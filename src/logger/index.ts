/**
 * Centralized logging system using Pino
 * Following LEGENDARYUM pattern for structured logging
 */

import pino from 'pino';
import { isDevelopment } from '@/env';

/**
 * Create logger instance with pretty printing in development
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment()
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{levelLabel} - {msg}',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

/**
 * Create child logger with prefix
 */
export function createLogger(prefix: string) {
  return logger.child({}, { msgPrefix: `[${prefix}] ` });
}

export default logger;



