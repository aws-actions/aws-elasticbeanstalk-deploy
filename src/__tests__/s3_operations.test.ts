// Mock all external dependencies
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
}));

jest.mock('@actions/exec', () => ({
  exec: jest.fn(),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn(() => 'mock-stream'),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

jest.mock('path', () => ({
  basename: jest.fn((p) => p.split('/').pop()),
  extname: jest.fn((p) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }),
}));

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn(),
  HeadBucketCommand: jest.fn(),
  CreateBucketCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-elastic-beanstalk', () => ({
  ElasticBeanstalkClient: jest.fn(() => ({ send: mockSend })),
  CreateApplicationVersionCommand: jest.fn(),
  UpdateEnvironmentCommand: jest.fn(),
  CreateEnvironmentCommand: jest.fn(),
  DescribeEnvironmentsCommand: jest.fn(),
  DescribeApplicationVersionsCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-sts', () => ({
  STSClient: jest.fn(() => ({ send: mockSend })),
  GetCallerIdentityCommand: jest.fn(),
}));

import * as fs from 'fs';
import { uploadToS3, createS3Bucket } from '../aws-operations';
import { AWSClients } from '../aws-clients';

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('S3 Operations', () => {
  let mockClients: AWSClients;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClients = AWSClients.getInstance('us-east-1');
  });

  describe('uploadToS3', () => {
    it('should upload file to S3 with version label in key', async () => {
      mockedFs.statSync.mockReturnValue({ size: 1024 } as any);
      mockSend
        .mockResolvedValueOnce({}) // HeadBucket (ownership check)
        .mockResolvedValueOnce({}); // PutObject

      const result = await uploadToS3(mockClients, 'us-east-1', '123456789012', 'my-app', 'v1.0.0', 'app.zip', 3, 1, false);

      expect(result).toEqual({
        bucket: 'elasticbeanstalk-us-east-1-123456789012',
        key: 'my-app/v1.0.0.zip',
      });
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle different file extensions', async () => {
      mockedFs.statSync.mockReturnValue({ size: 2048 } as any);
      mockSend
        .mockResolvedValueOnce({}) // HeadBucket (ownership check)
        .mockResolvedValueOnce({}); // PutObject

      const result = await uploadToS3(mockClients, 'us-west-2', '987654321098', 'app', 'abc123', 'deploy.jar', 3, 1, false);

      expect(result).toEqual({
        bucket: 'elasticbeanstalk-us-west-2-987654321098',
        key: 'app/abc123.jar',
      });
    });

    it('should use correct bucket naming format', async () => {
      mockedFs.statSync.mockReturnValue({ size: 512 } as any);
      mockSend
        .mockResolvedValueOnce({}) // HeadBucket (ownership check)
        .mockResolvedValueOnce({}); // PutObject

      const result = await uploadToS3(mockClients, 'eu-west-1', '111222333444', 'test-app', 'v2.0.0', 'package.zip', 3, 1, false);

      expect(result.bucket).toBe('elasticbeanstalk-eu-west-1-111222333444');
    });
  });

  describe('createS3Bucket', () => {
    it('should not create bucket if it already exists', async () => {
      mockSend.mockResolvedValueOnce({}); // HeadBucket with ExpectedBucketOwner succeeds

      await createS3Bucket(mockClients, 'us-east-1', 'existing-bucket', '123456789012', 3, 1);

      expect(mockSend).toHaveBeenCalledTimes(1); // HeadBucket only (ownership verified via ExpectedBucketOwner)
    });

    it('should create bucket if it does not exist', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucket throws (bucket doesn't exist)
        .mockResolvedValueOnce({}); // CreateBucket succeeds

      await createS3Bucket(mockClients, 'us-east-1', 'new-bucket', '123456789012', 3, 1);

      expect(mockSend).toHaveBeenCalledTimes(2); // HeadBucket + CreateBucket
    });

    it('should create bucket with location constraint for non-us-east-1 regions', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucket throws (bucket doesn't exist)
        .mockResolvedValueOnce({}); // CreateBucket with LocationConstraint succeeds

      await createS3Bucket(mockClients, 'eu-central-1', 'euro-bucket', '123456789012', 3, 1);

      expect(mockSend).toHaveBeenCalledTimes(2); // HeadBucket + CreateBucket
    });

    it('should handle retry logic on failure', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucket throws (bucket doesn't exist)
        .mockRejectedValueOnce(new Error('NetworkError')) // CreateBucket attempt 1 fails
        .mockResolvedValueOnce({}); // CreateBucket attempt 2 succeeds

      await createS3Bucket(mockClients, 'us-west-2', 'retry-bucket', '123456789012', 3, 1);

      expect(mockSend).toHaveBeenCalledTimes(3); // HeadBucket + 2 CreateBucket attempts
    });

    it('should throw a clear error when bucket is owned by a different account', async () => {
      const forbiddenError = new Error('Forbidden');
      (forbiddenError as any).$metadata = { httpStatusCode: 403 };

      mockSend.mockRejectedValueOnce(forbiddenError); // HeadBucket returns 403

      await expect(createS3Bucket(mockClients, 'us-east-1', 'someone-elses-bucket', '123456789012', 3, 1))
        .rejects.toThrow("S3 bucket 'someone-elses-bucket' exists but is not owned by this AWS account");

      expect(mockSend).toHaveBeenCalledTimes(1); // HeadBucket only, no create attempt
    });

    it('should bubble up AccessDenied permissions error without retrying', async () => {
      const accessDeniedError = new Error('Access Denied');
      accessDeniedError.name = 'AccessDenied';
      
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand throws error (bucket doesn't exist)
        .mockRejectedValueOnce(accessDeniedError); // First CreateBucketCommand fails with AccessDenied

      await expect(createS3Bucket(mockClients, 'us-east-1', 'permission-denied-bucket', '123456789012', 3, 1))
        .rejects.toThrow('Access Denied');

      expect(mockSend).toHaveBeenCalledTimes(2); // 1 HeadBucket + 1 CreateBucket (no retries on AccessDenied)
    });

    it('should bubble up BucketAlreadyExists error', async () => {
      const bucketExistsError = new Error('The requested bucket name is not available');
      bucketExistsError.name = 'BucketAlreadyExists';

      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand throws error (bucket doesn't exist)
        .mockRejectedValueOnce(bucketExistsError) // CreateBucketCommand attempt 1 fails
        .mockRejectedValueOnce(bucketExistsError) // CreateBucketCommand attempt 2 fails (retry 1)
        .mockRejectedValueOnce(bucketExistsError); // CreateBucketCommand attempt 3 fails (retry 2)

      await expect(createS3Bucket(mockClients, 'eu-west-1', 'taken-bucket-name', '123456789012', 2, 1))
        .rejects.toThrow('Create S3 bucket failed after 3 attempts (2 retries): The requested bucket name is not available');

      expect(mockSend).toHaveBeenCalledTimes(4); // 1 HeadBucket + 3 CreateBucket attempts
    });

    it('should bubble up InvalidBucketName error', async () => {
      const invalidNameError = new Error('The specified bucket is not valid');
      invalidNameError.name = 'InvalidBucketName';

      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand throws error (bucket doesn't exist)
        .mockRejectedValueOnce(invalidNameError) // CreateBucketCommand attempt 1 fails
        .mockRejectedValueOnce(invalidNameError); // CreateBucketCommand attempt 2 fails (retry 1)

      await expect(createS3Bucket(mockClients, 'us-west-2', 'Invalid_Bucket_Name', '123456789012', 1, 1))
        .rejects.toThrow('Create S3 bucket failed after 2 attempts (1 retry): The specified bucket is not valid');

      expect(mockSend).toHaveBeenCalledTimes(3); // 1 HeadBucket + 2 CreateBucket attempts
    });
  });

  describe('uploadToS3 permissions errors', () => {
    it('should bubble up S3 upload permissions error without retrying', async () => {
      const uploadError = new Error('Access Denied');
      uploadError.name = 'AccessDenied';

      mockedFs.statSync.mockReturnValue({ size: 1024 } as any);
      mockSend
        .mockResolvedValueOnce({}) // HeadBucket (ownership check)
        .mockRejectedValueOnce(uploadError); // PutObject fails with non-retryable AccessDenied

      await expect(uploadToS3(mockClients, 'us-east-1', '123456789012', 'my-app', 'v1.0.0', 'app.zip', 2, 1, false))
        .rejects.toThrow('Access Denied');

      expect(mockSend).toHaveBeenCalledTimes(2); // 1 HeadBucket + 1 PutObject
    });

    it('should bubble up S3 NoSuchBucket error during upload', async () => {
      const noSuchBucketError = new Error('The specified bucket does not exist');
      noSuchBucketError.name = 'NoSuchBucket';

      mockedFs.statSync.mockReturnValue({ size: 2048 } as any);
      mockSend
        .mockResolvedValueOnce({}) // HeadBucket (ownership check)
        .mockRejectedValueOnce(noSuchBucketError) // PutObject attempt 1 fails
        .mockRejectedValueOnce(noSuchBucketError) // PutObject attempt 2 fails (retry 1)
        .mockRejectedValueOnce(noSuchBucketError) // PutObject attempt 3 fails (retry 2)
        .mockRejectedValueOnce(noSuchBucketError); // PutObject attempt 4 fails (retry 3)

      await expect(uploadToS3(mockClients, 'eu-central-1', '987654321098', 'test-app', 'v2.0.0', 'deploy.jar', 3, 1, false))
        .rejects.toThrow('Upload to S3 failed after 4 attempts (3 retries): The specified bucket does not exist');

      expect(mockSend).toHaveBeenCalledTimes(5); // 1 HeadBucket + 4 PutObject attempts
    });
  });

  describe('uploadToS3 size limit validation', () => {
    it('should reject deployment package exceeding 500MB limit', async () => {
      const oversizedPackage = 600 * 1024 * 1024; // 600 MB
      mockedFs.statSync.mockReturnValue({ size: oversizedPackage } as any);

      await expect(uploadToS3(mockClients, 'us-east-1', '123456789012', 'my-app', 'v1.0.0', 'large-app.zip', 3, 1, false))
        .rejects.toThrow('exceeds the maximum allowed size of 500 MB');

      // Should fail before any AWS API calls
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should accept deployment package under 500MB limit', async () => {
      const validPackageSize = 450 * 1024 * 1024; // 450 MB
      mockedFs.statSync.mockReturnValue({ size: validPackageSize } as any);
      mockSend
        .mockResolvedValueOnce({}) // HeadBucket (ownership check)
        .mockResolvedValueOnce({}); // PutObject

      const result = await uploadToS3(mockClients, 'us-west-2', '123456789012', 'my-app', 'v2.0.0', 'valid-app.zip', 3, 1, false);

      expect(result).toEqual({
        bucket: 'elasticbeanstalk-us-west-2-123456789012',
        key: 'my-app/v2.0.0.zip',
      });
      expect(mockSend).toHaveBeenCalledTimes(2); // HeadBucket + PutObject
    });

    it('should accept deployment package exactly at 500MB limit', async () => {
      const exactLimitSize = 500 * 1024 * 1024; // Exactly 500 MB
      mockedFs.statSync.mockReturnValue({ size: exactLimitSize } as any);
      mockSend
        .mockResolvedValueOnce({}) // HeadBucket (ownership check)
        .mockResolvedValueOnce({}); // PutObject

      const result = await uploadToS3(mockClients, 'eu-west-1', '987654321098', 'test-app', 'v1.0.0', 'exact-app.zip', 3, 1, false);

      expect(result).toEqual({
        bucket: 'elasticbeanstalk-eu-west-1-987654321098',
        key: 'test-app/v1.0.0.zip',
      });
      expect(mockSend).toHaveBeenCalledTimes(2); // HeadBucket + PutObject
    });

    it('should reject deployment package just over 500MB limit', async () => {
      const justOverLimit = (500 * 1024 * 1024) + 1; // 500 MB + 1 byte
      mockedFs.statSync.mockReturnValue({ size: justOverLimit } as any);

      await expect(uploadToS3(mockClients, 'ap-southeast-1', '111222333444', 'app', 'v3.0.0', 'over-limit.zip', 3, 1, false))
        .rejects.toThrow('exceeds the maximum allowed size of 500 MB');

      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
