/**
 * Creates a deployment package for Elastic Beanstalk
 * @param packagePath - Path to existing package (optional)
 * @param versionLabel - Version label for the deployment
 * @param excludePatternsInput - Comma-separated patterns to exclude
 * @returns Object containing the path to the deployment package
 */
export declare function createDeploymentPackage(packagePath: string | undefined, versionLabel: string, excludePatternsInput: string): Promise<{
    path: string;
}>;
