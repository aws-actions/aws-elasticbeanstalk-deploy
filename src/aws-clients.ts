import { ElasticBeanstalkClient } from '@aws-sdk/client-elastic-beanstalk';
import { S3Client } from '@aws-sdk/client-s3';
import { STSClient } from '@aws-sdk/client-sts';
import { IAMClient } from '@aws-sdk/client-iam';

/**
 * Manages AWS SDK clients as singletons to avoid recreating instances
 * for every operation.
 */
export class AWSClients {
  private static instances: Map<string, AWSClients> = new Map();

  private readonly ebClient: ElasticBeanstalkClient;
  private readonly s3Client: S3Client;
  private readonly stsClient: STSClient;
  private readonly iamClient: IAMClient;

  private constructor(region: string) {
    this.ebClient = new ElasticBeanstalkClient({ region });
    this.s3Client = new S3Client({ region });
    this.stsClient = new STSClient({ region });
    this.iamClient = new IAMClient({ region });
  }

  /**
   * Get or create AWSClients instance for a specific region
   */
  public static getInstance(region: string): AWSClients {
    if (!AWSClients.instances.has(region)) {
      AWSClients.instances.set(region, new AWSClients(region));
    }
    return AWSClients.instances.get(region)!;
  }

  /**
   * Clear all cached client instances
   */
  public static clearInstances(): void {
    AWSClients.instances.clear();
  }

  public getElasticBeanstalkClient(): ElasticBeanstalkClient {
    return this.ebClient;
  }

  public getS3Client(): S3Client {
    return this.s3Client;
  }

  public getSTSClient(): STSClient {
    return this.stsClient;
  }

  public getIAMClient(): IAMClient {
    return this.iamClient;
  }
}
