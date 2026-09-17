import * as core from '@actions/core';
import * as fs from 'fs';

export interface Inputs {
  awsRegion: string;
  applicationName: string;
  environmentName: string;
  applicationVersionLabel: string;
  deploymentPackagePath?: string;
  solutionStackName?: string;
  platformArn?: string;
  createEnvironmentIfNotExists: boolean;
  createApplicationIfNotExists: boolean;
  waitForDeployment: boolean;
  waitForEnvironmentRecovery: boolean;
  deploymentTimeout: number;
  maxRetries: number;
  retryDelay: number;
  useExistingApplicationVersionIfAvailable: boolean;
  createS3BucketIfNotExists: boolean;
  s3BucketName?: string;
  cnamePrefix?: string;
  sourceDirectory?: string;
  excludePatterns: string;
  symlinks: 'preserve' | 'follow';
  optionSettings?: string;
  imageUri?: string;
  buildConfiguration?: string;
}

function validateRequiredInputs() {
  const awsRegion = core.getInput('aws-region', { required: true });
  const applicationName = core.getInput('application-name', { required: true });
  const environmentName = core.getInput('environment-name', { required: true });
  const solutionStackName = core.getInput('solution-stack-name') || undefined;
  const platformArn = core.getInput('platform-arn') || undefined;

  // Validate that both solution-stack-name AND platform-arn are not provided together
  if (solutionStackName && platformArn) {
    core.setFailed('Cannot specify both solution-stack-name and platform-arn. Use only one.');
    return { valid: false };
  }

  // Validate AWS region format (e.g., us-east-1, eu-west-2, us-gov-east-1).
  // \d+ (not \d) so a future multi-digit region suffix isn't rejected.
  const regionPattern = /^(us(-gov)?|af|ap|ca|eu|il|me|sa)-(north|south|east|west|central|northeast|southeast|northwest|southwest)-\d+$/;
  if (!regionPattern.test(awsRegion)) {
    core.setFailed(`Invalid AWS region format: ${awsRegion}. Expected format like 'us-east-1' or 'us-gov-east-1'`);
    return { valid: false };
  }

  return {
    valid: true,
    awsRegion,
    applicationName,
    environmentName,
    solutionStackName,
    platformArn
  };
}

function validateNumericInputs() {
  // Beanstalk Cluster defaults higher: the first environment in an account has to provision an
  // EKS cluster, which takes 15-20 minutes — longer than the classic 900s default, so a
  // successful first deploy would otherwise be reported as a timeout failure.
  const isClusterMode = !!(core.getInput('image-uri').trim() || core.getInput('build-configuration').trim());
  const defaultDeploymentTimeout = isClusterMode ? '2400' : '900';
  const deploymentTimeoutInput = core.getInput('deployment-timeout') || defaultDeploymentTimeout;
  const maxRetriesInput = core.getInput('max-retries') || '2';
  const retryDelayInput = core.getInput('retry-delay') || '5';

  const deploymentTimeout = parseInt(deploymentTimeoutInput, 10);
  const maxRetries = parseInt(maxRetriesInput, 10);
  const retryDelay = parseInt(retryDelayInput, 10);

  if (isNaN(deploymentTimeout)) {
    core.setFailed(`Deployment timeout must be a number, got: ${deploymentTimeoutInput}`);
    return { valid: false };
  }

  if (deploymentTimeout < 60) {
    core.setFailed(`Deployment timeout must be at least 60 seconds, got: ${deploymentTimeout}`);
    return { valid: false };
  }

  if (deploymentTimeout > 3600) {
    core.setFailed(`Deployment timeout cannot exceed 3600 seconds (1 hour), got: ${deploymentTimeout}`);
    return { valid: false };
  }

  if (isNaN(maxRetries)) {
    core.setFailed(`Max retries must be a number, got: ${maxRetriesInput}`);
    return { valid: false };
  }

  if (maxRetries < 0) {
    core.setFailed(`Max retries cannot be negative, got: ${maxRetries}`);
    return { valid: false };
  }

  if (maxRetries > 10) {
    core.setFailed(`Max retries cannot exceed 10, got: ${maxRetries}`);
    return { valid: false };
  }

  if (isNaN(retryDelay)) {
    core.setFailed(`Retry delay must be a number, got: ${retryDelayInput}`);
    return { valid: false };
  }

  if (retryDelay < 1) {
    core.setFailed(`Retry delay must be at least 1 second, got: ${retryDelay}`);
    return { valid: false };
  }

  if (retryDelay > 60) {
    core.setFailed(`Retry delay cannot exceed 60 seconds, got: ${retryDelay}`);
    return { valid: false };
  }

  return {
    valid: true,
    deploymentTimeout,
    maxRetries,
    retryDelay
  };
}

