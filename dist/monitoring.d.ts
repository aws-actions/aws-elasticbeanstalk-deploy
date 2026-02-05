import { AWSClients } from './aws-clients';
/**
 * Wait for deployment to complete
 * Returns the last seen event date to avoid duplicate events in subsequent monitoring
 */
export declare function waitForDeploymentCompletion(clients: AWSClients, applicationName: string, environmentName: string, timeout: number, deploymentActionType?: 'create' | 'update', deploymentStartTime?: Date): Promise<Date | undefined>;
/**
 * Wait for environment health to recover
 */
export declare function waitForHealthRecovery(clients: AWSClients, applicationName: string, environmentName: string, timeout: number, deploymentStartTime?: Date, lastEventDateFromDeployment?: Date): Promise<void>;
