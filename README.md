# AWS Elastic Beanstalk Deploy Action

A GitHub Action for deploying applications to AWS Elastic Beanstalk with automatic version management, environment creation, health monitoring, and intelligent retry logic.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
  - [Step 1: Create IAM User](#step-1-create-iam-user)
  - [Step 2: Create IAM Roles for Elastic Beanstalk](#step-2-create-iam-roles-for-elastic-beanstalk)
  - [Step 3: Add GitHub Secrets](#step-3-add-github-secrets)
- [Quick Start](#quick-start)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Examples](#examples)
- [Option Settings](#option-settings)
- [API Usage](#api-usage)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **Automatic Environment Creation**: Creates Elastic Beanstalk applications and environments if they don't exist
- **Deployment Package Management**: Auto-creates deployment packages from your repository or uses pre-built packages
- **S3 Upload**: Uploads deployment artifacts to S3 for version management
- **Health Monitoring**: Waits for deployment completion and environment health recovery
- **Event Streaming**: Displays real-time deployment events in GitHub Actions logs
- **Intelligent Retries**: Exponential backoff for transient API failures
- **Version Reuse**: Optionally skip S3 upload if version already exists

## Prerequisites

Before using this action, you need to set up AWS IAM permissions. This section walks you through the required steps.

### Step 1: Create IAM User

Create an IAM user that GitHub Actions will use to deploy to Elastic Beanstalk.

#### Required Permissions

The IAM user needs two types of permissions:

**1. Elastic Beanstalk Permissions**

Attach the AWS managed policy **`AdministratorAccess-AWSElasticBeanstalk`** to your IAM user. This policy grants the necessary permissions for Elastic Beanstalk to create and manage your environment, including:
- Creating and updating applications, environments, and application versions
- Managing EC2 instances, Auto Scaling groups, and load balancers
- Accessing CloudWatch logs and metrics

**2. S3 Bucket Permissions**

This action uploads your deployment package to S3 before creating an application version. This is required because the Elastic Beanstalk `CreateApplicationVersion` API requires the source bundle to be stored in S3—you cannot pass the deployment package directly to the API.

The S3 bucket name defaults to `{applicationName}-{accountId}` (e.g., `my-app-123456789012`), or you can specify a custom bucket name using the `s3-bucket-name` input.

Add the following inline policy to your IAM user (replace `{bucket-name}` with your bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion",
                "s3:CreateBucket",
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:GetBucketAcl",
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::{bucket-name}",
                "arn:aws:s3:::{bucket-name}/*"
            ]
        }
    ]
}
```

### Step 2: Create IAM Roles for Elastic Beanstalk

Elastic Beanstalk requires two IAM roles that must be passed in the `option-settings` input:

**1. Instance Profile** (`aws-elasticbeanstalk-ec2-role`)

This role is assumed by EC2 instances in your environment. It allows instances to:
- Upload logs to S3 and CloudWatch
- Download application versions from S3
- Send metrics to CloudWatch

See: [Managing Elastic Beanstalk Instance Profiles](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/iam-instanceprofile.html)

**2. Service Role** (`aws-elasticbeanstalk-service-role`)

This role is assumed by Elastic Beanstalk itself. It allows the service to:
- Create and manage AWS resources (EC2, ELB, Auto Scaling, etc.)
- Monitor environment health
- Perform managed platform updates

See: [Managing Elastic Beanstalk Service Roles](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/iam-servicerole.html)

**Creating the Roles**

- [Create the Instance Profile](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/iam-instanceprofile.html#iam-instanceprofile-create)
- [Create the Service Role](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/iam-servicerole.html#iam-servicerole-create)

### Step 3: Add GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Access key ID for your IAM user |
| `AWS_SECRET_ACCESS_KEY` | Secret access key for your IAM user |

## Quick Start

```yaml
name: Deploy to Elastic Beanstalk

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  APPLICATION_NAME: my-app
  ENVIRONMENT_NAME: my-app-env

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to Elastic Beanstalk
        uses: varsharagavendran/aws-elasticbeanstalk-deploy@main
        with:
          aws-region: ${{ env.AWS_REGION }}
          application-name: ${{ env.APPLICATION_NAME }}
          environment-name: ${{ env.ENVIRONMENT_NAME }}
          solution-stack-name: '64bit Amazon Linux 2023 v4.3.0 running Python 3.11'
          option-settings: |
            [
              {
                "Namespace": "aws:autoscaling:launchconfiguration",
                "OptionName": "IamInstanceProfile",
                "Value": "aws-elasticbeanstalk-ec2-role"
              },
              {
                "Namespace": "aws:elasticbeanstalk:environment",
                "OptionName": "ServiceRole",
                "Value": "aws-elasticbeanstalk-service-role"
              }
            ]
```

## Inputs

### Required Inputs

| Input | Description |
|-------|-------------|
| `aws-region` | AWS region for deployment (e.g., `us-east-1`, `eu-west-1`) |
| `application-name` | Elastic Beanstalk application name (1-100 characters) |
| `environment-name` | Elastic Beanstalk environment name (4-40 characters, alphanumeric and hyphens only) |

### Platform Configuration (One Required)

You must provide exactly one of the following:

| Input | Description |
|-------|-------------|
| `solution-stack-name` | Solution stack name (e.g., `64bit Amazon Linux 2023 v4.3.0 running Python 3.11`) |
| `platform-arn` | Platform ARN (e.g., `arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.3.0`) |

### Optional Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `version-label` | Version label for the application version (1-100 characters) | Git SHA or `v{timestamp}` |
| `deployment-package-path` | Path to pre-built deployment package (`.zip`, `.war`, `.jar`) | Auto-created from repository |
| `option-settings` | JSON array of Elastic Beanstalk option settings. **Required when creating a new environment** (must include IAM Instance Profile and Service Role) | None |
| `create-environment-if-not-exists` | Create the environment if it doesn't exist | `true` |
| `create-application-if-not-exists` | Create the application if it doesn't exist | `true` |
| `wait-for-deployment` | Wait for deployment to complete | `true` |
| `wait-for-environment-recovery` | Wait for environment health to become Green or Yellow | `true` |
| `deployment-timeout` | Maximum wait time for deployment (seconds, 60-3600) | `900` |
| `max-retries` | Maximum retry attempts for failed API calls (0-10) | `2` |
| `retry-delay` | Initial delay between retries in seconds (1-60, uses exponential backoff) | `5` |
| `use-existing-application-version-if-available` | Reuse existing application version if it exists (skips S3 upload) | `true` |
| `create-s3-bucket-if-not-exists` | Create S3 bucket if it doesn't exist | `true` |
| `s3-bucket-name` | Custom S3 bucket name for deployment packages | `{applicationName}-{accountId}` |
| `exclude-patterns` | Comma-separated glob patterns to exclude from auto-created packages | None |

## Outputs

| Output | Description |
|--------|-------------|
| `environment-url` | The CNAME/URL of the deployed environment |
| `environment-id` | The environment ID (e.g., `e-abc123def4`) |
| `environment-status` | Current status of the environment |
| `environment-health` | Current health of the environment |
| `deployment-action-type` | Whether the environment was `create`d or `update`d |
| `version-label` | The version label that was deployed |

## Examples

Complete workflow examples are available in the [`examples/`](examples/) directory:

| Platform | Example |
|----------|---------|
| Python | [python.yml](examples/python.yml) |
| Node.js | [nodejs.yml](examples/nodejs.yml) |
| Java (Corretto) | [corretto.yml](examples/corretto.yml) |
| Go | [go.yml](examples/go.yml) |
| Docker | [docker.yml](examples/docker.yml) |

## Option Settings

The `option-settings` input accepts a JSON array of Elastic Beanstalk configuration options. When creating a new environment, you **must** include the IAM Instance Profile and Service Role:

```yaml
option-settings: |
  [
    {
      "Namespace": "aws:autoscaling:launchconfiguration",
      "OptionName": "IamInstanceProfile",
      "Value": "aws-elasticbeanstalk-ec2-role"
    },
    {
      "Namespace": "aws:elasticbeanstalk:environment",
      "OptionName": "ServiceRole",
      "Value": "aws-elasticbeanstalk-service-role"
    }
  ]
```

See the [complete list of configuration options](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html) in AWS documentation.

## API Usage

This action makes AWS API calls during deployment. Understanding the API usage helps you estimate costs and troubleshoot rate limiting issues.

### API Calls Per Deployment

| API | Calls | When |
|-----|-------|------|
| **STS** | | |
| `GetCallerIdentity` | 1 | Always (verify credentials) |
| **S3** | | |
| `HeadBucket` | 1 | Check if bucket exists |
| `CreateBucket` | 0-1 | Only if bucket doesn't exist and `create-s3-bucket-if-not-exists: true` |
| `GetBucketAcl` | 1 | Verify bucket access |
| `PutObject` | 0-1 | Upload deployment package (skipped if version exists and `use-existing-application-version-if-available: true`) |
| **Elastic Beanstalk** | | |
| `DescribeApplicationVersions` | 1-2 | Check if version exists, get S3 location |
| `CreateApplicationVersion` | 0-1 | Only if version doesn't exist |
| `DescribeEnvironments` | 1 + N | Initial check + polling during deployment |
| `CreateEnvironment` | 0-1 | Only if environment doesn't exist |
| `UpdateEnvironment` | 0-1 | Only if environment exists |
| `DescribeEvents` | N | Polling during deployment (every 10-20 seconds) |

### Polling Behavior

- **Environment creation**: Polls every 20 seconds
- **Environment update**: Polls every 10 seconds
- **Health recovery**: Polls every 15 seconds
- **Events**: Fetched with each environment status poll

### Estimated Total API Calls

| Scenario | Estimated Calls |
|----------|-----------------|
| Update existing environment (5 min deployment) | ~40-50 calls |
| Create new environment (10 min deployment) | ~60-80 calls |
| Reuse existing version (skip S3 upload) | ~35-45 calls |

### Cost Considerations

- AWS Elastic Beanstalk API calls are free
- S3 requests have minimal costs (fractions of a cent per deployment)
- The primary costs come from the AWS resources created (EC2, ELB, etc.)

## Troubleshooting

### Finding Solution Stack Names

List available solution stacks for your region:

```bash
aws elasticbeanstalk list-available-solution-stacks --region us-east-1

# Filter by platform
aws elasticbeanstalk list-available-solution-stacks --region us-east-1 | grep -i python
aws elasticbeanstalk list-available-solution-stacks --region us-east-1 | grep -i node
aws elasticbeanstalk list-available-solution-stacks --region us-east-1 | grep -i corretto
aws elasticbeanstalk list-available-solution-stacks --region us-east-1 | grep -i docker
```

### Common Errors

**"option-settings must include IamInstanceProfile"**

When creating a new environment, you must provide IAM roles in `option-settings`. See [Option Settings](#option-settings).

**"Environment name must be 4-40 characters"**

Environment names must be 4-40 characters, contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen.

**S3 Access Denied**

Ensure your IAM user has S3 permissions for the deployment bucket. See [Step 1: Create IAM User](#step-1-create-iam-user).

**Deployment Timeout**

Increase the timeout for slow deployments:

```yaml
deployment-timeout: 1800  # 30 minutes
```

**Red Health Status**

If the environment health is Red after deployment:
1. Check CloudWatch Logs for application errors
2. Verify your application listens on the correct port (5000 for most platforms)
3. Ensure health check endpoint responds correctly

### Skipping Health Wait

For faster deployments in non-production environments:

```yaml
wait-for-environment-recovery: false
```

## License

This project is licensed under the MIT-0 License.

---

**Related Resources:**
- [AWS Elastic Beanstalk Developer Guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/)
- [Configuration Options Reference](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html)
- [Platform Versions](https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/)
- [configure-aws-credentials Action](https://github.com/aws-actions/configure-aws-credentials)
