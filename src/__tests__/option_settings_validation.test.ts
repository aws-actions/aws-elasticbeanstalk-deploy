import { validateOptionSettingsForCreate, validateOptionSettingsForCreateClusterMode } from '../aws-operations';

jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));

describe('validateOptionSettingsForCreate (classic EB)', () => {
  const validClassic = JSON.stringify([
    { Namespace: 'aws:autoscaling:launchconfiguration', OptionName: 'IamInstanceProfile', Value: 'profile' },
    { Namespace: 'aws:elasticbeanstalk:environment', OptionName: 'ServiceRole', Value: 'role' },
  ]);

  it('passes when both IamInstanceProfile and ServiceRole are present', () => {
    expect(() => validateOptionSettingsForCreate(validClassic)).not.toThrow();
  });

  it('throws when option-settings is undefined', () => {
    expect(() => validateOptionSettingsForCreate(undefined)).toThrow('option-settings is required when creating a new environment');
  });

  it('throws the shared invalid-JSON message for malformed option-settings', () => {
    expect(() => validateOptionSettingsForCreate('{not json')).toThrow('Invalid JSON in option-settings input');
  });

  it('throws a clear message when option-settings is a JSON object rather than an array', () => {
    expect(() => validateOptionSettingsForCreate('{"Namespace":"aws:elasticbeanstalk:environment"}'))
      .toThrow('option-settings must be a JSON array');
  });

  it('throws when IamInstanceProfile is missing', () => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:environment', OptionName: 'ServiceRole', Value: 'role' },
    ]);
    expect(() => validateOptionSettingsForCreate(settings)).toThrow('option-settings must include IamInstanceProfile');
  });

  it('throws when ServiceRole is missing', () => {
    const settings = JSON.stringify([
      { Namespace: 'aws:autoscaling:launchconfiguration', OptionName: 'IamInstanceProfile', Value: 'profile' },
    ]);
    expect(() => validateOptionSettingsForCreate(settings)).toThrow('option-settings must include ServiceRole');
  });
});

describe('validateOptionSettingsForCreateClusterMode', () => {
  const validClusterMode = JSON.stringify([
    { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-cluster-role' },
    { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-node-role' },
    { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/service-role/aws-elasticbeanstalk-eks-observability-role' },
  ]);

  it('passes when cluster-role, node-role, and observability-role are present', () => {
    expect(() => validateOptionSettingsForCreateClusterMode(validClusterMode)).not.toThrow();
  });

  it('passes without application-role (optional per service option definitions)', () => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-cluster-role' },
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-node-role' },
      { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/service-role/aws-elasticbeanstalk-eks-observability-role' },
      { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'service-port', Value: '5000' },
    ]);
    expect(() => validateOptionSettingsForCreateClusterMode(settings)).not.toThrow();
  });

  it('throws when option-settings is undefined', () => {
    expect(() => validateOptionSettingsForCreateClusterMode(undefined)).toThrow('option-settings is required when creating a new Beanstalk Cluster environment');
  });

  it('throws when a required role has an empty Value', () => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: '' },
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-node-role' },
      { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/service-role/aws-elasticbeanstalk-eks-observability-role' },
    ]);
    expect(() => validateOptionSettingsForCreateClusterMode(settings)).toThrow('cluster-role (Namespace "aws:elasticbeanstalk:eks") must be an IAM role ARN');
  });

  it('throws when a required role has a whitespace-only Value', () => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-cluster-role' },
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: '   ' },
      { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/service-role/aws-elasticbeanstalk-eks-observability-role' },
    ]);
    expect(() => validateOptionSettingsForCreateClusterMode(settings)).toThrow('node-role (Namespace "aws:elasticbeanstalk:eks") must be an IAM role ARN');
  });

  it.each([
    ['a bare role name', 'aws-elasticbeanstalk-eks-cluster-role'],
    ['an instance-profile ARN', 'arn:aws:iam::123456789012:instance-profile/x'],
    ['a malformed account id', 'arn:aws:iam::1234:role/x'],
    ['a secrets placeholder that was not substituted', '${{ secrets.CLUSTER_ROLE_ARN }}'],
  ])('throws when a required role Value is %s', (_desc, value) => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: value },
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: 'arn:aws:iam::123456789012:role/n' },
      { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/o' },
    ]);
    expect(() => validateOptionSettingsForCreateClusterMode(settings)).toThrow('cluster-role (Namespace "aws:elasticbeanstalk:eks") must be an IAM role ARN');
  });

  it.each([
    'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-cluster-role',
    'arn:aws:iam::123456789012:role/service-role/aws-elasticbeanstalk-eks-cluster-role',
    'arn:aws-cn:iam::123456789012:role/x',
    'arn:aws-us-gov:iam::123456789012:role/path/to/x',
  ])('accepts role ARN %s', (value) => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: value },
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: 'arn:aws:iam::123456789012:role/n' },
      { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/o' },
    ]);
    expect(() => validateOptionSettingsForCreateClusterMode(settings)).not.toThrow();
  });

  it('throws the shared invalid-JSON message for malformed option-settings', () => {
    expect(() => validateOptionSettingsForCreateClusterMode('[{')).toThrow('Invalid JSON in option-settings input');
  });

  it('throws a clear message when option-settings is a JSON object rather than an array', () => {
    expect(() => validateOptionSettingsForCreateClusterMode('{"Namespace":"aws:elasticbeanstalk:eks","OptionName":"cluster-role","Value":"arn:aws:iam::123456789012:role/c"}'))
      .toThrow('option-settings must be a JSON array');
  });

  it('throws when cluster-role is missing', () => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-node-role' },
      { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/service-role/aws-elasticbeanstalk-eks-observability-role' },
    ]);
    expect(() => validateOptionSettingsForCreateClusterMode(settings)).toThrow('option-settings must include cluster-role');
  });

  it('throws when node-role is missing', () => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-cluster-role' },
      { Namespace: 'aws:elasticbeanstalk:eks:environment', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/service-role/aws-elasticbeanstalk-eks-observability-role' },
    ]);
    expect(() => validateOptionSettingsForCreateClusterMode(settings)).toThrow('option-settings must include node-role');
  });

  it('throws when observability-role is missing', () => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-cluster-role' },
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-node-role' },
    ]);
    expect(() => validateOptionSettingsForCreateClusterMode(settings)).toThrow('option-settings must include observability-role');
  });

  it('throws when observability-role is in the wrong namespace', () => {
    const settings = JSON.stringify([
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'cluster-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-cluster-role' },
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'node-role', Value: 'arn:aws:iam::123456789012:role/aws-elasticbeanstalk-eks-node-role' },
      { Namespace: 'aws:elasticbeanstalk:eks', OptionName: 'observability-role', Value: 'arn:aws:iam::123456789012:role/service-role/aws-elasticbeanstalk-eks-observability-role' },
    ]);
    expect(() => validateOptionSettingsForCreateClusterMode(settings)).toThrow('option-settings must include observability-role');
  });
});
