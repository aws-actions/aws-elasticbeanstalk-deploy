import * as core from '@actions/core';
import { validateAllInputs, parseJsonInput } from '../validations';

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setFailed: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
}));

const mockedCore = core as jest.Mocked<typeof core>;

describe('Validation Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAllInputs', () => {
    it('should validate all inputs successfully', () => {
      const validOptionSettings = JSON.stringify([
        {
          "Namespace": "aws:autoscaling:launchconfiguration",
          "OptionName": "IamInstanceProfile",
          "Value": "test-instance-profile"
        },
        {
          "Namespace": "aws:elasticbeanstalk:environment",
          "OptionName": "ServiceRole",
          "Value": "test-service-role"
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
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.awsRegion).toBe('us-east-1');
      expect(result.applicationName).toBe('test-app');
      expect(result.environmentName).toBe('test-env');
      expect(result.solutionStackName).toBe('64bit Amazon Linux 2');
      expect(result.deploymentTimeout).toBe(900);
      expect(result.maxRetries).toBe(3);
      expect(result.retryDelay).toBe(5);
    });

    it('should fail validation for invalid aws-region format', () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'aws-region') return 'invalid-region';
        if (name === 'application-name') return 'test-app';
        if (name === 'environment-name') return 'test-env';
        if (name === 'solution-stack-name') return '64bit Amazon Linux 2';
        if (name === 'option-settings') return JSON.stringify([
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
        return '';
      });

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Invalid AWS region format: invalid-region. Expected format like \'us-east-1\' or \'us-gov-east-1\'');
    });

    it('should validate successfully for GovCloud regions', () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-gov-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'solution-stack-name': '64bit Amazon Linux 2',
          'deployment-timeout': '900',
          'max-retries': '3',
          'retry-delay': '5',
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.awsRegion).toBe('us-gov-east-1');
    });

    it('should validate successfully for us-gov-west-1', () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-gov-west-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'solution-stack-name': '64bit Amazon Linux 2',
          'deployment-timeout': '900',
          'max-retries': '3',
          'retry-delay': '5',
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.awsRegion).toBe('us-gov-west-1');
    });

    it('should fail validation for invalid deployment-timeout', () => {
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
          'deployment-timeout': 'invalid',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Deployment timeout must be a number, got: invalid');
    });

    it('should fail validation for invalid max-retries', () => {
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
          'deployment-timeout': '900',
          'max-retries': 'invalid',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Max retries must be a number, got: invalid');
    });

    it('should fail validation for invalid retry-delay', () => {
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
          'deployment-timeout': '900',
          'max-retries': '3',
          'retry-delay': 'invalid',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Retry delay must be a number, got: invalid');
    });

    it('should use default values for numeric inputs', () => {
      const validOptionSettings = JSON.stringify([
        {
          "Namespace": "aws:autoscaling:launchconfiguration",
          "OptionName": "IamInstanceProfile",
          "Value": "test-instance-profile"
        },
        {
          "Namespace": "aws:elasticbeanstalk:environment",
          "OptionName": "ServiceRole",
          "Value": "test-service-role"
        }
      ]);

      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'solution-stack-name': '64bit Amazon Linux 2',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.deploymentTimeout).toBe(900);
      expect(result.maxRetries).toBe(3);
      expect(result.retryDelay).toBe(5);
    });

  it('should pass validation for missing option-settings when not creating environment', () => {
    mockedCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'aws-region': 'us-east-1',
        'application-name': 'test-app',
        'environment-name': 'test-env',
        'solution-stack-name': '64bit Amazon Linux 2',
        'option-settings': '', // Empty - optional when not creating environment
      };
      return inputs[name] || '';
    });
    mockedCore.getBooleanInput.mockReturnValue(false);

    const result = validateAllInputs();

    expect(result.valid).toBe(true);
  });

    it('should handle boolean inputs', () => {
      const validOptionSettings = JSON.stringify([
        {
          "Namespace": "aws:autoscaling:launchconfiguration",
          "OptionName": "IamInstanceProfile",
          "Value": "test-instance-profile"
        },
        {
          "Namespace": "aws:elasticbeanstalk:environment",
          "OptionName": "ServiceRole",
          "Value": "test-service-role"
        }
      ]);

      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'solution-stack-name': '64bit Amazon Linux 2',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockImplementation((name: string) => {
        return name === 'create-environment-if-not-exists';
      });

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.createEnvironmentIfNotExists).toBe(true);
      expect(result.waitForDeployment).toBe(false);
    });

    it('should use GITHUB_SHA for version label', () => {
      process.env.GITHUB_SHA = 'test-sha-123';
      
      const validOptionSettings = JSON.stringify([
        {
          "Namespace": "aws:autoscaling:launchconfiguration",
          "OptionName": "IamInstanceProfile",
          "Value": "test-instance-profile"
        },
        {
          "Namespace": "aws:elasticbeanstalk:environment",
          "OptionName": "ServiceRole",
          "Value": "test-service-role"
        }
      ]);

      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'solution-stack-name': '64bit Amazon Linux 2',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.applicationVersionLabel).toBe('test-sha-123');
    });

    it('should fail validation for invalid JSON in option-settings', () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'solution-stack-name': '64bit Amazon Linux 2',
          'option-settings': 'invalid-json',
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON in option-settings:'));
    });

    it('should pass validation when neither solution-stack-name nor platform-arn is provided as this is checked during createEnvironment function', () => {
      const validOptionSettings = JSON.stringify([
        {
          "Namespace": "aws:autoscaling:launchconfiguration",
          "OptionName": "IamInstanceProfile",
          "Value": "test-instance-profile"
        },
        {
          "Namespace": "aws:elasticbeanstalk:environment",
          "OptionName": "ServiceRole",
          "Value": "test-service-role"
        }
      ]);

      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'option-settings': validOptionSettings, // Neither solution-stack-name nor platform-arn provided
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.solutionStackName).toBeUndefined();
      expect(result.platformArn).toBeUndefined();
    });

    it('should fail validation when both solution-stack-name and platform-arn are provided', () => {
      const validOptionSettings = JSON.stringify([
        {
          "Namespace": "aws:autoscaling:launchconfiguration",
          "OptionName": "IamInstanceProfile",
          "Value": "test-instance-profile"
        },
        {
          "Namespace": "aws:elasticbeanstalk:environment",
          "OptionName": "ServiceRole",
          "Value": "test-service-role"
        }
      ]);

      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'solution-stack-name': '64bit Amazon Linux 2',
          'platform-arn': 'arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Cannot specify both solution-stack-name and platform-arn. Use only one.');
    });

    it('should validate successfully with platform-arn instead of solution-stack-name', () => {
      const validOptionSettings = JSON.stringify([
        {
          "Namespace": "aws:autoscaling:launchconfiguration",
          "OptionName": "IamInstanceProfile",
          "Value": "test-instance-profile"
        },
        {
          "Namespace": "aws:elasticbeanstalk:environment",
          "OptionName": "ServiceRole",
          "Value": "test-service-role"
        }
      ]);

      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'us-east-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'platform-arn': 'arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.awsRegion).toBe('us-east-1');
      expect(result.applicationName).toBe('test-app');
      expect(result.environmentName).toBe('test-env');
      expect(result.platformArn).toBe('arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0');
      expect(result.solutionStackName).toBeUndefined();
    });

  });

  describe('parseJsonInput', () => {
    it('should parse valid JSON', () => {
      const jsonString = '{"key": "value"}';
      const result = parseJsonInput(jsonString, 'test-input');
      expect(result).toEqual({ key: 'value' });
    });

    it('should throw error for invalid JSON', () => {
      const jsonString = 'invalid-json';
      expect(() => parseJsonInput(jsonString, 'test-input'))
        .toThrow('Invalid JSON in test-input input');
    });

    it('should parse array JSON', () => {
      const jsonString = '[{"Namespace": "test", "OptionName": "test", "Value": "test"}]';
      const result = parseJsonInput(jsonString, 'option-settings');
      expect(result).toEqual([{ Namespace: 'test', OptionName: 'test', Value: 'test' }]);
    });
  });
});
