import { Ignore } from 'ignore';
/**
 * Loads ignore patterns from .ebignore or .gitignore (EB CLI behavior).
 * Returns the file content and source name, or null if neither file exists.
 */
export declare function loadIgnorePatterns(cwd: string): {
    content: string;
    source: string;
} | null;
/**
 * Recursively walks a directory, invoking a callback for each non-ignored file.
 * Normalizes path separators to forward slashes for cross-platform compatibility.
 * Skips ignored directories early to avoid unnecessary I/O, and skips symlinks
 * to prevent infinite recursion from circular symlinks.
 */
export declare function walkFiles(dir: string, zipFileName: string, callback: (relativePath: string) => void, ig?: Ignore, baseDir?: string): void;
/**
 * Creates a deployment package for Elastic Beanstalk
 * @param packagePath - Path to existing package (optional)
 * @param versionLabel - Version label for the deployment
 * @param excludePatternsInput - Comma-separated patterns to exclude
 * @returns Object containing the path to the deployment package
 */
export declare function createDeploymentPackage(packagePath: string | undefined, versionLabel: string, excludePatternsInput: string, sourceDirectory?: string): Promise<{
    path: string;
}>;
/**
 * Creates a zip file using archiver.
 * When ignoreFileContent is provided, walks the file tree and filters with the ignore library.
 * Otherwise, uses archive.glob() for backward compatibility.
 */
export declare function createZipFile(zipFileName: string, excludePatterns: string[], ignoreFileContent: string | null, sourceDirectory?: string): Promise<void>;
