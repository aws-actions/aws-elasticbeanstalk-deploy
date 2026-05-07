import * as core from '@actions/core';
import { validateAllInputs, Inputs } from './validations';
import { AWSClients } from './aws-clients';
import { DeploymentContext, logInfo } from './logging';
import { createDeploymentPackage } from './deploymentpackage';
import {
  getAwsAccountId,
  applicationVersionExists,
  getVersionS3Location,
  uploadToS3,
  createApplicationVersion,
  environmentExists,
  updateEnvironment,
  createEnvironment,
  getEnvironmentInfo,
  validateOptionSettingsForCreate,
} from './aws-operations';
import { waitForDeploymentCompletion, waitForHealthRecovery } from './monitoring';

export async function run(): Promise<void> {
  const startTime = Date.now();
  // Hoist verboseLogging so it is accessible in the catch block for error gating.
  // Defaults to false (quiet) if validation fails before inputs are parsed.
  let verboseLogging = false;

  try {
    core.info('🚀 Starting Elastic Beanstalk deployment...');

    const inputs = validateAllInputs();
    if (!inputs.valid) {
      return;
    }

    const {
      awsRegion, applicationName, environmentName, applicationVersionLabel,
      deploymentPackagePath, sourceDirectory, solutionStackName, platformArn,
      createEnvironmentIfNotExists, createApplicationIfNotExists, waitForDeployment,
      waitForEnvironmentRecovery, deploymentTimeout, maxRetries, retryDelay,
      useExistingApplicationVersionIfAvailable, createS3BucketIfNotExists, s3BucketName, cnamePrefix, excludePatterns,
      optionSettings, verboseLogging: verboseLoggingInput
    } = inputs as Inputs;
    verboseLogging = verboseLoggingInput;

    // Build the deployment context once; pass it everywhere instead of individual flags.
    const ctx: DeploymentContext = { verboseLogging, maxRetries, retryDelay };

    core.startGroup('📋 Validating inputs');
    if (verboseLogging) {
      core.info(`Application: ${applicationName}`);
      core.info(`Environment: ${environmentName}`);
      core.info(`Version: ${applicationVersionLabel}`);
      core.info(`Region: ${awsRegion}`);
    }
    core.endGroup();

    // Initialize AWS clients singleton
    const clients = AWSClients.getInstance(awsRegion);

    core.startGroup('🔐 Getting AWS account information');
    const accountId = await getAwsAccountId(clients, ctx);
    core.info('✅ AWS account verified');
    core.endGroup();

    core.startGroup('📦 Creating deployment package');
    const { path: packagePath } = await createDeploymentPackage(
      deploymentPackagePath,
      applicationVersionLabel,
      excludePatterns,
      sourceDirectory,
      ctx,
    );
    core.endGroup();

    // Check if we should reuse existing application version
    let bucket: string;
    let key: string;
    const shouldCreateNewApplicationVersion = !useExistingApplicationVersionIfAvailable || !(await applicationVersionExists(clients, applicationName, applicationVersionLabel, ctx));

    if (shouldCreateNewApplicationVersion) {
      core.startGroup('☁️  Uploading to S3');
      const uploadResult = await uploadToS3(
        clients,
        awsRegion,
        accountId,
        applicationName,
        applicationVersionLabel,
        packagePath,
        createS3BucketIfNotExists,
        ctx,
        s3BucketName,
      );
      bucket = uploadResult.bucket;
      key = uploadResult.key;
      core.endGroup();

      core.startGroup(verboseLogging ? `📝 Creating application version ${applicationVersionLabel}` : '📝 Creating application version');
      await createApplicationVersion(
        clients,
        applicationName,
        applicationVersionLabel,
        bucket,
        key,
        createApplicationIfNotExists,
        ctx,
      );
      core.endGroup();
    } else {
      core.startGroup('♻️  Reusing existing version');
      logInfo(
        ctx,
        `Version ${applicationVersionLabel} already exists, skipping S3 upload and version creation`,
        'Version already exists, skipping S3 upload and version creation'
      );
      const s3Location = await getVersionS3Location(clients, applicationName, applicationVersionLabel, ctx);
      bucket = s3Location.bucket;
      key = s3Location.key;
      core.endGroup();
    }

    core.startGroup('🔍 Checking environment status');
    const { exists: envExists } = await environmentExists(
      clients,
      applicationName,
      environmentName,
      ctx,
    );
    core.endGroup();

    let deploymentActionType: 'create' | 'update';
    const deploymentStartTime = new Date();

    if (envExists) {
      core.startGroup('🔄 Updating environment');
      await updateEnvironment(
        clients,
        applicationName,
        environmentName,
        applicationVersionLabel,
        optionSettings,
        solutionStackName,
        platformArn,
        ctx,
      );
      deploymentActionType = 'update';
      core.endGroup();
    } else {
      if (!createEnvironmentIfNotExists) {
        throw new Error(verboseLogging
          ? `Environment ${environmentName} does not exist and create-environment-if-not-exists is false`
          : 'Environment does not exist and create-environment-if-not-exists is false');
      }

      // Validate option-settings with IAM roles are provided when creating environment
      validateOptionSettingsForCreate(optionSettings);

      // When creating a new environment, either solution-stack-name or platform-arn must be provided
      if (!solutionStackName && !platformArn) {
        throw new Error('Either solution-stack-name or platform-arn must be provided when creating a new environment');
      }

      core.startGroup('🆕 Creating new environment');

      await createEnvironment(
        clients,
        applicationName,
        environmentName,
        applicationVersionLabel,
        optionSettings!,
        solutionStackName,
        platformArn,
        cnamePrefix,
        ctx,
      );
      deploymentActionType = 'create';
      core.endGroup();
    }

    let lastSeenEventDate: Date | undefined;
    if (waitForDeployment) {
      core.startGroup('⏳ Waiting for deployment');
      lastSeenEventDate = await waitForDeploymentCompletion(clients, applicationName, environmentName, deploymentTimeout, ctx, deploymentActionType, deploymentStartTime);
      core.endGroup();
    }
    if (waitForEnvironmentRecovery) {
      core.startGroup('🏥 Waiting for environment health');
      await waitForHealthRecovery(clients, applicationName, environmentName, deploymentTimeout, ctx, deploymentStartTime, lastSeenEventDate);
      core.endGroup();
    }

    const envInfo = await getEnvironmentInfo(clients, applicationName, environmentName, ctx);

    // Always set non-sensitive outputs
    core.setOutput('environment-status', envInfo.status);
    core.setOutput('environment-health', envInfo.health);
    core.setOutput('deployment-action-type', deploymentActionType);

    // Gate sensitive outputs
    if (verboseLogging) {
      core.setOutput('environment-url', envInfo.url);
      core.setOutput('environment-id', envInfo.id);
      core.setOutput('version-label', applicationVersionLabel);
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);

    core.startGroup('📤 Deployment Outputs');
    core.info(`Environment Status: ${envInfo.status}`);
    core.info(`Environment Health: ${envInfo.health}`);
    core.info(`Deployment Action: ${deploymentActionType}`);
    if (verboseLogging) {
      core.info(`Environment URL: ${envInfo.url}`);
      core.info(`Environment ID: ${envInfo.id}`);
      core.info(`Application Version Label: ${applicationVersionLabel}`);
    }
    core.endGroup();

    core.info(`✅ Deployment successful! (${deploymentActionType}) - Total time: ${totalTime}s`);

  } catch (error) {
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const errorMessage = (error as Error).message;
    if (verboseLogging) {
      core.error(`❌ Deployment failed after ${totalTime}s: ${errorMessage}`);
      core.setFailed(`Deployment failed: ${errorMessage}`);
    } else {
      core.error(`❌ Deployment failed after ${totalTime}s`);
      core.setFailed('Deployment failed (enable verbose-logging for details)');
      core.debug(`Deployment error detail: ${errorMessage}`);
    }
  }
}

if (require.main === module) {
  void run();
}
