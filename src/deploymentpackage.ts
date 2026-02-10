import * as core from '@actions/core';
import * as fs from 'fs';
import archiver from 'archiver';

/**
 * Creates a deployment package for Elastic Beanstalk
 * @param packagePath - Path to existing package (optional)
 * @param versionLabel - Version label for the deployment
 * @param excludePatternsInput - Comma-separated patterns to exclude
 * @returns Object containing the path to the deployment package
 */
export async function createDeploymentPackage(
  packagePath: string | undefined,
  versionLabel: string,
  excludePatternsInput: string
): Promise<{ path: string }> {
  if (packagePath) {
    // deployment-package-path explicitly provided by user
    if (!fs.existsSync(packagePath)) {
      throw new Error(
        `deployment-package-path '${packagePath}' does not exist. ` +
        'Either provide a valid file path or omit deployment-package-path to have the action create a package automatically.'
      );
    }

    const stats = fs.statSync(packagePath);
    if (!stats.isFile()) {
      throw new Error(
        `deployment-package-path '${packagePath}' is not a file. ` +
        'It must point to an existing deployment archive file (e.g., .zip, .war).'
      );
    }

    core.info(`📦 Using existing deployment package: ${packagePath}`);
    return { path: packagePath };
  }

  // No explicit package path provided – create a new deployment package from the workspace.
  const zipFileName = `deploy-${versionLabel}.zip`;
  core.info(`📦 Creating deployment package: ${zipFileName}`);

  const excludePatterns = excludePatternsInput
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  await createZipFile(zipFileName, excludePatterns);

  return { path: zipFileName };
}

/**
 * Creates a zip file using archiver
 */
async function createZipFile(zipFileName: string, excludePatterns: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFileName);
    const archive = archiver('zip');

    output.on('close', () => resolve());
    archive.on('error', reject);

    archive.pipe(output);
    archive.glob('**/*', { ignore: excludePatterns, dot: true });
    archive.finalize();
  });
}
