import { Ignore } from 'ignore';
export type SymlinkMode = 'preserve' | 'follow';
export type WalkEntry = {
    kind: 'file';
    relativePath: string;
    sourcePath: string;
} | {
    kind: 'symlink';
    relativePath: string;
    target: string;
};
/**
 * Loads ignore patterns from .ebignore or .gitignore (EB CLI behavior).
 * Returns the file content and source name, or null if neither file exists.
 */
export declare function loadIgnorePatterns(cwd: string): {
    content: string;
    source: string;
} | null;
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
 *   the root are skipped. An ancestor-directory set prevents cycles without
 *   blocking multiple symlinks that legitimately point to the same file.
 */
export declare function walkFiles(dir: string, zipFileName: string, callback: (entry: WalkEntry) => void, ig?: Ignore, symlinks?: SymlinkMode): void;
/**
 * Creates a deployment package for Elastic Beanstalk
 * @param packagePath - Path to existing package (optional)
 * @param versionLabel - Version label for the deployment
 * @param excludePatternsInput - Comma-separated patterns to exclude
 * @param sourceDirectory - Directory to package (defaults to cwd)
 * @param symlinks - How to handle symlinks: 'preserve' or 'follow'
 * @returns Object containing the path to the deployment package
 */
export declare function createDeploymentPackage(packagePath: string | undefined, versionLabel: string, excludePatternsInput: string, sourceDirectory?: string, symlinks?: SymlinkMode): Promise<{
    path: string;
}>;
/**
 * Creates a zip file using archiver. Walks the source tree with `walkFiles`
 * and routes each emitted entry to `archive.file()` for regular files or
 * inlined symlink targets, or `archive.symlink()` for preserved symlink
 * entries.
 */
export declare function createZipFile(zipFileName: string, excludePatterns: string[], ignoreFileContent: string | null, sourceDirectory: string, symlinks?: SymlinkMode): Promise<void>;
