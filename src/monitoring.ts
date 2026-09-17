import * as core from '@actions/core';
import { AWSClients } from './aws-clients';
import { describeEnvironment, describeEvents, EventSnapshot, isNonRetryableError } from './aws-operations';

/**
 * Fetch recent environment events for debugging and check for fatal/error events.
 */
async function describeRecentEvents(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  lastSeenEventDate?: Date,
  deploymentStartTime?: Date
): Promise<{ hasError: boolean; errorMessage?: string; lastEventDate?: Date }> {
  try {
    const events: EventSnapshot[] = await describeEvents(clients, applicationName, environmentName);

    const newEvents = events.filter((event) => {
      const eventDate = event.date;
      if (!eventDate) return false;
      if (deploymentStartTime && eventDate <= deploymentStartTime) return false;
      if (lastSeenEventDate && eventDate <= lastSeenEventDate) return false;
      return true;
    });

    if (newEvents.length === 0) {
      return { hasError: false, lastEventDate: lastSeenEventDate };
    }

    // Only show header on first call
    if (!lastSeenEventDate) {
      core.info('📋 Recent events:');
    }

    // Sort events by timestamp in ascending order (oldest first)
    const sortedEvents = [...newEvents].sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));

    const fatalOrErrorEvents: Array<{ message: string }> = [];
    let mostRecentDate: Date | undefined;

    sortedEvents.forEach((event) => {
      const eventDate = event.date;
      if (eventDate && (!mostRecentDate || eventDate > mostRecentDate)) {
        mostRecentDate = eventDate;
      }

      const timestamp = eventDate?.toISOString() || 'Unknown time';
      const severity = event.severity || 'INFO';
      const message = event.message || 'No message';

      if (severity === 'ERROR' || severity === 'FATAL') {
        core.error(`  [${timestamp}] ${severity}: ${message}`);
        fatalOrErrorEvents.push({ message });
      } else if (severity === 'WARN') {
        core.warning(`  [${timestamp}] ${severity}: ${message}`);
      } else {
        core.info(`  [${timestamp}] ${severity}: ${message}`);
      }
    });

    if (fatalOrErrorEvents.length > 0) {
      const errorMessage = fatalOrErrorEvents[0].message || 'Unknown error occurred';
      return { hasError: true, errorMessage, lastEventDate: mostRecentDate };
    }

    return { hasError: false, lastEventDate: mostRecentDate };
  } catch (error) {
    // If we can't fetch events, just log and continue
    core.debug(`Failed to fetch events: ${error}`);
    return { hasError: false, lastEventDate: lastSeenEventDate };
  }
}

/**
 * Wait for deployment to complete.
 * Returns the last seen event date to avoid duplicate events in subsequent monitoring.
 */
