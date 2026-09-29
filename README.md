# AWS Elastic Beanstalk Deploy Action

A GitHub Action for deploying applications to AWS Elastic Beanstalk with automatic version management, environment creation, health monitoring, and intelligent retry logic. It supports both Beanstalk Standard (EC2-backed) environments and Beanstalk Cluster (EKS-backed) container environments.

## Table of Contents

- [Features](#features)
- [Choose Your Deployment Mode](#choose-your-deployment-mode)
- [Prerequisites](#prerequisites)
  - [Step 1: Configure AWS Authentication](#step-1-configure-aws-authentication)
  - [Step 2: Attach Required Permissions](#step-2-attach-required-permissions)
  - [Step 3: Create IAM Roles for Elastic Beanstalk](#step-3-create-iam-roles-for-elastic-beanstalk)
  - [Step 4: Add GitHub Secrets](#step-4-add-github-secrets)
- [Beanstalk Standard Environments](#beanstalk-standard-environments)
  - [Quick Start](#quick-start)
  - [Platform Configuration](#platform-configuration)
  - [Option Settings](#option-settings)
- [Beanstalk Cluster Environments](#beanstalk-cluster-environments)
  - [Required Option Settings](#required-option-settings)
  - [Option A: Deploy a Pre-Built Image](#option-a-deploy-a-pre-built-image)
  - [Option B: Build the Image From Source](#option-b-build-the-image-from-source)
  - [What Changes Compared to Beanstalk Standard](#what-changes-compared-to-beanstalk-standard)
- [Versioning](#versioning)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **Automatic Environment Creation**: Creates Elastic Beanstalk applications and environments if they don't exist
- **Two Deployment Modes**: Deploys to Beanstalk Standard (EC2-backed) environments or to Beanstalk Cluster (EKS-backed) container environments
- **Flexible Container Sourcing**: For Beanstalk Cluster environments, deploy a pre-built image or let Elastic Beanstalk build one from your source
- **Deployment Package Management**: Auto-creates deployment packages from your repository or uses pre-built packages
- **S3 Upload**: Uploads deployment artifacts to S3 for version management
- **Health Monitoring**: Waits for deployment completion and environment health recovery
- **Event Streaming**: Displays real-time deployment events in GitHub Actions logs
- **Intelligent Retries**: Exponential backoff for transient API failures
- **Version Reuse**: Optionally skip S3 upload if version already exists

## Choose Your Deployment Mode

Start by picking the mode that matches where you want your application to run. The mode determines which inputs are required, which IAM roles you need, and which `option-settings` you must supply.

| Mode | Runs on | Choose this when | Required platform input |
|------|---------|------------------|-------------------------|
| **[Beanstalk Standard](#beanstalk-standard-environments)** | EC2 instances managed by Elastic Beanstalk | You're deploying a Python, Node.js, Java, Go, .NET, PHP, Ruby, or Docker application to a managed solution stack | `solution-stack-name` **or** `platform-arn` |
| **[Beanstalk Cluster](#beanstalk-cluster-environments)** | An EKS cluster managed by Elastic Beanstalk | You're deploying a container to a Beanstalk Cluster environment, which runs on Amazon EKS | `image-uri` **or** `build-configuration` |

Within Beanstalk Cluster, you then choose how Elastic Beanstalk gets your container image:

| Option | Input | Choose this when |
|--------|-------|------------------|
| **[A: Pre-built image](#option-a-deploy-a-pre-built-image)** | `image-uri` | Your CI already builds and pushes an image (for example to Amazon ECR) and you just want it deployed |
| **[B: Build from source](#option-b-build-the-image-from-source)** | `build-configuration` | You want Elastic Beanstalk to containerize your source for you using CodeBuild |

> [!IMPORTANT]
> The two modes are mutually exclusive. Setting `image-uri` or `build-configuration` together with `solution-stack-name` or `platform-arn` fails validation, as does setting both `image-uri` and `build-configuration`.

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
                    "token.actions.githubusercontent.com:sub": [
                        "repo:{your-org/your-repo}:*",
                        "repo:{your-org}@*/{your-repo}@*:*"
                    ]
                }
            }
        }
    ]
}
```

> **Note:** The `sub` condition is case-sensitive and must match your GitHub `owner/repo` exactly. Some organizations issue tokens whose subject claim embeds numeric IDs (e.g., `repo:my-org@12345/my-repo@67890:...`); the second pattern above matches that form. If the trust policy matches neither form, the workflow fails with `Not authorized to perform sts:AssumeRoleWithWebIdentity`.

#### Option B: Static Credentials

Create an IAM user with an access key and attach the permissions from [Step 2](#step-2-attach-required-permissions).

> **Note:** Static credentials are long-lived and must be rotated manually.

### Step 2: Attach Required Permissions

Whether you're using an IAM role (OIDC) or IAM user (static credentials), attach the following two policies:

**1. Elastic Beanstalk Permissions**

You have two options for granting Elastic Beanstalk permissions:

**Option A: AWS Managed Policy (Simplest)**

Attach the AWS managed policy **[`AdministratorAccess-AWSElasticBeanstalk`](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AdministratorAccess-AWSElasticBeanstalk.html)**. This policy grants the permissions that Elastic Beanstalk requires from the calling principal to create and manage environments, including interactions with EC2, Auto Scaling, CloudFormation, and other services that Elastic Beanstalk orchestrates during deployment.

**Option B: Scoped-Down Custom Policy (Recommended for Production)**

For tighter security, it's recommended to scope down the permissions in the [`AdministratorAccess-AWSElasticBeanstalk`](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AdministratorAccess-AWSElasticBeanstalk.html) managed policy based on your specific needs. Start with the AWS managed policy as a baseline and restrict resources to only what your deployment requires. This approach ensures you maintain the core functionality while following the principle of least privilege.

**2. S3 Bucket Permissions**

This action uploads your deployment package to S3 before creating an application version. This is required because the Elastic Beanstalk `CreateApplicationVersion` API requires the source bundle to be stored in S3—you cannot pass the deployment package directly to the API.

> [!NOTE]
> S3 permissions are not needed if you use Beanstalk Cluster Option A (`image-uri`), since a pre-built image is deployed directly and no source bundle is packaged or uploaded. Every other mode uploads to S3.

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

**3. Beanstalk Cluster Pass-Role Permissions (Beanstalk Cluster only)**

When the action creates a Beanstalk Cluster environment, it hands the cluster, node, and observability roles to Elastic Beanstalk, so the principal running the action must be allowed to pass them (and, for the first Beanstalk Cluster environment in an account, to create the Elastic Beanstalk and EKS service-linked roles). The `AdministratorAccess-AWSElasticBeanstalk` managed policy does not cover this. Grant the permissions listed under [Permissions to create the environment](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/beanstalk-cluster-permissions.html#beanstalk-cluster-permissions-caller) in the Elastic Beanstalk Developer Guide — that page is the source of truth for the exact actions, resources, and condition keys.

### Step 3: Create IAM Roles for Elastic Beanstalk

Elastic Beanstalk needs IAM roles that you pass through the `option-settings` input. **Which roles you need depends on your mode:**

| Mode | Required roles |
|------|----------------|
| Beanstalk Standard | Instance profile + service role (below) |
| Beanstalk Cluster | Cluster role, node role, and observability role — see [Beanstalk Cluster: Required Option Settings](#required-option-settings). The action's own principal must also be allowed to pass them; see [Step 2, item 3](#step-2-attach-required-permissions) |

#### Roles for Beanstalk Standard Environments

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

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions → Repository secrets):

**If using OIDC:**

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_TO_ASSUME` | ARN of the IAM role (e.g., `arn:aws:iam::123456789012:role/my-github-actions-role`) |

**If using static credentials:**

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Access key ID for your IAM user |
| `AWS_SECRET_ACCESS_KEY` | Secret access key for your IAM user |

**If using Beanstalk Cluster:** the examples and snippets in this README pass the [Beanstalk Cluster IAM role ARNs](#required-option-settings) via secrets rather than hardcoding them:

| Secret | Description |
|--------|-------------|
| `CLUSTER_ROLE_ARN` | ARN of the EKS cluster role |
| `NODE_ROLE_ARN` | ARN of the EKS node role |
| `OBSERVABILITY_ROLE_ARN` | ARN of the observability role |
| `CODEBUILD_ROLE_ARN` | ARN of the CodeBuild service role — only needed for [build from source](#option-b-build-the-image-from-source) |

## Beanstalk Standard Environments

Beanstalk Standard is the EC2-based Elastic Beanstalk deployment model: the action packages your source, uploads it to S3, creates an application version, and deploys it to an environment running on EC2 instances.

> [!IMPORTANT]
> Complete the [Prerequisites](#prerequisites) before continuing. Beanstalk Standard needs AWS authentication (Step 1), Elastic Beanstalk and S3 permissions (Step 2), the **instance profile and service role** (Step 3), and your GitHub secrets (Step 4). Deployments fail without them.

### Quick Start

Create a workflow file in your repository at `.github/workflows/deploy-to-elastic-beanstalk.yml` (or any name you prefer under `.github/workflows/`). The core deploy step looks like this:

```yaml
- name: Deploy to Elastic Beanstalk
  uses: aws-actions/aws-elasticbeanstalk-deploy@v1
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

For complete, runnable workflows — including checkout, AWS credential configuration via OIDC, and per-platform packaging — see the [Beanstalk Standard examples](#examples): [python.yml](examples/standard/python.yml), [nodejs.yml](examples/standard/nodejs.yml), [corretto.yml](examples/standard/corretto.yml), [go.yml](examples/standard/go.yml), and [docker.yml](examples/standard/docker.yml). To use static credentials instead of OIDC, swap the `configure-aws-credentials` step's `role-to-assume` input for `aws-access-key-id`/`aws-secret-access-key`.

### Platform Configuration

When **creating a new Beanstalk Standard environment**, you must provide **exactly one** of the following:

| Input | Description |
|-------|-------------|
| `solution-stack-name` | Solution stack name (e.g., `64bit Amazon Linux 2023 v4.9.2 running Python 3.14`) |
| `platform-arn` | Platform ARN (e.g., `arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.14 running on 64bit Amazon Linux 2023/4.9.2`) |

You can find the list of supported platforms and example values in the AWS Elastic Beanstalk documentation for [supported platforms](https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html).

When **deploying to an existing environment**, these inputs are **optional**. The existing environment's platform configuration will be used if neither is provided.

> [!IMPORTANT]
> When you specify `solution-stack-name` or `platform-arn`, each deployment updates your environment to that platform version if it differs from the current one. To deploy without changing the platform version, omit both options.

> [!TIP]
> Platform branch ARNs (without a version suffix, e.g., `arn:aws:elasticbeanstalk:::platform/Python 3.14 running on 64bit Amazon Linux 2023`) automatically select the latest version within that branch at deployment time.

To use **managed platform updates**, see the AWS docs for [managed updates](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environment-platform-update-managed.html) and configure the following `option-settings` in your workflow:

```yaml
option-settings: |
  [
    {
      "Namespace": "aws:elasticbeanstalk:managedactions",
      "OptionName": "ManagedActionsEnabled",
      "Value": "true"
    },
    {
      "Namespace": "aws:elasticbeanstalk:managedactions:platformupdate",
      "OptionName": "UpdateLevel",
      "Value": "minor"
    }
  ]
```

This enables managed platform updates and configures Elastic Beanstalk to automatically apply **minor** and **patch** platform version updates.

### Option Settings

The `option-settings` input accepts a JSON array of Elastic Beanstalk configuration options. When creating a new Beanstalk Standard environment, you **must** include the IAM Instance Profile and Service Role:

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

## Beanstalk Cluster Environments

Beanstalk Cluster environments run your containers on an EKS cluster that Elastic Beanstalk creates and manages for you. Instead of a solution stack or platform ARN, the action creates the environment with the Cluster tier and deploys a container image.

> [!IMPORTANT]
> Complete the [Prerequisites](#prerequisites) before continuing. Beanstalk Cluster needs AWS authentication (Step 1), Elastic Beanstalk permissions plus the **Beanstalk Cluster pass-role permissions** (Step 2 — and S3 permissions unless you deploy a pre-built image), the **cluster, node, and observability roles** described under [Required Option Settings](#required-option-settings) below, and your GitHub secrets (Step 4). Deployments fail without them.

The deployment lifecycle works the same as Beanstalk Standard: the action creates the application and environment if they don't exist, waits for an environment that is still updating from a previous run to become `Ready`, streams deployment events, waits for the deployment and for health recovery, and retries transient API failures. The differences — required option settings, image sourcing instead of source bundles, and version-reuse behavior — are summarized in [What Changes Compared to Beanstalk Standard](#what-changes-compared-to-beanstalk-standard).

You choose between two options for how Elastic Beanstalk gets your image. **Option A** (`image-uri`) deploys an image you already built. **Option B** (`build-configuration`) hands your source to CodeBuild and lets Elastic Beanstalk containerize it. Both require the same option settings, covered next.

### Required Option Settings

When creating a new Beanstalk Cluster environment, `option-settings` is **required** and must include these three roles. This differs from Beanstalk Standard, which requires an instance profile and service role instead.

| Namespace | Option name | Purpose |
|-----------|-------------|---------|
| `aws:elasticbeanstalk:eks` | `cluster-role` | Amazon EKS assumes this role for the cluster Elastic Beanstalk creates |
| `aws:elasticbeanstalk:eks` | `node-role` | The cluster's EC2 nodes assume this role; it must allow pulling your application images from Amazon ECR |
| `aws:elasticbeanstalk:eks:environment` | `observability-role` | The components that publish the environment's metrics, logs, and traces assume this role through EKS Pod Identity |

The action does not create these roles for you; create them before the first deployment, in the same AWS account as the environment. Use the role names, trust policies, and managed policies from [Roles that you provide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/beanstalk-cluster-permissions.html#beanstalk-cluster-permissions-customer-roles) in the Elastic Beanstalk Developer Guide. The names matter: Elastic Beanstalk registers the three roles with the EKS cluster it creates, and later environments on the same subnet set must supply the same roles. The principal running this action must also be allowed to pass them — see [Step 2, item 3](#step-2-attach-required-permissions).

In addition to these three, you need one more role **only if you use [Option B: Build the Image From Source](#option-b-build-the-image-from-source)**: a CodeBuild service role, passed as `CodeBuildServiceRole` inside the `build-configuration` input (not in `option-settings`). CodeBuild assumes it to run the image build — it needs to read the source bundle from S3, push the built image to Amazon ECR, and write build logs to CloudWatch. Option A (`image-uri`) does not need it.

```yaml
option-settings: |
  [
    {
      "Namespace": "aws:elasticbeanstalk:eks",
      "OptionName": "cluster-role",
      "Value": "${{ secrets.CLUSTER_ROLE_ARN }}"
    },
    {
      "Namespace": "aws:elasticbeanstalk:eks",
      "OptionName": "node-role",
      "Value": "${{ secrets.NODE_ROLE_ARN }}"
    },
    {
      "Namespace": "aws:elasticbeanstalk:eks:environment",
      "OptionName": "observability-role",
      "Value": "${{ secrets.OBSERVABILITY_ROLE_ARN }}"
    }
  ]
```

The action validates that all three are present and hold IAM role ARNs as soon as it determines the environment doesn't exist — before packaging, uploading, creating an application version, or starting an image build — so a missing role fails fast with a clear message rather than after those steps have run.

Beyond the required roles, the action passes any `option-settings` through to Elastic Beanstalk unchanged, so every `aws:elasticbeanstalk:eks*` setting works — service port, memory, load balancer type, replica autoscaling, deployment strategy, health probes, and more. For the full list of Beanstalk Cluster namespaces and options, see [Configuration options for Beanstalk Cluster environments](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general-eks.html) in the Elastic Beanstalk Developer Guide.

> [!NOTE]
> Beanstalk Cluster environments use their own `aws:elasticbeanstalk:eks*` namespaces, so don't copy Beanstalk Standard `option-settings` (such as `IamInstanceProfile` or `ServiceRole`) across modes. If you set `load-balancer-type` to `None`, the environment has no CNAME and the `environment-url` output is empty.

### Option A: Deploy a Pre-Built Image

Use `image-uri` when your workflow already builds and pushes a container image. The action skips packaging and the S3 upload entirely and creates the application version directly from the image.

The action itself needs no registry permissions. The build-and-push steps in the [prebuilt-image.yml](examples/cluster/prebuilt-image.yml) example do: the principal from [Step 1](#step-1-configure-aws-authentication) must be allowed to log in to and push to your Amazon ECR repository (and to create it, if you keep the create-repository step). See [Private repository policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html) and [Pushing an image](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push.html) in the Amazon ECR User Guide. If your image is already published elsewhere, drop those steps and pass its URI directly.

```yaml
- name: Deploy to Elastic Beanstalk
  uses: aws-actions/aws-elasticbeanstalk-deploy@v1
  with:
    aws-region: ${{ env.AWS_REGION }}
    application-name: ${{ env.APPLICATION_NAME }}
    environment-name: ${{ env.ENVIRONMENT_NAME }}
    image-uri: ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}
    option-settings: |
      [
        {
          "Namespace": "aws:elasticbeanstalk:eks",
          "OptionName": "cluster-role",
          "Value": "${{ secrets.CLUSTER_ROLE_ARN }}"
        },
        {
          "Namespace": "aws:elasticbeanstalk:eks",
          "OptionName": "node-role",
          "Value": "${{ secrets.NODE_ROLE_ARN }}"
        },
        {
          "Namespace": "aws:elasticbeanstalk:eks:environment",
          "OptionName": "observability-role",
          "Value": "${{ secrets.OBSERVABILITY_ROLE_ARN }}"
        }
      ]
```

See [cluster/prebuilt-image.yml](examples/cluster/prebuilt-image.yml) for the complete workflow, including the ECR login and the docker build/push steps that produce the image this step deploys.

Make sure the image is pushed before this action runs, and that the environment's node role can pull from your registry. After creating the version, the action confirms the service recorded the image and logs its URI before deploying.

If an application version with the same `version-label` already exists and `use-existing-application-version-if-available` is `true` (the default), the action deploys that version as-is and skips version creation — the same behavior as Beanstalk Standard, so it may point at a different image than `image-uri`. The one exception is a version whose image build `FAILED`, which can never deploy: the action fails immediately and asks for a new label. Elastic Beanstalk does not allow a label to be recreated, so to deploy a new image use a new `version-label` (the default, the commit SHA, changes on every commit).

### Option B: Build the Image From Source

Use `build-configuration` to let Elastic Beanstalk containerize your source. The action packages your repository, uploads it to S3, creates the application version with your build configuration, and then polls the version status (`BUILDING` while the image builds) until it reaches `PROCESSED`. Before deploying, the action confirms the version actually carries a built image and logs its digest-pinned URI; a `FAILED` build, or a `PROCESSED` version with no image (which the service currently produces when it doesn't accept the build settings — for example `Type` in the wrong case or a `DockerfileLocation` that isn't in the bundle), fails the workflow with a message naming the cause.

`build-configuration` takes a JSON object with the fields of the `Build` member of the Elastic Beanstalk `ImageConfiguration` API. The action validates only that `Type` and `CodeBuildServiceRole` are present; the service validates the values. A field that the AWS SDK bundled with the action does not model would be dropped from the request, so the action fails before creating the version and names the field. The fields (see [Building container images for Beanstalk Cluster environments](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/beanstalk-cluster-app-versions.html)) are:

| Field | Required | Description |
|-------|----------|-------------|
| `Type` | Yes | `docker` to build from a Dockerfile, or `buildpack` to build with Cloud Native Buildpacks |
| `CodeBuildServiceRole` | Yes | ARN of the role CodeBuild assumes to run the image build |
| `DockerfileLocation` | No | Path to the Dockerfile; defaults to `Dockerfile` at the root of your source |
| `Buildpack` | When `Type` is `buildpack` | The builder image, passed to the build verbatim. Elastic Beanstalk does not detect one for you |
| `Architecture` | No | `amd64` (default) or `arm64` |
| `ComputeType` | No | CodeBuild compute: `BUILD_GENERAL1_SMALL`, `BUILD_GENERAL1_MEDIUM` (default), or `BUILD_GENERAL1_LARGE` |
| `TimeoutInMinutes` | No | Build timeout enforced by the service, 5–480; defaults to 60. The action waits for the build for the same duration |

```yaml
- name: Deploy to Elastic Beanstalk
  uses: aws-actions/aws-elasticbeanstalk-deploy@v1
  with:
    aws-region: ${{ env.AWS_REGION }}
    application-name: ${{ env.APPLICATION_NAME }}
    environment-name: ${{ env.ENVIRONMENT_NAME }}
    build-configuration: |
      {
        "Type": "docker",
        "DockerfileLocation": "Dockerfile",
        "CodeBuildServiceRole": "${{ secrets.CODEBUILD_ROLE_ARN }}"
      }
    option-settings: |
      [
        {
          "Namespace": "aws:elasticbeanstalk:eks",
          "OptionName": "cluster-role",
          "Value": "${{ secrets.CLUSTER_ROLE_ARN }}"
        },
        {
          "Namespace": "aws:elasticbeanstalk:eks",
          "OptionName": "node-role",
          "Value": "${{ secrets.NODE_ROLE_ARN }}"
        },
        {
          "Namespace": "aws:elasticbeanstalk:eks:environment",
          "OptionName": "observability-role",
          "Value": "${{ secrets.OBSERVABILITY_ROLE_ARN }}"
        }
      ]
```

See [cluster/build-from-source.yml](examples/cluster/build-from-source.yml) for the complete workflow.

Because this path uploads a source bundle, it needs the same [S3 permissions](#step-2-attach-required-permissions) as Beanstalk Standard. The `CodeBuildServiceRole` also needs permission to pull the source from S3 and push the built image to your registry.

If an application version with the same `version-label` already exists and `use-existing-application-version-if-available` is `true` (the default), the action deploys that version as-is and skips packaging, the S3 upload, and the build — the same behavior as Beanstalk Standard. If that version's build is still running (for example a concurrent run of the same commit), the action waits for it to finish; if its build `FAILED`, the action fails immediately with a message asking for a new `version-label`, since the label cannot be recreated.

> [!NOTE]
> The action waits for the image build for as long as the service's own build timeout, `TimeoutInMinutes` (default 60 minutes), plus a short grace period. `deployment-timeout` does not apply to the build; it bounds each of the three phases around it: the wait for an existing environment to become `Ready`, the deployment, and health recovery. Make sure your AWS session outlives the build: `configure-aws-credentials` issues OIDC credentials for one hour by default, so for long builds set its `role-duration-seconds` above `TimeoutInMinutes` plus the deployment time, otherwise the run fails after the build with an expired-credentials error.

### What Changes Compared to Beanstalk Standard

| Behavior | Beanstalk Standard | Beanstalk Cluster |
|----------|-----|------------|
| Platform input | `solution-stack-name` or `platform-arn` | `image-uri` or `build-configuration` |
| Required option settings | `IamInstanceProfile`, `ServiceRole` | `cluster-role`, `node-role`, `observability-role` |
| Source packaging and S3 upload | Every run packages; upload is skipped when the version is reused | Only with `build-configuration` (both skipped when the version is reused); never with `image-uri` |
| Reusing an existing version (`use-existing-application-version-if-available`) | Any version under the label is reused | Same, except a version whose image build `FAILED` fails the run immediately, and one still `BUILDING` is waited for |
| Before deploying to an existing environment | The environment's tier is checked first; `image-uri`/`build-configuration` against a Standard environment, or an unreadable tier, fail before anything is packaged or created | The environment's tier is checked first; a source-bundle deployment against a Cluster environment, or an unreadable tier, fail before anything is packaged or created |

Inputs that apply the same way in both modes include `version-label`, `create-environment-if-not-exists`, `create-application-if-not-exists`, `wait-for-deployment`, `wait-for-environment-recovery`, `deployment-timeout`, `max-retries`, `retry-delay`, and `cname-prefix`. The packaging inputs (`source-directory`, `exclude-patterns`, `symlinks`, `deployment-package-path`) apply to `build-configuration` but are ignored with `image-uri`, which never packages source.

> [!NOTE]
> `deployment-timeout` defaults to `2400` for Beanstalk Cluster (vs `900` for Beanstalk Standard). The first Beanstalk Cluster environment in an account provisions an EKS cluster, which takes 15-20 minutes; a lower timeout would report a still-provisioning (and ultimately successful) first deployment as a failure.

## Versioning

This action follows semantic versioning and publishes both immutable release tags and a floating major-version tag.

| Reference | Points to | Recommended for |
|---|---|---|
| `@v1` | Latest `v1.x.y` release | Most users — automatically receives patches and non-breaking updates |
| `@v1.0.4` | An exact release | Reproducible pins when you need to lock a specific version |
| `@<full-sha>` | An exact commit | Strictest supply-chain posture — see [GitHub's guidance on pinning to a SHA](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions) |

Examples:

```yaml
# Get the latest v1.x.y release (recommended)
- uses: aws-actions/aws-elasticbeanstalk-deploy@v1

# Pin to a specific release
- uses: aws-actions/aws-elasticbeanstalk-deploy@v1.0.4

# Pin to a commit SHA (strictest)
- uses: aws-actions/aws-elasticbeanstalk-deploy@1f56e4e813ae4eb167e69ca324234c336c1df573 # v1.0.4
```

Every release is signed with a [SLSA build provenance attestation](https://slsa.dev/spec/v1.0/provenance) and can be verified with the GitHub CLI. See the release notes on each release for verification instructions.

## Inputs

### Required Inputs

| Input | Description |
|-------|-------------|
| `aws-region` | AWS region for deployment (e.g., `us-east-1`, `eu-west-1`) |
| `application-name` | Elastic Beanstalk application name |
| `environment-name` | Elastic Beanstalk environment name |

### Mode-Selecting Inputs

Exactly one of these groups applies, depending on your [deployment mode](#choose-your-deployment-mode). They cannot be combined across modes.

| Input | Mode | Description |
|-------|------|-------------|
| `solution-stack-name` | Beanstalk Standard | Solution stack name (e.g., `64bit Amazon Linux 2023 v4.9.2 running Python 3.14`) |
| `platform-arn` | Beanstalk Standard | Platform ARN (e.g., `arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.14 running on 64bit Amazon Linux 2023/4.9.2`) |
| `image-uri` | Beanstalk Cluster | Pre-built container image URI to deploy (e.g., `123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:v1`) |
| `build-configuration` | Beanstalk Cluster | JSON object (the `ImageConfiguration.Build` settings) describing how Elastic Beanstalk should build a container image from your source |

See [Platform Configuration](#platform-configuration) and [Beanstalk Cluster Environments](#beanstalk-cluster-environments) for the details of each.

### Optional Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `version-label` | Version label for the application version (1-100 characters) | Git SHA or `v{timestamp}` |
| `deployment-package-path` | Path to pre-built deployment package (`.zip`, `.war`, `.jar`) | Auto-created from repository |
| `option-settings` | JSON array of Elastic Beanstalk option settings. **Required when creating a new environment.** Beanstalk Standard must include the IAM instance profile and service role; Beanstalk Cluster must include `cluster-role`, `node-role`, and `observability-role` | None |
| `create-environment-if-not-exists` | Create the environment if it doesn't exist | `true` |
| `create-application-if-not-exists` | Create the application if it doesn't exist | `true` |
| `wait-for-deployment` | Wait for deployment to complete | `true` |
| `wait-for-environment-recovery` | Wait for environment health to become Green or Yellow | `true` |
| `deployment-timeout` | Maximum wait time **per wait phase** (seconds, 60-3600): waiting for an existing environment to become `Ready`, the deployment (`wait-for-deployment`), and health recovery (`wait-for-environment-recovery`). With both waits enabled the total maximum wait is 3× this value. | `900` (Beanstalk Standard), `2400` (Beanstalk Cluster) |
| `max-retries` | Maximum retry attempts for failed API calls (0-10) | `2` |
| `retry-delay` | Initial delay between retries in seconds (1-60, uses exponential backoff) | `5` |
| `use-existing-application-version-if-available` | Reuse existing application version if it exists (skips S3 upload, version creation, and — for `build-configuration` — the image build) | `true` |
| `create-s3-bucket-if-not-exists` | Create S3 bucket if it doesn't exist | `true` |
| `s3-bucket-name` | Custom S3 bucket name for deployment packages | `elasticbeanstalk-{region}-{accountId}` |
| `exclude-patterns` | Comma-separated patterns to exclude from auto-created packages. Uses **gitignore pattern syntax** — a bare name like `node_modules` or `*.log` matches at any depth, `dir/` matches directories only, and `!pattern` re-includes. | None |
| `symlinks` | How to handle symlinks in auto-created packages. `preserve` (default) records them as symlink entries; targets are recorded verbatim without validation, so links pointing outside the source tree will be broken on the instance. `follow` replaces in-tree symlinks with a copy of their target's contents, skipping links that resolve outside the source directory — layouts sharing one directory across many links can multiply package size, so watch the 500 MB limit. Symlinks match `exclude-patterns` as files, not directories — use `linked-dir`, not `linked-dir/`. | `preserve` |
| `source-directory` | Directory to package for deployment, useful in mono-repos. Ignored (with a warning) when `image-uri` is set | Workspace root |
| `cname-prefix` | CNAME prefix for the environment URL (4–63 alphanumeric characters or hyphens). Only used when creating a new environment | AWS auto-assigns |
| `mask-resource-identifiers` | Mask infrastructure identifiers in the action log as `***`: account ID, S3 bucket name, application and environment names, version label, environment URL and ID, and container image URIs. Also suppresses the Elastic Beanstalk event stream (which names resources the service creates, such as security groups, load balancers, and instances) and strips AWS resource IDs (instance, security group, subnet, VPC, ENI IDs, ARNs, IP addresses, environment IDs, ECR image references) from failure messages. Masking is job-wide and matches substrings, so it also applies to later steps in the job, and a short value such as an environment named `prod` will also hide that text inside other words (`production` becomes `***uction`). The action logs a warning when a value it masks is shorter than 8 characters. A version label equal to the commit SHA (the default when `version-label` is unset) is never masked. Action outputs are always set and readable by later steps in the same job, but GitHub does not forward masked values as job-level outputs to other jobs | `false` |

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

**Beanstalk Standard environments** ([`examples/standard/`](examples/standard/))

| Platform | Example |
|----------|---------|
| Python | [python.yml](examples/standard/python.yml) |
| Node.js | [nodejs.yml](examples/standard/nodejs.yml) |
| Java (Corretto) | [corretto.yml](examples/standard/corretto.yml) |
| Go | [go.yml](examples/standard/go.yml) |
| Docker | [docker.yml](examples/standard/docker.yml) |

**Beanstalk Cluster environments** ([`examples/cluster/`](examples/cluster/))

| Image source | Example |
|--------------|---------|
| Pre-built image (`image-uri`) | [cluster/prebuilt-image.yml](examples/cluster/prebuilt-image.yml) |
| Build from source (`build-configuration`) | [cluster/build-from-source.yml](examples/cluster/build-from-source.yml) |

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

When creating a new Beanstalk Standard environment, you must provide IAM roles in `option-settings`. See [Option Settings](#option-settings).

**"option-settings must include cluster-role / node-role / observability-role"**

When creating a new Beanstalk Cluster environment, all three EKS roles are required. See [Required Option Settings](#required-option-settings).

**"Environment … is a Beanstalk Cluster environment. Provide image-uri … or build-configuration …"**

You deployed to an existing Beanstalk Cluster environment without either image input. The action stops before packaging or creating a version, so nothing needs cleaning up — add `image-uri` or `build-configuration` and re-run.

**"Environment … is a WebServer tier (Beanstalk Standard) environment, which cannot deploy container image versions"**

You passed `image-uri` or `build-configuration` against an existing Beanstalk Standard environment. Remove them and provide `solution-stack-name` or `platform-arn`, or target a Beanstalk Cluster environment.

**"Could not determine the tier of environment …"**

`DescribeEnvironments` returned the environment without a `Tier`. The action refuses to deploy rather than guess, because a wrong guess would consume the version label with an unusable version. Retry; if it persists, open an issue.

**"Application version … already exists but its image build FAILED"**

The label is held by a version whose image build failed, so it can never deploy. Elastic Beanstalk does not allow a label to be recreated, so either set a new `version-label` or delete the existing application version and re-run (`DeleteApplicationVersion` is rejected while a build is still `BUILDING`).

**`UpdateEnvironment` rejects the application version as not compatible with the environment**

The version under this label was created outside this action (or by a different tool) without an image, and `use-existing-application-version-if-available` reused it. The action checks reused versions for an image before deploying, so this usually indicates the check was bypassed by an in-flight change; set a new `version-label` or delete the existing version and re-run.

**`AccessDenied` from `CreateEnvironment` naming `iam:PassRole`, `iam:GetRole`, or `iam:CreateServiceLinkedRole`**

The principal running the action isn't allowed to hand the cluster, node, or observability role to Elastic Beanstalk (or, for the first Beanstalk Cluster environment in the account, to create the Elastic Beanstalk and EKS service-linked roles). Grant the permissions in [Permissions to create the environment](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/beanstalk-cluster-permissions.html#beanstalk-cluster-permissions-caller). Elastic Beanstalk checks this before provisioning, so nothing was created.

**"Application version … has no container image"**

The service accepted the version but recorded no image: for `build-configuration`, the version reached `PROCESSED` without a build (check that `Type` is exactly `docker` or `buildpack` and that `DockerfileLocation` names a file in your source bundle); for `image-uri`, the image URI was not recorded on the version. Elastic Beanstalk does not allow a label to be recreated, so set a new `version-label` (or delete the version) and re-run.

**"Cannot specify solution-stack-name or platform-arn together with image-uri or build-configuration"**

You've mixed the two modes. Beanstalk Cluster environments use the Cluster environment tier rather than a solution stack or platform, so remove whichever input doesn't match your intended mode. See [Choose Your Deployment Mode](#choose-your-deployment-mode).

**"Cannot specify both image-uri and build-configuration"**

Pick one image-sourcing option: `image-uri` to deploy an image you already built, or `build-configuration` to have Elastic Beanstalk build it.

**"build-configuration must include CodeBuildServiceRole and Type"**

Both fields are required. See [Option B: Build the Image From Source](#option-b-build-the-image-from-source).

**"Image build failed" or "Image build did not complete within N minutes"**

The CodeBuild image build failed or exceeded `TimeoutInMinutes`. Run `aws elasticbeanstalk describe-events --application-name <app> --version-label <label> --severity ERROR` for the build diagnostics (source download, role assumption, ECR authentication, or image build/push failures), and verify that `CodeBuildServiceRole` can read the source bundle from S3 and push to Amazon ECR. If the build legitimately needs longer, raise `TimeoutInMinutes` in `build-configuration`. A version whose build failed keeps its label; to reuse the label, delete the version once it has left the `BUILDING` state.

**S3 Access Denied**

Ensure your IAM user or role has S3 permissions for the deployment bucket. See [Step 2: Attach Required Permissions](#step-2-attach-required-permissions). This doesn't apply when deploying with `image-uri`, which uploads nothing to S3.

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
