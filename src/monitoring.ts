import * as core from '@actions/core';
import {
  DescribeEnvironmentsCommand,
  DescribeEventsCommand,
} from '@aws-sdk/client-elastic-beanstalk';
import { AWSClients } from './aws-clients';

/**
 * Fetch recent environment events for debugging and check for fatal/error events
 * Returns error information if fatal/error events are found
 * Only displays events newer than lastSeenEventDate to avoid duplicates
 * Only shows events that occurred after deploymentStartTime to filter out old events
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
      // Filter to only events relevant to this deployment:
      // 1. Events after deploymentStartTime (if provided)
      // 2. Events after lastSeenEventDate (to avoid duplicates)
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
        // Only show header on first call (when lastSeenEventDate is undefined)
        if (!lastSeenEventDate) {
          core.info('📋 Recent events:');
        }
        
        // Sort events by timestamp in ascending order (oldest first)
        const sortedEvents = [...newEvents].sort((a, b) => {
          const dateA = a.EventDate?.getTime() || 0;
          const dateB = b.EventDate?.getTime() || 0;
          return dateA - dateB;
        });
        
        // Track fatal/error events while displaying all events
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

        // Return error information if fatal/error events were found
        if (fatalOrErrorEvents.length > 0) {
          const errorMessage = fatalOrErrorEvents[0].message || 'Unknown error occurred';
          return { hasError: true, errorMessage, lastEventDate: mostRecentDate };
        }
        
        return { hasError: false, lastEventDate: mostRecentDate };
      }
    }
    
    // If no new events, return the last seen date (or undefined if first call)
    return { hasError: false, lastEventDate: lastSeenEventDate };
  } catch (error) {
    // If we can't fetch events, don't fail the deployment check
    // Just log and continue
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
  deploymentStartTime?: Date
): Promise<Date | undefined> {
  core.info('⏳ Waiting for deployment to complete...');

  const startTime = Date.now();
  const maxWait = timeout * 1000;
  let previousStatus: string | undefined;
  let lastSeenEventDate: Date | undefined;
  
  // Poll every 20 seconds for create, 10 seconds for update
  const pollInterval = deploymentActionType === 'create' ? 20000 : 10000;

  while (Date.now() - startTime < maxWait) {
    const command = new DescribeEnvironmentsCommand({
      ApplicationName: applicationName,
      EnvironmentNames: [environmentName],
    });

    const response = await clients.getElasticBeanstalkClient().send(command);

    if (response.Environments && response.Environments.length > 0) {
      const env = response.Environments[0];
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
      // This prevents getting stuck when errors occur during deployment
      const eventCheck = await describeRecentEvents(
        clients,
        applicationName,
        environmentName,
        lastSeenEventDate,
        deploymentStartTime
      );

      // Update last seen event date for next iteration
      // Always update, even if undefined (preserves the state)
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

    // Wait based on deployment action type
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout occurred - fetch events to help diagnose
  await describeRecentEvents(clients, applicationName, environmentName, lastSeenEventDate, deploymentStartTime);
  throw new Error(`Deployment timed out after ${timeout}s`);
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
  lastEventDateFromDeployment?: Date
): Promise<void> {
  core.info('🏥 Waiting for environment health to recover...');

  const startTime = Date.now();
  const maxWait = timeout * 1000;
  let previousStatus: string | undefined;
  let previousHealth: string | undefined;
  let lastSeenEventDate: Date | undefined = lastEventDateFromDeployment;

  while (Date.now() - startTime < maxWait) {
    const command = new DescribeEnvironmentsCommand({
      ApplicationName: applicationName,
      EnvironmentNames: [environmentName],
    });

    const response = await clients.getElasticBeanstalkClient().send(command);

    if (response.Environments && response.Environments.length > 0) {
      const env = response.Environments[0];
      const health = env.Health;
      const status = env.Status;

      // Only check for fatal/error events when health is Grey
      // This prevents getting stuck when errors occur during deployment
      // before health status changes to Red
      if (health === 'Grey' || health === undefined) {
        const eventCheck = await describeRecentEvents(
          clients,
          applicationName,
          environmentName,
          lastSeenEventDate,
          deploymentStartTime
        );

        // Update last seen event date for next iteration
        // Always update, even if undefined (preserves the state)
        lastSeenEventDate = eventCheck.lastEventDate;

        if (eventCheck.hasError) {
          throw new Error(
            `Environment deployment failed - fatal or error event detected: ${eventCheck.errorMessage}`
          );
        }
      }

      if (health === 'Green' || health === 'Yellow') {
        core.info('✅ Environment is healthy!');
        return;
      }

      // Check for errors if health is Red (regardless of status)
      // This catches errors even when status is still Updating
      if (health === 'Red') {
        const eventCheck = await describeRecentEvents(
          clients,
          applicationName,
          environmentName,
          lastSeenEventDate,
          deploymentStartTime
        );

        // Update last seen event date
        if (eventCheck.lastEventDate) {
          lastSeenEventDate = eventCheck.lastEventDate;
        }

        if (eventCheck.hasError) {
          throw new Error(
            `Environment deployment failed - fatal or error event detected: ${eventCheck.errorMessage}`
          );
        }

        // If status is Ready and health is Red, deployment failed
        if (status === 'Ready') {
          throw new Error('Environment deployment failed - health is Red');
        }
      }

      // Only log when status or health changes
      if (status !== previousStatus || health !== previousHealth) {
        core.info(`Current status: ${status}, health: ${health}`);
        previousStatus = status;
        previousHealth = health;
      }
    }

    // Wait 15 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  // Timeout occurred - fetch events to help diagnose
  await describeRecentEvents(clients, applicationName, environmentName, lastSeenEventDate, deploymentStartTime);
  throw new Error(`Environment health check timed out after ${timeout}s`);
}
