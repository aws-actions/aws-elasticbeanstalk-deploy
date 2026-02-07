# AWS Elastic Beanstalk Deploy Action

A GitHub Action for deploying applications to AWS Elastic Beanstalk with automatic version management, environment creation, health monitoring, and intelligent retry logic.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
  - [Step 1: Configure AWS Authentication](#step-1-configure-aws-authentication)
  - [Step 2: Attach Required Permissions](#step-2-attach-required-permissions)
  - [Step 3: Create IAM Roles for Elastic Beanstalk](#step-3-create-iam-roles-for-elastic-beanstalk)
  - [Step 4: Add GitHub Secrets](#step-4-add-github-secrets)
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

### Step 1: Configure AWS Authentication

This action supports two authentication methods. Choose the one that best fits your needs.

#### Option A: OpenID Connect (OIDC) — Recommended

OIDC lets GitHub Actions authenticate with AWS using short-lived credentials without storing long-lived secrets. This is the recommended approach.

**1. Create an OIDC Identity Provider** (one-time per AWS account)

In the AWS Console: IAM → Identity providers → Add provider
- **Provider type**: OpenID Connect
- **Provider URL**: `https://token.actions.githubusercontent.com`
- **Audience**: `sts.amazonaws.com`

**2. Create an IAM Role**

Create an IAM role that GitHub Actions will assume. Attach the permissions from [Step 2](#step-2-attach-required-permissions), and set the following trust policy (replace `{account-id}` and `{your-org/your-repo}`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::{account-id}:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:{your-org/your-repo}:*"
                }
            }
        }
    ]
}
```

> **Note:** The `sub` condition is case-sensitive and must match your GitHub `owner/repo` exactly.

#### Option B: Static Credentials

Create an IAM user with an access key and attach the permissions from [Step 2](#step-2-attach-required-permissions).

> **Note:** Static credentials are long-lived and must be rotated manually.

### Step 2: Attach Required Permissions

Whether you're using an IAM role (OIDC) or IAM user (static credentials), attach the following two policies:

**1. Elastic Beanstalk Permissions**

Attach the AWS managed policy **`AdministratorAccess-AWSElasticBeanstalk`**. This policy grants the permissions that Elastic Beanstalk requires from the calling principal to create and manage environments, including interactions with EC2, Auto Scaling, CloudFormation, and other services that Elastic Beanstalk orchestrates during deployment.

**2. S3 Bucket Permissions**

This action uploads your deployment package to S3 before creating an application version. This is required because the Elastic Beanstalk `CreateApplicationVersion` API requires the source bundle to be stored in S3—you cannot pass the deployment package directly to the API.

The S3 bucket name defaults to `elasticbeanstalk-{region}-{accountId}` (e.g., `elasticbeanstalk-us-east-2-123456789012`), or you can specify a custom bucket name using the `s3-bucket-name` input.

Add the following inline policy (replace `{bucket-name}` with your bucket name):

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

### Step 3: Create IAM Roles for Elastic Beanstalk

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

### Step 4: Add GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

**If using OIDC:**

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_TO_ASSUME` | ARN of the IAM role (e.g., `arn:aws:iam::123456789012:role/my-github-actions-role`) |

**If using static credentials:**

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Access key ID for your IAM user |
| `AWS_SECRET_ACCESS_KEY` | Secret access key for your IAM user |

## Quick Start

### Using OIDC (Recommended)

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
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to Elastic Beanstalk
        uses: aws-actions/aws-elasticbeanstalk-deploy@v1.0.0
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

### Using Static Credentials

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
        uses: aws-actions/aws-elasticbeanstalk-deploy@v1.0.0
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
| `s3-bucket-name` | Custom S3 bucket name for deployment packages | `elasticbeanstalk-{region}-{accountId}` |
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


## Troubleshooting

### Finding Solution Stack Names

List available solution stacks for your region:

```bash
aws elasticbeanstalk list-available-solution-stacks --region us-east-1

# Filter by platform
aws elasticbeanstalk list-available-solution-stacks --region us-east-1 | grep -i python
aws elasticbeanstalk list-available-solution-stacks --region us-east-1 | grep -i node
```

### Common Errors

**"option-settings must include IamInstanceProfile"**

When creating a new environment, you must provide IAM roles in `option-settings`. See [Option Settings](#option-settings).

**"Environment name must be 4-40 characters"**

Environment names must be 4-40 characters, contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen.

**S3 Access Denied**

Ensure your IAM user or role has S3 permissions for the deployment bucket. See [Step 2: Attach Required Permissions](#step-2-attach-required-permissions).

**Deployment Timeout**

Increase the timeout for slow deployments:

```yaml
deployment-timeout: 1800  # 30 minutes
```

**Red Health Status**

If the environment health is Red after deployment:
1. Check CloudWatch Logs for application errors
2. Verify your application listens on the correct port
3. Ensure health check endpoint responds correctly

### Skipping Health Wait

For faster deployments in non-production environments:

```yaml
wait-for-environment-recovery: false
```

## License

This project is licensed under the MIT-0 License. See [LICENSE](LICENSE) for details.

---

**Related Resources:**
- [AWS Elastic Beanstalk Developer Guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/)
- [Configuration Options Reference](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html)
- [Platform Versions](https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/)
- [configure-aws-credentials Action](https://github.com/aws-actions/configure-aws-credentials)
