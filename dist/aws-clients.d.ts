import { ElasticBeanstalkClient } from '@aws-sdk/client-elastic-beanstalk';
import { S3Client } from '@aws-sdk/client-s3';
import { STSClient } from '@aws-sdk/client-sts';
/**
 * Manages AWS SDK clients as singletons to avoid recreating instances
 * for every operation.
 */
export declare class AWSClients {
    private static instances;
    private readonly ebClient;
    private readonly s3Client;
    private readonly stsClient;
    private constructor();
    /**
     * Get or create AWSClients instance for a specific region
     */
    static getInstance(region: string): AWSClients;
    /**
     * Clear all cached client instances
     */
    static clearInstances(): void;
    getElasticBeanstalkClient(): ElasticBeanstalkClient;
    getS3Client(): S3Client;
    getSTSClient(): STSClient;
}
