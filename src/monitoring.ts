import * as core from '@actions/core';
import {
  DescribeEnvironmentsCommand,
  DescribeEventsCommand,
} from '@aws-sdk/client-elastic-beanstalk';
import { AWSClients } from './aws-clients';

/**
 * Strip dynamic AWS resource identifiers from a message.
 * Used to sanitize error messages when verbose logging is disabled.
 */
export function sanitizeResourceIdentifiers(message: string): string {
  return message
    // EC2 instance IDs: i-0abc123def
    .replace(/\bi-[0-9a-f]{8,17}\b/g, '***')
    // Security group IDs: sg-0abc123def
    .replace(/\bsg-[0-9a-f]{8,17}\b/g, '***')
    // ENI IDs: eni-0abc123
    .replace(/\beni-[0-9a-f]{8,17}\b/g, '***')
    // Subnet IDs: subnet-0abc123
    .replace(/\bsubnet-[0-9a-f]{8,17}\b/g, '***')
    // VPC IDs: vpc-0abc123
    .replace(/\bvpc-[0-9a-f]{8,17}\b/g, '***')
    // Launch template IDs: lt-0abc123def
    .replace(/\blt-[0-9a-f]{8,17}\b/g, '***')
    // EBS volume IDs: vol-0abc123def
    .replace(/\bvol-[0-9a-f]{8,17}\b/g, '***')
    // Elastic IP allocation IDs: eipalloc-0abc123
    .replace(/\beipalloc-[0-9a-f]{8,17}\b/g, '***')
    // NAT gateway IDs: nat-0abc123
    .replace(/\bnat-[0-9a-f]{8,17}\b/g, '***')
    // EB-generated resource names: awseb-e-xxx-AWSEBLoa-xxx (must precede env ID pattern)
    .replace(/\bawseb-[a-zA-Z0-9_-]+\b/g, '***')
    // EB environment IDs: e-abcdefghij
    .replace(/\be-[a-z0-9]{10,}\b/g, '***')
    // ARNs: arn:aws:service:region:account:resource
    .replace(/\barn:aws:[a-zA-Z0-9_/:.+*-]+\b/g, '***')
    // IP addresses
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '***');
}

/**
 * Fetch recent environment events for debugging and check for fatal/error events
 */
async function describeRecentEvents(
  clients: AWSClients,
  applicationName: string,
  environmentName: string,
  verboseLogging: boolean,
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
        if (verboseLogging && !lastSeenEventDate) {
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

          const severity = event.Severity || 'INFO';
          const message = event.Message || 'No message';

          if (severity === 'ERROR' || severity === 'FATAL') {
            fatalOrErrorEvents.push({ message });
          }

          if (verboseLogging) {
            const timestamp = eventDate?.toISOString() || 'Unknown time';
            if (severity === 'ERROR' || severity === 'FATAL') {
              core.error(`  [${timestamp}] ${severity}: ${message}`);
            } else if (severity === 'WARN') {
              core.warning(`  [${timestamp}] ${severity}: ${message}`);
            } else {
              core.info(`  [${timestamp}] ${severity}: ${message}`);
            }
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
  verboseLogging: boolean,
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
          verboseLogging,
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
        verboseLogging,
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

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout occurred - fetch events to help diagnose
  await describeRecentEvents(clients, applicationName, environmentName, verboseLogging, lastSeenEventDate, deploymentStartTime);
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
  verboseLogging: boolean,
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

      if (health === 'Green' || health === 'Yellow') {
        core.info('✅ Environment is healthy!');
        return;
      }

      if (health === 'Grey' || health === undefined || health === 'Red') {
        const eventCheck = await describeRecentEvents(
          clients,
          applicationName,
          environmentName,
          verboseLogging,
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
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  // Timeout occurred - fetch events to help diagnose
  await describeRecentEvents(clients, applicationName, environmentName, verboseLogging, lastSeenEventDate, deploymentStartTime);
  throw new Error(`Environment health recovery timed out after ${timeout}s`);
}
