/**
 * Archivo Service
 * Handles automatic archiving of expired expedientes
 */

import { ExpedienteModel } from '@/database/models';
import { logger } from '@/logger';
import { NotificationService } from './NotificationService';

export class ArchivoService {
    /**
     * Archive expired expedientes automatically
     * - Expedientes with high priority that are expired
     * - Expedientes that have passed their due date
     */
    static async archivarExpedientesVencidos(): Promise<void> {
        try {
            const now = new Date();

            // Find expedientes that meet archiving criteria:
            // 1. Not already archived
            // 2. Have a due date (fechaVencimiento)
            // 3. Due date has passed
            const expedientesVencidos = await ExpedienteModel.find({
                estado: { $ne: 'ARCHIVADO' },
                fechaVencimiento: { $lte: now },
            });

            if (expedientesVencidos.length === 0) {
                logger.info('[ArchivoService] No expired expedientes found');
                return;
            }

            // Archive each expired expediente
            const archivados = await Promise.all(
                expedientesVencidos.map(async (expediente) => {
                    expediente.estado = 'ARCHIVADO';
                    await expediente.save();

                    // Lookup despacho ID for websocket channel
                    let despachoId: string | undefined;
                    try {
                        const { DespachoModel } = await import('@/database/models/Despacho');
                        const desp = await DespachoModel.findOne({
                            nombre: { $regex: new RegExp(`^${expediente.despachoActual.trim()}$`, 'i') }
                        }).lean().exec();
                        if (desp) despachoId = desp._id.toString();
                    } catch { /* ignore lookup error */ }

                    // push notification per expediente
                    void NotificationService.push({
                        type: 'EXPEDIENTE_ARCHIVADO',
                        message: `Expediente ${expediente.numeroExpediente} fue archivado automáticamente`,
                        expedienteId: expediente._id?.toString(),
                        orgTargetId: despachoId || expediente.despachoActual, // Use ID if found
                    });
                    return expediente;
                })
            );

            logger.info(
                {
                    count: archivados.length,
                    expedientes: archivados.map((e) => ({
                        id: e._id,
                        numero: e.numeroExpediente,
                        prioridad: e.prioridad,
                        vencimiento: e.fechaVencimiento,
                    })),
                },
                '[ArchivoService] Expedientes archived automatically'
            );
        } catch (error) {
            logger.error(
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                },
                '[ArchivoService] Error archiving expired expedientes'
            );
            throw error;
        }
    }

    /**
     * Get expedientes close to expiration (within X days)
     */
    static async getExpedientesProximosAVencer(dias: number = 3): Promise<any[]> {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + dias);

            const expedientes = await ExpedienteModel.find({
                estado: { $ne: 'ARCHIVADO' },
                fechaVencimiento: {
                    $gte: now,
                    $lte: futureDate,
                },
            }).sort({ fechaVencimiento: 1 });

            logger.info(
                {
                    count: expedientes.length,
                    dias,
                },
                '[ArchivoService] Expedientes close to expiration'
            );

            return expedientes;
        } catch (error) {
            logger.error(
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
                '[ArchivoService] Error getting expedientes close to expiration'
            );
            throw error;
        }
    }
}

