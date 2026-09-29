import { AWSClients } from './aws-clients';
/**
 * Strip dynamic AWS resource identifiers from a message.
 * Used to sanitize error messages when mask-resource-identifiers is enabled. Identifiers the action
 * knows up front (application/environment names, account ID, version label, ...) are masked by
 * core.setSecret instead; this covers the ones only the service knows (resources it created).
 *
 * Scope is intentional: this only runs on error/warning messages, so it targets the identifiers
 * Elastic Beanstalk actually embeds there. Bare 12-digit account IDs are left alone (too
 * false-positive-prone; the account ID is masked via setSecret), and rarer VPC resource IDs
 * (rtb-, igw-, eipassoc-, pcx-) and IPv6 are not covered.
 */
export declare function sanitizeResourceIdentifiers(message: string): string;
/**
 * Format an AWS error for a non-fatal log line, stripping resource identifiers when masking is on.
 */
export declare function describeErrorMessage(error: unknown, maskIdentifiers: boolean): string;
/**
 * Wait for deployment to complete.
 * Returns the last seen event date to avoid duplicate events in subsequent monitoring.
 */
export declare function waitForDeploymentCompletion(clients: AWSClients, applicationName: string, environmentName: string, timeout: number, maskIdentifiers: boolean, deploymentActionType?: 'create' | 'update', deploymentStartTime?: Date, expectedVersionLabel?: string): Promise<Date | undefined>;
/**
 * Wait for environment health to recover.
 */
export declare function waitForHealthRecovery(clients: AWSClients, applicationName: string, environmentName: string, timeout: number, maskIdentifiers: boolean, deploymentStartTime?: Date, lastEventDateFromDeployment?: Date): Promise<void>;
/**
 * Wait for an existing environment to leave a transitional status (Updating/Launching) before
 * deploying to it. UpdateEnvironment on a non-Ready environment fails immediately with
 * "invalid state for this operation. Must be Ready", so a run that starts while a previous one is
 * still deploying (e.g. two pushes in quick succession) would otherwise fail after a few retries.
 * The status is read fresh here rather than reusing the pre-packaging check: packaging, upload,
 * or an image build may have taken long enough for another deployment to start in between.
 */
export declare function waitForEnvironmentReady(clients: AWSClients, applicationName: string, environmentName: string, timeout: number, maskIdentifiers: boolean): Promise<void>;
/**
 * Get environment information for outputs.
 */
export declare function getEnvironmentInfo(clients: AWSClients, applicationName: string, environmentName: string): Promise<{
    url: string;
    id: string;
    status: string;
    health: string;
}>;
