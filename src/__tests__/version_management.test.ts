import { applicationVersionExists, getVersionS3Location, createApplicationVersion } from '../aws-operations';
import { AWSClients } from '../aws-clients';

// Mock dependencies
jest.mock('@actions/core');

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-elastic-beanstalk', () => ({
  ElasticBeanstalkClient: jest.fn(() => ({ send: mockSend })),
  DescribeApplicationVersionsCommand: jest.fn(),
  CreateApplicationVersionCommand: jest.fn(),
  CreateApplicationCommand: jest.fn(),
}));

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

      const result = await applicationVersionExists(mockClients, 'my-app', 'v1.0.0');

      expect(result).toBe(true);
    });

    it('should return false if version does not exist', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [],
      });

      const result = await applicationVersionExists(mockClients, 'my-app', 'v2.0.0');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockSend.mockRejectedValue(new Error('API Error'));

      const result = await applicationVersionExists(mockClients, 'my-app', 'v1.0.0');

      expect(result).toBe(false);
    });

    it('should handle empty response', async () => {
      mockSend.mockResolvedValue({});

      const result = await applicationVersionExists(mockClients, 'my-app', 'v1.0.0');

      expect(result).toBe(false);
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

      const result = await getVersionS3Location(mockClients, 'my-app', 'v1.0.0');

      expect(result).toEqual({
        bucket: 'my-bucket',
        key: 'my-app/v1.0.0.zip',
      });
    });

    it('should throw error if version not found', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [],
      });

      await expect(getVersionS3Location(mockClients, 'my-app', 'v2.0.0'))
        .rejects.toThrow('Version v2.0.0 not found');
    });

    it('should throw error if version has no S3 source bundle', async () => {
      mockSend.mockResolvedValue({
        ApplicationVersions: [{
          VersionLabel: 'v1.0.0',
        }],
      });

      await expect(getVersionS3Location(mockClients, 'my-app', 'v1.0.0'))
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

      await expect(getVersionS3Location(mockClients, 'my-app', 'v1.0.0'))
        .rejects.toThrow('has incomplete S3 source bundle information');
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
        3,
        1,
        false
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
        3,
        1,
        true
      );

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle version creation with different S3 paths', async () => {
      mockSend.mockResolvedValue({});

      await createApplicationVersion(
        mockClients,
        'euro-app',
        'abc123',
        'elasticbeanstalk-eu-west-1-123456',
        'euro-app/abc123.jar',
        2,
        5,
        false
      );

      expect(mockSend).toHaveBeenCalled();
    });
  });
});