function validateOptionalInputs() {
  const applicationVersionLabel = core.getInput('version-label') || process.env.GITHUB_SHA || `v${Date.now()}`;
  const deploymentPackagePath = core.getInput('deployment-package-path').trim() || undefined;
  const sourceDirectory = core.getInput('source-directory').trim() || undefined;
  const excludePatterns = core.getInput('exclude-patterns').trim() || '';
  const symlinksInput = (core.getInput('symlinks').trim() || 'preserve').toLowerCase();
  if (symlinksInput !== 'preserve' && symlinksInput !== 'follow') {
    core.setFailed(`Invalid symlinks value: '${symlinksInput}'. Expected 'preserve' or 'follow'.`);
    return { valid: false };
  }
  const symlinks = symlinksInput as 'preserve' | 'follow';
  const s3BucketName = core.getInput('s3-bucket-name') || undefined;
  const cnamePrefix = core.getInput('cname-prefix') || undefined;
  const optionSettings = core.getInput('option-settings') || undefined;
  const imageUri = core.getInput('image-uri').trim() || undefined;
  const buildConfiguration = core.getInput('build-configuration').trim() || undefined;

  // Validate source-directory exists and is a directory if provided. Skipped for image-uri
  // deployments, which never package source (checkInputConflicts warns that it's ignored).
  if (sourceDirectory && !imageUri) {
    if (!fs.existsSync(sourceDirectory)) {
      core.setFailed(`source-directory '${sourceDirectory}' does not exist.`);
      return { valid: false };
    }
    if (!fs.statSync(sourceDirectory).isDirectory()) {
      core.setFailed(`source-directory '${sourceDirectory}' is not a directory.`);
      return { valid: false };
    }
  }

  // Validate option-settings is valid JSON array if provided
  if (optionSettings) {
    try {
      const parsed = JSON.parse(optionSettings);
      if (!Array.isArray(parsed)) {
        core.setFailed('option-settings must be a JSON array');
        return { valid: false };
      }
    } catch (error) {
      core.setFailed(`Invalid JSON in option-settings: ${(error as Error).message}`);
      return { valid: false };
    }
  }

  if (imageUri && buildConfiguration) {
    core.setFailed('Cannot specify both image-uri and build-configuration. Use image-uri for pre-built images (BYOI) or build-configuration for auto-containerization.');
    return { valid: false };
  }

  if (buildConfiguration) {
    try {
      const parsed = JSON.parse(buildConfiguration);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        core.setFailed('build-configuration must be a JSON object');
        return { valid: false };
      }
      if (!parsed.CodeBuildServiceRole || !parsed.Type) {
        core.setFailed('build-configuration must include CodeBuildServiceRole and Type');
        return { valid: false };
      }
    } catch (error) {
      core.setFailed(`Invalid JSON in build-configuration: ${(error as Error).message}`);
      return { valid: false };
    }
  }

  const createEnvironmentIfNotExists = core.getBooleanInput('create-environment-if-not-exists');
  const createApplicationIfNotExists = core.getBooleanInput('create-application-if-not-exists');
  const waitForDeployment = core.getBooleanInput('wait-for-deployment');
  const waitForEnvironmentRecovery = core.getBooleanInput('wait-for-environment-recovery');
  const useExistingApplicationVersionIfAvailable = core.getBooleanInput('use-existing-application-version-if-available');
  const createS3BucketIfNotExists = core.getBooleanInput('create-s3-bucket-if-not-exists');

  return {
    valid: true,
    applicationVersionLabel,
    deploymentPackagePath,
    sourceDirectory,
    createEnvironmentIfNotExists,
    createApplicationIfNotExists,
    waitForDeployment,
    waitForEnvironmentRecovery,
    useExistingApplicationVersionIfAvailable,
    createS3BucketIfNotExists,
    s3BucketName,
    cnamePrefix,
    excludePatterns,
    symlinks,
    optionSettings,
    imageUri,
    buildConfiguration
  };
}

