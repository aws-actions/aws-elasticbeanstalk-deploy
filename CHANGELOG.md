# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### <a name="1.0.8" href="https://github.com/aws-actions/aws-elasticbeanstalk-deploy/tree/v1.0.8">1.0.8</a>

#### Features

* package: add `symlinks` input to control symlink handling in auto-created packages (`preserve` | `follow`)

#### Behavior changes

* package: symlinks are now included in auto-created packages. They were previously omitted entirely. The default `preserve` records them as symlink entries, matching the EB CLI.
* package: `exclude-patterns` now uses gitignore semantics in all cases. Repositories with no `.ebignore` or `.gitignore` previously used glob semantics, where a pattern matched only at the root. Patterns such as `*.log` or `node_modules` now match at any depth and will exclude more files than before.

### <a name="1.0.0" href="https://github.com/aws-actions/aws-elasticbeanstalk-deploy/tree/v1.0.0">1.0.0 (2026-02-11)</a>

#### Features

* initial-release: AWS Elastic Beanstalk Deploy Action v1.0.0
