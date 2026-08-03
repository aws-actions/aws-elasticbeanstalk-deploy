import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import ignore, { Ignore } from 'ignore';

export type SymlinkMode = 'preserve' | 'follow';

export type WalkEntry =
  | { kind: 'file'; relativePath: string; sourcePath: string }
  | { kind: 'symlink'; relativePath: string; target: string };

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
 * Recursively walks a directory, emitting non-ignored entries via callback.
 *
 * Symlink modes:
 * - 'preserve' (default, matches EB CLI): stores the link as a symlink entry.
 * - 'follow': inlines target contents for in-tree symlinks; skips external ones.
 *   An ancestor set breaks directory cycles without blocking duplicate file links.
 */
export function walkFiles(
  dir: string,
  zipFileName: string,
  callback: (entry: WalkEntry) => void,
  ig?: Ignore,
  symlinks: SymlinkMode = 'preserve'
): void {
  let rootReal: string;
  try {
    rootReal = fs.realpathSync(dir);
  } catch (err: any) {
    // An unreadable root means nothing to package — fail rather than
    // silently producing an empty archive.
    throw new Error(`Cannot read source directory '${dir}': ${err.code ?? err.message}`);
  }

  // Tracks directories on the recursion stack to break cyclic symlinks.
  // Walking from the resolved root keeps joined paths canonical.
  const ancestors = new Set<string>([rootReal]);
  walkTree(rootReal, '', zipFileName, callback, ig, symlinks, rootReal, ancestors);
}

/**
 * Internal recursive walker. `relBase` is the archive-relative prefix for
 * entries in `dir` (empty at the top level; the link's path when following a
 * directory symlink). `ancestors` tracks directories on the current stack to
 * prevent cycles — file symlinks are never blocked by it.
 */
function walkTree(
  dir: string,
  relBase: string,
  zipFileName: string,
  callback: (entry: WalkEntry) => void,
  ig: Ignore | undefined,
  symlinks: SymlinkMode,
  rootReal: string,
  ancestors: Set<string>
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err: any) {
    core.warning(`Skipping unreadable directory: ${dir} (${err.code ?? err.message})`);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = relBase === '' ? entry.name : `${relBase}/${entry.name}`;

    if (relativePath === zipFileName) continue;

    if (entry.isSymbolicLink()) {
      if (ig && ig.ignores(relativePath)) continue;

      if (symlinks === 'preserve') {
        let target: string;
        try {
          target = fs.readlinkSync(fullPath);
        } catch (err: any) {
          core.warning(`Skipping unreadable symlink: ${fullPath} (${err.code ?? err.message})`);
          continue;
        }
        callback({ kind: 'symlink', relativePath, target });
        continue;
      }

      // symlinks === 'follow'
      let realPath: string;
      try {
        realPath = fs.realpathSync(fullPath);
      } catch (err: any) {
        core.warning(`Skipping broken symlink: ${fullPath} (${err.code ?? err.message})`);
        continue;
      }

      if (realPath !== rootReal && !realPath.startsWith(rootReal + path.sep)) {
        core.info(`Skipping external symlink: ${relativePath} -> ${realPath}`);
        continue;
      }

      let stats: fs.Stats;
      try {
        stats = fs.statSync(realPath);
      } catch (err: any) {
        core.warning(`Skipping unreadable symlink target: ${fullPath} (${err.code ?? err.message})`);
        continue;
      }

      if (stats.isDirectory()) {
        if (ancestors.has(realPath)) {
          core.info(`Skipping cyclic directory symlink: ${relativePath} -> ${realPath}`);
          continue;
        }
        ancestors.add(realPath);
        walkTree(realPath, relativePath, zipFileName, callback, ig, symlinks, rootReal, ancestors);
        ancestors.delete(realPath);
      } else if (stats.isFile()) {
        callback({ kind: 'file', relativePath, sourcePath: realPath });
      }
      continue;
    }

    if (entry.isDirectory()) {
      if (ig && ig.ignores(relativePath + '/')) continue;
      // Register real dirs too, so links back at them (a/loop -> a) are
      // caught as cycles instead of duplicating contents.
      ancestors.add(fullPath);
      walkTree(fullPath, relativePath, zipFileName, callback, ig, symlinks, rootReal, ancestors);
      ancestors.delete(fullPath);
    } else if (entry.isFile()) {
      if (ig && ig.ignores(relativePath)) continue;
      callback({ kind: 'file', relativePath, sourcePath: fullPath });
    }
  }
}

/**
 * Creates a deployment package for Elastic Beanstalk
 * @param packagePath - Path to existing package (optional)
 * @param versionLabel - Version label for the deployment
 * @param excludePatternsInput - Comma-separated patterns to exclude
 * @param sourceDirectory - Directory to package (defaults to cwd)
 * @param symlinks - How to handle symlinks: 'preserve' or 'follow'
 * @returns Object containing the path to the deployment package
 */
export async function createDeploymentPackage(
  packagePath: string | undefined,
  versionLabel: string,
  excludePatternsInput: string,
  sourceDirectory?: string,
  symlinks: SymlinkMode = 'preserve'
): Promise<{ path: string }> {
  if (packagePath) {
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

  const zipFileName = `deploy-${versionLabel}.zip`;
  core.info(`📦 Creating deployment package: ${zipFileName}`);

  const excludePatterns = excludePatternsInput
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const effectiveDir = sourceDirectory ?? process.cwd();
  const ignoreFile = loadIgnorePatterns(effectiveDir);
  const ignoreFileContent = ignoreFile ? ignoreFile.content : null;

  await createZipFile(zipFileName, excludePatterns, ignoreFileContent, effectiveDir, symlinks);

  return { path: zipFileName };
}

/**
 * Creates a zip file using archiver. Walks the source tree with `walkFiles`
 * and routes each emitted entry to `archive.file()` for regular files or
 * inlined symlink targets, or `archive.symlink()` for preserved symlink
 * entries.
 */
export async function createZipFile(
  zipFileName: string,
  excludePatterns: string[],
  ignoreFileContent: string | null,
  sourceDirectory: string,
  symlinks: SymlinkMode = 'preserve'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFileName);
    const archive = archiver('zip');

    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);

    const ig = ignore();
    if (ignoreFileContent) {
      ig.add(ignoreFileContent);
    }
    if (excludePatterns.length > 0) {
      ig.add(excludePatterns);
    }
    const hasIgnoreRules = !!ignoreFileContent || excludePatterns.length > 0;

    walkFiles(sourceDirectory, zipFileName, (entry) => {
      if (entry.kind === 'file') {
        archive.file(entry.sourcePath, { name: entry.relativePath });
      } else {
        // Without an explicit mode, archiver writes symlink entries with 000
        // permissions, which breaks extraction on platforms that honor
        // symlink modes (e.g. macOS).
        archive.symlink(entry.relativePath, entry.target, 0o755);
      }
    }, hasIgnoreRules ? ig : undefined, symlinks);

    archive.finalize();
  });
}
