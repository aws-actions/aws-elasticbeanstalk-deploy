import * as core from '@actions/core';
import {
  CreateApplicationVersionCommand,
  UpdateEnvironmentCommand,
  UpdateEnvironmentCommandInput,
  CreateEnvironmentCommand,
  CreateEnvironmentCommandInput,
  DescribeEnvironmentsCommand,
  DescribeEventsCommand,
  DescribeApplicationVersionsCommand,
  ImageBuildConfiguration,
} from '@aws-sdk/client-elastic-beanstalk';
import { PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import * as fs from 'fs';
import * as path from 'path';
import { AWSClients } from './aws-clients';
import { parseJsonInput } from './validations';

/**
 * Maximum deployment package size in bytes (500 MB)
 * AWS Elastic Beanstalk limit: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/applications-sourcebundle.html
 */
export const MAX_DEPLOYMENT_PACKAGE_SIZE_BYTES = 500 * 1024 * 1024;

/**
 * Every field of the SDK's ImageConfiguration.Build model. Typed as a complete Record so that a
 * future SDK bump that adds a field fails to compile until it is listed here, keeping the
 * unknown-field warning in sync with what the SDK serializer actually sends.
 */
const IMAGE_BUILD_CONFIGURATION_FIELDS: Record<keyof ImageBuildConfiguration, true> = {
  Type: true,
  DockerfileLocation: true,
  Buildpack: true,
  Architecture: true,
  CodeBuildServiceRole: true,
  ComputeType: true,
  TimeoutInMinutes: true,
};

/**
 * Keys of a user-supplied build-configuration object that the SDK does not model and therefore
 * silently drops from the CreateApplicationVersion request.
 */
export function unknownImageBuildConfigurationFields(config: object): string[] {
  return Object.keys(config).filter((key) => !Object.prototype.hasOwnProperty.call(IMAGE_BUILD_CONFIGURATION_FIELDS, key));
}

/** Service default for ImageConfiguration.Build.TimeoutInMinutes when the caller doesn't set one. */
export const DEFAULT_IMAGE_BUILD_TIMEOUT_MINUTES = 60;

/** IAM role ARN in any partition (aws, aws-cn, aws-us-gov, ...), with an optional path. */
export const IAM_ROLE_ARN_PATTERN = /^arn:aws[a-z-]*:iam::\d{12}:role\/[\w+=,.@/-]+$/;

export interface OptionSettingInput {
  Namespace?: string;
  OptionName?: string;
  Value?: string;
}

/**
 * Parse the option-settings input, requiring a JSON array. Shared by both create-time validators
 * so malformed input gets the same "Invalid JSON in option-settings input" wording as the rest of
 * the action, and a JSON object fails with a clear message instead of a bare TypeError.
 */
function parseOptionSettingsArray(optionSettingsJson: string): OptionSettingInput[] {
  const parsed = parseJsonInput<unknown>(optionSettingsJson, 'option-settings');
  if (!Array.isArray(parsed)) {
    throw new Error('option-settings must be a JSON array of {"Namespace", "OptionName", "Value"} objects');
  }
  return parsed as OptionSettingInput[];
}

/**
 * Validate that option-settings contains required IAM roles when creating an environment
 */
export function validateOptionSettingsForCreate(optionSettingsJson: string | undefined): void {
  if (!optionSettingsJson) {
    throw new Error('option-settings is required when creating a new environment. Must include IamInstanceProfile and ServiceRole.');
  }

  const parsedSettings = parseOptionSettingsArray(optionSettingsJson);

  let hasIamInstanceProfile = false;
  let hasServiceRole = false;

  for (const setting of parsedSettings) {
    if (setting.Namespace === 'aws:autoscaling:launchconfiguration' && 
        setting.OptionName === 'IamInstanceProfile') {
      hasIamInstanceProfile = true;
    }

    if (setting.Namespace === 'aws:elasticbeanstalk:environment' && 
        setting.OptionName === 'ServiceRole') {
      hasServiceRole = true;
    }
  }

  if (!hasIamInstanceProfile) {
    throw new Error('option-settings must include IamInstanceProfile setting with Namespace "aws:autoscaling:launchconfiguration" and OptionName "IamInstanceProfile"');
  }

  if (!hasServiceRole) {
    throw new Error('option-settings must include ServiceRole setting with Namespace "aws:elasticbeanstalk:environment" and OptionName "ServiceRole"');
  }
}

/**
 * Validate that option-settings contains the settings the Beanstalk Cluster service itself requires
 * the customer to provide on CreateEnvironment (required=true with no default and no
 * server-side override in the service's option definitions): cluster-role, node-role, and
 * observability-role. Other required-flagged settings are satisfied without customer input
 * (operation-role is overridden server-side; service-port has a default), and
 * application-role is optional - so none of those are validated here.
 */
export function validateOptionSettingsForCreateClusterMode(optionSettingsJson: string | undefined): void {
  if (!optionSettingsJson) {
    throw new Error(
      'option-settings is required when creating a new Beanstalk Cluster environment. ' +
      'Must include cluster-role, node-role (Namespace "aws:elasticbeanstalk:eks") and ' +
      'observability-role (Namespace "aws:elasticbeanstalk:eks:environment").'
    );
  }

  const parsedSettings = parseOptionSettingsArray(optionSettingsJson);

  const requiredSettings: Array<{ namespace: string; optionName: string }> = [
    { namespace: 'aws:elasticbeanstalk:eks', optionName: 'cluster-role' },
    { namespace: 'aws:elasticbeanstalk:eks', optionName: 'node-role' },
    { namespace: 'aws:elasticbeanstalk:eks:environment', optionName: 'observability-role' },
  ];

  for (const required of requiredSettings) {
    const found = parsedSettings.find(
      (setting: OptionSettingInput) => setting.Namespace === required.namespace && setting.OptionName === required.optionName
    );
    if (!found) {
      throw new Error(
        `option-settings must include ${required.optionName} setting with Namespace "${required.namespace}" and OptionName "${required.optionName}"`
      );
    }
    // These settings take IAM role ARNs. A missing or malformed value passes CreateEnvironment
    // input validation but fails later during provisioning — catch it here where the message can
    // name the setting.
    if (!IAM_ROLE_ARN_PATTERN.test(found.Value?.trim() ?? '')) {
      throw new Error(
        `option-settings entry ${required.optionName} (Namespace "${required.namespace}") must be an IAM role ARN ` +
        `(arn:aws:iam::123456789012:role/...), got: ${JSON.stringify(found.Value ?? '')}`
      );
    }
  }
}

/**
 * AWS S3 LocationConstraint regions
 * Used for S3 bucket creation outside of us-east-1
 */
export const AWS_S3_REGIONS = [
  'af-south-1',
  'ap-east-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ca-central-1',
  'cn-north-1',
  'cn-northwest-1',
  'eu-central-1',
  'eu-north-1',
  'eu-south-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'me-south-1',
  'sa-east-1',
  'us-east-2',
  'us-gov-east-1',
  'us-gov-west-1',
  'us-west-1',
  'us-west-2',
] as const;

export type AWSS3Region = typeof AWS_S3_REGIONS[number];

/**
 * Errors that retrying cannot fix: authorization/permission failures, expired or invalid
 * credentials, and deterministic Elastic Beanstalk rejections. Shared by retryWithBackoff and the
 * long-running pollers, which otherwise would keep retrying a permanent failure until their deadline.
 */
export function isNonRetryableError(error: unknown): boolean {
  const err = error as Error & { name?: string };
  const message = err?.message || '';

  const isAuthError =
    /accessdenied|access denied|not authorized|unauthorizedoperation|you do not have permission/i.test(message) ||
    err?.name === 'AccessDeniedException' ||
    err?.name === 'UnauthorizedOperation';

  // Expired/invalid credentials (e.g. an OIDC session that ended during a long image build).
  const isCredentialError =
    err?.name === 'ExpiredToken' ||
    err?.name === 'ExpiredTokenException' ||
    err?.name === 'InvalidClientTokenId' ||
    err?.name === 'UnrecognizedClientException' ||
    err?.name === 'CredentialsProviderError' ||
    /security token .* (expired|invalid)|expired token|could not load credentials/i.test(message);

  // EB application version already exists under this label.
  const isAppVersionExistsError =
    /application version .* already exists/i.test(message) ||
    (err?.name === 'InvalidParameterValueException' && /already exists/i.test(message));

  // The version under this label can't be deployed to the target environment (e.g. a source
  // bundle or a FAILED build reused on a Beanstalk Cluster environment). The service message is
  // "Application version 'X' does not exist or is not compatible with Kubernetes-based environments ...".
  const isIncompatibleVersionError =
    err?.name === 'InvalidParameterValueException' &&
    /does not exist or is not compatible with .* environments/i.test(message);

  return err?.name === 'BucketCheckResult' || isAuthError || isCredentialError || isAppVersionExistsError || isIncompatibleVersionError;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  retryDelay: number,
  operationName: string
): Promise<T> {
  let lastError: Error | undefined;

  const totalAttempts = maxRetries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const err = error as Error;

      if (isNonRetryableError(err)) {
        throw err;
      }

      lastError = err;

      if (attempt < totalAttempts) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        core.warning(`❌ ${operationName} failed (attempt ${attempt}/${totalAttempts}). Retrying in ${delay}s...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    }
  }

  const retryWord = maxRetries === 1 ? 'retry' : 'retries';
  const errorMessage = `${operationName} failed after ${totalAttempts} attempts (${maxRetries} ${retryWord}): ${lastError?.message}`;
  // Not logged here: main() logs the final error (sanitized when mask-resource-identifiers is on).
  throw new Error(errorMessage);
}

/**
 * Get AWS account ID
 */
export async function getAwsAccountId(
  clients: AWSClients,
  maxRetries: number,
  retryDelay: number
): Promise<string> {
  return retryWithBackoff(
    async () => {
      const command = new GetCallerIdentityCommand({});
      const response = await clients.getSTSClient().send(command);
      return response.Account!;
    },
    maxRetries,
    retryDelay,
    'Get AWS Account ID'
  );
}

/**
 * Check if an application version exists
 */
export async function applicationVersionExists(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string
): Promise<boolean> {
  try {
    return (await getApplicationVersionInfo(clients, applicationName, versionLabel)).exists;
  } catch (error) {
    core.debug(`Error checking application version ${versionLabel} existence: ${error}`);
    return false;
  }
}

/**
 * Get the processing status of an application version (UNPROCESSED, BUILDING while an image builds, PROCESSED, FAILED).
 * Used to poll a Beanstalk Cluster image build to completion.
 */
export async function getApplicationVersionStatus(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string,
  maxRetries = 0,
  retryDelay = 1
): Promise<string | undefined> {
  return (await getApplicationVersionInfo(clients, applicationName, versionLabel, maxRetries, retryDelay)).status;
}

/**
 * Describe an application version: the single DescribeApplicationVersions call behind
 * applicationVersionExists and getApplicationVersionStatus.
 */
export async function getApplicationVersionInfo(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string,
  maxRetries = 0,
  retryDelay = 1
): Promise<{ exists: boolean; status?: string; buildTimeoutMinutes?: number }> {
  const command = new DescribeApplicationVersionsCommand({
    ApplicationName: applicationName,
    VersionLabels: [versionLabel],
  });

  const response = await retryWithBackoff(
    () => clients.getElasticBeanstalkClient().send(command),
    maxRetries,
    retryDelay,
    'Describe application version'
  );
  const version = response.ApplicationVersions?.[0];
  return {
    exists: !!version,
    status: version?.Status,
    // Present on versions the service builds from source; lets a reused in-progress build be
    // waited on for its own timeout rather than the current run's build-configuration.
    buildTimeoutMinutes: version?.ImageBuildConfiguration?.TimeoutInMinutes,
  };
}

/**
 * Container image recorded on a Beanstalk Cluster application version (ImageSource.Uri),
 * or undefined when the version has none.
 */
export async function getApplicationVersionImageUri(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string,
  maxRetries: number,
  retryDelay: number
): Promise<string | undefined> {
  const response = await retryWithBackoff(
    () => clients.getElasticBeanstalkClient().send(new DescribeApplicationVersionsCommand({
      ApplicationName: applicationName,
      VersionLabels: [versionLabel],
    })),
    maxRetries,
    retryDelay,
    'Describe application version'
  );
  return response.ApplicationVersions?.[0]?.ImageSource?.Uri || undefined;
}

/**
 * Get S3 location for an existing version
 */
export async function getVersionS3Location(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string
): Promise<{ bucket: string; key: string }> {
  try {
    const command = new DescribeApplicationVersionsCommand({
      ApplicationName: applicationName,
      VersionLabels: [versionLabel],
    });

    const response = await clients.getElasticBeanstalkClient().send(command);

    if (!response.ApplicationVersions || response.ApplicationVersions.length === 0) {
      throw new Error(`Version ${versionLabel} not found`);
    }

    const version = response.ApplicationVersions[0];
    const bucket = version.SourceBundle?.S3Bucket;
    const key = version.SourceBundle?.S3Key;

    if (!bucket || !key) {
      throw new Error(
        `Application Version ${versionLabel} has incomplete S3 source bundle information. ` +
        `Bucket ${bucket ? 'found' : 'missing'}, Key ${key ? 'found' : 'missing'}`
      );
    }

    return { bucket, key };
  } catch (error) {
    throw new Error(`Failed to get S3 location for application version ${versionLabel}: ${error}`);
  }
}

/**
 * Check if an environment exists
 */
export async function environmentExists(
  clients: AWSClients,
  applicationName: string,
  environmentName: string
): Promise<{ exists: boolean; status?: string; health?: string; tierName?: string }> {
  try {
    const command = new DescribeEnvironmentsCommand({
      ApplicationName: applicationName,
      EnvironmentNames: [environmentName],
    });

    const response = await clients.getElasticBeanstalkClient().send(command);

    if (response.Environments && response.Environments.length > 0) {
      const env = response.Environments[0];
      const status = env.Status;
      const health = env.Health;
      const tierName = env.Tier?.Name;
      core.info(`Environment ${environmentName} found - Status: ${status}, Health: ${health}`);

      const exists = status !== 'Terminated';
      return { exists, status, health, tierName };
    }

    core.info(`No environments found with name ${environmentName}`);
    return { exists: false };
  } catch (error) {
    const err = error as Error & { name?: string; $metadata?: { httpStatusCode?: number } };
    const statusCode = err.$metadata?.httpStatusCode;
    // Only treat "not found" responses as non-existent; rethrow real errors
    // so callers receive a clear failure rather than a silent false negative.
    if (statusCode === 404 || err.name === 'NoSuchEntityException') {
      return { exists: false };
    }
    throw error;
  }
}

/**
 * Upload deployment package to S3
 */
export async function uploadToS3(
  clients: AWSClients,
  region: string,
  accountId: string,
  applicationName: string,
  versionLabel: string,
  packagePath: string,
  maxRetries: number,
  retryDelay: number,
  createBucketIfNotExists: boolean,
  customBucketName?: string
): Promise<{ bucket: string; key: string }> {
  const bucket = customBucketName || `elasticbeanstalk-${region}-${accountId}`;
  const packageExtension = path.extname(packagePath);
  const key = `${applicationName}/${versionLabel}${packageExtension}`;

  // Validate deployment package size
  const fileStats = fs.statSync(packagePath);
  const fileSizeBytes = fileStats.size;
  const fileSizeMB = (fileSizeBytes / 1024 / 1024).toFixed(2);

  if (fileSizeBytes > MAX_DEPLOYMENT_PACKAGE_SIZE_BYTES) {
    const maxSizeMB = (MAX_DEPLOYMENT_PACKAGE_SIZE_BYTES / 1024 / 1024).toFixed(0);
    throw new Error(
      `Deployment package size (${fileSizeMB} MB) exceeds the maximum allowed size of ${maxSizeMB} MB. ` +
      `Please reduce the package size and try again.`
    );
  }

  if (createBucketIfNotExists) {
    await createS3Bucket(clients, region, bucket, accountId, maxRetries, retryDelay);
  } else {
    // Verify bucket exists and is owned by this account before uploading.
    // ExpectedBucketOwner causes a 403 if owned by a different account,
    // which is safer than a raw PutObject that might write to the wrong bucket.
    await clients.getS3Client().send(new HeadBucketCommand({
      Bucket: bucket,
      ExpectedBucketOwner: accountId,
    }));
  }

  core.info(`☁️  Uploading deployment package to S3`);
  core.info(`   File size: ${fileSizeMB} MB`);

  await retryWithBackoff(
    async () => {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(packagePath),
        ContentLength: fileSizeBytes,
      });

      await clients.getS3Client().send(command);
    },
    maxRetries,
    retryDelay,
    'Upload to S3'
  );

  core.info('✅ Upload complete');
  return { bucket, key };
}

/**
 * Definitive HeadBucket outcome (403 owned by another account, 404 missing) carried out of
 * retryWithBackoff without being retried.
 */
class BucketCheckResult extends Error {
  constructor(public readonly cause: Error, public readonly statusCode: number) {
    super(cause.message);
    this.name = 'BucketCheckResult';
  }
}

/**
 * Create S3 bucket if it does not exist
 */
export async function createS3Bucket(
  clients: AWSClients,
  region: string,
  bucket: string,
  accountId: string,
  maxRetries: number,
  retryDelay: number
): Promise<void> {
  try {
    core.info('🪣 Checking if S3 bucket exists');
    // ExpectedBucketOwner verifies ownership in the same request:
    // - 200: bucket exists and is owned by this account
    // - 403: bucket exists but is owned by a different account
    // - 404: bucket does not exist
    // 403 and 404 are definitive answers. Everything else (5xx, throttling, network errors and
    // other failures with no HTTP status) is retried, and if it persists it surfaces as the
    // failure it is rather than falling through to CreateBucket on a bucket that may exist.
    await retryWithBackoff(
      async () => {
        try {
          await clients.getS3Client().send(new HeadBucketCommand({
            Bucket: bucket,
            ExpectedBucketOwner: accountId,
          }));
        } catch (error) {
          const statusCode = (error as Error & { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
          if (statusCode === 403 || statusCode === 404) {
            throw new BucketCheckResult(error as Error, statusCode);
          }
          throw error;
        }
      },
      maxRetries,
      retryDelay,
      'Check S3 bucket'
    );
    core.info('✅ S3 bucket exists');
  } catch (error) {
    if (!(error instanceof BucketCheckResult)) {
      throw error;
    }
    const statusCode = error.statusCode;

    if (statusCode === 403) {
      throw new Error(
        `S3 bucket '${bucket}' exists but is not owned by this AWS account (${accountId}). ` +
        'Specify a different bucket name using the s3-bucket-name input.'
      );
    }

    // 404: the bucket does not exist.
    core.info('🪣 S3 bucket does not exist, creating S3 bucket');

    await retryWithBackoff(
      async () => {
        const createParams = region === 'us-east-1'
          ? { Bucket: bucket }
          : {
              Bucket: bucket,
              CreateBucketConfiguration: {
                LocationConstraint: region as AWSS3Region,
              },
            };

        await clients.getS3Client().send(new CreateBucketCommand(createParams));
      },
      maxRetries,
      retryDelay,
      'Create S3 bucket'
    );

    core.info('✅ S3 bucket created');
  }
}

/**
 * Create an application version via the SDK.
 *
 * Beanstalk Standard versions carry a SourceBundle. Beanstalk Cluster versions carry an
 * ImageConfiguration: Source (a prebuilt image) or Build (built from the SourceBundle by the
 * service; Process=true starts the build).
 */
export async function createApplicationVersion(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string,
  s3Bucket: string | undefined,
  s3Key: string | undefined,
  maxRetries: number,
  retryDelay: number,
  autoCreateApplication: boolean,
  imageUri?: string,
  buildConfiguration?: ImageBuildConfiguration
): Promise<void> {
  core.info(`📝 Creating application version: ${versionLabel}`);

  await retryWithBackoff(
    async () => {
      const command = new CreateApplicationVersionCommand({
        ApplicationName: applicationName,
        VersionLabel: versionLabel,
        ...(s3Bucket && s3Key ? { SourceBundle: { S3Bucket: s3Bucket, S3Key: s3Key } } : {}),
        ...(imageUri ? { ImageConfiguration: { Source: { Uri: imageUri } } } : {}),
        ...(buildConfiguration ? { ImageConfiguration: { Build: buildConfiguration }, Process: true } : {}),
        Description: `Deployed from GitHub Actions - ${process.env.GITHUB_SHA || 'manual'}`,
        AutoCreateApplication: autoCreateApplication,
      });

      await clients.getElasticBeanstalkClient().send(command);
    },
    maxRetries,
    retryDelay,
    'Create application version'
  );

  core.info(`✅ Application version ${versionLabel} created`);
}

/**
 * Update an existing environment
 */
export async function updateEnvironment(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  versionLabel: string,
  optionSettings: string | undefined,
  solutionStackName: string | undefined,
  platformArn: string | undefined,
  maxRetries: number,
  retryDelay: number
): Promise<void> {
  core.info(`🔄 Updating environment: ${environmentName}`);

  let parsedOptionSettings: OptionSettingInput[] | undefined = undefined;
  if (optionSettings) {
    try {
      const customSettings = parseJsonInput<OptionSettingInput[]>(optionSettings, 'option-settings');
      if (Array.isArray(customSettings)) {
        parsedOptionSettings = customSettings;
      }
    } catch (error) {
      throw new Error(`Failed to parse option-settings: ${(error as Error).message}`);
    }
  }

  await retryWithBackoff(
    async () => {
      const commandParams: UpdateEnvironmentCommandInput = {
        ApplicationName: applicationName,
        EnvironmentName: environmentName,
        VersionLabel: versionLabel,
        OptionSettings: parsedOptionSettings,
      };

      // Only set one of SolutionStackName or PlatformArn
      if (solutionStackName) {
        commandParams.SolutionStackName = solutionStackName;
      } else if (platformArn) {
        commandParams.PlatformArn = platformArn;
      }

      const command = new UpdateEnvironmentCommand(commandParams);

      await clients.getElasticBeanstalkClient().send(command);
    },
    maxRetries,
    retryDelay,
    'Update environment'
  );

  core.info(`✅ Environment update initiated for ${environmentName}`);
}

/**
 * Create a new environment. In Beanstalk Cluster mode the environment is created with
 * Tier={Name: Cluster, Type: EKS} instead of a solution stack or platform ARN.
 */
export async function createEnvironment(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  versionLabel: string,
  optionSettingsJson: string,
  solutionStackName: string | undefined,
  platformArn: string | undefined,
  cnamePrefix: string | undefined,
  maxRetries: number,
  retryDelay: number,
  isClusterMode = false
): Promise<void> {
  core.info(`🆕 Creating new environment: ${environmentName}`);

  const optionSettings = parseJsonInput<OptionSettingInput[]>(optionSettingsJson, 'option-settings');

  await retryWithBackoff(
    async () => {
      const commandParams: CreateEnvironmentCommandInput = {
        ApplicationName: applicationName,
        EnvironmentName: environmentName,
        VersionLabel: versionLabel,
        OptionSettings: optionSettings,
        ...(cnamePrefix ? { CNAMEPrefix: cnamePrefix } : {}),
        ...(isClusterMode
          ? { Tier: { Name: 'Cluster', Type: 'EKS' } }
          : (solutionStackName
              ? { SolutionStackName: solutionStackName }
              : platformArn
                ? { PlatformArn: platformArn }
                : {})),
      };

      const command = new CreateEnvironmentCommand(commandParams);

      await clients.getElasticBeanstalkClient().send(command);
    },
    maxRetries,
    retryDelay,
    'Create environment'
  );

  core.info(`✅ Environment creation initiated for ${environmentName}`);
}

export interface EnvironmentSnapshot {
  status?: string;
  health?: string;
  cname?: string;
  environmentId?: string;
  versionLabel?: string;
}

export interface EventSnapshot {
  severity?: string;
  message?: string;
  date?: Date;
}

/**
 * Describe an environment's current status/health for polling (used by monitoring.ts for both tiers).
 */
export async function describeEnvironment(
  clients: AWSClients,
  applicationName: string,
  environmentName: string
): Promise<EnvironmentSnapshot | null> {
  const command = new DescribeEnvironmentsCommand({
    ApplicationName: applicationName,
    EnvironmentNames: [environmentName],
  });
  const response = await clients.getElasticBeanstalkClient().send(command);
  const env = response.Environments?.[0];
  return env
    ? { status: env.Status, health: env.Health, cname: env.CNAME, environmentId: env.EnvironmentId, versionLabel: env.VersionLabel }
    : null;
}

/**
 * Describe an environment's recent events for polling (used by monitoring.ts for both tiers).
 */
export async function describeEvents(
  clients: AWSClients,
  applicationName: string,
  environmentName: string
): Promise<EventSnapshot[]> {
  const command = new DescribeEventsCommand({
    ApplicationName: applicationName,
    EnvironmentName: environmentName,
    MaxRecords: 10,
  });
  const response = await clients.getElasticBeanstalkClient().send(command);
  return (response.Events || []).map(e => ({ severity: e.Severity, message: e.Message, date: e.EventDate }));
}
