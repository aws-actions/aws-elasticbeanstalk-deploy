export interface Inputs {
    awsRegion: string;
    applicationName: string;
    environmentName: string;
    applicationVersionLabel: string;
    deploymentPackagePath?: string;
    solutionStackName?: string;
    platformArn?: string;
    createEnvironmentIfNotExists: boolean;
    createApplicationIfNotExists: boolean;
    waitForDeployment: boolean;
    waitForEnvironmentRecovery: boolean;
    deploymentTimeout: number;
    maxRetries: number;
    retryDelay: number;
    useExistingApplicationVersionIfAvailable: boolean;
    createS3BucketIfNotExists: boolean;
    s3BucketName?: string;
    excludePatterns: string;
    optionSettings?: string;
}
export declare function validateAllInputs(): {
    valid: boolean;
} & Partial<Inputs>;
export declare function parseJsonInput(jsonString: string, inputName: string): any;
