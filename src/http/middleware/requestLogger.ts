/**
 * Request logging middleware
 */

import type { Context, Next } from 'hono';
import { createLogger } from '@/logger';

const logger = createLogger('HTTP');

export async function requestLogger(c: Context, next: Next): Promise<void> {
  const start = Date.now();
  const { method, path } = c.req;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info(
    {
      method,
      path,
      status,
      duration: `${duration}ms`,
      query: c.req.query(),
    },
    `${method} ${path} - ${status} - ${duration}ms`
  );
}







