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
  GetBucketAclCommand: jest.fn(),
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

jest.mock('@aws-sdk/client-iam', () => ({
  IAMClient: jest.fn(() => ({ send: mockSend })),
  GetInstanceProfileCommand: jest.fn(),
  GetRoleCommand: jest.fn(),
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
      mockedFs.readFileSync.mockReturnValue(Buffer.from('content'));
      mockSend
        .mockResolvedValueOnce({ // GetBucketAcl
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'WRITE' }]
        })
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
      mockedFs.readFileSync.mockReturnValue(Buffer.from('content'));
      mockSend
        .mockResolvedValueOnce({ // GetBucketAcl
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'FULL_CONTROL' }]
        })
        .mockResolvedValueOnce({}); // PutObject

      const result = await uploadToS3(mockClients, 'us-west-2', '987654321098', 'app', 'abc123', 'deploy.jar', 3, 1, false);

      expect(result).toEqual({
        bucket: 'elasticbeanstalk-us-west-2-987654321098',
        key: 'app/abc123.jar',
      });
    });

    it('should use correct bucket naming format', async () => {
      mockedFs.statSync.mockReturnValue({ size: 512 } as any);
      mockedFs.readFileSync.mockReturnValue(Buffer.from('test'));
      mockSend
        .mockResolvedValueOnce({ // GetBucketAcl
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'WRITE' }]
        })
        .mockResolvedValueOnce({}); // PutObject

      const result = await uploadToS3(mockClients, 'eu-west-1', '111222333444', 'test-app', 'v2.0.0', 'package.zip', 3, 1, false);

      expect(result.bucket).toBe('elasticbeanstalk-eu-west-1-111222333444');
    });
  });

  describe('createS3Bucket', () => {
    it('should not create bucket if it already exists', async () => {
      mockSend
        .mockResolvedValueOnce({}) // HeadBucketCommand returns success (bucket exists)
        .mockResolvedValueOnce({ // GetBucketAclCommand verifies ownership
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'FULL_CONTROL' }]
        });

      await createS3Bucket(mockClients, 'us-east-1', 'existing-bucket', '123456789012', 3, 1);

      expect(mockSend).toHaveBeenCalledTimes(2); // HeadBucket + GetBucketAcl
    });

    it('should create bucket if it does not exist', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand throws error (bucket doesn't exist)
        .mockResolvedValueOnce({}) // CreateBucketCommand creates the bucket
        .mockResolvedValueOnce({ // GetBucketAclCommand verifies ownership
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'WRITE' }]
        });

      await createS3Bucket(mockClients, 'us-east-1', 'new-bucket', '123456789012', 3, 1);

      expect(mockSend).toHaveBeenCalledTimes(3); // HeadBucket + CreateBucket + GetBucketAcl
    });

    it('should create bucket with location constraint for non-us-east-1 regions', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand throws error (bucket doesn't exist)
        .mockResolvedValueOnce({}) // CreateBucketCommand creates bucket with LocationConstraint
        .mockResolvedValueOnce({ // GetBucketAclCommand verifies ownership
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'FULL_CONTROL' }]
        });

      await createS3Bucket(mockClients, 'eu-central-1', 'euro-bucket', '123456789012', 3, 1);

      expect(mockSend).toHaveBeenCalledTimes(3); // HeadBucket + CreateBucket + GetBucketAcl
    });

    it('should handle retry logic on failure', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand throws error (bucket doesn't exist)
        .mockRejectedValueOnce(new Error('NetworkError')) // CreateBucketCommand attempt 1 fails with network error
        .mockResolvedValueOnce({}) // CreateBucketCommand attempt 2 succeeds
        .mockResolvedValueOnce({ // GetBucketAclCommand verifies ownership
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'WRITE' }]
        });

      await createS3Bucket(mockClients, 'us-west-2', 'retry-bucket', '123456789012', 3, 1);

      expect(mockSend).toHaveBeenCalledTimes(4); // HeadBucket + 2 CreateBucket attempts + GetBucketAcl
    });

    it('should bubble up AccessDenied permissions error', async () => {
      const accessDeniedError = new Error('Access Denied');
      accessDeniedError.name = 'AccessDenied';
      
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand throws error (bucket doesn't exist)
        .mockRejectedValueOnce(accessDeniedError) // CreateBucketCommand attempt 1 fails with AccessDenied
        .mockRejectedValueOnce(accessDeniedError) // CreateBucketCommand attempt 2 fails with AccessDenied
        .mockRejectedValueOnce(accessDeniedError); // CreateBucketCommand attempt 3 fails with AccessDenied

      await expect(createS3Bucket(mockClients, 'us-east-1', 'permission-denied-bucket', '123456789012', 3, 1))
        .rejects.toThrow('Create S3 bucket failed after 3 attempts: Access Denied');

      expect(mockSend).toHaveBeenCalledTimes(4); // 1 HeadBucket + 3 CreateBucket attempts
    });

    it('should bubble up BucketAlreadyExists error', async () => {
      const bucketExistsError = new Error('The requested bucket name is not available');
      bucketExistsError.name = 'BucketAlreadyExists';
      
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand throws error (bucket doesn't exist)
        .mockRejectedValueOnce(bucketExistsError) // CreateBucketCommand attempt 1 fails - bucket name taken by another account
        .mockRejectedValueOnce(bucketExistsError); // CreateBucketCommand attempt 2 fails - bucket name still taken

      await expect(createS3Bucket(mockClients, 'eu-west-1', 'taken-bucket-name', '123456789012', 2, 1))
        .rejects.toThrow('Create S3 bucket failed after 2 attempts: The requested bucket name is not available');

      expect(mockSend).toHaveBeenCalledTimes(3); // 1 HeadBucket + 2 CreateBucket attempts
    });

    it('should bubble up InvalidBucketName error', async () => {
      const invalidNameError = new Error('The specified bucket is not valid');
      invalidNameError.name = 'InvalidBucketName';
      
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand throws error (bucket doesn't exist)
        .mockRejectedValueOnce(invalidNameError); // CreateBucketCommand fails - invalid bucket name format

      await expect(createS3Bucket(mockClients, 'us-west-2', 'Invalid_Bucket_Name', '123456789012', 1, 1))
        .rejects.toThrow('Create S3 bucket failed after 1 attempts: The specified bucket is not valid');

      expect(mockSend).toHaveBeenCalledTimes(2); // 1 HeadBucket + 1 CreateBucket attempt
    });
  });

  describe('uploadToS3 permissions errors', () => {
    it('should bubble up S3 upload permissions error', async () => {
      const uploadError = new Error('Access Denied');
      uploadError.name = 'AccessDenied';
      
      mockedFs.statSync.mockReturnValue({ size: 1024 } as any);
      mockedFs.readFileSync.mockReturnValue(Buffer.from('content'));
      mockSend
        .mockResolvedValueOnce({ // GetBucketAcl
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'WRITE' }]
        })
        .mockRejectedValueOnce(uploadError) // PutObject attempt 1 fails
        .mockRejectedValueOnce(uploadError); // PutObject attempt 2 fails

      await expect(uploadToS3(mockClients, 'us-east-1', '123456789012', 'my-app', 'v1.0.0', 'app.zip', 2, 1, false))
        .rejects.toThrow('Upload to S3 failed after 2 attempts: Access Denied');

      expect(mockSend).toHaveBeenCalledTimes(3); // 1 GetBucketAcl + 2 PutObject attempts
    });

    it('should bubble up S3 NoSuchBucket error during upload', async () => {
      const noSuchBucketError = new Error('The specified bucket does not exist');
      noSuchBucketError.name = 'NoSuchBucket';
      
      mockedFs.statSync.mockReturnValue({ size: 2048 } as any);
      mockedFs.readFileSync.mockReturnValue(Buffer.from('test-content'));
      mockSend
        .mockResolvedValueOnce({ // GetBucketAcl
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'FULL_CONTROL' }]
        })
        .mockRejectedValueOnce(noSuchBucketError) // PutObject attempt 1 fails
        .mockRejectedValueOnce(noSuchBucketError) // PutObject attempt 2 fails
        .mockRejectedValueOnce(noSuchBucketError); // PutObject attempt 3 fails

      await expect(uploadToS3(mockClients, 'eu-central-1', '987654321098', 'test-app', 'v2.0.0', 'deploy.jar', 3, 1, false))
        .rejects.toThrow('Upload to S3 failed after 3 attempts: The specified bucket does not exist');

      expect(mockSend).toHaveBeenCalledTimes(4); // 1 GetBucketAcl + 3 PutObject attempts
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
      mockedFs.readFileSync.mockReturnValue(Buffer.from('valid-content'));
      mockSend
        .mockResolvedValueOnce({ // GetBucketAcl
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'WRITE' }]
        })
        .mockResolvedValueOnce({}); // PutObject

      const result = await uploadToS3(mockClients, 'us-west-2', '123456789012', 'my-app', 'v2.0.0', 'valid-app.zip', 3, 1, false);

      expect(result).toEqual({
        bucket: 'elasticbeanstalk-us-west-2-123456789012',
        key: 'my-app/v2.0.0.zip',
      });
      expect(mockSend).toHaveBeenCalledTimes(2); // GetBucketAcl + PutObject
    });

    it('should accept deployment package exactly at 500MB limit', async () => {
      const exactLimitSize = 500 * 1024 * 1024; // Exactly 500 MB
      mockedFs.statSync.mockReturnValue({ size: exactLimitSize } as any);
      mockedFs.readFileSync.mockReturnValue(Buffer.from('exact-limit-content'));
      mockSend
        .mockResolvedValueOnce({ // GetBucketAcl
          Owner: { ID: 'owner-id' },
          Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'FULL_CONTROL' }]
        })
        .mockResolvedValueOnce({}); // PutObject

      const result = await uploadToS3(mockClients, 'eu-west-1', '987654321098', 'test-app', 'v1.0.0', 'exact-app.zip', 3, 1, false);

      expect(result).toEqual({
        bucket: 'elasticbeanstalk-eu-west-1-987654321098',
        key: 'test-app/v1.0.0.zip',
      });
      expect(mockSend).toHaveBeenCalledTimes(2); // GetBucketAcl + PutObject
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