function checkInputConflicts(inputs: Partial<Inputs>): void {
  // Check if deployment-package-path is provided WITH exclude-patterns
  if (inputs.deploymentPackagePath && inputs.excludePatterns !== '') {
    core.warning(
      'Both deployment-package-path and exclude-patterns are specified. ' +
      'exclude-patterns and .ebignore/.gitignore patterns will be ignored since deployment-package-path takes precedence.'
    );
  }

  // Warn if deployment-package-path is provided together with symlinks (non-default)
  if (inputs.deploymentPackagePath && inputs.symlinks && inputs.symlinks !== 'preserve') {
    core.warning(
      'Both deployment-package-path and a non-default symlinks value are specified. ' +
      'symlinks will be ignored since deployment-package-path takes precedence.'
    );
  }

  // image-uri deploys a pre-built image and never packages source, so packaging inputs are ignored
  if (inputs.imageUri) {
    const ignored = [
      inputs.deploymentPackagePath && 'deployment-package-path',
      inputs.sourceDirectory && 'source-directory',
      inputs.excludePatterns && 'exclude-patterns',
      inputs.symlinks && inputs.symlinks !== 'preserve' && 'symlinks',
    ].filter(Boolean);
    if (ignored.length > 0) {
      core.warning(`image-uri is set, so ${ignored.join(', ')} will be ignored: no source bundle is packaged or uploaded for a pre-built image.`);
    }
  }

  // Check if deployment-package-path is provided WITH source-directory
  if (inputs.deploymentPackagePath && inputs.sourceDirectory) {
    core.warning(
      'Both deployment-package-path and source-directory are specified. ' +
      'source-directory will be ignored since deployment-package-path takes precedence.'
    );
  }

  // Check if create-application-if-not-exists is true but create-environment-if-not-exists is false
  if (inputs.createApplicationIfNotExists && !inputs.createEnvironmentIfNotExists) {
    core.warning(
      'create-application-if-not-exists is true, but create-environment-if-not-exists is false. ' +
      'The application will be created, but the environment will NOT be created if it does not exist.'
    );
  }

  // Check if use-existing-application-version-if-available is true with deployment-timeout very low
  if (inputs.useExistingApplicationVersionIfAvailable && inputs.deploymentTimeout && inputs.deploymentTimeout < 120) {
    core.warning(
      `use-existing-application-version-if-available is true with a low deployment-timeout (${inputs.deploymentTimeout}s). ` +
      'If a new version needs to be created, deployment may timeout.'
    );
  }

  // Check if max-retries is 0
  if (inputs.maxRetries === 0) {
    core.warning(
      'max-retries is set to 0. API calls will not be retried on failure, which may cause transient errors to fail the deployment.'
    );
  }

  // Check if create-s3-bucket-if-not-exists is false without a custom bucket name
  if (inputs.createS3BucketIfNotExists === false && !inputs.s3BucketName) {
    core.warning(
      'create-s3-bucket-if-not-exists is false and no custom s3-bucket-name was provided. ' +
      'The action will use the default Elastic Beanstalk bucket elasticbeanstalk-<region>-<account-id>. ' +
      'If that bucket does not exist or is not writable, deployment will fail. Either create the default bucket or set s3-bucket-name to an existing bucket.'
    );
  }
}

export function validateAllInputs(): { valid: boolean } & Partial<Inputs> {
  const requiredInputs = validateRequiredInputs();
  if (!requiredInputs.valid) {
    return { valid: false };
  }

  const numericInputs = validateNumericInputs();
  if (!numericInputs.valid) {
    return { valid: false };
  }

  const optionalInputs = validateOptionalInputs();
  if (!optionalInputs.valid) {
    return { valid: false };
  }

  // Beanstalk Cluster (image-uri/build-configuration) creates environments with Tier=Cluster,
  // not a solution stack or platform - these inputs are mutually exclusive.
  if ((optionalInputs.imageUri || optionalInputs.buildConfiguration) && (requiredInputs.solutionStackName || requiredInputs.platformArn)) {
    core.setFailed(
      'Cannot specify solution-stack-name or platform-arn together with image-uri or build-configuration. ' +
      'Beanstalk Cluster environments (image-uri/build-configuration) use Tier=Cluster instead of a solution stack or platform.'
    );
    return { valid: false };
  }

  const validatedInputs = {
    valid: true,
    awsRegion: requiredInputs.awsRegion,
    applicationName: requiredInputs.applicationName,
    environmentName: requiredInputs.environmentName,
    solutionStackName: requiredInputs.solutionStackName,
    platformArn: requiredInputs.platformArn,
    deploymentTimeout: numericInputs.deploymentTimeout,
    maxRetries: numericInputs.maxRetries,
    retryDelay: numericInputs.retryDelay,
    applicationVersionLabel: optionalInputs.applicationVersionLabel!,
    deploymentPackagePath: optionalInputs.deploymentPackagePath,
    sourceDirectory: optionalInputs.sourceDirectory,
    createEnvironmentIfNotExists: optionalInputs.createEnvironmentIfNotExists!,
    createApplicationIfNotExists: optionalInputs.createApplicationIfNotExists!,
    waitForDeployment: optionalInputs.waitForDeployment!,
    waitForEnvironmentRecovery: optionalInputs.waitForEnvironmentRecovery!,
    useExistingApplicationVersionIfAvailable: optionalInputs.useExistingApplicationVersionIfAvailable!,
    createS3BucketIfNotExists: optionalInputs.createS3BucketIfNotExists!,
    s3BucketName: optionalInputs.s3BucketName,
    excludePatterns: optionalInputs.excludePatterns!,
    symlinks: optionalInputs.symlinks!,
    optionSettings: optionalInputs.optionSettings,
    imageUri: optionalInputs.imageUri,
    buildConfiguration: optionalInputs.buildConfiguration
  };

  checkInputConflicts(validatedInputs);

  return validatedInputs;
}

export function parseJsonInput<T = unknown>(jsonString: string, inputName: string): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new Error(`Invalid JSON in ${inputName} input: ${(error as Error).message}`);
  }
}
