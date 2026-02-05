import { AWSClients } from './aws-clients';
/**
 * Maximum deployment package size in bytes (500 MB)
 * AWS Elastic Beanstalk limit: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/applications-sourcebundle.html
 */
export declare const MAX_DEPLOYMENT_PACKAGE_SIZE_BYTES: number;
/**
 * Validate that option-settings contains required IAM roles when creating an environment.
 * Note: JSON format validation is already done in validations.ts
 */
export declare function validateOptionSettingsForCreate(optionSettingsJson: string | undefined): void;
/**
 * AWS S3 LocationConstraint regions
 * Used for S3 bucket creation outside of us-east-1
 */
export declare const AWS_S3_REGIONS: readonly ["af-south-1", "ap-east-1", "ap-northeast-1", "ap-northeast-2", "ap-northeast-3", "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ca-central-1", "cn-north-1", "cn-northwest-1", "eu-central-1", "eu-north-1", "eu-south-1", "eu-west-1", "eu-west-2", "eu-west-3", "me-south-1", "sa-east-1", "us-east-2", "us-gov-east-1", "us-gov-west-1", "us-west-1", "us-west-2"];
export type AWSS3Region = typeof AWS_S3_REGIONS[number];
/**
 * Retry a function with exponential backoff
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number, retryDelay: number, operationName: string): Promise<T>;
/**
 * Get AWS account ID
 */
export declare function getAwsAccountId(clients: AWSClients, maxRetries: number, retryDelay: number): Promise<string>;
/**
 * Check if an application version exists
 */
export declare function applicationVersionExists(clients: AWSClients, applicationName: string, versionLabel: string): Promise<boolean>;
/**
 * Get S3 location for an existing version
 */
export declare function getVersionS3Location(clients: AWSClients, applicationName: string, versionLabel: string): Promise<{
    bucket: string;
    key: string;
}>;
/**
 * Check if an environment exists
 */
export declare function environmentExists(clients: AWSClients, applicationName: string, environmentName: string): Promise<{
    exists: boolean;
    status?: string;
    health?: string;
}>;
/**
 * Verify S3 bucket ownership and write permissions
 */
export declare function verifyBucketOwnership(clients: AWSClients, bucket: string, accountId: string): Promise<void>;
/**
 * Upload deployment package to S3
 */
export declare function uploadToS3(clients: AWSClients, region: string, accountId: string, applicationName: string, versionLabel: string, packagePath: string, maxRetries: number, retryDelay: number, createBucketIfNotExists: boolean, customBucketName?: string): Promise<{
    bucket: string;
    key: string;
}>;
/**
 * Create S3 bucket exists if not exists
 */
export declare function createS3Bucket(clients: AWSClients, region: string, bucket: string, accountId: string, maxRetries: number, retryDelay: number): Promise<void>;
/**
 * Create an application version
 */
export declare function createApplicationVersion(clients: AWSClients, applicationName: string, versionLabel: string, s3Bucket: string, s3Key: string, maxRetries: number, retryDelay: number, autoCreateApplication: boolean): Promise<void>;
/**
 * Update an existing environment
 */
export declare function updateEnvironment(clients: AWSClients, applicationName: string, environmentName: string, versionLabel: string, optionSettings: string | undefined, solutionStackName: string | undefined, platformArn: string | undefined, maxRetries: number, retryDelay: number): Promise<void>;
/**
 * Create a new environment
 */
export declare function createEnvironment(clients: AWSClients, applicationName: string, environmentName: string, versionLabel: string, optionSettingsJson: string, solutionStackName: string | undefined, platformArn: string | undefined, maxRetries: number, retryDelay: number): Promise<void>;
/**
 * Verify IAM roles exist
/**
 * Get environment information
 */
export declare function getEnvironmentInfo(clients: AWSClients, applicationName: string, environmentName: string): Promise<{
    url: string;
    id: string;
    status: string;
    health: string;
}>;
