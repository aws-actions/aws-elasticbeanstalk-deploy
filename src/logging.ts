import * as core from '@actions/core';

/**
 * Cross-cutting deployment configuration that is threaded through all operations.
 * Avoids passing verboseLogging, maxRetries, and retryDelay as individual parameters.
 */
export interface DeploymentContext {
  verboseLogging: boolean;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Log an info message. When verbose is false, uses the redacted alternative.
 * If redacted is omitted, the message is suppressed entirely when verbose is off.
 */
export function logInfo(ctx: DeploymentContext, verbose: string, redacted?: string): void {
  if (ctx.verboseLogging) {
    core.info(verbose);
  } else if (redacted !== undefined) {
    core.info(redacted);
  }
}

/**
 * Log an error message. When verbose is false, uses the redacted alternative.
 * If redacted is omitted, the message is suppressed entirely when verbose is off.
 */
export function logError(ctx: DeploymentContext, verbose: string, redacted?: string): void {
  if (ctx.verboseLogging) {
    core.error(verbose);
  } else if (redacted !== undefined) {
    core.error(redacted);
  }
}
