import * as core from '@actions/core';
import { validateAllInputs, Inputs } from './validations';
import { AWSClients } from './aws-clients';
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

  try {
    core.info('🚀 Starting Elastic Beanstalk deployment...');

    const inputs = validateAllInputs();
    if (!inputs.valid) {
      return;
    }

    const {
      awsRegion, applicationName, environmentName, applicationVersionLabel,
      deploymentPackagePath, solutionStackName, platformArn,
      createEnvironmentIfNotExists, createApplicationIfNotExists, waitForDeployment,
      waitForEnvironmentRecovery, deploymentTimeout, maxRetries, retryDelay,
      useExistingApplicationVersionIfAvailable, createS3BucketIfNotExists, s3BucketName, excludePatterns,
      optionSettings
    } = inputs as Inputs;

    core.startGroup('📋 Validating inputs');
    core.info(`Application: ${applicationName}`);
    core.info(`Environment: ${environmentName}`);
    core.info(`Version: ${applicationVersionLabel}`);
    core.info(`Region: ${awsRegion}`);
    core.endGroup();

    // Initialize AWS clients singleton
    const clients = AWSClients.getInstance(awsRegion);

    core.startGroup('🔐 Getting AWS account information');
    const accountId = await getAwsAccountId(clients, maxRetries, retryDelay);
    core.info('✅ AWS account verified');
    core.endGroup();

    core.startGroup('📦 Creating deployment package');
    const { path: packagePath } = await createDeploymentPackage(
      deploymentPackagePath,
      applicationVersionLabel,
      excludePatterns
    );
    core.endGroup();

    // Check if we should reuse existing application version
    let bucket: string;
    let key: string;
    const shouldCreateNewApplicationVersion = !useExistingApplicationVersionIfAvailable || !(await applicationVersionExists(clients, applicationName, applicationVersionLabel));

    if (shouldCreateNewApplicationVersion) {
      core.startGroup('☁️  Uploading to S3');
      const uploadResult = await uploadToS3(
        clients,
        awsRegion,
        accountId,
        applicationName,
        applicationVersionLabel,
        packagePath,
        maxRetries,
        retryDelay,
        createS3BucketIfNotExists,
        s3BucketName
      );
      bucket = uploadResult.bucket;
      key = uploadResult.key;
      core.endGroup();

      core.startGroup(`📝 Creating application version ${applicationVersionLabel}`);
      await createApplicationVersion(
        clients,
        applicationName,
        applicationVersionLabel,
        bucket,
        key,
        maxRetries,
        retryDelay,
        createApplicationIfNotExists
      );
      core.endGroup();
    } else {
      core.startGroup('♻️  Reusing existing version');
      core.info(`Version ${applicationVersionLabel} already exists, skipping S3 upload and version creation`);
      const s3Location = await getVersionS3Location(clients, applicationName, applicationVersionLabel);
      bucket = s3Location.bucket;
      key = s3Location.key;
      core.endGroup();
    }

    core.startGroup('🔍 Checking environment status');
    const { exists: envExists } = await environmentExists(
      clients,
      applicationName,
      environmentName
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
        maxRetries,
        retryDelay
      );
      deploymentActionType = 'update';
      core.endGroup();
    } else {
      if (!createEnvironmentIfNotExists) {
        throw new Error(`Environment ${environmentName} does not exist and create-environment-if-not-exists is false`);
      }

      // Validate option-settings with IAM roles are provided when creating environment
      validateOptionSettingsForCreate(optionSettings);

      core.startGroup('🆕 Creating new environment');
      
      await createEnvironment(
        clients,
        applicationName,
        environmentName,
        applicationVersionLabel,
        optionSettings!,
        solutionStackName,
        platformArn,
        maxRetries,
        retryDelay
      );
      deploymentActionType = 'create';
      core.endGroup();
    }

    let lastSeenEventDate: Date | undefined;
    if (waitForDeployment) {
      core.startGroup('⏳ Waiting for deployment');
      lastSeenEventDate = await waitForDeploymentCompletion(clients, applicationName, environmentName, deploymentTimeout, deploymentActionType, deploymentStartTime);
      core.endGroup();
    }
    if (waitForEnvironmentRecovery) {
      core.startGroup('🏥 Waiting for environment health');
      await waitForHealthRecovery(clients, applicationName, environmentName, deploymentTimeout, deploymentStartTime, lastSeenEventDate);
      core.endGroup();
    }

    const envInfo = await getEnvironmentInfo(clients, applicationName, environmentName);

    core.setOutput('environment-url', envInfo.url);
    core.setOutput('environment-id', envInfo.id);
    core.setOutput('environment-status', envInfo.status);
    core.setOutput('environment-health', envInfo.health);
    core.setOutput('deployment-action-type', deploymentActionType);
    core.setOutput('version-label', applicationVersionLabel);

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    core.startGroup('📤 Deployment Outputs');
    core.info(`Environment URL: ${envInfo.url}`);
    core.info(`Environment ID: ${envInfo.id}`);
    core.info(`Environment Status: ${envInfo.status}`);
    core.info(`Environment Health: ${envInfo.health}`);
    core.info(`Deployment Action: ${deploymentActionType}`);
    core.info(`Application Version Label: ${applicationVersionLabel}`);
    core.endGroup();
    
    core.info(`✅ Deployment successful! (${deploymentActionType}) - Total time: ${totalTime}s`);

  } catch (error) {
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    core.error(`❌ Deployment failed after ${totalTime}s: ${(error as Error).message}`);
    core.setFailed(`Deployment failed: ${(error as Error).message}`);
  }
}

if (require.main === module) {
  void run();
}
