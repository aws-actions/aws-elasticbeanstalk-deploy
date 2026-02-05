import * as core from '@actions/core';
import { validateAllInputs } from '../validations';

// Mock @actions/core
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setFailed: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
}));

const mockedCore = jest.mocked(core);

describe('Input Conflict Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
      const defaults: Record<string, string> = {
        'aws-region': 'us-east-1',
        'application-name': 'test-app',
        'environment-name': 'test-env',
        'solution-stack-name': '64bit Amazon Linux 2023',
        'deployment-timeout': '900',
        'max-retries': '3',
        'retry-delay': '5',
        'option-settings': validOptionSettings,
      };
      return defaults[name] || '';
    });

    mockedCore.getBooleanInput.mockReturnValue(true);
  });

  it('should warn when deployment-package is provided with exclude-patterns', () => {
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
        'solution-stack-name': '64bit Amazon Linux 2023',
        'deployment-package-path': 'my-app.zip',
        'exclude-patterns': '*.git*,*node_modules*',
        'deployment-timeout': '900',
        'max-retries': '3',
        'retry-delay': '5',
        'option-settings': validOptionSettings,
      };
      return inputs[name] || '';
    });

    validateAllInputs();

    expect(mockedCore.warning).toHaveBeenCalledWith(
      expect.stringContaining('deployment-package-path and exclude-patterns')
    );
  });

  it('should warn when create-application-if-not-exists is true but create-environment-if-not-exists is false', () => {
    mockedCore.getBooleanInput.mockImplementation((name: string) => {
      if (name === 'create-application-if-not-exists') return true;
      if (name === 'create-environment-if-not-exists') return false;
      return true;
    });

    validateAllInputs();

    expect(mockedCore.warning).toHaveBeenCalledWith(
      expect.stringContaining('create-application-if-not-exists is true, but create-environment-if-not-exists is false')
    );
  });

  it('should warn when max-retries is 0', () => {
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
        'solution-stack-name': '64bit Amazon Linux 2023',
        'deployment-timeout': '900',
        'max-retries': '0',
        'retry-delay': '5',
        'option-settings': validOptionSettings,
      };
      return inputs[name] || '';
    });

    validateAllInputs();

    expect(mockedCore.warning).toHaveBeenCalledWith(
      expect.stringContaining('max-retries is set to 0')
    );
  });

  it('should warn when create-s3-bucket-if-not-exists is false', () => {
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
        'solution-stack-name': '64bit Amazon Linux 2023',
        'deployment-timeout': '900',
        'max-retries': '3',
        'retry-delay': '5',
        'create-s3-bucket-if-not-exists': 'false', // Explicitly set to 'false'
        'option-settings': validOptionSettings,
      };
      return inputs[name] || '';
    });

    mockedCore.getBooleanInput.mockImplementation((name: string) => {
      if (name === 'create-s3-bucket-if-not-exists') return false;
      return true;
    });

    validateAllInputs();

    expect(mockedCore.warning).toHaveBeenCalledWith(
      expect.stringContaining('create-s3-bucket-if-not-exists is false')
    );
  });

  it('should warn when deployment-timeout is low with use-existing-application-version-if-available', () => {
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
        'solution-stack-name': '64bit Amazon Linux 2023',
        'deployment-timeout': '90',
        'max-retries': '3',
        'retry-delay': '5',
        'option-settings': validOptionSettings,
      };
      return inputs[name] || '';
    });

    mockedCore.getBooleanInput.mockImplementation((name: string) => {
      if (name === 'use-existing-application-version-if-available') return true;
      return true;
    });

    validateAllInputs();

    expect(mockedCore.warning).toHaveBeenCalledWith(
      expect.stringContaining('use-existing-application-version-if-available is true with a low deployment-timeout')
    );
  });

  it('should not warn when inputs are valid and compatible', () => {
    validateAllInputs();
    const warningCalls = mockedCore.warning.mock.calls.filter(call =>
      typeof call[0] === 'string' && (call[0].includes('conflict') || call[0].includes('incompatible'))
    );
    expect(warningCalls).toHaveLength(0);
  });
});
