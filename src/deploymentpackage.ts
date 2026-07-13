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
 * Recursively walks a directory, invoking a callback for each non-ignored entry.
 * Normalizes path separators to forward slashes for cross-platform compatibility.
 * Skips ignored directories early to avoid unnecessary I/O.
 *
 * Symlink handling depends on `symlinks`:
 * - 'preserve' (default): emit a symlink entry that records the link target.
 *   Matches EB CLI behavior. The directory tree is not descended through the
 *   link, so cyclic links can't cause infinite recursion.
 * - 'follow': if the symlink resolves inside the source root, inline the
 *   target's contents (file or directory subtree). Symlinks pointing outside
 *   the root are skipped. A visited-real-path set prevents cycles.
 */
export function walkFiles(
  dir: string,
  zipFileName: string,
  callback: (entry: WalkEntry) => void,
  ig?: Ignore,
  symlinks: SymlinkMode = 'preserve',
  baseDir?: string,
  visited?: Set<string>
): void {
  const root = baseDir ?? dir;
  const seen = visited ?? new Set<string>();

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err: any) {
    core.warning(`Skipping unreadable directory: ${dir} (${err.code ?? err.message})`);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');

    if (entry.isSymbolicLink()) {
      if (relativePath === zipFileName) continue;
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

      const rootReal = fs.realpathSync(root);
      const rel = path.relative(rootReal, realPath);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        core.info(`Skipping external symlink: ${relativePath} -> ${realPath}`);
        continue;
      }

      if (seen.has(realPath)) continue;
      seen.add(realPath);

      let stats: fs.Stats;
      try {
        stats = fs.statSync(realPath);
      } catch (err: any) {
        core.warning(`Skipping unreadable symlink target: ${fullPath} (${err.code ?? err.message})`);
        continue;
      }

      if (stats.isDirectory()) {
        walkSymlinkedDir(realPath, relativePath, zipFileName, callback, ig, symlinks, root, seen);
      } else if (stats.isFile()) {
        callback({ kind: 'file', relativePath, sourcePath: realPath });
      }
      continue;
    }

    if (entry.isDirectory()) {
      if (ig && ig.ignores(relativePath + '/')) continue;
      walkFiles(fullPath, zipFileName, callback, ig, symlinks, root, seen);
    } else if (entry.isFile()) {
      if (relativePath === zipFileName) continue;
      if (ig && ig.ignores(relativePath)) continue;
      callback({ kind: 'file', relativePath, sourcePath: fullPath });
    }
  }
}

/**
 * Walks a directory reached via a followed symlink. Entries inside are added
 * to the archive at paths relative to the *link's* location in the source
 * tree (linkRelPath), not the target's real path. Nested symlinks are still
 * subject to the same follow rules and cycle protection.
 */
function walkSymlinkedDir(
  realDir: string,
  linkRelPath: string,
  zipFileName: string,
  callback: (entry: WalkEntry) => void,
  ig: Ignore | undefined,
  symlinks: SymlinkMode,
  root: string,
  seen: Set<string>
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(realDir, { withFileTypes: true });
  } catch (err: any) {
    core.warning(`Skipping unreadable directory: ${realDir} (${err.code ?? err.message})`);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(realDir, entry.name);
    const relativePath = `${linkRelPath}/${entry.name}`;

    if (entry.isSymbolicLink()) {
      if (ig && ig.ignores(relativePath)) continue;
      let realPath: string;
      try {
        realPath = fs.realpathSync(fullPath);
      } catch {
        continue;
      }
      const rootReal = fs.realpathSync(root);
      const rel = path.relative(rootReal, realPath);
      if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
      if (seen.has(realPath)) continue;
      seen.add(realPath);
      let stats: fs.Stats;
      try {
        stats = fs.statSync(realPath);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        walkSymlinkedDir(realPath, relativePath, zipFileName, callback, ig, symlinks, root, seen);
      } else if (stats.isFile()) {
        callback({ kind: 'file', relativePath, sourcePath: realPath });
      }
    } else if (entry.isDirectory()) {
      if (ig && ig.ignores(relativePath + '/')) continue;
      walkSymlinkedDir(fullPath, relativePath, zipFileName, callback, ig, symlinks, root, seen);
    } else if (entry.isFile()) {
      if (relativePath === zipFileName) continue;
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

  await createZipFile(zipFileName, excludePatterns, ignoreFileContent, sourceDirectory, symlinks);

  return { path: zipFileName };
}

/**
 * Creates a zip file using archiver. Walks the source tree with `walkFiles`
 * and emits file, symlink, or inlined-target entries per the requested
 * symlink mode. When ignoreFileContent is null and no symlink handling is
 * needed, falls back to archiver's built-in glob for backward compatibility —
 * but glob doesn't handle symlinks, so we always walk when symlinks='preserve'
 * or when we need to include them.
 */
export async function createZipFile(
  zipFileName: string,
  excludePatterns: string[],
  ignoreFileContent: string | null,
  sourceDirectory?: string,
  symlinks: SymlinkMode = 'preserve'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFileName);
    const archive = archiver('zip');

    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);

    const effectiveDir = sourceDirectory ?? process.cwd();

    const ig = ignore();
    if (ignoreFileContent) {
      ig.add(ignoreFileContent);
    }
    if (excludePatterns.length > 0) {
      ig.add(excludePatterns);
    }
    const hasIgnoreRules = !!ignoreFileContent || excludePatterns.length > 0;

    walkFiles(effectiveDir, zipFileName, (entry) => {
      if (entry.kind === 'file') {
        archive.file(entry.sourcePath, { name: entry.relativePath });
      } else {
        archive.symlink(entry.relativePath, entry.target);
      }
    }, hasIgnoreRules ? ig : undefined, symlinks);

    archive.finalize();
  });
}
