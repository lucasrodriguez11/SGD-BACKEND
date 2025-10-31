/**
 * HTTP Server
 * Hono-based HTTP server following LEGENDARYUM pattern
 */

import { Hono } from 'hono';
import { serve } from 'bun';
import { getEnvOrFail, getEnv } from '@/env';
import { createLogger } from '@/logger';
import {
  corsMiddleware,
  requestLogger,
  errorHandler,
  notFoundHandler,
} from './middleware';
import { expedientesRoutes, movimientosRoutes, despachosRoutes, organigramaRoutes, healthRoutes, authRoutes, usersRoutes, notificationsRoutes, recepcionesRoutes, temasRoutes, inboxRoutes } from './routes';
import type { ApiResponse } from '@/types';
import { wsHub } from '@/services/WebSocketHub';

const logger = createLogger('HTTP');

export class Http {
  private static instance: Http | null = null;
  private app: Hono;
  private server: any;

  private constructor() {
    this.app = new Hono();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // CORS
    this.app.use('*', corsMiddleware);

    // Request logging
    this.app.use('*', requestLogger);
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Root route
    this.app.get('/', (c) => {
      const response: ApiResponse = {
        success: true,
        data: {
          service: 'SGD Backend',
          version: '2.0.0',
          description: 'Sistema de Gestión Documental',
          timestamp: new Date().toISOString(),
        },
      };
      return c.json(response);
    });

    // Health routes
    this.app.route('/health', healthRoutes);

    // API routes
    this.app.route('/api/expedientes', expedientesRoutes);
    this.app.route('/api/movimientos', movimientosRoutes);
    this.app.route('/api/despachos', despachosRoutes);
    this.app.route('/api/organigrama', organigramaRoutes);
    this.app.route('/api/auth', authRoutes);
    this.app.route('/api/users', usersRoutes);
    this.app.route('/api/notifications', notificationsRoutes);
    this.app.route('/api/recepciones', recepcionesRoutes);
    this.app.route('/api/temas', temasRoutes);
    this.app.route('/api/inbox', inboxRoutes);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.onError(errorHandler);

    // 404 handler
    this.app.notFound(notFoundHandler);
  }

  /**
   * Start HTTP server
   */
  private startServer(): void {
    const port = parseInt(getEnvOrFail('PORT'), 10);
    const host = getEnv('HOST', '0.0.0.0');

    this.server = serve({
      fetch: (req, server) => {
        const url = new URL(req.url);
        if (url.pathname === '/ws' || url.pathname === '/ws/notifications') {
          // upgrade to websocket; use channel query or default 'notifications'
          const channel = url.searchParams.get('channel') ?? 'notifications';
          // attach channel via data
          if (server.upgrade(req, { data: { channel } as any })) return;
          return new Response('Upgrade failed', { status: 400 });
        }
        return this.app.fetch(req);
      },
      websocket: {
        open: (ws) => {
          const client = ws as any;
          const channel = ((ws as any).data?.channel as string) ?? 'notifications';
          wsHub.addClient(client, channel);
        },
        message: (_ws, _message) => {
          // future: accept client pings or subscriptions
        },
        close: (ws) => {
          wsHub.removeClient(ws as any);
        },
      },
      port,
      hostname: host,
    });

    logger.info(`✓ HTTP Server listening on ${host}:${port}`);
    console.log('\x1b[32m%s\x1b[0m', `🚀 HTTP Server started on ${host}:${port}`);
  }

  /**
   * Start the HTTP service
   */
  public static start(): void {
    if (this.instance) {
      logger.warn('HTTP server already initialized');
      return;
    }

    this.instance = new Http();
    this.instance.startServer();
  }

  /**
   * Stop the HTTP service
   */
  public static stop(): void {
    if (this.instance?.server) {
      this.instance.server.stop();
      this.instance = null;
      logger.info('HTTP server stopped');
    }
  }

  /**
   * Get Hono app instance (for testing)
   */
  public static getApp(): Hono | null {
    return this.instance?.app || null;
  }
}
