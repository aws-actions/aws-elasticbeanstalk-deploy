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
  readdirSync: jest.fn(() => []),
  readlinkSync: jest.fn(),
  realpathSync: jest.fn((p: any) => p),
  createReadStream: jest.fn(() => 'mock-stream'),
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
  join: jest.fn((...args) => args.join('/')),
  relative: jest.fn((from, to) => to),
  isAbsolute: jest.fn((p) => typeof p === 'string' && p.startsWith('/')),
  sep: '/',
}));

jest.mock('archiver', () => {
  const mockArchive: any = {
    pipe: jest.fn(),
    glob: jest.fn(),
    file: jest.fn(),
    symlink: jest.fn(),
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
  DescribeEventsCommand: jest.fn(),
  DescribeApplicationVersionsCommand: jest.fn(),
  waitUntilEnvironmentUpdated: mockWaitUntil,
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn(),
  HeadBucketCommand: jest.fn(),
  CreateBucketCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-sts', () => ({
  STSClient: jest.fn(() => ({ send: mockSend })),
  GetCallerIdentityCommand: jest.fn(),
}));

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';

// Import functions to test
import { run } from '../main';
import { createDeploymentPackage, loadIgnorePatterns, walkFiles, createZipFile } from '../deploymentpackage';
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
        'retry-delay': '1',
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
      mockedFs.statSync.mockReturnValue({ isFile: () => true } as any);
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

      const mockArchiveInstance = archiver();
      expect(mockArchiveInstance.pipe).toHaveBeenCalled();
      expect(mockArchiveInstance.finalize).toHaveBeenCalled();
    });

    it('should walk sourceDirectory when provided', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readFileSync.mockReturnValue(Buffer.from('test'));
      mockedFs.readdirSync.mockReturnValueOnce([
        { name: 'app.js', isDirectory: () => false, isSymbolicLink: () => false, isFile: () => true } as any,
      ]);
      const mockedPath = require('path') as jest.Mocked<typeof import('path')>;
      mockedPath.relative.mockImplementation((from: string, to: string) => {
        if (to.startsWith(from + '/')) return to.slice(from.length + 1);
        return to;
      });

      const result = await createDeploymentPackage(undefined, 'v1.0.0', '*.git*', '/frontend');

      expect(result.path).toBe('deploy-v1.0.0.zip');
      const archiver = require('archiver');
      const mockArchiveInstance = archiver();
      expect(mockedFs.readdirSync).toHaveBeenCalledWith('/frontend', expect.any(Object));
      expect(mockArchiveInstance.file).toHaveBeenCalledWith('/frontend/app.js', { name: 'app.js' });
    });

    it('should fail when deployment-package-path does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await expect(
        createDeploymentPackage('/does/not/exist.zip', 'v1.0.0', '*.git*')
      ).rejects.toThrow(
        "deployment-package-path '/does/not/exist.zip' does not exist."
      );
    });

    it('should reject when output stream errors', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readFileSync.mockReturnValue(Buffer.from('test'));
      const originalImpl = mockedFs.createWriteStream.getMockImplementation();
      mockedFs.createWriteStream.mockReturnValue({
        on: jest.fn((event: string, callback: (err?: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('ENOSPC: no space left on device')), 0);
          }
        }),
      } as any);

      await expect(
        createDeploymentPackage(undefined, 'v1.0.0', '*.git*')
      ).rejects.toThrow('ENOSPC: no space left on device');

      // Restore default mock so subsequent tests aren't affected
      mockedFs.createWriteStream.mockImplementation(originalImpl!);
    });

    it('should fail when deployment-package-path is a directory', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({ isFile: () => false } as any);

      await expect(
        createDeploymentPackage('/some/directory', 'v1.0.0', '*.git*')
      ).rejects.toThrow(
        "deployment-package-path '/some/directory' is not a file."
      );
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
        .rejects.toThrow('Test failed after 3 attempts (2 retries): fail');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on access denied errors', async () => {
      const errorMessage = "You do not have permission to perform the 'ec2:DescribeImages' action.";
      const mockFn = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(retryWithBackoff(mockFn, 3, 1, 'Create environment'))
        .rejects.toThrow(errorMessage);

      // Ensure we only attempted once (no retries)
      expect(mockFn).toHaveBeenCalledTimes(1);
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

    it('should rethrow unexpected API errors', async () => {
      mockSend.mockRejectedValue(new Error('API Error'));
      await expect(environmentExists(mockClients, 'app', 'env')).rejects.toThrow('API Error');
    });

    it('should return false on 404 not found', async () => {
      const notFoundError = Object.assign(new Error('Not Found'), {
        name: 'NoSuchEntityException',
      });
      mockSend.mockRejectedValue(notFoundError);
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
      await createEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[{"Namespace":"aws:autoscaling:launchconfiguration","OptionName":"IamInstanceProfile","Value":"profile"}]', 'stack', undefined, undefined, 3, 1);
      expect(mockSend).toHaveBeenCalledTimes(1); // 1 create
    });

    it('should create environment with custom options', async () => {
      mockSend.mockResolvedValue({});
      await createEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[{"Namespace":"test","OptionName":"test","Value":"test"}]', 'stack', undefined, undefined, 3, 1);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should pass cnamePrefix to CreateEnvironmentCommand', async () => {
      const { CreateEnvironmentCommand } = require('@aws-sdk/client-elastic-beanstalk');
      mockSend.mockResolvedValue({});
      await createEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[]', 'stack', undefined, 'my-cname', 3, 1);
      expect(CreateEnvironmentCommand).toHaveBeenCalledWith(
        expect.objectContaining({ CNAMEPrefix: 'my-cname' })
      );
    });

    it('should not include CNAMEPrefix when cnamePrefix is undefined', async () => {
      const { CreateEnvironmentCommand } = require('@aws-sdk/client-elastic-beanstalk');
      mockSend.mockResolvedValue({});
      await createEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[]', 'stack', undefined, undefined, 3, 1);
      expect(CreateEnvironmentCommand).toHaveBeenCalledWith(
        expect.not.objectContaining({ CNAMEPrefix: expect.anything() })
      );
    });

    it('should use PlatformArn only when SolutionStackName is not set', async () => {
      const { CreateEnvironmentCommand } = require('@aws-sdk/client-elastic-beanstalk');
      mockSend.mockResolvedValue({});
      await createEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[]', undefined, 'arn:aws:elasticbeanstalk:us-east-1::platform/Node.js/1.0', undefined, 3, 1);
      expect(CreateEnvironmentCommand).toHaveBeenCalledWith(
        expect.objectContaining({ PlatformArn: 'arn:aws:elasticbeanstalk:us-east-1::platform/Node.js/1.0' })
      );
      expect(CreateEnvironmentCommand).toHaveBeenCalledWith(
        expect.not.objectContaining({ SolutionStackName: expect.anything() })
      );
    });

    it('should prefer SolutionStackName over PlatformArn when both are set', async () => {
      const { CreateEnvironmentCommand } = require('@aws-sdk/client-elastic-beanstalk');
      mockSend.mockResolvedValue({});
      await createEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[]', 'stack-name', 'arn:platform', undefined, 3, 1);
      expect(CreateEnvironmentCommand).toHaveBeenCalledWith(
        expect.objectContaining({ SolutionStackName: 'stack-name' })
      );
      expect(CreateEnvironmentCommand).toHaveBeenCalledWith(
        expect.not.objectContaining({ PlatformArn: expect.anything() })
      );
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

    const deploymentStartTime = new Date('2025-01-01T00:00:00Z');

    it('should throw when the environment persistently runs a different version than requested', async () => {
      jest.useFakeTimers();
      try {
        mockSend.mockResolvedValue({
          Environments: [{ Status: 'Ready', VersionLabel: 'v1.0.0' }],
        });

        const deployment = waitForDeploymentCompletion(mockClients, 'app', 'env', 900, 'update', deploymentStartTime, 'v2.0.0');
        const assertion = expect(deployment).rejects.toThrow(
          'Environment deployment failed - environment is running version v1.0.0 instead of the requested v2.0.0'
        );

        await jest.advanceTimersByTimeAsync(40000);
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });

    it('should throw when the environment settles back on the previous version after updating', async () => {
      jest.useFakeTimers();
      try {
        mockSend
          .mockResolvedValueOnce({ Environments: [{ Status: 'Updating', VersionLabel: 'v2.0.0' }] })
          .mockResolvedValue({ Environments: [{ Status: 'Ready', VersionLabel: 'v1.0.0' }] });

        const deployment = waitForDeploymentCompletion(mockClients, 'app', 'env', 900, 'update', deploymentStartTime, 'v2.0.0');
        const assertion = expect(deployment).rejects.toThrow(
          'Environment deployment failed - environment is running version v1.0.0 instead of the requested v2.0.0'
        );

        await jest.advanceTimersByTimeAsync(60000);
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });

    it('should keep waiting while the environment has not acted on the request', async () => {
      jest.useFakeTimers();
      try {
        mockSend.mockResolvedValue({
          Environments: [{ Status: 'Ready', VersionLabel: 'v1.0.0' }],
        });

        const deployment = waitForDeploymentCompletion(mockClients, 'app', 'env', 1, 'update', deploymentStartTime, 'v2.0.0');
        const assertion = expect(deployment).rejects.toThrow('Deployment timed out after 1s');

        await jest.advanceTimersByTimeAsync(30000);
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });

    it('should complete when the requested version appears after a pre-update Ready poll', async () => {
      jest.useFakeTimers();
      try {
        mockSend
          .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', VersionLabel: 'v1.0.0' }] })
          .mockResolvedValueOnce({})
          .mockResolvedValue({ Environments: [{ Status: 'Ready', VersionLabel: 'v2.0.0' }] });

        const deployment = waitForDeploymentCompletion(mockClients, 'app', 'env', 900, 'update', deploymentStartTime, 'v2.0.0');
        const assertion = expect(deployment).resolves.toBeUndefined();

        await jest.advanceTimersByTimeAsync(20000);
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });

    it('should throw when error events surface on the final Ready poll', async () => {
      mockSend
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', VersionLabel: 'v2.0.0' }] })
        .mockResolvedValueOnce({
          Events: [{
            EventDate: new Date('2025-01-01T00:01:00Z'),
            Severity: 'ERROR',
            Message: 'Failed to deploy application.',
          }],
        });

      await expect(
        waitForDeploymentCompletion(mockClients, 'app', 'env', 900, 'update', deploymentStartTime, 'v2.0.0')
      ).rejects.toThrow(
        'Environment deployment failed - fatal or error event detected: Failed to deploy application.'
      );
    });

    it('should complete when the environment runs the requested version', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Status: 'Ready', VersionLabel: 'v2.0.0' }],
      });

      await expect(
        waitForDeploymentCompletion(mockClients, 'app', 'env', 900, 'update', deploymentStartTime, 'v2.0.0')
      ).resolves.toBeUndefined();
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
        .mockResolvedValueOnce({ Events: [] });
      await expect(waitForHealthRecovery(mockClients, 'app', 'env', 1))
        .rejects.toThrow('Environment health recovery failed - health is Red');
    });

    it('should throw when an error event surfaces while health is red', async () => {
      mockSend
        .mockResolvedValueOnce({
          Environments: [{ Health: 'Red', Status: 'Updating' }],
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
        .rejects.toThrow('Environment health recovery failed - fatal or error event detected: Deployment failed');
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
        .rejects.toThrow('Environment health recovery timed out after 1s');
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
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Deployment failed: Get AWS Account ID failed after 4 attempts (3 retries): AWS Error');
    });

    it('should update existing environment and set outputs', async () => {
      mockSend.mockImplementation(() => {
        const callCount = mockSend.mock.calls.length + 1;

        if (callCount === 1) return Promise.resolve({ Account: '123456789012' }); // GetCallerIdentity
        if (callCount === 2) return Promise.resolve({ ApplicationVersions: [] }); // DescribeApplicationVersions
        if (callCount === 3) return Promise.resolve({});  // HeadBucket (bucket exists, owned by us)
        if (callCount === 4) return Promise.resolve({});  // PutObject
        if (callCount === 5) return Promise.resolve({});  // CreateAppVersion
        if (callCount === 6) return Promise.resolve({ Environments: [{ Status: 'Ready', Health: 'Green' }] }); // DescribeEnvironment
        if (callCount === 7) return Promise.resolve({});  // UpdateEnvironment
        if (callCount === 8) return Promise.resolve({ Environments: [{ CNAME: 'test-env.elasticbeanstalk.com', EnvironmentId: 'e-123', Status: 'Ready', Health: 'Green' }] }); // GetEnvironmentInfo

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

        if (callCount === 1) return Promise.resolve({ Account: '123456789012' }); // GetCallerIdentity
        if (callCount === 2) return Promise.resolve({ ApplicationVersions: [] }); // DescribeApplicationVersions
        if (callCount === 3) return Promise.resolve({});  // HeadBucket (bucket exists, owned by us)
        if (callCount === 4) return Promise.resolve({});  // PutObject
        if (callCount === 5) return Promise.resolve({});  // CreateAppVersion
        if (callCount === 6) return Promise.resolve({ Environments: [] });  // DescribeEnvironment (no env found)
        if (callCount === 7) return Promise.resolve({});  // CreateEnv
        if (callCount === 8) return Promise.resolve({ Environments: [{ CNAME: 'new-env.elasticbeanstalk.com', EnvironmentId: 'e-new', Status: 'Ready', Health: 'Green' }] }); // GetEnvironmentInfo

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
      // No S3 calls since version already exists
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
      mockSend.mockImplementation(() => {
        const callCount = mockSend.mock.calls.length + 1;

        if (callCount === 1) return Promise.resolve({ Account: '123456789012' }); // GetCallerIdentity
        if (callCount === 2) return Promise.resolve({ ApplicationVersions: [] }); // DescribeApplicationVersions
        if (callCount === 3) return Promise.resolve({}); // HeadBucket (bucket exists, owned by us)
        if (callCount === 4) return Promise.resolve({}); // PutObject
        if (callCount === 5) return Promise.resolve({}); // CreateAppVersion
        if (callCount === 6) return Promise.resolve({ Environments: [] }); // DescribeEnvironment (no env found)

        return Promise.resolve({});
      });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith('Deployment failed: Environment test-env does not exist and create-environment-if-not-exists is false');
    });

    it('should fail create environment when no platform configuration is provided', async () => {
      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'create-s3-bucket-if-not-exists') return true;
        if (name === 'create-environment-if-not-exists') return true;
        return false;
      });

      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'version-label': 'v1.0.0',
          // no solution-stack-name
          // no platform-arn
          'deployment-timeout': '900',
          'max-retries': '3',
          'retry-delay': '5',
          'exclude-patterns': '*.git*',
          'option-settings': JSON.stringify([
            {
              Namespace: 'aws:autoscaling:launchconfiguration',
              OptionName: 'IamInstanceProfile',
              Value: 'test-profile',
            },
            {
              Namespace: 'aws:elasticbeanstalk:environment',
              OptionName: 'ServiceRole',
              Value: 'test-role',
            },
          ]),
        };
        return inputs[name] || '';
      });

      mockSend.mockImplementation(() => {
        const callCount = mockSend.mock.calls.length + 1;

        if (callCount === 1) return Promise.resolve({ Account: '123456789012' }); // GetCallerIdentity
        if (callCount === 2) return Promise.resolve({ ApplicationVersions: [] }); // DescribeApplicationVersions
        if (callCount === 3) return Promise.resolve({}); // HeadBucket (bucket exists, owned by us)
        if (callCount === 4) return Promise.resolve({}); // PutObject
        if (callCount === 5) return Promise.resolve({}); // CreateAppVersion
        if (callCount === 6) return Promise.resolve({ Environments: [] }); // DescribeEnvironment (no env found)

        return Promise.resolve({});
      });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(
        'Deployment failed: Either solution-stack-name or platform-arn must be provided when creating a new environment',
      );
    });
  });

  describe('walkFiles', () => {
    const mockedPath = require('path') as jest.Mocked<typeof import('path')>;
    let originalRelative: any;

    function makeDirent(name: string, opts: { isDir?: boolean; isSymlink?: boolean } = {}) {
      return {
        name,
        isDirectory: () => !!opts.isDir,
        isSymbolicLink: () => !!opts.isSymlink,
        isFile: () => !opts.isDir && !opts.isSymlink,
      };
    }

    function collectFiles(dir: string, zipFileName: string, ig?: any): string[] {
      const files: string[] = [];
      walkFiles(dir, zipFileName, (entry) => {
        if (entry.kind === 'file') files.push(entry.relativePath);
      }, ig);
      return files;
    }

    function collectEntries(dir: string, zipFileName: string, ig?: any, symlinks?: 'preserve' | 'follow') {
      const entries: any[] = [];
      walkFiles(dir, zipFileName, (entry) => entries.push(entry), ig, symlinks);
      return entries;
    }

    beforeEach(() => {
      mockedFs.realpathSync.mockImplementation((p: any) => p);
      originalRelative = mockedPath.relative;
      mockedPath.relative.mockImplementation((from: string, to: string) => {
        if (to.startsWith(from + '/')) {
          return to.slice(from.length + 1);
        }
        return to;
      });
    });

    afterEach(() => {
      mockedPath.relative.mockImplementation(originalRelative.getMockImplementation() || ((from: string, to: string) => to));
    });

    it('should return all files relative to root', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('app.js'),
            makeDirent('README.md'),
          ] as any;
        }
        return [] as any;
      });

      const files = collectFiles('/project', 'deploy.zip');
      expect(files).toEqual(['app.js', 'README.md']);
    });

    it('should recurse into subdirectories', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [makeDirent('src', { isDir: true }), makeDirent('index.js')] as any;
        }
        if (String(dir) === '/project/src') {
          return [makeDirent('main.ts')] as any;
        }
        return [] as any;
      });

      const files = collectFiles('/project', 'deploy.zip');
      expect(files).toEqual(['src/main.ts', 'index.js']);
    });

    it('should skip ignored directories early when ig is provided', () => {
      const ignoreLib = require('ignore');
      const ig = ignoreLib.default().add('node_modules');

      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('node_modules', { isDir: true }),
            makeDirent('src', { isDir: true }),
          ] as any;
        }
        if (String(dir) === '/project/src') {
          return [makeDirent('app.ts')] as any;
        }
        // If node_modules is entered, fail the test
        if (String(dir).includes('node_modules')) {
          throw new Error('Should not traverse into node_modules');
        }
        return [] as any;
      });

      const files = collectFiles('/project', 'deploy.zip', ig);
      expect(files).toEqual(['src/app.ts']);
    });

    it('should support negation patterns to re-include ignored files', () => {
      const ignoreLib = require('ignore');
      const ig = ignoreLib.default().add('*.log\n!important.log');

      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('debug.log'),
            makeDirent('important.log'),
            makeDirent('app.js'),
          ] as any;
        }
        return [] as any;
      });

      const files = collectFiles('/project', 'deploy.zip', ig);
      expect(files).toEqual(['important.log', 'app.js']);
      expect(files).not.toContain('debug.log');
    });

    it('should preserve symlinks as symlink entries by default (EB CLI parity)', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('link-to-parent', { isSymlink: true }),
            makeDirent('real-file.js'),
          ] as any;
        }
        return [] as any;
      });
      mockedFs.readlinkSync.mockReturnValue('..' as any);

      const entries = collectEntries('/project', 'deploy.zip');
      expect(entries).toEqual([
        { kind: 'symlink', relativePath: 'link-to-parent', target: '..' },
        { kind: 'file', relativePath: 'real-file.js', sourcePath: '/project/real-file.js' },
      ]);
    });

    it('should follow in-tree symlinks and inline target contents when symlinks="follow"', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('link-to-real', { isSymlink: true }),
            makeDirent('index.js'),
          ] as any;
        }
        return [] as any;
      });
      mockedFs.realpathSync.mockImplementation((p: any) => {
        if (String(p) === '/project/link-to-real') return '/project/real-target.js' as any;
        if (String(p) === '/project') return '/project' as any;
        return p as any;
      });
      mockedFs.statSync.mockReturnValue({ isDirectory: () => false, isFile: () => true } as any);

      const entries = collectEntries('/project', 'deploy.zip', undefined, 'follow');
      expect(entries).toEqual([
        { kind: 'file', relativePath: 'link-to-real', sourcePath: '/project/real-target.js' },
        { kind: 'file', relativePath: 'index.js', sourcePath: '/project/index.js' },
      ]);
    });

    it('should include multiple symlinks to the same file target when symlinks="follow"', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('alias-one', { isSymlink: true }),
            makeDirent('alias-two', { isSymlink: true }),
            makeDirent('index.js'),
          ] as any;
        }
        return [] as any;
      });
      mockedFs.realpathSync.mockImplementation((p: any) => {
        if (String(p) === '/project/alias-one') return '/project/shared.js' as any;
        if (String(p) === '/project/alias-two') return '/project/shared.js' as any;
        if (String(p) === '/project') return '/project' as any;
        return p as any;
      });
      mockedFs.statSync.mockReturnValue({ isDirectory: () => false, isFile: () => true } as any);

      const entries = collectEntries('/project', 'deploy.zip', undefined, 'follow');
      expect(entries).toEqual([
        { kind: 'file', relativePath: 'alias-one', sourcePath: '/project/shared.js' },
        { kind: 'file', relativePath: 'alias-two', sourcePath: '/project/shared.js' },
        { kind: 'file', relativePath: 'index.js', sourcePath: '/project/index.js' },
      ]);
    });

    it('should skip cyclic directory symlinks when symlinks="follow"', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('cycle-link', { isSymlink: true }),
            makeDirent('index.js'),
          ] as any;
        }
        return [] as any;
      });
      mockedFs.realpathSync.mockImplementation((p: any) => {
        if (String(p) === '/project/cycle-link') return '/project' as any;
        if (String(p) === '/project') return '/project' as any;
        return p as any;
      });
      mockedFs.statSync.mockReturnValue({ isDirectory: () => true, isFile: () => false } as any);

      const entries = collectEntries('/project', 'deploy.zip', undefined, 'follow');
      expect(entries).toEqual([
        { kind: 'file', relativePath: 'index.js', sourcePath: '/project/index.js' },
      ]);
    });

    it('should skip a symlink pointing at a real ancestor directory without duplicating contents', () => {
      // /project/a/loop -> /project/a
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [makeDirent('a', { isDir: true })] as any;
        }
        if (String(dir) === '/project/a') {
          return [
            makeDirent('f.js'),
            makeDirent('loop', { isSymlink: true }),
          ] as any;
        }
        return [] as any;
      });
      mockedFs.realpathSync.mockImplementation((p: any) => {
        if (String(p) === '/project/a/loop') return '/project/a' as any;
        return p as any;
      });
      mockedFs.statSync.mockReturnValue({ isDirectory: () => true, isFile: () => false } as any);

      const entries = collectEntries('/project', 'deploy.zip', undefined, 'follow');
      expect(entries).toEqual([
        { kind: 'file', relativePath: 'a/f.js', sourcePath: '/project/a/f.js' },
      ]);
    });

    it('should still follow sibling symlinks to the same real directory when not cyclic', () => {
      // l1 and l2 -> /project/shared, which is never on the stack when walked
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('shared', { isDir: true }),
            makeDirent('l1', { isSymlink: true }),
            makeDirent('l2', { isSymlink: true }),
          ] as any;
        }
        if (String(dir) === '/project/shared') {
          return [makeDirent('lib.js')] as any;
        }
        return [] as any;
      });
      mockedFs.realpathSync.mockImplementation((p: any) => {
        if (String(p) === '/project/l1' || String(p) === '/project/l2') return '/project/shared' as any;
        return p as any;
      });
      mockedFs.statSync.mockReturnValue({ isDirectory: () => true, isFile: () => false } as any);

      const entries = collectEntries('/project', 'deploy.zip', undefined, 'follow');
      expect(entries).toEqual([
        { kind: 'file', relativePath: 'shared/lib.js', sourcePath: '/project/shared/lib.js' },
        { kind: 'file', relativePath: 'l1/lib.js', sourcePath: '/project/shared/lib.js' },
        { kind: 'file', relativePath: 'l2/lib.js', sourcePath: '/project/shared/lib.js' },
      ]);
    });

    it('should throw when the source root directory cannot be resolved', () => {
      mockedFs.realpathSync.mockImplementation(() => {
        const err: any = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      });

      expect(() => collectFiles('/project', 'deploy.zip')).toThrow(
        "Cannot read source directory '/project': EACCES"
      );
    });

    it('should throw when the source root resolves but cannot be listed', () => {
      // realpathSync succeeds on a chmod 000 directory while readdirSync fails,
      // so the root must be rejected here too rather than yielding an empty zip.
      mockedFs.readdirSync.mockImplementation(() => {
        const err: any = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      });

      expect(() => collectFiles('/project', 'deploy.zip')).toThrow(
        "Cannot read source directory '/project': EACCES"
      );
    });

    it('should warn and skip an unreadable subdirectory without throwing', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('locked', { isDir: true }),
            makeDirent('index.js'),
          ] as any;
        }
        const err: any = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      });

      const files = collectFiles('/project', 'deploy.zip');

      expect(files).toEqual(['index.js']);
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Skipping unreadable directory: /project/locked')
      );
    });

    it('should skip external symlinks when symlinks="follow"', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            makeDirent('external-link', { isSymlink: true }),
            makeDirent('index.js'),
          ] as any;
        }
        return [] as any;
      });
      mockedFs.realpathSync.mockImplementation((p: any) => {
        if (String(p) === '/project/external-link') return '/outside/somefile' as any;
        if (String(p) === '/project') return '/project' as any;
        return p as any;
      });

      const entries = collectEntries('/project', 'deploy.zip', undefined, 'follow');
      expect(entries).toEqual([
        { kind: 'file', relativePath: 'index.js', sourcePath: '/project/index.js' },
      ]);
    });

    it('should exclude the zip file itself', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [makeDirent('deploy.zip'), makeDirent('app.js')] as any;
        }
        return [] as any;
      });

      const files = collectFiles('/project', 'deploy.zip');
      expect(files).toEqual(['app.js']);
    });

    it('should skip nested ignored directories', () => {
      const ignoreLib = require('ignore');
      const ig = ignoreLib.default().add('dist');

      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [makeDirent('src', { isDir: true }), makeDirent('index.js')] as any;
        }
        if (String(dir) === '/project/src') {
          return [makeDirent('dist', { isDir: true }), makeDirent('app.ts')] as any;
        }
        if (String(dir).includes('dist')) {
          throw new Error('Should not traverse into nested dist');
        }
        return [] as any;
      });

      const files = collectFiles('/project', 'deploy.zip', ig);
      expect(files).toEqual(['src/app.ts', 'index.js']);
      expect(files).not.toContain('dist');
    });

    it('should skip unreadable directories with a warning', () => {
      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [makeDirent('secret', { isDir: true }), makeDirent('app.js')] as any;
        }
        if (String(dir) === '/project/secret') {
          const err: any = new Error('EACCES: permission denied');
          err.code = 'EACCES';
          throw err;
        }
        return [] as any;
      });

      const files = collectFiles('/project', 'deploy.zip');
      expect(files).toEqual(['app.js']);
      expect(mockedCore.warning).toHaveBeenCalledWith(
        expect.stringContaining('Skipping unreadable directory')
      );
    });
  });

  describe('createZipFile with ignore filtering', () => {
    const mockedPath = require('path') as jest.Mocked<typeof import('path')>;
    let originalRelative: any;

    beforeEach(() => {
      originalRelative = mockedPath.relative;
      mockedPath.relative.mockImplementation((from: string, to: string) => {
        if (to.startsWith(from + '/')) {
          return to.slice(from.length + 1);
        }
        return to;
      });
    });

    afterEach(() => {
      mockedPath.relative.mockImplementation(originalRelative.getMockImplementation() || ((from: string, to: string) => to));
    });

    it('should filter files using ignore patterns and add only matching files', async () => {
      const archiver = require('archiver');
      const mockArchiveInstance = archiver();

      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            {
              name: 'app.js',
              isDirectory: () => false,
              isSymbolicLink: () => false,
              isFile: () => true,
            },
            {
              name: '.env',
              isDirectory: () => false,
              isSymbolicLink: () => false,
              isFile: () => true,
            },
            {
              name: 'README.md',
              isDirectory: () => false,
              isSymbolicLink: () => false,
              isFile: () => true,
            },
          ] as any;
        }
        return [] as any;
      });

      await createZipFile('deploy.zip', [], '.env\n', '/project');

      const fileNames = mockArchiveInstance.file.mock.calls.map((c: any[]) => c[1].name);
      expect(fileNames).toContain('app.js');
      expect(fileNames).toContain('README.md');
      expect(fileNames).not.toContain('.env');
    });

    it('should apply exclude patterns on top of ignore patterns', async () => {
      const archiver = require('archiver');
      const mockArchiveInstance = archiver();

      mockedFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir) === '/project') {
          return [
            {
              name: 'app.js',
              isDirectory: () => false,
              isSymbolicLink: () => false,
              isFile: () => true,
            },
            {
              name: 'debug.log',
              isDirectory: () => false,
              isSymbolicLink: () => false,
              isFile: () => true,
            },
            {
              name: 'README.md',
              isDirectory: () => false,
              isSymbolicLink: () => false,
              isFile: () => true,
            },
          ] as any;
        }
        return [] as any;
      });

      await createZipFile('deploy.zip', ['*.log'], '# no ignores\n', '/project');

      const fileNames = mockArchiveInstance.file.mock.calls.map((c: any[]) => c[1].name);
      expect(fileNames).toContain('app.js');
      expect(fileNames).toContain('README.md');
      expect(fileNames).not.toContain('debug.log');
    });

    it('should walk the source tree with exclude patterns when no ignore file is provided', async () => {
      const archiver = require('archiver');
      const mockArchiveInstance = archiver();
      mockedFs.readdirSync.mockReturnValueOnce([
        { name: 'app.js', isDirectory: () => false, isSymbolicLink: () => false, isFile: () => true } as any,
        { name: 'debug.log', isDirectory: () => false, isSymbolicLink: () => false, isFile: () => true } as any,
      ]);

      await createZipFile('deploy.zip', ['*.log'], null, '/project');

      // *.log excluded, app.js included
      expect(mockArchiveInstance.file).toHaveBeenCalledWith('/project/app.js', { name: 'app.js' });
      const debugAdded = (mockArchiveInstance.file as jest.Mock).mock.calls.some(
        (call: any[]) => call[1]?.name === 'debug.log'
      );
      expect(debugAdded).toBe(false);
    });
  });

  describe('loadIgnorePatterns', () => {
    it('should use .ebignore when present', () => {
      mockedFs.existsSync.mockImplementation((p: any) => {
        return String(p).endsWith('.ebignore');
      });
      mockedFs.readFileSync.mockReturnValue('node_modules\n.env\n');

      const result = loadIgnorePatterns('/workspace');
      expect(result).toEqual({ content: 'node_modules\n.env\n', source: '.ebignore' });
      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining('.ebignore'));
    });

    it('should fall back to .gitignore when .ebignore is absent', () => {
      mockedFs.existsSync.mockImplementation((p: any) => {
        return String(p).endsWith('.gitignore');
      });
      mockedFs.readFileSync.mockReturnValue('node_modules\n');

      const result = loadIgnorePatterns('/workspace');
      expect(result).toEqual({ content: 'node_modules\n', source: '.gitignore' });
      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining('.gitignore'));
    });

    it('should return null when neither file exists', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = loadIgnorePatterns('/workspace');
      expect(result).toBeNull();
      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining('No .ebignore or .gitignore found'));
    });
  });
});
