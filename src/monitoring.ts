import * as core from '@actions/core';
import {
  DescribeEnvironmentsCommand,
  DescribeEventsCommand,
  EnvironmentDescription,
} from '@aws-sdk/client-elastic-beanstalk';
import { AWSClients } from './aws-clients';
import { isAuthorizationError } from './aws-operations';

/**
 * Read the environment, reporting a failed read rather than throwing it: each caller polls until
 * its own timeout, so a transient failure is a tick to skip. Authorization failures are thrown —
 * polling will not grant the permission.
 */
async function describeEnvironment(
  clients: AWSClients,
  applicationName: string,
  environmentName: string
): Promise<{ environment?: EnvironmentDescription; error?: unknown }> {
  const command = new DescribeEnvironmentsCommand({
    ApplicationName: applicationName,
    EnvironmentNames: [environmentName],
  });

  try {
    const response = await clients.getElasticBeanstalkClient().send(command);
    return { environment: response.Environments?.[0] };
  } catch (error) {
    if (isAuthorizationError(error)) {
      throw error;
    }
    core.warning(`Could not read the environment's status, retrying: ${error}`);
    return { error };
  }
}

/** Names a failed read in a timeout message, so it is not read as a deployment that never finished. */
function timeoutMessage(message: string, lastDescribeError: unknown): string {
  return lastDescribeError
    ? `${message}; the last read of the environment's status failed: ${lastDescribeError}`
    : message;
}

/**
 * Fetch recent environment events for debugging and check for fatal/error events
 */
async function describeRecentEvents(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  lastSeenEventDate?: Date,
  deploymentStartTime?: Date
): Promise<{ hasError: boolean; errorMessage?: string; lastEventDate?: Date }> {
  try {
    const command = new DescribeEventsCommand({
      ApplicationName: applicationName,
      EnvironmentName: environmentName,
      MaxRecords: 10,
    });

    const response = await clients.getElasticBeanstalkClient().send(command);

    if (response.Events && response.Events.length > 0) {
      const newEvents = response.Events.filter((event) => {
        const eventDate = event.EventDate;
        if (!eventDate) return false;

        // Must be after deployment start time
        if (deploymentStartTime && eventDate <= deploymentStartTime) {
          return false;
        }

        // Must be after last seen event date
        if (lastSeenEventDate && eventDate <= lastSeenEventDate) {
          return false;
        }

        return true;
      });

      if (newEvents.length > 0) {
        // Only show header on first call
        if (!lastSeenEventDate) {
          core.info('📋 Recent events:');
        }
        
        // Sort events by timestamp in ascending order (oldest first)
        const sortedEvents = [...newEvents].sort((a, b) => {
          const dateA = a.EventDate?.getTime() || 0;
          const dateB = b.EventDate?.getTime() || 0;
          return dateA - dateB;
        });
        
        const fatalOrErrorEvents: Array<{ message: string }> = [];
        let mostRecentDate: Date | undefined;
        
        sortedEvents.forEach((event) => {
          const eventDate = event.EventDate;
          if (eventDate) {
            // Track the most recent event date
            if (!mostRecentDate || eventDate > mostRecentDate) {
              mostRecentDate = eventDate;
            }
          }
          
          const timestamp = eventDate?.toISOString() || 'Unknown time';
          const severity = event.Severity || 'INFO';
          const message = event.Message || 'No message';

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
      }
    }    
    return { hasError: false, lastEventDate: lastSeenEventDate };
  } catch (error) {
    // If we can't fetch events, just log and continue
    core.debug(`Failed to fetch events: ${error}`);
    return { hasError: false, lastEventDate: lastSeenEventDate };
  }
}

/**
 * Wait for deployment to complete
 * Returns the last seen event date to avoid duplicate events in subsequent monitoring
 */
export async function waitForDeploymentCompletion(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  timeout: number,
  deploymentActionType?: 'create' | 'update',
  deploymentStartTime?: Date,
  pollInterval?: number
): Promise<Date | undefined> {
  core.info('⏳ Waiting for deployment to complete...');

  const startTime = Date.now();
  const maxWait = timeout * 1000;
  let previousStatus: string | undefined;
  let lastSeenEventDate: Date | undefined;
  let lastDescribeError: unknown;

  // Every 20s for create, 10s for update, unless the caller asked for fewer calls than that.
  const pollIntervalMs = (pollInterval ?? (deploymentActionType === 'create' ? 20 : 10)) * 1000;

  while (Date.now() - startTime < maxWait) {
    const { environment: env, error } = await describeEnvironment(clients, applicationName, environmentName);
    lastDescribeError = error;

    if (env) {
      const status = env.Status;

      if (status === 'Ready') {
        // Fetch and display final events before completing
        const finalEvents = await describeRecentEvents(
          clients,
          applicationName,
          environmentName,
          lastSeenEventDate,
          deploymentStartTime
        );
        core.info('✅ Deployment complete');
        return finalEvents.lastEventDate || lastSeenEventDate;
      }

      // Check for fatal/error events during deployment
      const eventCheck = await describeRecentEvents(
        clients,
        applicationName,
        environmentName,
        lastSeenEventDate,
        deploymentStartTime
      );

      lastSeenEventDate = eventCheck.lastEventDate;

      if (eventCheck.hasError) {
        throw new Error(
          `Environment deployment failed - fatal or error event detected: ${eventCheck.errorMessage}`
        );
      }

      // Only log when status changes
      if (status !== previousStatus) {
        core.info(`Current status: ${status}`);
        previousStatus = status;
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  // Timeout occurred - fetch events to help diagnose
  await describeRecentEvents(clients, applicationName, environmentName, lastSeenEventDate, deploymentStartTime);
  throw new Error(timeoutMessage(`Deployment timed out after ${timeout}s`, lastDescribeError));
}

/**
 * Wait for environment health to recover
 */
export async function waitForHealthRecovery(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  timeout: number,
  deploymentStartTime?: Date,
  lastEventDateFromDeployment?: Date,
  pollInterval?: number
): Promise<void> {
  core.info('🏥 Waiting for environment health to recover...');

  const startTime = Date.now();
  const maxWait = timeout * 1000;
  let previousStatus: string | undefined;
  let previousHealth: string | undefined;
  let lastSeenEventDate: Date | undefined = lastEventDateFromDeployment;
  let lastDescribeError: unknown;

  const pollIntervalMs = (pollInterval ?? 15) * 1000;

  while (Date.now() - startTime < maxWait) {
    const { environment: env, error } = await describeEnvironment(clients, applicationName, environmentName);
    lastDescribeError = error;

    if (env) {
      const health = env.Health;
      const status = env.Status;

      if (health === 'Green' || health === 'Yellow') {
        core.info('✅ Environment is healthy!');
        return;
      }

      if (health === 'Grey' || health === undefined || health === 'Red') {
        const eventCheck = await describeRecentEvents(
          clients,
          applicationName,
          environmentName,
          lastSeenEventDate,
          deploymentStartTime
        );

        if (eventCheck.lastEventDate) {
          lastSeenEventDate = eventCheck.lastEventDate;
        }

        if (eventCheck.hasError) {
          throw new Error(
            `Environment health recovery failed - fatal or error event detected: ${eventCheck.errorMessage}`
          );
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
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  // Timeout occurred - fetch events to help diagnose
  await describeRecentEvents(clients, applicationName, environmentName, lastSeenEventDate, deploymentStartTime);
  throw new Error(timeoutMessage(`Environment health recovery timed out after ${timeout}s`, lastDescribeError));
}
