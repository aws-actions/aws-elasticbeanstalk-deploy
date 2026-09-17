import * as core from '@actions/core';
import { ImageBuildConfiguration } from '@aws-sdk/client-elastic-beanstalk';
import { validateAllInputs, Inputs } from './validations';
import { AWSClients } from './aws-clients';
import { createDeploymentPackage } from './deploymentpackage';
import {
  getAwsAccountId,
  applicationVersionExists,
  getApplicationVersionStatus,
  getApplicationVersionInfo,
  getVersionS3Location,
  getApplicationVersionImageUri,
  isNonRetryableError,
  unknownImageBuildConfigurationFields,
  DEFAULT_IMAGE_BUILD_TIMEOUT_MINUTES,
  uploadToS3,
  createApplicationVersion,
  environmentExists,
  updateEnvironment,
  createEnvironment,
  validateOptionSettingsForCreate,
  validateOptionSettingsForCreateClusterMode,
} from './aws-operations';
import { waitForDeploymentCompletion, waitForHealthRecovery, waitForEnvironmentReady, getEnvironmentInfo } from './monitoring';

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
      deploymentPackagePath, sourceDirectory, solutionStackName, platformArn,
      createEnvironmentIfNotExists, createApplicationIfNotExists, waitForDeployment,
      waitForEnvironmentRecovery, deploymentTimeout, maxRetries, retryDelay,
      useExistingApplicationVersionIfAvailable, createS3BucketIfNotExists, s3BucketName, cnamePrefix, excludePatterns,
      symlinks, optionSettings, imageUri, buildConfiguration
    } = inputs as Inputs;

    // image-uri / build-configuration select Beanstalk Cluster mode (CreateApplicationVersion with
    // ImageConfiguration); neither set means the classic Beanstalk Standard source-bundle flow.
    const isClusterMode = !!(imageUri || buildConfiguration);

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

    // Check the target environment before packaging anything. A Beanstalk Cluster environment
    // only accepts application versions created with an ImageConfiguration; deploying a
    // source bundle to one fails at UpdateEnvironment, after the label has already been
    // consumed by an unusable version (which use-existing-application-version-if-available
    // would then reuse on retry). Failing here avoids both.
    core.startGroup('🔍 Checking environment status');
    const envCheck = await environmentExists(clients, applicationName, environmentName);
    core.endGroup();

    const isClusterTier = envCheck.tierName === 'Cluster';

    if (envCheck.exists) {
      // Fail closed: without the tier, input/tier compatibility can't be verified, and
      // proceeding could consume the version label with an incompatible version.
      if (envCheck.status === 'Terminating') {
        throw new Error(`Environment ${environmentName} is terminating and cannot be deployed to`);
      }

      if (!envCheck.tierName) {
        throw new Error(
          `Could not determine the tier of environment ${environmentName} from DescribeEnvironments. ` +
          'Refusing to deploy because tier/input compatibility cannot be verified. Retry the deployment; if this persists, report it at https://github.com/aws-actions/aws-elasticbeanstalk-deploy/issues.'
        );
      }

      if (isClusterTier && !isClusterMode) {
        throw new Error(
          `Environment ${environmentName} is a Beanstalk Cluster environment. ` +
          'Provide image-uri (pre-built image) or build-configuration (build from source) to deploy to it.'
        );
      }

      // Mirror guard for the opposite direction: an image version can't deploy to a
      // WebServer/Worker tier environment, and creating one would consume the label the
      // same way (issue #7 in reverse).
      if (!isClusterTier && isClusterMode) {
        throw new Error(
          `Environment ${environmentName} is a ${envCheck.tierName} tier (Beanstalk Standard) environment, which cannot deploy container image versions. ` +
          'Remove image-uri/build-configuration and provide solution-stack-name or platform-arn, or target a Beanstalk Cluster environment.'
        );
      }
    } else if (!createEnvironmentIfNotExists) {
      // Nothing can be deployed, so fail before packaging, uploading, or creating a version —
      // a version created now would only consume the label.
      throw new Error(`Environment ${environmentName} does not exist and create-environment-if-not-exists is false`);
    } else {
      // The environment will be created, so validate its option-settings now — before packaging,
      // uploading, creating a version, or (build-configuration) running a CodeBuild image build —
      // rather than after those steps have run and consumed the label.
      if (isClusterMode) {
        validateOptionSettingsForCreateClusterMode(optionSettings);
      } else {
        validateOptionSettingsForCreate(optionSettings);
        if (!solutionStackName && !platformArn) {
          throw new Error('Either solution-stack-name or platform-arn must be provided when creating a new environment');
        }
      }
    }

    if (imageUri) {
      // Beanstalk Cluster BYOI: skip packaging/S3, create the application version from ImageConfiguration.Source.
      // The application is created through AutoCreateApplication on CreateApplicationVersion,
      // exactly like the Beanstalk Standard path.
      // Same reuse semantics as the Beanstalk Standard path: a version label can't be recreated,
      // so if one already exists under this label it is deployed as-is — unless its image build
      // FAILED (undeployable) or is still running (wait for it).
      const existing = useExistingApplicationVersionIfAvailable
        ? await getApplicationVersionInfo(clients, applicationName, applicationVersionLabel, maxRetries, retryDelay)
        : { exists: false };
      if (existing.exists) {
        core.startGroup('♻️  Reusing existing version');
        await ensureReusableClusterVersion(clients, applicationName, applicationVersionLabel, existing.status, existing.buildTimeoutMinutes ?? DEFAULT_IMAGE_BUILD_TIMEOUT_MINUTES);
        await assertVersionHasImage(clients, applicationName, applicationVersionLabel, maxRetries, retryDelay,
          'The existing version under this label has no image (for example a source bundle from a run that did not set image-uri), so it cannot be deployed to a Beanstalk Cluster environment.');
        core.info(`Version ${applicationVersionLabel} already exists, skipping version creation`);
        core.endGroup();
      } else {
        core.startGroup('📝 Creating application version (Beanstalk Cluster BYOI)');
        await createApplicationVersion(clients, applicationName, applicationVersionLabel, undefined, undefined, maxRetries, retryDelay, createApplicationIfNotExists, imageUri);
        await assertVersionHasImage(clients, applicationName, applicationVersionLabel, maxRetries, retryDelay,
          'The service did not record the image-uri on the version, so it cannot be deployed to a Beanstalk Cluster environment.');
        core.endGroup();
      }
    } else if (buildConfiguration) {
      // Beanstalk Cluster auto-containerization: zip → S3 → CreateApplicationVersion with ImageConfiguration.Build.
      // Sent to the service as ImageConfiguration.Build; the service validates the field values.
      // The SDK serializer only emits the fields it models, so any other field would silently
      // vanish from the request while the version label is consumed — fail before that happens.
      const parsedBuildConfig = JSON.parse(buildConfiguration) as ImageBuildConfiguration;
      const unknownFields = unknownImageBuildConfigurationFields(parsedBuildConfig);
      if (unknownFields.length > 0) {
        throw new Error(
          `build-configuration field(s) ${unknownFields.join(', ')} are not part of ImageConfiguration.Build in the ` +
          'AWS SDK bundled with this action and would not be sent to Elastic Beanstalk. Remove them, or if the API ' +
          'supports them, use a release of the action built with a newer SDK.'
        );
      }

      // Wait for the build up to the service's own build timeout (ImageConfiguration.Build.TimeoutInMinutes,
      // default 60) plus a short grace period for the status to flip, so the action never gives up
      // on a build the service is still running. Coerce defensively: the field is passed through
      // unvalidated, and a non-numeric value would otherwise produce a NaN deadline.
      const requestedTimeout = Number(parsedBuildConfig.TimeoutInMinutes);
      const buildTimeoutMinutes = Number.isFinite(requestedTimeout) && requestedTimeout > 0
        ? requestedTimeout
        : DEFAULT_IMAGE_BUILD_TIMEOUT_MINUTES;

      // Same reuse semantics as the Beanstalk Standard path: a version label can't be recreated,
      // so if one already exists under this label it is deployed as-is (no packaging, upload, or
      // build) — unless its build FAILED (undeployable) or is still running (wait for it).
      const existing = useExistingApplicationVersionIfAvailable
        ? await getApplicationVersionInfo(clients, applicationName, applicationVersionLabel, maxRetries, retryDelay)
        : { exists: false };

      if (existing.exists) {
        core.startGroup('♻️  Reusing existing version');
        await ensureReusableClusterVersion(clients, applicationName, applicationVersionLabel, existing.status, existing.buildTimeoutMinutes ?? buildTimeoutMinutes);
        await assertVersionHasImage(clients, applicationName, applicationVersionLabel, maxRetries, retryDelay,
          'The existing version under this label reports PROCESSED but has no built image, so it cannot be deployed to a Beanstalk Cluster environment.');
        core.info(`Version ${applicationVersionLabel} already exists, skipping packaging, S3 upload, and image build`);
        core.endGroup();
      } else {
        core.startGroup('📦 Creating deployment package');
        const { path: packagePath } = await createDeploymentPackage(
          deploymentPackagePath,
          applicationVersionLabel,
          excludePatterns,
          sourceDirectory,
          symlinks
        );
        core.endGroup();

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
        core.endGroup();

        core.startGroup('📝 Creating application version (auto-containerization)');
        await createApplicationVersion(clients, applicationName, applicationVersionLabel, uploadResult.bucket, uploadResult.key, maxRetries, retryDelay, createApplicationIfNotExists, undefined, parsedBuildConfig);
        core.endGroup();

        core.startGroup(`🔨 Waiting for image build to complete (up to ${buildTimeoutMinutes} minutes)`);
        await waitForImageBuild(clients, applicationName, applicationVersionLabel, buildTimeoutMinutes);
        // PROCESSED alone is not proof an image exists: when the service does not accept the build
        // settings (for example a Type in the wrong case or a DockerfileLocation that is not in the
        // bundle) it currently marks the version PROCESSED within a second without building anything.
        await assertVersionHasImage(clients, applicationName, applicationVersionLabel, maxRetries, retryDelay,
          'The version reports PROCESSED but no image was built. Check the build-configuration ' +
          '(Type must be "docker" or "buildpack"; DockerfileLocation must name a file in the source bundle).');
        core.endGroup();
      }
    } else {
      // Classic EB: package → S3 → CreateApplicationVersion
      core.startGroup('📦 Creating deployment package');
      const { path: packagePath } = await createDeploymentPackage(
        deploymentPackagePath,
        applicationVersionLabel,
        excludePatterns,
        sourceDirectory,
        symlinks
      );
      core.endGroup();

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
    }

    let deploymentActionType: 'create' | 'update';
    // Events are attributed to this deployment from this timestamp on, so take it after any wait
    // for a previous deployment to finish: its ERROR events must not fail this run.
    let deploymentStartTime = new Date();

    if (envCheck.exists) {
      await waitForEnvironmentReady(clients, applicationName, environmentName, deploymentTimeout);
      deploymentStartTime = new Date();

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
      core.startGroup('🆕 Creating new environment');
      await createEnvironment(
        clients,
        applicationName,
        environmentName,
        applicationVersionLabel,
        optionSettings || '[]',
        solutionStackName,
        platformArn,
        cnamePrefix,
        maxRetries,
        retryDelay,
        isClusterMode
      );
      deploymentActionType = 'create';
      core.endGroup();
    }

    let lastSeenEventDate: Date | undefined;
    if (waitForDeployment) {
      core.startGroup('⏳ Waiting for deployment');
      lastSeenEventDate = await waitForDeploymentCompletion(clients, applicationName, environmentName, deploymentTimeout, deploymentActionType, deploymentStartTime, applicationVersionLabel);
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

const BUILD_POLL_INTERVAL_MS = 15000;

/**
 * Poll a Beanstalk Cluster application version until its image build reaches a terminal status.
 * Throws on FAILED or when the deadline (TimeoutInMinutes plus a short grace period) passes.
 * Classic EB returns title-case statuses ('Processed'/'Failed'); Beanstalk Cluster returns all-caps
 * ('BUILDING' while the image builds, then 'PROCESSED'/'FAILED') — compared case-insensitively; any
 * other status is treated as in progress. The loop itself is the retry for transient describe errors,
 * so the deadline stays real (retryWithBackoff here could sleep far past it).
 */
async function waitForImageBuild(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string,
  timeoutMinutes: number
): Promise<void> {
  const deadlineMs = (timeoutMinutes * 60 + 120) * 1000;
  const start = Date.now();
  let status: string | undefined;
  while (Date.now() - start < deadlineMs) {
    try {
      status = await getApplicationVersionStatus(clients, applicationName, versionLabel);
    } catch (error) {
      // Transient describe failures are absorbed by the next poll; permanent ones (expired
      // credentials, lost permissions) would otherwise be retried until the build deadline and
      // then misreported as a build timeout.
      if (isNonRetryableError(error)) throw error;
      core.warning(`Could not read build status (will retry): ${(error as Error).message}`);
    }
    const normalized = status?.toUpperCase();
    if (normalized === 'PROCESSED' || normalized === 'FAILED') {
      break;
    }
    core.info(`Build status: ${status || 'unknown'}`);
    const remainingMs = deadlineMs - (Date.now() - start);
    if (remainingMs <= 0) {
      break;
    }
    // Sleep at most until the deadline, then take one final read before giving up.
    await new Promise(resolve => setTimeout(resolve, Math.min(BUILD_POLL_INTERVAL_MS, remainingMs)));
    if (Date.now() - start >= deadlineMs) {
      try {
        status = await getApplicationVersionStatus(clients, applicationName, versionLabel);
      } catch (error) {
        if (isNonRetryableError(error)) throw error;
        core.warning(`Could not read build status: ${(error as Error).message}`);
      }
      break;
    }
  }
  if (status?.toUpperCase() === 'FAILED') {
    throw new Error(`Image build failed for application version ${versionLabel}`);
  }
  if (status?.toUpperCase() !== 'PROCESSED') {
    throw new Error(
      `Image build did not complete within ${timeoutMinutes} minutes (last status: ${status || 'unknown'}). ` +
      'Raise TimeoutInMinutes in build-configuration if the build legitimately needs longer.'
    );
  }
}

/**
 * Decide whether an existing Beanstalk Cluster application version can be reused. A version whose
 * image build FAILED can never be deployed — and the label can't be recreated — so fail with
 * guidance now rather than at UpdateEnvironment. A build that is still running (e.g. a concurrent
 * run of the same commit) is waited for. Anything else (PROCESSED, or UNPROCESSED for a pre-built
 * image) is reused as-is.
 */
async function ensureReusableClusterVersion(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string,
  status: string | undefined,
  buildTimeoutMinutes: number
): Promise<void> {
  const normalized = status?.toUpperCase();
  if (normalized === 'FAILED') {
    throw new Error(
      `Application version ${versionLabel} already exists but its image build FAILED, so it cannot be deployed, ` +
      'and a new version cannot be created under an existing label. Use a new version-label (or delete the existing version) and retry.'
    );
  }
  if (normalized && normalized !== 'PROCESSED' && normalized !== 'UNPROCESSED') {
    core.info(`Version ${versionLabel} already exists and its image build is still ${status}; waiting for it to finish`);
    await waitForImageBuild(clients, applicationName, versionLabel, buildTimeoutMinutes);
  }
}

/**
 * Confirm a Beanstalk Cluster application version actually carries an image before deploying it,
 * and log the image URI (digest-pinned for built images). Throws with `reason` otherwise, so the
 * user gets a clear failure instead of UpdateEnvironment rejecting the version and the label being
 * consumed by an undeployable version.
 */
async function assertVersionHasImage(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string,
  maxRetries: number,
  retryDelay: number,
  reason: string
): Promise<void> {
  const imageUri = await getApplicationVersionImageUri(clients, applicationName, versionLabel, maxRetries, retryDelay);
  if (!imageUri) {
    throw new Error(
      `Application version ${versionLabel} has no container image. ${reason} ` +
      'A label cannot be recreated, so use a new version-label (or delete this version) and retry.'
    );
  }
  core.info(`   Image: ${imageUri}`);
}

if (require.main === module) {
  void run();
}
