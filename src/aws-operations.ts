import * as core from '@actions/core';
import {
  CreateApplicationVersionCommand,
  UpdateEnvironmentCommand,
  CreateEnvironmentCommand,
  DescribeEnvironmentsCommand,
  DescribeApplicationVersionsCommand,
} from '@aws-sdk/client-elastic-beanstalk';
import { PutObjectCommand, HeadBucketCommand, CreateBucketCommand, GetBucketAclCommand } from '@aws-sdk/client-s3';
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
 * Validate that option-settings contains required IAM roles when creating an environment.
 * Note: JSON format validation is already done in validations.ts
 */
export function validateOptionSettingsForCreate(optionSettingsJson: string | undefined): void {
  if (!optionSettingsJson) {
    throw new Error('option-settings is required when creating a new environment. Must include IamInstanceProfile and ServiceRole.');
  }

  // JSON parsing already validated in validations.ts
  const parsedSettings = JSON.parse(optionSettingsJson);

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
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  retryDelay: number,
  operationName: string
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        core.warning(`❌ ${operationName} failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}s...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    }
  }

  const errorMessage = `${operationName} failed after ${maxRetries} attempts: ${lastError?.message}`;
  core.error(errorMessage);
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
    const command = new DescribeApplicationVersionsCommand({
      ApplicationName: applicationName,
      VersionLabels: [versionLabel],
    });

    const response = await clients.getElasticBeanstalkClient().send(command);
    return (response.ApplicationVersions?.length ?? 0) > 0;
  } catch (error) {
    core.debug(`Error checking application version ${versionLabel} existence: ${error}`);
    return false;
  }
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
): Promise<{ exists: boolean; status?: string; health?: string }> {
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
      core.info(`Environment ${environmentName} found - Status: ${status}, Health: ${health}`);

      const exists = status !== 'Terminated';
      return { exists, status, health };
    }

    core.info(`No environments found with name ${environmentName}`);
    return { exists: false };
  } catch (error) {
    core.warning(`Error checking environment ${environmentName}: ${error}`);
    return { exists: false };
  }
}

/**
 * Verify S3 bucket ownership and write permissions
 */
export async function verifyBucketOwnership(
  clients: AWSClients,
  bucket: string,
  accountId: string
): Promise<void> {
  const command = new GetBucketAclCommand({
    Bucket: bucket,
    ExpectedBucketOwner: accountId,
  });

  const response = await clients.getS3Client().send(command);

  // Verify the owner has write permissions
  const ownerGrants = response.Grants?.filter(grant => 
    grant.Grantee?.ID === response.Owner?.ID
  );

  const hasWritePermission = ownerGrants?.some(grant => 
    grant.Permission === 'WRITE' || grant.Permission === 'FULL_CONTROL'
  );

  if (!hasWritePermission) {
    throw new Error('Bucket owner does not have write permissions');
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
  const bucket = customBucketName || `${applicationName}-${accountId}`;
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
    await verifyBucketOwnership(clients, bucket, accountId);
  }

  core.info(`☁️  Uploading deployment package to S3`);
  core.info(`   File size: ${fileSizeMB} MB`);

  await retryWithBackoff(
    async () => {
      const fileContent = fs.readFileSync(packagePath);
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
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
 * Create S3 bucket exists if not exists
 */
export async function createS3Bucket(
  clients: AWSClients,
  region: string,
  bucket: string,
  accountId: string,
  maxRetries: number,
  retryDelay: number
): Promise<void> {
  let bucketExists = false;
  
  try {
    core.info('🪣 Checking if S3 bucket exists');
    await clients.getS3Client().send(new HeadBucketCommand({ Bucket: bucket }));
    core.info('✅ S3 bucket exists');
    bucketExists = true;
  } catch (_error) {
    core.info('🪣 S3 bucket does not exist, Creating S3 bucket');

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
  
  // Verify ownership after bucket exists (either found or created)
  await verifyBucketOwnership(clients, bucket, accountId);
}

/**
 * Create an application version
 */
export async function createApplicationVersion(
  clients: AWSClients,
  applicationName: string,
  versionLabel: string,
  s3Bucket: string,
  s3Key: string,
  maxRetries: number,
  retryDelay: number,
  autoCreateApplication: boolean
): Promise<void> {
  core.info(`📝 Creating application version: ${versionLabel}`);

  await retryWithBackoff(
    async () => {
      const command = new CreateApplicationVersionCommand({
        ApplicationName: applicationName,
        VersionLabel: versionLabel,
        SourceBundle: {
          S3Bucket: s3Bucket,
          S3Key: s3Key,
        },
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

  let parsedOptionSettings: Array<{
    Namespace?: string;
    OptionName?: string;
    Value?: string;
  }> | undefined = undefined;
  if (optionSettings) {
    try {
      const customSettings = parseJsonInput(optionSettings, 'option-settings');
      if (Array.isArray(customSettings)) {
        parsedOptionSettings = customSettings;
      }
    } catch (error) {
      throw new Error(`Failed to parse option-settings: ${(error as Error).message}`);
    }
  }

  await retryWithBackoff(
    async () => {
      const commandParams: any = {
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
 * Create a new environment
 */
export async function createEnvironment(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  versionLabel: string,
  optionSettingsJson: string,
  solutionStackName: string | undefined,
  platformArn: string | undefined,
  maxRetries: number,
  retryDelay: number
): Promise<void> {
  core.info(`🆕 Creating new environment: ${environmentName}`);

  const optionSettings = parseJsonInput(optionSettingsJson, 'option-settings');

  await retryWithBackoff(
    async () => {
      const commandParams: any = {
        ApplicationName: applicationName,
        EnvironmentName: environmentName,
        VersionLabel: versionLabel,
        CNAMEPrefix: environmentName,
        OptionSettings: optionSettings,
      };

      // Only set one of SolutionStackName or PlatformArn
      if (solutionStackName) {
        commandParams.SolutionStackName = solutionStackName;
      } else if (platformArn) {
        commandParams.PlatformArn = platformArn;
      }

      const command = new CreateEnvironmentCommand(commandParams);

      await clients.getElasticBeanstalkClient().send(command);
    },
    maxRetries,
    retryDelay,
    'Create environment'
  );

  core.info(`✅ Environment creation initiated for ${environmentName}`);
}

/**
 * Verify IAM roles exist
/**
 * Get environment information
 */
export async function getEnvironmentInfo(
  clients: AWSClients,
  applicationName: string,
  environmentName: string
): Promise<{ url: string; id: string; status: string; health: string }> {
  const command = new DescribeEnvironmentsCommand({
    ApplicationName: applicationName,
    EnvironmentNames: [environmentName],
  });

  const response = await clients.getElasticBeanstalkClient().send(command);

  if (!response.Environments || response.Environments.length === 0) {
    throw new Error(`Environment ${environmentName} not found after deployment`);
  }

  const env = response.Environments[0];

  return {
    url: env.CNAME || '',
    id: env.EnvironmentId || '',
    status: env.Status || '',
    health: env.Health || '',
  };
}