export async function waitForDeploymentCompletion(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  timeout: number,
  deploymentActionType?: 'create' | 'update',
  deploymentStartTime?: Date,
  expectedVersionLabel?: string
): Promise<Date | undefined> {
  core.info('⏳ Waiting for deployment to complete...');

  const startTime = Date.now();
  const maxWait = timeout * 1000;
  let previousStatus: string | undefined;
  let lastSeenEventDate: Date | undefined;
  // 'Ready' on another version is ambiguous: either the environment has not acted on the
  // request yet, or the update was rolled back. Only the state surviving this window is
  // treated as a rollback.
  const rollbackConfirmationMs = 30000;
  let readyOnUnexpectedVersionSince: number | undefined;

  // Poll every 20 seconds for create, 10 seconds for update
  const pollInterval = deploymentActionType === 'create' ? 20000 : 10000;

  while (Date.now() - startTime < maxWait) {
    const env = await describeEnvironment(clients, applicationName, environmentName);

    if (env) {
      const status = env.status;

      // Always check for fatal/error events first — a launch failure can flip status to
      // Ready in the same poll cycle it errors (EB surfaces the failure via events/health,
      // not a distinct terminal status), so the Ready branch must not short-circuit past it.
      const eventCheck = await describeRecentEvents(clients, applicationName, environmentName, lastSeenEventDate, deploymentStartTime);
      lastSeenEventDate = eventCheck.lastEventDate;

      if (eventCheck.hasError) {
        throw new Error(`Environment deployment failed - fatal or error event detected: ${eventCheck.errorMessage}`);
      }

      const versionMismatch = expectedVersionLabel !== undefined && env.versionLabel !== expectedVersionLabel;

      if (status === 'Ready' && !versionMismatch) {
        core.info('✅ Deployment complete');
        return lastSeenEventDate;
      }

      // A failed update emits its ERROR events and then returns the environment to Ready on the
      // previous version, so status and health look healthy for a deployment that never landed.
      if (status === 'Ready' && versionMismatch) {
        readyOnUnexpectedVersionSince ??= Date.now();
        if (Date.now() - readyOnUnexpectedVersionSince >= rollbackConfirmationMs) {
          throw new Error(
            `Environment deployment failed - environment is running version ${env.versionLabel ?? 'unknown'} ` +
            `instead of the requested ${expectedVersionLabel}, the update was most likely rolled back`
          );
        }
      } else {
        readyOnUnexpectedVersionSince = undefined;
      }

      // Only log when status changes
      if (status !== previousStatus) {
        core.info(`Current status: ${status}`);
        previousStatus = status;
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout occurred - fetch events to help diagnose
  await describeRecentEvents(clients, applicationName, environmentName, lastSeenEventDate, deploymentStartTime);
  throw new Error(`Deployment timed out after ${timeout}s`);
}

/**
 * Wait for environment health to recover.
 */
export async function waitForHealthRecovery(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  timeout: number,
  deploymentStartTime?: Date,
  lastEventDateFromDeployment?: Date
): Promise<void> {
  core.info('🏥 Waiting for environment health to recover...');

  const startTime = Date.now();
  const maxWait = timeout * 1000;
  let previousStatus: string | undefined;
  let previousHealth: string | undefined;
  let lastSeenEventDate: Date | undefined = lastEventDateFromDeployment;

  while (Date.now() - startTime < maxWait) {
    const env = await describeEnvironment(clients, applicationName, environmentName);

    if (env) {
      const health = env.health;
      const status = env.status;

      if (health === 'Green' || health === 'Yellow') {
        core.info('✅ Environment is healthy!');
        return;
      }

      if (health === 'Grey' || health === undefined || health === 'Red') {
        const eventCheck = await describeRecentEvents(clients, applicationName, environmentName, lastSeenEventDate, deploymentStartTime);

        if (eventCheck.lastEventDate) {
          lastSeenEventDate = eventCheck.lastEventDate;
        }

        if (eventCheck.hasError) {
          throw new Error(`Environment health recovery failed - fatal or error event detected: ${eventCheck.errorMessage}`);
        }

        if (health === 'Red' && status === 'Ready') {
          throw new Error('Environment health recovery failed - health is Red');
        }
      }

      if (status !== previousStatus || health !== previousHealth) {
        core.info(`Current status: ${status}, health: ${health}`);
        previousStatus = status;
        previousHealth = health;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  // Timeout occurred - fetch events to help diagnose
  await describeRecentEvents(clients, applicationName, environmentName, lastSeenEventDate, deploymentStartTime);
  throw new Error(`Environment health recovery timed out after ${timeout}s`);
}

/**
 * Wait for an existing environment to leave a transitional status (Updating/Launching) before
 * deploying to it. UpdateEnvironment on a non-Ready environment fails immediately with
 * "invalid state for this operation. Must be Ready", so a run that starts while a previous one is
 * still deploying (e.g. two pushes in quick succession) would otherwise fail after a few retries.
 * The status is read fresh here rather than reusing the pre-packaging check: packaging, upload,
 * or an image build may have taken long enough for another deployment to start in between.
 */
export async function waitForEnvironmentReady(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  timeout: number
): Promise<void> {
  const startTime = Date.now();
  const maxWait = timeout * 1000;
  const pollInterval = 10000;
  let waited = false;

  while (true) {
    let env;
    let status: string | undefined;
    try {
      env = await describeEnvironment(clients, applicationName, environmentName);
      status = env?.status;
      if (status === 'Ready') {
        if (waited) core.info('✅ Environment is Ready');
        return;
      }
      if (status === 'Terminating' || status === 'Terminated' || !env) {
        throw new Error(`Environment ${environmentName} is ${status ?? 'gone'} and cannot be deployed to`);
      }
    } catch (error) {
      // The poll loop is the retry for transient describe failures (throttling, 5xx); permanent
      // ones (lost permissions, expired credentials) and the terminal-state error above propagate.
      if (env !== undefined || isNonRetryableError(error)) throw error;
      core.warning(`Could not read environment status (will retry): ${(error as Error).message}`);
      status = undefined;
    }
    const remainingMs = maxWait - (Date.now() - startTime);
    if (remainingMs <= 0) break;
    if (!waited) {
      core.info(`⏳ Environment ${environmentName} is ${status ?? 'in an unknown state'}; waiting for it to become Ready...`);
      waited = true;
    } else {
      core.info(`Current status: ${status}`);
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(pollInterval, remainingMs)));
  }

  throw new Error(`Environment ${environmentName} did not become Ready within ${timeout}s`);
}

/**
 * Get environment information for outputs.
 */
export async function getEnvironmentInfo(
  clients: AWSClients,
  applicationName: string,
  environmentName: string
): Promise<{ url: string; id: string; status: string; health: string }> {
  const env = await describeEnvironment(clients, applicationName, environmentName);

  if (!env) {
    throw new Error(`Environment ${environmentName} not found after deployment`);
  }

  return {
    url: env.cname || '',
    id: env.environmentId || '',
    status: env.status || '',
    health: env.health || '',
  };
}
