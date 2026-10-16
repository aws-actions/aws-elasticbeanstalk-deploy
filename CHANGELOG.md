# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### <a name="1.1.2" href="https://github.com/aws-actions/aws-elasticbeanstalk-deploy/tree/v1.1.2">1.1.2</a>

#### Bug fixes

* The S3 upload is now conditional (`If-None-Match: *`) and never replaces an existing object. If the key is already taken, the run fails before `CreateApplicationVersion` with a message naming the key and the label. Previously, when the label lookup did not see an existing version (for example because the caller lacks `elasticbeanstalk:DescribeApplicationVersions`, which returns an empty list rather than an error), the Standard and `build-configuration` paths uploaded over that version's bundle.

* Because the upload never overwrites, an object left at the bundle key blocks a re-run of the same label until it is removed. This affects any "delete the version and retry" flow: `DeleteApplicationVersion` keeps the source bundle unless `DeleteSourceBundle=true`, so delete the version with that flag (the API default is false; the EB CLI's `eb appversion --delete` sets it) or delete the object. A run that uploaded and then failed before `CreateApplicationVersion` also leaves its object behind. Before 1.1.2 the re-run silently overwrote it.

#### Documentation

* Correction to the 1.1.1 notes: a missing `elasticbeanstalk:DescribeApplicationVersions` permission does not fail the run. With it, an existing label is reported before packaging. Without it, Standard and `build-configuration` runs fail at the upload and `image-uri` runs fail at `CreateApplicationVersion`, and `use-existing-application-version-if-available: true` cannot see the version to reuse it. The permission is required for reuse and recommended otherwise.

### <a name="1.1.1" href="https://github.com/aws-actions/aws-elasticbeanstalk-deploy/tree/v1.1.1">1.1.1</a>

#### Behavior changes

* `use-existing-application-version-if-available` now defaults to `false`. A `version-label` that already exists fails the run instead of deploying the existing version. Set the input to `true` to deploy one version to multiple environments or to re-run a deployment of a commit whose version already exists. Note that with it on, the action deploys the application version that exists under the label as-is, without comparing it to the current source. Workflows that relied on the previous default for those flows must now set the input explicitly.
* The label is looked up before anything is packaged in every mode. A `DescribeApplicationVersions` error now fails the run; previously the Standard path skipped the lookup with reuse off and ignored lookup errors with reuse on. Policies without `elasticbeanstalk:DescribeApplicationVersions` should add it. The Standard path no longer packages a bundle when reusing a version.

#### Bug fixes

* With reuse off and an existing label, the Standard path uploaded the new bundle to the existing version's S3 key before `CreateApplicationVersion` rejected the duplicate, replacing that version's bundle. The run now fails before upload and the existing bundle is left untouched.

#### Features

* README: new "Reusing an Existing Version" section describing the default and when to opt in.

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
