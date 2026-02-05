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
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Invalid AWS region format: invalid-region. Expected format like \'us-east-1\'');
    });

    it('should fail validation for application name too short', () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'application-name') return '';
        if (name === 'aws-region') return 'us-east-1';
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
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Application name must be between 1 and 100 characters, got 0');
    });

    it('should fail validation for environment name too short', () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'environment-name') return 'abc';
        if (name === 'aws-region') return 'us-east-1';
        if (name === 'application-name') return 'test-app';
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
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Environment name must be between 4 and 40 characters, got 3');
    });

    it('should fail validation for environment name with invalid characters', () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        if (name === 'environment-name') return 'test_env!';
        if (name === 'aws-region') return 'us-east-1';
        if (name === 'application-name') return 'test-app';
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
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Environment name can only contain alphanumeric characters and hyphens, got: test_env!');
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

    it('should fail validation when neither solution-stack-name nor platform-arn is provided', () => {
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
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Either solution-stack-name or platform-arn must be provided');
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

    it('should fail validation for invalid platform-arn format', () => {
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
          'platform-arn': 'invalid-platform-arn',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Invalid platform ARN format: invalid-platform-arn. Expected format like \'arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0\'');
    });

    it('should fail validation when platform-arn region does not match aws-region', () => {
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
          'platform-arn': 'arn:aws:elasticbeanstalk:us-west-2::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Platform ARN region (us-west-2) does not match aws-region input (us-east-1)');
    });

    it('should validate successfully with different platform ARN formats', () => {
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

      // Test with Java platform ARN
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'aws-region': 'eu-west-1',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'platform-arn': 'arn:aws:elasticbeanstalk:eu-west-1::platform/Java 17 running on 64bit Amazon Linux 2/4.3.0',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.awsRegion).toBe('eu-west-1');
      expect(result.platformArn).toBe('arn:aws:elasticbeanstalk:eu-west-1::platform/Java 17 running on 64bit Amazon Linux 2/4.3.0');
      expect(result.solutionStackName).toBeUndefined();
    });

    it('should validate successfully with Node.js platform ARN', () => {
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
          'aws-region': 'ap-southeast-2',
          'application-name': 'test-app',
          'environment-name': 'test-env',
          'platform-arn': 'arn:aws:elasticbeanstalk:ap-southeast-2::platform/Node.js 18 running on 64bit Amazon Linux 2023/6.1.0',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(true);
      expect(result.awsRegion).toBe('ap-southeast-2');
      expect(result.platformArn).toBe('arn:aws:elasticbeanstalk:ap-southeast-2::platform/Node.js 18 running on 64bit Amazon Linux 2023/6.1.0');
    });

    it('should fail validation for platform ARN with wrong service', () => {
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
          'platform-arn': 'arn:aws:ec2:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Invalid platform ARN format: arn:aws:ec2:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0. Expected format like \'arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0\'');
    });

    it('should fail validation for empty platform ARN', () => {
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
          'platform-arn': '',
          'option-settings': validOptionSettings,
        };
        return inputs[name] || '';
      });
      mockedCore.getBooleanInput.mockReturnValue(false);

      const result = validateAllInputs();

      expect(result.valid).toBe(false);
      expect(mockedCore.setFailed).toHaveBeenCalledWith('Either solution-stack-name or platform-arn must be provided');
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
