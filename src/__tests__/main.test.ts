// Mock all external dependencies
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  setSecret: jest.fn(),
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
  CreateApplicationCommand: jest.fn(),
  CreateApplicationVersionCommand: jest.fn((input) => ({ input })),
  UpdateEnvironmentCommand: jest.fn(),
  CreateEnvironmentCommand: jest.fn(),
  DescribeEnvironmentsCommand: jest.fn((input) => ({ input })),
  DescribeEventsCommand: jest.fn((input) => ({ input })),
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
} from '../aws-operations';
import { waitForDeploymentCompletion, waitForHealthRecovery, waitForEnvironmentReady, getEnvironmentInfo, sanitizeResourceIdentifiers } from '../monitoring';
import { AWSClients } from '../aws-clients';
import { CreateApplicationVersionCommand } from '@aws-sdk/client-elastic-beanstalk';

/** Inputs of every CreateApplicationVersionCommand constructed during the test. */
function createVersionInputs(): Record<string, unknown>[] {
  return (CreateApplicationVersionCommand as unknown as jest.Mock).mock.calls.map((c) => c[0]);
}

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

  describe('retryWithBackoff fail-fast rules', () => {
    it('should not retry when the version is incompatible with the target environment', async () => {
      const err = Object.assign(
        new Error("Application version 'v1' does not exist or is not compatible with Kubernetes-based environments for application 'app'."),
        { name: 'InvalidParameterValueException' }
      );
      const fn = jest.fn().mockRejectedValue(err);
      await expect(retryWithBackoff(fn, 3, 1, 'Update environment')).rejects.toThrow('not compatible');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should still retry an InvalidParameterValueException for an environment that is not Ready', async () => {
      const err = Object.assign(
        new Error('Environment named env is in an invalid state for this operation. Must be Ready.'),
        { name: 'InvalidParameterValueException' }
      );
      const fn = jest.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');
      await expect(retryWithBackoff(fn, 1, 1, 'Update environment')).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
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

    it('should return the environment tier name when present', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster', Type: 'EKS' } }],
      });
      const result = await environmentExists(mockClients, 'app', 'env');
      expect(result).toEqual({
        exists: true,
        status: 'Ready',
        health: 'Green',
        tierName: 'Cluster',
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

    it('should create a Beanstalk Cluster environment with the Cluster/EKS tier and no platform', async () => {
      const { CreateEnvironmentCommand } = require('@aws-sdk/client-elastic-beanstalk');
      mockSend.mockResolvedValue({});
      await createEnvironment(mockClients, 'app', 'env', 'v1.0.0', '[]', undefined, undefined, undefined, 3, 1, true);
      expect(CreateEnvironmentCommand).toHaveBeenCalledWith(
        expect.objectContaining({ Tier: { Name: 'Cluster', Type: 'EKS' } })
      );
      const params = CreateEnvironmentCommand.mock.calls[0][0];
      expect(params.SolutionStackName).toBeUndefined();
      expect(params.PlatformArn).toBeUndefined();
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
    it('should read events scoped to both the application and the environment', async () => {
      mockSend
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green' }] })
        .mockResolvedValueOnce({ Events: [] });
      await waitForDeploymentCompletion(mockClients, 'app', 'env', 60, false, 'update', new Date(0));
      const { DescribeEventsCommand } = require('@aws-sdk/client-elastic-beanstalk');
      expect(DescribeEventsCommand).toHaveBeenCalledWith(expect.objectContaining({ ApplicationName: 'app', EnvironmentName: 'env' }));
    });

    it('should wait for deployment', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Status: 'Ready' }],
      });
      await waitForDeploymentCompletion(mockClients, 'app', 'env', 900, false);
      expect(mockSend).toHaveBeenCalled();
    });

    const deploymentStartTime = new Date('2025-01-01T00:00:00Z');

    it('should throw when the environment persistently runs a different version than requested', async () => {
      jest.useFakeTimers();
      try {
        mockSend.mockResolvedValue({ Environments: [{ Status: 'Ready', VersionLabel: 'v1.0.0' }] });

        const deployment = waitForDeploymentCompletion(mockClients, 'app', 'env', 900, false, 'update', deploymentStartTime, 'v2.0.0');
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

        const deployment = waitForDeploymentCompletion(mockClients, 'app', 'env', 900, false, 'update', deploymentStartTime, 'v2.0.0');
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
        mockSend.mockResolvedValue({ Environments: [{ Status: 'Ready', VersionLabel: 'v1.0.0' }] });

        const deployment = waitForDeploymentCompletion(mockClients, 'app', 'env', 1, false, 'update', deploymentStartTime, 'v2.0.0');
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
          .mockResolvedValueOnce({}) // events
          .mockResolvedValue({ Environments: [{ Status: 'Ready', VersionLabel: 'v2.0.0' }] });

        const deployment = waitForDeploymentCompletion(mockClients, 'app', 'env', 900, false, 'update', deploymentStartTime, 'v2.0.0');
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
          Events: [{ EventDate: new Date('2025-01-01T00:01:00Z'), Severity: 'ERROR', Message: 'Failed to deploy application.' }],
        });

      await expect(
        waitForDeploymentCompletion(mockClients, 'app', 'env', 900, false, 'update', deploymentStartTime, 'v2.0.0')
      ).rejects.toThrow('Environment deployment failed - fatal or error event detected: Failed to deploy application.');
    });

    it('should complete when the environment runs the requested version', async () => {
      mockSend.mockResolvedValue({ Environments: [{ Status: 'Ready', VersionLabel: 'v2.0.0' }] });

      await expect(
        waitForDeploymentCompletion(mockClients, 'app', 'env', 900, false, 'update', deploymentStartTime, 'v2.0.0')
      ).resolves.toBeUndefined();
    });

    it('should throw even when status is Ready if an error event is present in the same poll', async () => {
      // Regression test: a failed launch can flip Status to Ready in the same poll cycle
      // the failure event appears (EB doesn't hold status in a distinct "Failed" state).
      // The Ready branch must not short-circuit past the error check.
      mockSend.mockImplementation((command: any) => {
        if (command.input?.MaxRecords) {
          return Promise.resolve({
            Events: [
              {
                EventDate: new Date('2025-01-01'),
                Severity: 'ERROR',
                Message: 'Failed to launch environment',
              },
            ],
          });
        }
        return Promise.resolve({ Environments: [{ Status: 'Ready' }] });
      });

      await expect(waitForDeploymentCompletion(mockClients, 'app', 'env', 900, false))
        .rejects.toThrow('Environment deployment failed - fatal or error event detected: Failed to launch environment');
    });
  });

  describe('waitForDeploymentCompletion timeout diagnostics', () => {
    it('should report an ERROR event found on the final check instead of a bare timeout', async () => {
      const deploymentStartTime = new Date(0);
      // Poll: env Updating, no events; then the deadline passes and the final check finds an ERROR
      mockSend
        .mockResolvedValueOnce({ Environments: [{ Status: 'Updating' }] })
        .mockResolvedValueOnce({ Events: [] })
        .mockResolvedValueOnce({ Events: [{ EventDate: new Date(60000), Severity: 'ERROR', Message: 'Failed to deploy application.' }] });

      await expect(waitForDeploymentCompletion(mockClients, 'app', 'env', 1, true, 'update', deploymentStartTime))
        .rejects.toThrow('Deployment timed out after 1s - fatal or error event detected: Failed to deploy application.');
    });
  });

  describe('waitForEnvironmentReady', () => {
    it('should keep polling after a transient DescribeEnvironments failure', async () => {
      jest.useFakeTimers();
      try {
        mockSend
          .mockRejectedValueOnce(new Error('Rate exceeded')) // transient
          .mockResolvedValueOnce({ Environments: [{ Status: 'Ready' }] });

        const wait = waitForEnvironmentReady(mockClients, 'app', 'env', 900, false);
        await jest.advanceTimersByTimeAsync(10000);
        await expect(wait).resolves.toBeUndefined();
        expect(mockedCore.warning).toHaveBeenCalledWith(expect.stringContaining('Could not read environment status (will retry): Rate exceeded'));
      } finally {
        jest.useRealTimers();
      }
    });

    it('should fail immediately on a permanent DescribeEnvironments failure', async () => {
      const denied = new Error('User is not authorized to perform elasticbeanstalk:DescribeEnvironments');
      denied.name = 'AccessDeniedException';
      mockSend.mockRejectedValueOnce(denied);

      await expect(waitForEnvironmentReady(mockClients, 'app', 'env', 900, false)).rejects.toThrow('not authorized');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return without waiting when the environment is already Ready', async () => {
      mockSend.mockResolvedValueOnce({ Environments: [{ Status: 'Ready' }] });
      await expect(waitForEnvironmentReady(mockClients, 'app', 'env', 900, false)).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('waitForHealthRecovery', () => {
    it('should wait for green health', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Health: 'Green', Status: 'Ready' }],
      });
      await waitForHealthRecovery(mockClients, 'app', 'env', 900, false);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should wait for yellow health', async () => {
      mockSend.mockResolvedValue({
        Environments: [{ Health: 'Yellow', Status: 'Ready' }],
      });
      await waitForHealthRecovery(mockClients, 'app', 'env', 900, false);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should throw error for red health with an error event present', async () => {
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
      await expect(waitForHealthRecovery(mockClients, 'app', 'env', 1, false))
        .rejects.toThrow('Environment health recovery failed - fatal or error event detected: Deployment failed');
    });

    it('should throw "health is Red" when no error event is present', async () => {
      mockSend.mockImplementation((command: any) => {
        if (command.input?.MaxRecords) {
          return Promise.resolve({ Events: [] });
        }
        return Promise.resolve({ Environments: [{ Health: 'Red', Status: 'Ready' }] });
      });
      await expect(waitForHealthRecovery(mockClients, 'app', 'env', 1, false))
        .rejects.toThrow('Environment health recovery failed - health is Red');
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
      await expect(waitForHealthRecovery(mockClients, 'app', 'env', 1, false))
        .rejects.toThrow('Environment health recovery timed out after 1s');
    });
  });

  describe('sanitizeResourceIdentifiers', () => {
    it('should mask EC2 instance IDs', () => {
      expect(sanitizeResourceIdentifiers('Failed on i-0a1b2c3d4e5f67890'))
        .toBe('Failed on ***');
    });

    it('should mask security group IDs', () => {
      expect(sanitizeResourceIdentifiers('Created security group named: sg-0a1b2c3d4e5f67890'))
        .toBe('Created security group named: ***');
    });

    it('should mask ARNs', () => {
      expect(sanitizeResourceIdentifiers('Policy: arn:aws:autoscaling:us-west-2:000000000000:scalingPolicy:example'))
        .toBe('Policy: ***');
      expect(sanitizeResourceIdentifiers('Role: arn:aws-us-gov:iam::000000000000:role/my-role'))
        .toBe('Role: ***');
    });

    it('should mask EB-generated resource names', () => {
      expect(sanitizeResourceIdentifiers('Created: awseb-e-abcdefghij-stack-AWSEBAutoScalingGroup-EXAMPLE123'))
        .toBe('Created: ***');
    });

    it('should mask EB environment IDs', () => {
      expect(sanitizeResourceIdentifiers('Environment e-abcdefghij not found'))
        .toBe('Environment *** not found');
    });

    it('should mask ECR image references', () => {
      expect(sanitizeResourceIdentifiers('Image 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app@sha256:abc123 not found'))
        .toBe('Image *** not found');
      expect(sanitizeResourceIdentifiers('Pulling 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:v1'))
        .toBe('Pulling ***');
    });

    it('should mask IP addresses', () => {
      expect(sanitizeResourceIdentifiers('Connected to 10.0.0.1'))
        .toBe('Connected to ***');
    });

    it('should mask multiple identifiers in one message', () => {
      expect(sanitizeResourceIdentifiers('Instance i-0a1b2c3d4e5f67890 in sg-0f9e8d7c6b5a43210 failed'))
        .toBe('Instance *** in *** failed');
    });

    it('should leave non-sensitive text unchanged', () => {
      expect(sanitizeResourceIdentifiers('Deployment completed successfully'))
        .toBe('Deployment completed successfully');
      expect(sanitizeResourceIdentifiers('Environment health recovery failed - health is Red'))
        .toBe('Environment health recovery failed - health is Red');
      // Dotted version strings are not IPv4 addresses
      expect(sanitizeResourceIdentifiers('Deployed version 1.2.3.400 to platform 4.9.2'))
        .toBe('Deployed version 1.2.3.400 to platform 4.9.2');
    });

    it('should not consume punctuation around ECR image references', () => {
      expect(sanitizeResourceIdentifiers('Image (123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1), retrying'))
        .toBe('Image (***), retrying');
      expect(sanitizeResourceIdentifiers('Pulled 123456789012.dkr.ecr.us-east-1.amazonaws.com/app@sha256:abc.'))
        .toBe('Pulled ***.');
      expect(sanitizeResourceIdentifiers('Image <123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1> not found!'))
        .toBe('Image <***> not found!');
    });
  });

  describe('event logging and mask-resource-identifiers', () => {
    const events = {
      Events: [
        { EventDate: new Date('2024-01-01T00:00:10Z'), Severity: 'INFO', Message: 'Created security group named: sg-0a1b2c3d4e5f67890' },
        { EventDate: new Date('2024-01-01T00:00:20Z'), Severity: 'ERROR', Message: 'Launching instance i-0a1b2c3d4e5f67890 failed' },
      ],
    };

    it('should print event details when masking is off', async () => {
      mockSend
        .mockResolvedValueOnce({ Environments: [{ Status: 'Updating' }] }) // DescribeEnvironments
        .mockResolvedValueOnce(events); // DescribeEvents

      await expect(waitForDeploymentCompletion(mockClients, 'app', 'env', 900, false, 'update', new Date(0)))
        .rejects.toThrow('fatal or error event detected: Launching instance i-0a1b2c3d4e5f67890 failed');

      expect(mockedCore.info).toHaveBeenCalledWith('📋 Recent events:');
      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining('sg-0a1b2c3d4e5f67890'));
      expect(mockedCore.error).toHaveBeenCalledWith(expect.stringContaining('i-0a1b2c3d4e5f67890'));
    });

    it('should suppress event details but still detect errors when masking is on', async () => {
      mockSend
        .mockResolvedValueOnce({ Environments: [{ Status: 'Updating' }] }) // DescribeEnvironments
        .mockResolvedValueOnce(events); // DescribeEvents

      // The raw event message still surfaces in the thrown error; main() sanitizes it before logging.
      await expect(waitForDeploymentCompletion(mockClients, 'app', 'env', 900, true, 'update', new Date(0)))
        .rejects.toThrow('fatal or error event detected: Launching instance i-0a1b2c3d4e5f67890 failed');

      expect(mockedCore.info).not.toHaveBeenCalledWith('📋 Recent events:');
      expect(mockedCore.info).not.toHaveBeenCalledWith(expect.stringContaining('sg-0a1b2c3d4e5f67890'));
      expect(mockedCore.error).not.toHaveBeenCalled();
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
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'WebServer' } }] }) // DescribeEnvironments
        .mockResolvedValueOnce({}) // HeadBucket (bucket exists, owned by us)
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateAppVersion
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce({ Environments: [{ CNAME: 'test-env.elasticbeanstalk.com', EnvironmentId: 'e-123', Status: 'Ready', Health: 'Green' }] }); // GetEnvironmentInfo

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

      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce({ Environments: [] }) // DescribeEnvironments (no env found)
        .mockResolvedValueOnce({}) // HeadBucket (bucket exists, owned by us)
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateAppVersion
        .mockResolvedValueOnce({}) // CreateEnv
        .mockResolvedValueOnce({ Environments: [{ CNAME: 'new-env.elasticbeanstalk.com', EnvironmentId: 'e-new', Status: 'Ready', Health: 'Green' }] }); // GetEnvironmentInfo

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

      // Mock sequence: STS -> DescribeEnvs -> applicationVersionExists (true) -> getVersionS3Location -> DescribeEnvs (fresh) -> UpdateEnv -> GetEnvInfo
      // No S3 calls since version already exists
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'WebServer' } }] })
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', SourceBundle: { S3Bucket: 'my-bucket', S3Key: 'my-app/v1.0.0.zip' } }] })
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', SourceBundle: { S3Bucket: 'my-bucket', S3Key: 'my-app/v1.0.0.zip' } }] })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'WebServer' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce({ Environments: [{ CNAME: 'test.com', EnvironmentId: 'e-123', Status: 'Ready', Health: 'Green' }] });

      await run();

      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('version-label', 'v1.0.0');
    });

    // STS -> DescribeEnvs -> HeadBucket -> PutObject -> CreateAppVersion -> DescribeEnvs (fresh) -> UpdateEnv -> GetEnvInfo
    function mockStandardUpdateFlow() {
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'WebServer' } }] })
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateAppVersion
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'WebServer' } }] })
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce({ Environments: [{ CNAME: 'test.com', EnvironmentId: 'e-123', Status: 'Ready', Health: 'Green' }] });
    }

    it('should mask sensitive identifiers when mask-resource-identifiers is true', async () => {
      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'create-s3-bucket-if-not-exists') return true;
        if (name === 'mask-resource-identifiers') return true;
        return false;
      });
      mockStandardUpdateFlow();

      await run();

      expect(mockedCore.setFailed).not.toHaveBeenCalled();
      expect(mockedCore.setSecret).toHaveBeenCalledWith('123456789012');
      expect(mockedCore.setSecret).toHaveBeenCalledWith('test-app');
      expect(mockedCore.setSecret).toHaveBeenCalledWith('test-env');
      expect(mockedCore.setSecret).toHaveBeenCalledWith('v1.0.0');
      expect(mockedCore.setSecret).toHaveBeenCalledWith('elasticbeanstalk-us-east-1-123456789012');
      expect(mockedCore.setSecret).toHaveBeenCalledWith('test.com');
      expect(mockedCore.setSecret).toHaveBeenCalledWith('e-123');
      // Identifiers are registered with the masker before the first log line that contains them
      const firstAppMask = mockedCore.setSecret.mock.invocationCallOrder[mockedCore.setSecret.mock.calls.findIndex(c => c[0] === 'test-app')];
      const firstAppLog = mockedCore.info.mock.invocationCallOrder[mockedCore.info.mock.calls.findIndex(c => String(c[0]).includes('test-app'))];
      expect(firstAppMask).toBeLessThan(firstAppLog);
      // Outputs are still set (masking is handled by the runner, not by withholding outputs)
      expect(mockedCore.setOutput).toHaveBeenCalledWith('environment-url', 'test.com');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('environment-id', 'e-123');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('version-label', 'v1.0.0');
    });

    it('should warn when a masked value is shorter than 8 characters', async () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'prod',
          'solution-stack-name': '64bit Amazon Linux 2',
          'version-label': 'v1.0.0-long-enough',
          'deployment-timeout': '900',
          'max-retries': '3',
          'retry-delay': '1',
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockImplementation((name: string) =>
        name === 'create-s3-bucket-if-not-exists' || name === 'mask-resource-identifiers');
      mockStandardUpdateFlow();

      await run();

      expect(mockedCore.setFailed).not.toHaveBeenCalled();
      expect(mockedCore.setSecret).toHaveBeenCalledWith('prod');
      expect(mockedCore.warning).toHaveBeenCalledWith(expect.stringContaining('environment-name is only 4 characters long'));
      // The warning must not leak the value it is about
      const warnings = mockedCore.warning.mock.calls.map(c => String(c[0])).join('\n');
      expect(warnings).not.toContain("'prod'");
      // Long values do not warn
      expect(warnings).not.toContain('application-name is only');
    });

    it('should not mask the version label when it defaults to the commit SHA', async () => {
      const sha = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
      const prevSha = process.env.GITHUB_SHA;
      process.env.GITHUB_SHA = sha;
      try {
        mockedCore.getInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            'aws-region': 'us-east-1',
            'application-name': 'test-app',
            'environment-name': 'test-env',
            'solution-stack-name': '64bit Amazon Linux 2',
            'deployment-timeout': '900',
            'max-retries': '3',
            'retry-delay': '1',
          };
          return inputs[name] || '';
        });
        mockedCore.getBooleanInput.mockImplementation((name: string) =>
          name === 'create-s3-bucket-if-not-exists' || name === 'mask-resource-identifiers');
        mockStandardUpdateFlow();

        await run();

        expect(mockedCore.setFailed).not.toHaveBeenCalled();
        expect(mockedCore.setSecret).toHaveBeenCalledWith('test-app');
        expect(mockedCore.setSecret).not.toHaveBeenCalledWith(sha);
        expect(mockedCore.setOutput).toHaveBeenCalledWith('version-label', sha);
      } finally {
        if (prevSha === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = prevSha;
      }
    });

    it('should not mask identifiers when mask-resource-identifiers is false (default)', async () => {
      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'create-s3-bucket-if-not-exists') return true;
        if (name === 'mask-resource-identifiers') return false;
        return false;
      });
      mockStandardUpdateFlow();

      await run();

      expect(mockedCore.setFailed).not.toHaveBeenCalled();
      expect(mockedCore.setSecret).not.toHaveBeenCalled();
    });

    it('should sanitize resource identifiers in the failure message when mask-resource-identifiers is true', async () => {
      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'create-s3-bucket-if-not-exists') return true;
        if (name === 'mask-resource-identifiers') return true;
        return false;
      });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockRejectedValue(Object.assign(new Error('Environment e-abcdefghij is bound to arn:aws:iam::123456789012:role/r and instance i-0a1b2c3d4e5f67890'), { name: 'AccessDeniedException' }));

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('Environment *** is bound to *** and instance ***'));
      expect(mockedCore.setFailed).not.toHaveBeenCalledWith(expect.stringContaining('i-0a1b2c3d4e5f67890'));
      expect(mockedCore.error).toHaveBeenCalledWith(expect.stringContaining('Environment *** is bound to *** and instance ***'));
    });

    it('should log an ERROR event only in sanitized form when mask-resource-identifiers is true (end to end)', async () => {
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'WebServer' } }] })
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateAppVersion
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'WebServer' } }] })
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce({ Environments: [{ Status: 'Updating', Health: 'Grey' }] }) // DescribeEnvironments (deployment poll)
        .mockResolvedValueOnce({ Events: [{ EventDate: new Date(Date.now() + 60000), Severity: 'ERROR', Message: 'Creating security group failed: sg-0a1b2c3d4e5f67890 on i-0a1b2c3d4e5f67890' }] });

      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'create-s3-bucket-if-not-exists') return true;
        if (name === 'wait-for-deployment') return true;
        if (name === 'mask-resource-identifiers') return true;
        return false;
      });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('Creating security group failed: *** on ***'));
      const allLogged = [...mockedCore.info.mock.calls, ...mockedCore.warning.mock.calls, ...mockedCore.error.mock.calls, ...mockedCore.setFailed.mock.calls]
        .map(c => String(c[0])).join('\n');
      expect(allLogged).not.toContain('sg-0a1b2c3d4e5f67890');
      expect(allLogged).not.toContain('i-0a1b2c3d4e5f67890');
    });

    it('should keep resource identifiers in the failure message when masking is off', async () => {
      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'create-s3-bucket-if-not-exists') return true;
        if (name === 'mask-resource-identifiers') return false;
        return false;
      });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockRejectedValue(Object.assign(new Error('Launching instance i-0a1b2c3d4e5f67890 failed'), { name: 'AccessDeniedException' }));

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('i-0a1b2c3d4e5f67890'));
    });

    const clusterEnv = { Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster', Type: 'EKS' } }] };
    const envInfo = { Environments: [{ CNAME: 'test.com', EnvironmentId: 'e-123', Status: 'Ready', Health: 'Green' }] };
    const BUILD_CONFIG = JSON.stringify({ Type: 'docker', CodeBuildServiceRole: 'arn:role' });
    const IMAGE_URI = '654654172698.dkr.ecr.us-west-1.amazonaws.com/app@sha256:abc';
    // DescribeApplicationVersions responses for the post-create/reuse image check
    const versionWithImage = { ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED', ImageSource: { Uri: IMAGE_URI } }] };
    const versionWithoutImage = { ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED' }] };

    function useClusterInputs(extra: Record<string, string>, reuse = true) {
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'version-label': 'v1.0.0',
          ...extra,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'use-existing-application-version-if-available') return reuse;
        if (name === 'create-environment-if-not-exists') return true;
        if (name === 'create-application-if-not-exists') return true;
        if (name === 'create-s3-bucket-if-not-exists') return true;
        return false;
      });
    }

    it('should create a new BYOI version and update an existing Beanstalk Cluster environment', async () => {
      useClusterInputs({ 'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1' });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce(clusterEnv) // DescribeEnvironments
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce(versionWithImage) // DescribeApplicationVersions (image check)
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo); // GetEnvironmentInfo

      await run();

      expect(createVersionInputs()).toEqual([expect.objectContaining({
        ApplicationName: 'test-app',
        VersionLabel: 'v1.0.0',
        ImageConfiguration: { Source: { Uri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1' } },
        AutoCreateApplication: true,
      })]);
      expect(createVersionInputs()[0]).not.toHaveProperty('SourceBundle');
      expect(createVersionInputs()[0]).not.toHaveProperty('Process');
      // The created version is verified to carry an image before deploying
      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining(`Image: ${IMAGE_URI}`));
      expect(mockSend).toHaveBeenCalledTimes(8);
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });

    it('should create the application, a BYOI version, and a new Cluster-tier environment on first deploy', async () => {
      useClusterInputs({
        'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1',
        'option-settings': JSON.stringify([
          { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: 'arn:aws:iam::123456789012:role/c' },
          { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: 'arn:aws:iam::123456789012:role/n' },
          { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/o' },
        ]),
      });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce({ Environments: [] }) // DescribeEnvironments (none)
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce(versionWithImage) // DescribeApplicationVersions (image check)
        .mockResolvedValueOnce({}) // CreateEnvironment
        .mockResolvedValueOnce(envInfo); // GetEnvironmentInfo

      await run();

      expect(createVersionInputs()).toHaveLength(1);
      // The application is created via AutoCreateApplication on CreateApplicationVersion — no separate calls
      expect(mockSend).toHaveBeenCalledTimes(7);
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'create');
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });

    it('should reuse an existing version in BYOI mode as-is', async () => {
      useClusterInputs({ 'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1' });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce(clusterEnv) // DescribeEnvironments
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0' }] }) // DescribeApplicationVersions (exists)
        .mockResolvedValueOnce(versionWithImage) // DescribeApplicationVersions (image check)
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo); // GetEnvironmentInfo

      await run();

      expect(createVersionInputs()).toHaveLength(0);
      // A reused version is verified to carry an image before deploying, like a created one
      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining(`Image: ${IMAGE_URI}`));
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });

    it('should fail when a reused version has no image (e.g. a source bundle under the label)', async () => {
      useClusterInputs({ 'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1' });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce(clusterEnv) // DescribeEnvironments
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'UNPROCESSED' }] }) // exists
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'UNPROCESSED', SourceBundle: { S3Bucket: 'b', S3Key: 'k' } }] }); // image check: none

      await run();

      expect(createVersionInputs()).toHaveLength(0);
      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('has no container image. The existing version under this label has no image'));
      expect(mockSend).toHaveBeenCalledTimes(4); // no UpdateEnvironment
    });

    it('should take a final status read at the build deadline instead of stopping early', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      try {
        useClusterInputs({ 'build-configuration': JSON.stringify({ Type: 'docker', CodeBuildServiceRole: 'arn:role', TimeoutInMinutes: 5 }) });
        let polls = 0;
        mockSend
          .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
          .mockResolvedValueOnce(clusterEnv) // DescribeEnvironments
          .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
          .mockResolvedValueOnce({}) // HeadBucket
          .mockResolvedValueOnce({}) // PutObject
          .mockResolvedValueOnce({}) // CreateApplicationVersion
          .mockImplementation(async () => { polls += 1; return { ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'BUILDING' }] }; });

        const runPromise = run();
        // budget = 5 min + 120 s grace = 420 s; advance past it in poll-sized steps
        for (let i = 0; i < 40; i++) {
          await jest.advanceTimersByTimeAsync(15000);
        }
        await runPromise;

        // one read per 15 s poll within the budget, plus exactly one final read at the deadline
        expect(polls).toBe(420 / 15 + 1);
        expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('Image build did not complete within 5 minutes (last status: BUILDING)'));
      } finally {
        jest.useRealTimers();
      }
    });

    it('should create a build-configuration version, wait for the image build, and deploy', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce(clusterEnv) // DescribeEnvironments
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED' }] }) // build poll
        .mockResolvedValueOnce(versionWithImage) // DescribeApplicationVersions (image check)
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo); // GetEnvironmentInfo

      await run();

      expect(createVersionInputs()).toEqual([expect.objectContaining({
        ApplicationName: 'test-app',
        VersionLabel: 'v1.0.0',
        SourceBundle: { S3Bucket: expect.any(String), S3Key: expect.any(String) },
        ImageConfiguration: { Build: { Type: 'docker', CodeBuildServiceRole: 'arn:role' } },
        Process: true,
        AutoCreateApplication: true,
      })]);
      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining(`Image: ${IMAGE_URI}`));
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });

    it('should pass ComputeType/TimeoutInMinutes through and use TimeoutInMinutes as the build wait budget shown in the log group', async () => {
      const cfg = { Type: 'docker', CodeBuildServiceRole: 'arn:role', ComputeType: 'BUILD_GENERAL1_SMALL', TimeoutInMinutes: 5 };
      useClusterInputs({ 'build-configuration': JSON.stringify(cfg) });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED' }] }) // build poll
        .mockResolvedValueOnce(versionWithImage) // DescribeApplicationVersions (image check)
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo);

      await run();

      // The whole build-configuration object is passed through untouched as ImageConfiguration.Build
      expect(createVersionInputs()[0]).toMatchObject({ ImageConfiguration: { Build: cfg }, Process: true });
      expect(mockedCore.startGroup).toHaveBeenCalledWith(expect.stringContaining('up to 5 minutes'));
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });

    it('should fail before creating a version when build-configuration has fields the SDK does not model', async () => {
      const cfg = { Type: 'docker', CodeBuildServiceRole: 'arn:role', SomeFutureField: 'x', Nested: { a: 1 }, constructor: 'not-a-field' };
      useClusterInputs({ 'build-configuration': JSON.stringify(cfg) });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv);

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('build-configuration field(s) SomeFutureField, Nested, constructor are not part of ImageConfiguration.Build'));
      // Nothing packaged, uploaded, or created: the label is not consumed
      const archiver = require('archiver');
      expect(archiver).not.toHaveBeenCalled();
      expect(createVersionInputs()).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should accept a build-configuration that uses only modeled fields', async () => {
      useClusterInputs({ 'build-configuration': JSON.stringify({ Type: 'docker', CodeBuildServiceRole: 'arn:role', DockerfileLocation: 'app/Dockerfile', Architecture: 'arm64', ComputeType: 'BUILD_GENERAL1_SMALL', TimeoutInMinutes: 30, Buildpack: 'paketobuildpacks/builder-jammy-base' }) });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [] })
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED' }] }) // build poll
        .mockResolvedValueOnce(versionWithImage) // image check
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo);

      await run();

      expect(mockedCore.setFailed).not.toHaveBeenCalled();
      expect(createVersionInputs()).toHaveLength(1);
    });

    it('should fail when a build reports PROCESSED but the version has no image (service dropped the build settings)', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce(versionWithoutImage) // build poll -> PROCESSED
        .mockResolvedValueOnce(versionWithoutImage); // image check -> no ImageSource

      await run();

      expect(createVersionInputs()).toHaveLength(1);
      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('has no container image. The version reports PROCESSED but no image was built'));
      // Nothing was deployed: no UpdateEnvironment call after the image check
      expect(mockSend).toHaveBeenCalledTimes(8);
    });

    it('should fail when a BYOI version is created without the image being recorded', async () => {
      useClusterInputs({ 'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1' });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', SourceBundle: { S3Bucket: 'sample', S3Key: 'GenericSampleApplication' } }] }); // image check: none

      await run();

      expect(createVersionInputs()).toHaveLength(1);
      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('did not record the image-uri on the version'));
      expect(mockSend).toHaveBeenCalledTimes(5);
    });

    it('should wait for an Updating environment to become Ready before updating it', async () => {
      useClusterInputs({ 'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1' });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Updating', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // initial check
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // version lookup
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce(versionWithImage) // image check
        .mockResolvedValueOnce({ Environments: [{ Status: 'Updating', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // fresh status: still Updating -> wait
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // wait poll -> Ready
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo);

      await run();

      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining('is Updating; waiting for it to become Ready'));
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    }, 40000);

    it('should fail fast when the environment is Terminating', async () => {
      useClusterInputs({ 'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1' });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Terminating', Health: 'Grey', Tier: { Name: 'Cluster' } }] });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('is terminating and cannot be deployed to'));
      // Fails before any version is created or the label consumed
      expect(createVersionInputs()).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should fall back to the default build timeout when TimeoutInMinutes is not numeric', async () => {
      useClusterInputs({ 'build-configuration': JSON.stringify({ Type: 'docker', CodeBuildServiceRole: 'arn:role', TimeoutInMinutes: 'soon' }) });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [] })
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED' }] }) // build poll
        .mockResolvedValueOnce(versionWithImage) // image check
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo);

      await run();

      expect(mockedCore.startGroup).toHaveBeenCalledWith(expect.stringContaining('up to 60 minutes'));
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });

    it('should fail fast when reusing a version whose image build FAILED', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'FAILED' }] }); // existing version

      await run();

      expect(createVersionInputs()).toHaveLength(0);
      const archiver = require('archiver');
      expect(archiver).not.toHaveBeenCalled();
      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('its image build FAILED, so it cannot be deployed'));
      // Fails before any environment call
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should wait for a still-BUILDING existing version and then reuse it', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'BUILDING' }] }) // existing, in progress
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED' }] }) // poll -> done
        .mockResolvedValueOnce(versionWithImage) // image check
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo);

      await run();

      expect(createVersionInputs()).toHaveLength(0);
      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining('image build is still BUILDING; waiting for it to finish'));
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });

    it('should wait for a reused in-progress build using that version\'s own TimeoutInMinutes, not the current input', async () => {
      // Current input says 5 minutes; the existing version was created with a 180-minute build.
      useClusterInputs({ 'build-configuration': JSON.stringify({ Type: 'docker', CodeBuildServiceRole: 'arn:role', TimeoutInMinutes: 5 }) });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'BUILDING', ImageBuildConfiguration: { Type: 'docker', TimeoutInMinutes: 180 } }] }) // existing, in progress
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED' }] }) // poll -> done
        .mockResolvedValueOnce(versionWithImage) // image check
        .mockResolvedValueOnce(clusterEnv) // fresh status before update
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo);

      await run();

      expect(mockedCore.info).toHaveBeenCalledWith(expect.stringContaining('image build is still BUILDING; waiting for it to finish'));
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
      // The wait budget came from the existing version (180 min), so the timeout message would name it
      expect(mockedCore.setFailed).not.toHaveBeenCalledWith(expect.stringContaining('within 5 minutes'));
    });

    it('should fail fast in BYOI mode when the label holds a FAILED build version', async () => {
      useClusterInputs({ 'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1' });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'FAILED' }] });

      await run();

      expect(createVersionInputs()).toHaveLength(0);
      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('its image build FAILED'));
    });

    it('should stop polling the image build immediately when credentials expire', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      const expired = new Error('The security token included in the request is expired');
      expired.name = 'ExpiredTokenException';
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockRejectedValueOnce(expired); // build poll #1: credentials gone

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('security token included in the request is expired'));
      expect(mockedCore.setFailed).not.toHaveBeenCalledWith(expect.stringContaining('Image build did not complete'));
      expect(mockSend).toHaveBeenCalledTimes(7); // no further polls
    });

    it('should fail when the image build reports FAILED', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'FAILED' }] }); // build poll

      await run();

      expect(createVersionInputs()).toHaveLength(1);
      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('Image build failed'));
    });

    it('should reuse an existing version in build-configuration mode and skip packaging and the image build', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED' }] }) // DescribeApplicationVersions (exists)
        .mockResolvedValueOnce(versionWithImage) // image check
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo);

      await run();

      expect(createVersionInputs()).toHaveLength(0);
      const archiver = require('archiver');
      expect(archiver).not.toHaveBeenCalled();
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });

    it('should keep polling the image build after a transient describe error', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce(clusterEnv)
        .mockResolvedValueOnce({ ApplicationVersions: [] }) // DescribeApplicationVersions (none)
        .mockResolvedValueOnce({}) // HeadBucket
        .mockResolvedValueOnce({}) // PutObject
        .mockResolvedValueOnce({}) // CreateApplicationVersion
        .mockRejectedValueOnce(new Error('Throttling')) // build poll #1 fails transiently
        .mockResolvedValueOnce({ ApplicationVersions: [{ VersionLabel: 'v1.0.0', Status: 'PROCESSED' }] }) // build poll #2
        .mockResolvedValueOnce(versionWithImage) // image check
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'Cluster' } }] }) // DescribeEnvironments (fresh status before update)
        .mockResolvedValueOnce({}) // UpdateEnvironment
        .mockResolvedValueOnce(envInfo);

      await run();

      expect(mockedCore.warning).toHaveBeenCalledWith(expect.stringMatching(/Could not read build status \(will retry\).*Throttling/));
      expect(mockedCore.setOutput).toHaveBeenCalledWith('deployment-action-type', 'update');
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    }, 40000);

    it('should fail fast when deploying a source bundle to a Beanstalk Cluster environment', async () => {
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce(clusterEnv); // DescribeEnvironments

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('is a Beanstalk Cluster environment'));
      // Fails before packaging: no S3 upload or version creation happened
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should fail closed when an existing environment reports no tier', async () => {
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green' }] }); // no Tier

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('Could not determine the tier of environment test-env'));
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should fail fast when deploying image-uri to a Beanstalk Standard environment', async () => {
      useClusterInputs({ 'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:v1' });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'WebServer' } }] });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('WebServer tier (Beanstalk Standard) environment'));
      expect(createVersionInputs()).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should fail fast when deploying build-configuration to a Beanstalk Standard environment, before packaging', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ Environments: [{ Status: 'Ready', Health: 'Green', Tier: { Name: 'WebServer' } }] });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('WebServer tier (Beanstalk Standard) environment'));
      expect(createVersionInputs()).toHaveLength(0);
      const archiver = require('archiver');
      expect(archiver).not.toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should fail before packaging when creating a Cluster environment with missing option-settings', async () => {
      useClusterInputs({ 'build-configuration': BUILD_CONFIG });
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' })
        .mockResolvedValueOnce({ Environments: [] }); // env missing -> create path preconditions

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('option-settings is required when creating a new Beanstalk Cluster environment'));
      expect(createVersionInputs()).toHaveLength(0);
      const archiver = require('archiver');
      expect(archiver).not.toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle environment not exists without create flag', async () => {
      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce({ Environments: [] }); // DescribeEnvironments (no env found)

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith('Deployment failed: Environment test-env does not exist and create-environment-if-not-exists is false');
      // Fails before packaging, upload, or version creation so the label is not consumed
      const archiver = require('archiver');
      expect(archiver).not.toHaveBeenCalled();
      expect(createVersionInputs()).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledTimes(2);
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

      mockSend
        .mockResolvedValueOnce({ Account: '123456789012' }) // GetCallerIdentity
        .mockResolvedValueOnce({ Environments: [] }) // DescribeEnvironments (no env found)
        .mockResolvedValue({}); // HeadBucket / PutObject / CreateAppVersion

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith(
        'Deployment failed: Either solution-stack-name or platform-arn must be provided when creating a new environment',
      );
      expect(mockSend).toHaveBeenCalledTimes(2);
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
