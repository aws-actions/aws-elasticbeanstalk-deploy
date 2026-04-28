import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import ignore, { Ignore } from 'ignore';
import { DeploymentContext, logInfo } from './logging';

/**
 * Loads ignore patterns from .ebignore or .gitignore (EB CLI behavior).
 * Returns the file content and source name, or null if neither file exists.
 */
export function loadIgnorePatterns(cwd: string): { content: string; source: string } | null {
  const ebignorePath = path.join(cwd, '.ebignore');
  if (fs.existsSync(ebignorePath)) {
    const content = fs.readFileSync(ebignorePath, 'utf-8');
    core.info(`📄 Using ignore patterns from .ebignore`);
    return { content, source: '.ebignore' };
  }

  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    core.info(`📄 Using ignore patterns from .gitignore (no .ebignore found)`);
    return { content, source: '.gitignore' };
  }

  core.info('📄 No .ebignore or .gitignore found; no file-based exclusions applied');
  return null;
}

/**
 * Recursively walks a directory, invoking a callback for each non-ignored file.
 * Normalizes path separators to forward slashes for cross-platform compatibility.
 * Skips ignored directories early to avoid unnecessary I/O, and skips symlinks
 * to prevent infinite recursion from circular symlinks.
 */
export function walkFiles(
  dir: string,
  zipFileName: string,
  callback: (relativePath: string) => void,
  ig?: Ignore,
  baseDir?: string
): void {
  const root = baseDir ?? dir;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err: any) {
    core.warning(`Skipping unreadable directory: ${dir} (${err.code ?? err.message})`);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip symlinks to prevent infinite recursion from circular symlinks
    if (entry.isSymbolicLink()) continue;

    const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      // Skip ignored directories early to avoid unnecessary traversal
      if (ig && ig.ignores(relativePath + '/')) continue;
      walkFiles(fullPath, zipFileName, callback, ig, root);
    } else {
      if (relativePath === zipFileName) continue;
      // Skip ignored files during traversal
      if (ig && ig.ignores(relativePath)) continue;
      callback(relativePath);
    }
  }
}

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
  excludePatternsInput: string,
  sourceDirectory?: string,
  ctx?: DeploymentContext,
): Promise<{ path: string }> {
  if (packagePath) {
    if (!fs.existsSync(packagePath)) {
      throw new Error(
        (ctx?.verboseLogging ?? true)
          ? `deployment-package-path '${packagePath}' does not exist. ` +
            'Either provide a valid file path or omit deployment-package-path to have the action create a package automatically.'
          : 'deployment-package-path does not exist. ' +
            'Either provide a valid file path or omit deployment-package-path to have the action create a package automatically.'
      );
    }

    const stats = fs.statSync(packagePath);
    if (!stats.isFile()) {
      throw new Error(
        (ctx?.verboseLogging ?? true)
          ? `deployment-package-path '${packagePath}' is not a file. ` +
            'It must point to an existing deployment archive file (e.g., .zip, .war).'
          : 'deployment-package-path is not a file. ' +
            'It must point to an existing deployment archive file (e.g., .zip, .war).'
      );
    }

    if (ctx) {
      logInfo(ctx, `📦 Using existing deployment package: ${packagePath}`, '📦 Using existing deployment package');
    } else {
      core.info(`📦 Using existing deployment package: ${packagePath}`);
    }
    return { path: packagePath };
  }

  const zipFileName = `deploy-${versionLabel}.zip`;
  if (ctx) {
    logInfo(ctx, `📦 Creating deployment package: ${zipFileName}`, '📦 Creating deployment package');
  } else {
    core.info(`📦 Creating deployment package: ${zipFileName}`);
  }

  const excludePatterns = excludePatternsInput
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const effectiveDir = sourceDirectory ?? process.cwd();
  const ignoreFile = loadIgnorePatterns(effectiveDir);
  const ignoreFileContent = ignoreFile ? ignoreFile.content : null;

  await createZipFile(zipFileName, excludePatterns, ignoreFileContent, sourceDirectory);

  return { path: zipFileName };
}

/**
 * Creates a zip file using archiver.
 * When ignoreFileContent is provided, walks the file tree and filters with the ignore library.
 * Otherwise, uses archive.glob() for backward compatibility.
 */
export async function createZipFile(
  zipFileName: string,
  excludePatterns: string[],
  ignoreFileContent: string | null,
  sourceDirectory?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFileName);
    const archive = archiver('zip');

    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);

    const effectiveDir = sourceDirectory ?? process.cwd();

    if (ignoreFileContent) {
      const ig = ignore().add(ignoreFileContent);
      if (excludePatterns.length > 0) {
        ig.add(excludePatterns);
      }

      walkFiles(effectiveDir, zipFileName, (relativePath) => {
        archive.file(path.join(effectiveDir, relativePath), { name: relativePath });
      }, ig);
    } else {
      archive.glob('**/*', { cwd: sourceDirectory, ignore: excludePatterns, dot: true });
    }

    archive.finalize();
  });
}
