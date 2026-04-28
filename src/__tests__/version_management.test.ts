import { applicationVersionExists, getVersionS3Location, createApplicationVersion } from '../aws-operations';
import { AWSClients } from '../aws-clients';
import { DeploymentContext } from '../logging';

// Mock dependencies
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

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-elastic-beanstalk', () => ({
  ElasticBeanstalkClient: jest.fn(() => ({ send: mockSend })),
  DescribeApplicationVersionsCommand: jest.fn(),
  CreateApplicationVersionCommand: jest.fn(),
  CreateApplicationCommand: jest.fn(),
}));

const defaultCtx: DeploymentContext = { verboseLogging: true, maxRetries: 3, retryDelay: 1 };

describe('Version Management', () => {
  let mockClients: AWSClients;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClients = AWSClients.getInstance('us-east-1');
  });

  describe('applicationVersionExists', () => {
    it('should return true if version exists', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [{ VersionLabel: 'v1.0.0' }],
      });

      const result = await applicationVersionExists(mockClients, 'my-app', 'v1.0.0', defaultCtx);

      expect(result).toBe(true);
    });

    it('should return false if version does not exist', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [],
      });

      const result = await applicationVersionExists(mockClients, 'my-app', 'v2.0.0', defaultCtx);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockSend.mockRejectedValue(new Error('API Error'));

      const result = await applicationVersionExists(mockClients, 'my-app', 'v1.0.0', defaultCtx);

      expect(result).toBe(false);
    });

    it('should handle empty response', async () => {
      mockSend.mockResolvedValue({});

      const result = await applicationVersionExists(mockClients, 'my-app', 'v1.0.0', defaultCtx);

      expect(result).toBe(false);
    });

    it('should not include version label in debug log when verbose-logging is false', async () => {
      const core = require('@actions/core');
      mockSend.mockRejectedValue(new Error('API Error'));

      const quietCtx: DeploymentContext = { verboseLogging: false, maxRetries: 3, retryDelay: 1 };
      await applicationVersionExists(mockClients, 'my-app', 'v1.0.0', quietCtx);

      const debugCalls = core.debug.mock.calls.map((c: any[]) => c[0]);
      const relevantCall = debugCalls.find((c: string) => c.includes('application version'));
      expect(relevantCall).toBeDefined();
      expect(relevantCall).not.toContain('v1.0.0');
    });
  });

  describe('getVersionS3Location', () => {
    it('should return S3 bucket and key for existing version', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [{
          VersionLabel: 'v1.0.0',
          SourceBundle: {
            S3Bucket: 'my-bucket',
            S3Key: 'my-app/v1.0.0.zip',
          },
        }],
      });

      const result = await getVersionS3Location(mockClients, 'my-app', 'v1.0.0', defaultCtx);

      expect(result).toEqual({
        bucket: 'my-bucket',
        key: 'my-app/v1.0.0.zip',
      });
    });

    it('should throw error if version not found', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [],
      });

      await expect(getVersionS3Location(mockClients, 'my-app', 'v2.0.0', defaultCtx))
        .rejects.toThrow('Version v2.0.0 not found');
    });

    it('should throw error if version has no S3 source bundle', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [{
          VersionLabel: 'v1.0.0',
        }],
      });

      await expect(getVersionS3Location(mockClients, 'my-app', 'v1.0.0', defaultCtx))
        .rejects.toThrow('has incomplete S3 source bundle information');
    });

    it('should throw error if S3 bucket is missing', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [{
          VersionLabel: 'v1.0.0',
          SourceBundle: {
            S3Key: 'my-app/v1.0.0.zip',
          },
        }],
      });

      await expect(getVersionS3Location(mockClients, 'my-app', 'v1.0.0', defaultCtx))
        .rejects.toThrow('has incomplete S3 source bundle information');
    });

    it('should not include version label in errors when verbose-logging is false', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [],
      });

      const quietCtx: DeploymentContext = { verboseLogging: false, maxRetries: 3, retryDelay: 1 };
      try {
        await getVersionS3Location(mockClients, 'my-app', 'v1.0.0', quietCtx);
        fail('Expected error to be thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain('v1.0.0');
        expect(message).toContain('Application version not found');
      }
    });
  });

  describe('createApplicationVersion', () => {
    it('should create new application version', async () => {
      mockSend.mockResolvedValue({});

      await createApplicationVersion(
        mockClients,
        'my-app',
        'v1.0.0',
        'my-bucket',
        'my-app/v1.0.0.zip',
        false,
        defaultCtx,
      );

      expect(mockSend).toHaveBeenCalled();
    });

    it('should create application if auto-create is enabled', async () => {
      mockSend
        .mockRejectedValueOnce({ name: 'InvalidParameterValueException' })
        .mockResolvedValue({});

      await createApplicationVersion(
        mockClients,
        'new-app',
        'v1.0.0',
        'my-bucket',
        'new-app/v1.0.0.zip',
        true,
        defaultCtx,
      );

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle version creation with different S3 paths', async () => {
      mockSend.mockResolvedValue({});

      const euroCtx: DeploymentContext = { verboseLogging: true, maxRetries: 2, retryDelay: 5 };
      await createApplicationVersion(
        mockClients,
        'euro-app',
        'abc123',
        'elasticbeanstalk-eu-west-1-123456',
        'euro-app/abc123.jar',
        false,
        euroCtx,
      );

      expect(mockSend).toHaveBeenCalled();
    });

    it('should not log version label when verboseLogging is false', async () => {
      const core = require('@actions/core');
      mockSend.mockResolvedValue({});

      const quietCtx: DeploymentContext = { verboseLogging: false, maxRetries: 3, retryDelay: 1 };
      await createApplicationVersion(
        mockClients,
        'my-app',
        'v1.0.0',
        'my-bucket',
        'my-app/v1.0.0.zip',
        false,
        quietCtx,
      );

      const infoCalls = core.info.mock.calls.map((c: any[]) => c[0]);
      // Should log generic messages without version label
      expect(infoCalls).toContainEqual('📝 Creating application version');
      expect(infoCalls).toContainEqual('✅ Application version created');
      // Should NOT contain version label in any info call
      expect(infoCalls).not.toContainEqual(expect.stringContaining('v1.0.0'));
    });

    it('should fail fast when application version already exists', async () => {
      const existingVersionError = new Error('Application Version v1.0.0 already exists.');
      (existingVersionError as any).name = 'InvalidParameterValueException';

      mockSend.mockRejectedValue(existingVersionError);

      await expect(
        createApplicationVersion(
          mockClients,
          'my-app',
          'v1.0.0',
          'my-bucket',
          'my-app/v1.0.0.zip',
          false,
          defaultCtx,
        )
      ).rejects.toThrow('Application Version v1.0.0 already exists.');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});
