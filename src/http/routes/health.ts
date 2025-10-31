/**
 * Health check routes
 */

import { Hono } from 'hono';
import { Mongoose } from '@/database';
import type { ApiResponse } from '@/types';

const health = new Hono();

/**
 * GET /health - Basic health check
 */
health.get('/', async (c) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'sgd-backend',
    },
  };

  return c.json(response, 200);
});

/**
 * GET /health/ready - Readiness check (database connection)
 */
health.get('/ready', async (c) => {
  try {
    const isDatabaseHealthy = await Mongoose.isHealthy();

    if (!isDatabaseHealthy) {
      const response: ApiResponse = {
        success: false,
        error: {
          message: 'Database not ready',
          code: 'DATABASE_NOT_READY',
        },
      };
      return c.json(response, 503);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response, 200);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Service not ready',
        code: 'SERVICE_NOT_READY',
        details: error.message,
      },
    };
    return c.json(response, 503);
  }
});

/**
 * GET /health/live - Liveness check
 */
health.get('/live', async (c) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
    },
  };

  return c.json(response, 200);
});

export default health;


