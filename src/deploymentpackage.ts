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
  let finalPath: string;

  if (packagePath && fs.existsSync(packagePath)) {
    core.info(`📦 Using existing deployment package: ${packagePath}`);
    finalPath = packagePath;
  } else {
    const zipFileName = `deploy-${versionLabel}.zip`;
    core.info(`📦 Creating deployment package: ${zipFileName}`);

    const excludePatterns = excludePatternsInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    await createZipFile(zipFileName, excludePatterns);
    finalPath = zipFileName;
  }

  return { path: finalPath };
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
