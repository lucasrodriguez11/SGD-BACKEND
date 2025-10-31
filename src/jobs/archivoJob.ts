/**
 * Archivo Job
 * Periodic job to archive expired expedientes
 */

import { ArchivoService } from '@/services';
import { logger } from '@/logger';

// Job interval in milliseconds (5 minutes)
const JOB_INTERVAL = 5 * 60 * 1000; // 300000ms = 5 minutes

let jobInterval: NodeJS.Timeout | null = null;

/**
 * Start the archivo job
 */
export function startArchivoJob(): void {
    if (jobInterval) {
        logger.warn('[ArchivoJob] Job already running');
        return;
    }

    logger.info(
        {
            intervalMs: JOB_INTERVAL,
            intervalMinutes: JOB_INTERVAL / 60000,
        },
        '[ArchivoJob] Starting automatic archivo job'
    );

    // Run immediately on start
    runArchivoJob().catch((error) => {
        logger.error({ error }, '[ArchivoJob] Initial run failed');
    });

    // Schedule periodic runs
    jobInterval = setInterval(() => {
        runArchivoJob().catch((error) => {
            logger.error({ error }, '[ArchivoJob] Scheduled run failed');
        });
    }, JOB_INTERVAL);
}

/**
 * Stop the archivo job
 */
export function stopArchivoJob(): void {
    if (jobInterval) {
        clearInterval(jobInterval);
        jobInterval = null;
        logger.info('[ArchivoJob] Archivo job stopped');
    }
}

/**
 * Run the archivo job once
 */
async function runArchivoJob(): Promise<void> {
    try {
        logger.info('[ArchivoJob] Running archivo job...');
        await ArchivoService.archivarExpedientesVencidos();
        logger.info('[ArchivoJob] Archivo job completed successfully');
    } catch (error) {
        logger.error(
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            },
            '[ArchivoJob] Archivo job failed'
        );
    }
}

