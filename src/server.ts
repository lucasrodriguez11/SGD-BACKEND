#!/usr/bin/env bun
/**
 * Main Server Entry Point
 * Following LEGENDARYUM pattern for service orchestration
 */

import pc from 'picocolors';
import { validateEnv } from '@/env';
import { Mongoose } from '@/database';
import { Http } from '@/http';
import { logger } from '@/logger';
import { startArchivoJob, stopArchivoJob } from '@/jobs';
import { TemaService } from '@/services/TemaService';
import { UserService } from '@/services/UserService';

/**
 * Start all services
 */
async function startServices(): Promise<void> {
  try {
    console.log(pc.cyan('\n🚀 Starting SGD Backend Service...\n'));

    // Validate environment
    validateEnv();

    // Start database
    await Mongoose.start();

    // Seed default catalogs
    await TemaService.seedDefaults();
    await UserService.seedSuperAdmin('user@admin.com', '1230');

    // Start HTTP server (should be last for health checks)
    Http.start();

    // Start background jobs
    startArchivoJob();

    console.log(pc.green('\n✅ All services started successfully!\n'));

    logger.info(
      {
        environment: process.env.NODE_ENV,
        port: process.env.PORT,
        mongodb: process.env.MONGODB_URL?.split('@')[1] || 'connected',
      },
      'SGD Backend started'
    );
  } catch (error) {
    console.error(pc.red('\n❌ Failed to start services:\n'));
    console.trace(error);
    process.exitCode = 1;
  }
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(): void {
  // Handle termination signals
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(
        pc.yellow(
          `\n\n${signal} signal received. ${String.fromCodePoint(0x1f44b)} Shutting down gracefully...\n`
        )
      );

      try {
        // Stop services in reverse order
        stopArchivoJob();
        Http.stop();
        await Mongoose.stop();

        console.log(pc.green('✓ All services stopped successfully'));
        process.exit(0);
      } catch (error) {
        console.error(pc.red('Error during shutdown:'), error);
        process.exit(1);
      }
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    console.error(pc.red('Uncaught exception:'), error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
    console.error(pc.red('Unhandled promise rejection:'), reason);
    process.exit(1);
  });
}

// Initialize application
void (async () => {
  setupGracefulShutdown();
  await startServices();
})();
