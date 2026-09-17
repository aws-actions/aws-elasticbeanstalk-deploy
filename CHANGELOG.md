# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### <a name="1.1.0" href="https://github.com/aws-actions/aws-elasticbeanstalk-deploy/tree/v1.1.0">1.1.0</a>

#### Features

* Beanstalk Cluster (EKS tier) deployment support. Adds support for deploying to Elastic Beanstalk Cluster environments alongside the existing EC2 tier. The classic flow's API calls and request contents are unchanged; see Behavior changes below for the pre-deployment checks that now run in both modes.
  * New inputs: `image-uri` (deploy a prebuilt container image) and `build-configuration` (build the image from source with CodeBuild). Either implies a Cluster-tier environment; `deployment-timeout` defaults to 2400 seconds in that mode.
  * Tier mismatch between inputs and an existing environment fails fast, before packaging. A version that reports `PROCESSED` without a built image is rejected before deployment.
  * The action waits for an environment that is still updating to become `Ready` before deploying to it, and fails immediately when the target environment cannot run the selected version.
  * Monitoring refactored around a shared environment/event snapshot helper; rollback detection from #87 is preserved.
  * README restructured around EC2 vs Cluster deployment modes; examples split into `examples/standard/` and `examples/cluster/`.

#### Behavior changes

* `deployment-timeout` also bounds the new wait for an existing environment to become `Ready`, so the total maximum wait can be up to 3× the value (previously 2×).
* `build-configuration` fields that the bundled AWS SDK does not model fail the run before the version is created, since the SDK would otherwise drop them from the request.
* The target environment is described before the source bundle is packaged (previously after). A tier mismatch or a `Terminating` environment fails the run before any packaging, upload, or version creation, and when `create-environment-if-not-exists` is `true` the create-time `option-settings`/platform checks run at that point too. A missing environment with `create-environment-if-not-exists` set to `false` now also fails at that point, before a version is created under the label (previously the version was created first).

### <a name="1.0.9" href="https://github.com/aws-actions/aws-elasticbeanstalk-deploy/tree/v1.0.9">1.0.9</a>

#### Bug fixes

* deploy: fail the deployment when the environment update was rolled back ([#87](https://github.com/aws-actions/aws-elasticbeanstalk-deploy/pull/87)). Once the environment reports `Ready`, `ERROR`/`FATAL` events from the final poll fail the run, and an environment still running a version other than the requested one 30 seconds after reporting `Ready` is treated as a rollback. Previously the run was reported successful in both cases.
* deps: resolve Dependabot alerts via scoped `brace-expansion` overrides ([#84](https://github.com/aws-actions/aws-elasticbeanstalk-deploy/pull/84)); bump `action-gh-release` to v2.6.2 and patch `js-yaml` ([#85](https://github.com/aws-actions/aws-elasticbeanstalk-deploy/pull/85), [#91](https://github.com/aws-actions/aws-elasticbeanstalk-deploy/pull/91)); bump `browserslist` ([#90](https://github.com/aws-actions/aws-elasticbeanstalk-deploy/pull/90)).
* release: SLSA build provenance attestations and SHA256 checksums attached to `dist/index.js` and `action.yml`.

### <a name="1.0.8" href="https://github.com/aws-actions/aws-elasticbeanstalk-deploy/tree/v1.0.8">1.0.8</a>

#### Features

* package: add `symlinks` input to control symlink handling in auto-created packages (`preserve` | `follow`)

#### Behavior changes

* package: symlinks are now included in auto-created packages. They were previously omitted entirely. The default `preserve` records them as symlink entries, matching the EB CLI.
* package: `exclude-patterns` now uses gitignore semantics in all cases. Repositories with no `.ebignore` or `.gitignore` previously used glob semantics, where a pattern matched only at the root. Patterns such as `*.log` or `node_modules` now match at any depth and will exclude more files than before.

### <a name="1.0.0" href="https://github.com/aws-actions/aws-elasticbeanstalk-deploy/tree/v1.0.0">1.0.0 (2026-02-11)</a>

#### Features

* initial-release: AWS Elastic Beanstalk Deploy Action v1.0.0
