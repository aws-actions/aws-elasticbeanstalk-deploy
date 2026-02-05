import * as core from '@actions/core';

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
  excludePatterns: string;
  optionSettings?: string;
}

function validateRequiredInputs() {
  const awsRegion = core.getInput('aws-region', { required: true });
  const applicationName = core.getInput('application-name', { required: true });
  const environmentName = core.getInput('environment-name', { required: true });
  const solutionStackName = core.getInput('solution-stack-name') || undefined;
  const platformArn = core.getInput('platform-arn') || undefined;

  // Validate that either solution-stack-name OR platform-arn is provided, but not both
  if (!solutionStackName && !platformArn) {
    core.setFailed('Either solution-stack-name or platform-arn must be provided');
    return { valid: false };
  }

  if (solutionStackName && platformArn) {
    core.setFailed('Cannot specify both solution-stack-name and platform-arn. Use only one.');
    return { valid: false };
  }

  // Validate AWS region format (e.g., us-east-1, eu-west-2)
  const regionPattern = /^[a-z]{2}-[a-z]+-\d{1}$/;
  if (!regionPattern.test(awsRegion)) {
    core.setFailed(`Invalid AWS region format: ${awsRegion}. Expected format like 'us-east-1'`);
    return { valid: false };
  }

  // Validate platform ARN format if provided
  if (platformArn) {
    const platformArnPattern = /^arn:aws:elasticbeanstalk:[a-z0-9-]+::platform\/.+$/;
    if (!platformArnPattern.test(platformArn)) {
      core.setFailed(`Invalid platform ARN format: ${platformArn}. Expected format like 'arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0'`);
      return { valid: false };
    }

    // Extract region from platform ARN and validate it matches the aws-region input
    const arnParts = platformArn.split(':');
    if (arnParts.length >= 4) {
      const platformRegion = arnParts[3];
      if (platformRegion !== awsRegion) {
        core.setFailed(`Platform ARN region (${platformRegion}) does not match aws-region input (${awsRegion})`);
        return { valid: false };
      }
    }
  }

  // Elastic Beanstalk application name constraints
  if (applicationName.length < 1 || applicationName.length > 100) {
    core.setFailed(`Application name must be between 1 and 100 characters, got ${applicationName.length}`);
    return { valid: false };
  }

  // Elastic Beanstalk environment name constraints
  if (environmentName.length < 4 || environmentName.length > 40) {
    core.setFailed(`Environment name must be between 4 and 40 characters, got ${environmentName.length}`);
    return { valid: false };
  }

  // Environment name must contain only alphanumeric and hyphens
  const envNamePattern = /^[a-zA-Z0-9-]+$/;
  if (!envNamePattern.test(environmentName)) {
    core.setFailed(`Environment name can only contain alphanumeric characters and hyphens, got: ${environmentName}`);
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
  const deploymentTimeoutInput = core.getInput('deployment-timeout') || '900';
  const maxRetriesInput = core.getInput('max-retries') || '3';
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
  const deploymentPackagePath = core.getInput('deployment-package-path');
  const excludePatterns = core.getInput('exclude-patterns') || '';
  const s3BucketName = core.getInput('s3-bucket-name') || undefined;
  const optionSettings = core.getInput('option-settings') || undefined;

  // Validate version label length
  if (applicationVersionLabel.length < 1 || applicationVersionLabel.length > 100) {
    core.setFailed(`Version label must be between 1 and 100 characters, got ${applicationVersionLabel.length}`);
    return { valid: false };
  }

  // Validate option-settings is valid JSON array if provided (IAM validation happens at runtime)
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
    createEnvironmentIfNotExists,
    createApplicationIfNotExists,
    waitForDeployment,
    waitForEnvironmentRecovery,
    useExistingApplicationVersionIfAvailable,
    createS3BucketIfNotExists,
    s3BucketName,
    excludePatterns,
    optionSettings
  };
}

function checkInputConflicts(inputs: Partial<Inputs>): void {
  // Check if deployment-package-path is provided WITH exclude-patterns
  if (inputs.deploymentPackagePath && inputs.deploymentPackagePath.trim() !== '' &&
      inputs.excludePatterns && inputs.excludePatterns.trim() !== '') {
    core.warning(
      'Both deployment-package-path and exclude-patterns are specified. ' +
      'exclude-patterns will be ignored since deployment-package-path takes precedence.'
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

  // Check if create-s3-bucket-if-not-exists is false
  if (inputs.createS3BucketIfNotExists === false) {
    core.warning(
      'create-s3-bucket-if-not-exists is false. If the S3 bucket does not exist, deployment will fail. ' +
      'Ensure the bucket exists: <elasticbeanstalk-<region>-<account-id>'
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
    createEnvironmentIfNotExists: optionalInputs.createEnvironmentIfNotExists!,
    createApplicationIfNotExists: optionalInputs.createApplicationIfNotExists!,
    waitForDeployment: optionalInputs.waitForDeployment!,
    waitForEnvironmentRecovery: optionalInputs.waitForEnvironmentRecovery!,
    useExistingApplicationVersionIfAvailable: optionalInputs.useExistingApplicationVersionIfAvailable!,
    createS3BucketIfNotExists: optionalInputs.createS3BucketIfNotExists!,
    s3BucketName: optionalInputs.s3BucketName,
    excludePatterns: optionalInputs.excludePatterns!,
    optionSettings: optionalInputs.optionSettings
  };

  checkInputConflicts(validatedInputs);

  return validatedInputs;
}

export function parseJsonInput(jsonString: string, inputName: string) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Invalid JSON in ${inputName} input: ${(error as Error).message}`);
  }
}
