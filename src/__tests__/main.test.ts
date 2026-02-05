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
  createWriteStream: jest.fn(() => ({
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(callback, 0);
      }
    }),
  })),
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

jest.mock('archiver', () => {
  const mockArchive: any = {
    pipe: jest.fn(),
    glob: jest.fn(),
    finalize: jest.fn(),
    on: jest.fn((event: string, callback: () => void) => {
      if (event === 'close') {
        // Simulate successful completion
        setTimeout(callback, 0);
      }
      return mockArchive;
    }),
  };
  return jest.fn(() => mockArchive);
});

// Mock AWS SDK clients
const mockSend = jest.fn();
const mockWaitUntil = jest.fn();
jest.mock('@aws-sdk/client-elastic-beanstalk', () => ({
  ElasticBeanstalkClient: jest.fn(() => ({ send: mockSend })),
  CreateApplicationVersionCommand: jest.fn(),
  UpdateEnvironmentCommand: jest.fn(),
  CreateEnvironmentCommand: jest.fn(),
  DescribeEnvironmentsCommand: jest.fn(),
  DescribeApplicationVersionsCommand: jest.fn(),
  waitUntilEnvironmentUpdated: mockWaitUntil,
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn(),
  HeadBucketCommand: jest.fn(),
  CreateBucketCommand: jest.fn(),
  GetBucketAclCommand: jest.fn(),
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

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';

// Import functions to test
import { run } from '../main';
import { createDeploymentPackage } from '../deploymentpackage';
import {
  retryWithBackoff,
  getAwsAccountId,
  environmentExists,
  updateEnvironment,
  createEnvironment,
  getEnvironmentInfo,
} from '../aws-operations';
import { waitForDeploymentCompletion, waitForHealthRecovery } from '../monitoring';
import { AWSClients } from '../aws-clients';

const mockedCore = core as jest.Mocked<typeof core>;
const mockedExec = exec as jest.Mocked<typeof exec>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Main Functions', () => {
  let mockClients: AWSClients;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockReset();
    mockWaitUntil.mockReset();

    // Create mock clients instance
    mockClients = AWSClients.getInstance('us-east-1');

    // Default mock implementations
    const validOptionSettings = JSON.stringify([
      {
        "Namespace": "aws:autoscaling:launchconfiguration",
        "OptionName": "IamInstanceProfile",
        "Value": "test-profile"
      },
      {
        "Namespace": "aws:elasticbeanstalk:environment",
        "OptionName": "ServiceRole",
        "Value": "test-role"
      }
    ]);

    mockedCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'aws-region': 'us-east-1',
        'application-name': 'test-app',
        'environment-name': 'test-env',
        'solution-stack-name': '64bit Amazon Linux 2',
        'version-label': 'v1.0.0',
        'deployment-timeout': '900',
        'max-retries': '3',
        'retry-delay': '5',
        'exclude-patterns': '*.git*',
        'option-settings': validOptionSettings,
      };
      return inputs[name] || '';
    });
    mockedCore.getBooleanInput.mockImplementation((name: string) => {
      if (name === 'create-s3-bucket-if-not-exists') return true;
      return false;
    });
  });

  describe('createDeploymentPackage', () => {
    it('should use existing package', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(Buffer.from('test'));
      const result = await createDeploymentPackage('/existing.zip', 'v1.0.0', '*.git*');

      expect(result.path).toBe('/existing.zip');
    });

    it('should create new package', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readFileSync.mockReturnValue(Buffer.from('test'));

      const result = await createDeploymentPackage(undefined, 'v1.0.0', '*.git*,*.node*');

      expect(result.path).toBe('deploy-v1.0.0.zip');
      
      const archiver = require('archiver');
      expect(archiver).toHaveBeenCalledWith('zip');
      
      // Verify the mock archive methods were called
      const mockArchiveInstance = archiver();
      expect(mockArchiveInstance.pipe).toHaveBeenCalled();
      expect(mockArchiveInstance.glob).toHaveBeenCalledWith('**/*', { 
        dot: true,
        ignore: ['*.git*', '*.node*'] 
      });
      expect(mockArchiveInstance.finalize).toHaveBeenCalled();
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(mockFn, 3, 1, 'Test');
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      const result = await retryWithBackoff(mockFn, 3, 1, 'Test');
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(retryWithBackoff(mockFn, 2, 1, 'Test'))
        .rejects.toThrow('Test failed after 2 attempts: fail');
    });
  });

  describe('getAwsAccountId', () => {
    it('should return account ID', async () => {
      mockSend.mockResolvedValue({ Account: '123456789012' });
      const result = await getAwsAccountId(mockClients, 3, 1);
      expect(result).toBe('123456789012');
    });
  });

  describe('environmentExists', () => {
    it('should return environment info if exists', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Status: 'Ready', Health: 'Green' }],
      });
      const result = await environmentExists(mockClients, 'app', 'env');
      expect(result).toEqual({
        exists: true,
        status: 'Ready',
        health: 'Green',
      });
    });

    it('should return false if environment does not exist', async () => {
      mockSend.mockResolvedValue({ Environments: [] });
      const result = await environmentExists(mockClients, 'app', 'env');
      expect(result).toEqual({ exists: false });
    });

    it('should return false if terminated', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Status: 'Terminated', Health: 'Grey' }],
      });
      const result = await environmentExists(mockClients, 'app', 'env');
      expect(result).toEqual({ exists: false, status: 'Terminated', health: 'Grey' });
    });

    it('should return false on error', async () => {
      mockSend.mockRejectedValue(new Error('API Error'));
      const result = await environmentExists(mockClients, 'app', 'env');
      expect(result).toEqual({ exists: false });
    });
  });


  describe('updateEnvironment', () => {
    it('should update environment without options', async () => {
      mockSend.mockResolvedValue({});
      await updateEnvironment(mockClients, 'app', 'env', 'v1.0.0', '', '64bit Amazon Linux 2', undefined, 3, 1);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should update environment with options', async () => {
      mockSend.mockResolvedValue({});
      await updateEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[{"Namespace":"test","OptionName":"test","Value":"test"}]', '64bit Amazon Linux 2', undefined, 3, 1);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle invalid JSON options', async () => {
      await expect(updateEnvironment(mockClients, 'app', 'env', 'v1.0.0', 'invalid-json', '64bit Amazon Linux 2', undefined, 3, 1))
        .rejects.toThrow('Failed to parse option-settings');
    });
  });

  describe('createEnvironment', () => {
    it('should create environment', async () => {
      mockSend.mockResolvedValue({});
      await createEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[{"Namespace":"aws:autoscaling:launchconfiguration","OptionName":"IamInstanceProfile","Value":"profile"}]', 'stack', undefined, 3, 1);
      expect(mockSend).toHaveBeenCalledTimes(1); // 1 create
    });

    it('should create environment with custom options', async () => {
      mockSend.mockResolvedValue({});
      await createEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[{"Namespace":"test","OptionName":"test","Value":"test"}]', 'stack', undefined, 3, 1);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('waitForDeploymentCompletion', () => {
    it('should wait for deployment', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Status: 'Ready' }],
      });
      await waitForDeploymentCompletion(mockClients, 'app', 'env', 900);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('waitForHealthRecovery', () => {
    it('should wait for green health', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Health: 'Green', Status: 'Ready' }],
      });
      await waitForHealthRecovery(mockClients, 'app', 'env', 900);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should wait for yellow health', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Health: 'Yellow', Status: 'Ready' }],
      });
      await waitForHealthRecovery(mockClients, 'app', 'env', 900);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should throw error for red health', async () => {
      mockSend
        .mockResolvedValueOnce({
          Environments: [{ Health: 'Red', Status: 'Ready' }],
        })
        .mockResolvedValueOnce({
          Events: [
            {
              EventDate: new Date('2025-01-01'),
              Severity: 'ERROR',
              Message: 'Deployment failed'
            }
          ]
        });
      await expect(waitForHealthRecovery(mockClients, 'app', 'env', 1))
        .rejects.toThrow('Environment deployment failed - health is Red');
    });

    it('should timeout', async () => {
      // Mock multiple health checks (Red/Updating) and then the final DescribeEvents call
      mockSend.mockImplementation((command: any) => {
        if (command.input?.MaxRecords) {
          return Promise.resolve({ Events: [] });
        }
        return Promise.resolve({
          Environments: [{ Health: 'Red', Status: 'Updating' }],
        });
      });
      await expect(waitForHealthRecovery(mockClients, 'app', 'env', 1))
        .rejects.toThrow('Environment health check timed out after 1s');
    });
  });

  describe('getEnvironmentInfo', () => {
    it('should return environment info', async () => {
      mockSend.mockResolvedValue({
        Environments: [{
          CNAME: 'test.com',
          EnvironmentId: 'e-123',
          Status: 'Ready',
          Health: 'Green',
        }],
      });
      const result = await getEnvironmentInfo(mockClients, 'app', 'env');
      expect(result).toEqual({
        url: 'test.com',
        id: 'e-123',
        status: 'Ready',
        health: 'Green',
      });
    });

    it('should throw error if no environment found', async () => {
      mockSend.mockResolvedValue({ Environments: [] });
      await expect(getEnvironmentInfo(mockClients, 'app', 'env'))
        .rejects.toThrow('Environment env not found after deployment');
    });
  });

  describe('run', () => {
    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readFileSync.mockReturnValue(Buffer.from('test'));
      mockedFs.statSync.mockReturnValue({ size: 1024 } as any);
      mockedExec.exec.mockResolvedValue(0);
    });

    it('should handle validation failure', async () => {
      mockedCore.getInput.mockImplementation(() => '');
      await run();
      expect(mockedCore.setFailed).toHaveBeenCalled();
    });

    it('should handle deployment error', async () => {
      mockSend.mockRejectedValue(new Error('AWS Error'));
      await run();
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Deployment failed: Get AWS Account ID failed after 3 attempts: AWS Error');
    });

    it('should update existing environment and set outputs', async () => {
      mockSend.mockImplementation(() => {
        const callCount = mockSend.mock.calls.length + 1;

        if (callCount === 1) return Promise.resolve({ Account: '123456789012' });
        if (callCount === 2) return Promise.resolve({ ApplicationVersions: [] });
        if (callCount === 3) return Promise.resolve({});  // HeadBucket
        if (callCount === 4) return Promise.resolve({ Owner: { ID: 'owner-id' }, Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'WRITE' }] });  // GetBucketAcl
        if (callCount === 5) return Promise.resolve({});  // PutObject
        if (callCount === 6) return Promise.resolve({});  // CreateAppVersion
        if (callCount === 7) return Promise.resolve({ Environments: [{ Status: 'Ready', Health: 'Green' }] });  // DescribeEnvironment
        if (callCount === 8) return Promise.resolve({});  // UpdateEnvironment
        if (callCount === 9) return Promise.resolve({ Environments: [{ CNAME: 'test-env.elasticbeanstalk.com', EnvironmentId: 'e-123', Status: 'Ready', Health: 'Green' }] });

        return Promise.resolve({});
      });

      await run();

      expect(mockedCore.setOutput).toHaveBeenCalledWith('environment-url', 'test-env.elasticbeanstalk.com');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('environment-id', 'e-123');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('version-label', 'v1.0.0');
    });

    it('should create new environment when create-environment-if-not-exists is true', async () => {
      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'create-s3-bucket-if-not-exists') return true;
        if (name === 'create-environment-if-not-exists') return true;
        return false;
      });

      mockSend.mockImplementation(() => {
        const callCount = mockSend.mock.calls.length + 1;

        if (callCount === 1) return Promise.resolve({ Account: '123456789012' });
        if (callCount === 2) return Promise.resolve({ ApplicationVersions: [] });
        if (callCount === 3) return Promise.resolve({});  // HeadBucket
        if (callCount === 4) return Promise.resolve({ Owner: { ID: 'owner-id' }, Grants: [{ Grantee: { ID: 'owner-id' }, Permission: 'FULL_CONTROL' }] });  // GetBucketAcl
        if (callCount === 5) return Promise.resolve({});  // PutObject
        if (callCount === 6) return Promise.resolve({});  // CreateAppVersion
        if (callCount === 7) return Promise.resolve({ Environments: [] });  // DescribeEnvironment (no env found)
        if (callCount === 8) return Promise.resolve({});  // CreateEnv
        if (callCount === 9) return Promise.resolve({ Environments: [{ CNAME: 'new-env.elasticbeanstalk.com', EnvironmentId: 'e-new', Status: 'Ready', Health: 'Green' }] });

        return Promise.resolve({});
      });

      await run();

      expect(mockedCore.setOutput).toHaveBeenCalledWith('environment-url', 'new-env.elasticbeanstalk.com');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('environment-id', 'e-new');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'create');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('version-label', 'v1.0.0');
    });

    it('should reuse existing version when use-existing-application-version-if-available is true', async () => {
      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'create-s3-bucket-if-not-exists') return true;
        if (name === 'use-existing-application-version-if-available') return true;
        return false;
      });

      // Mock sequence: STS -> applicationVersionExists (true) -> getVersionS3Location -> DescribeEnvs -> UpdateEnv -> GetEnvInfo
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', SourceBundle: { S3Bucket: 'my-bucket', S3Key: 'my-app/v1.0.0.zip' } }] })
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', SourceBundle: { S3Bucket: 'my-bucket', S3Key: 'my-app/v1.0.0.zip' } }] })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green' }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Environments: [{ CNAME: 'test.com', EnvironmentId: 'e-123', Status: 'Ready', Health: 'Green' }] });

      await run();

      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('version-label', 'v1.0.0');
    });

    it('should handle environment not exists without create flag', async () => {
      // Use default behavior where create-environment-if-not-exists is false
      mockSend.mockImplementation(() => {
        const callCount = mockSend.mock.calls.length + 1;

        if (callCount === 1) return Promise.resolve({ Account: '123456789012' }); // GetCallerIdentity
        if (callCount === 2) return Promise.resolve({ ApplicationVersions: [] }); // DescribeApplicationVersions
        if (callCount === 3) return Promise.resolve({}); // HeadBucket
        if (callCount === 4) return Promise.resolve({ // GetBucketAcl
          Owner: { ID: 'owner-id' },
          Grants: [{ 
            Grantee: { Type: 'CanonicalUser', ID: 'owner-id' }, 
            Permission: 'WRITE' 
          }]
        });
        if (callCount === 5) return Promise.resolve({}); // PutObject
        if (callCount === 6) return Promise.resolve({}); // CreateAppVersion
        if (callCount === 7) return Promise.resolve({ Environments: [] }); // DescribeEnvironment (no env found)

        return Promise.resolve({});
      });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith('Deployment failed: Environment test-env does not exist and create-environment-if-not-exists is false');
    });
  });
});
