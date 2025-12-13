/**
 * CORS middleware configuration
 */

import { cors } from 'hono/cors';
import { getEnv } from '@/env';

export const corsMiddleware = cors({
  origin: (origin) => {
    const allowedOrigins = getEnv('CORS_ORIGIN', 'http://localhost:3000').split(',');

    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return origin;
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    return allowedOrigins[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
});







