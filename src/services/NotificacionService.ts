/**
 * Notificacion Service
 * Handles notifications for expedientes archiving and other events
 */

import { logger } from '@/logger';
import type { IExpediente } from '@/types';

interface NotificacionArchivado {
    expedienteId: string;
    numeroExpediente: string;
    despachoDestino: string;
    prioridad: string;
    fechaArchivado: Date;
    motivo: 'VENCIMIENTO';
}

export class NotificacionService {
    /**
     * Send notification when an expediente is archived
     */
    static async notificarArchivado(expediente: IExpediente): Promise<void> {
        const notificacion: NotificacionArchivado = {
            expedienteId: expediente._id?.toString() ?? 'unknown',
            numeroExpediente: expediente.numeroExpediente,
            despachoDestino: expediente.despachoActual,
            prioridad: expediente.prioridad,
            fechaArchivado: new Date(),
            motivo: 'VENCIMIENTO',
        };

        // Log structured notification
        logger.info(
            {
                notification: notificacion,
                type: 'EXPEDIENTE_ARCHIVADO',
            },
            `[Notificación] 📁 Expediente ${expediente.numeroExpediente} archivado en ${expediente.despachoActual}`
        );

        // TODO: Future implementations:
        // - Send email to despacho's responsible person
        // - Push notification to web app
        // - Store in notifications table for dashboard
        // - Send webhook to external systems

        // For now, we just log it for tracking
        await NotificacionService.registrarNotificacion(notificacion);
    }

    /**
     * Register notification (could be stored in DB, sent via email, etc.)
     */
    private static async registrarNotificacion(
        notificacion: NotificacionArchivado
    ): Promise<void> {
        // Future: Store in MongoDB notifications collection
        // For now, just ensure it's logged
        logger.info(
            {
                ...notificacion,
                timestamp: new Date().toISOString(),
            },
            '[NotificacionService] Notification registered'
        );

        // TODO: Example implementation for email:
        // if (despacho.email) {
        //   await sendEmail({
        //     to: despacho.email,
        //     subject: `Expediente ${notificacion.numeroExpediente} archivado`,
        //     body: `El expediente ha sido archivado por vencimiento en su despacho.`
        //   });
        // }
    }

    /**
     * Get summary of archived expedientes by despacho
     */
    static generarResumenArchivados(
        expedientes: IExpediente[]
    ): Map<string, number> {
        const resumen = new Map<string, number>();

        expedientes.forEach((exp) => {
            const count = resumen.get(exp.despachoActual) ?? 0;
            resumen.set(exp.despachoActual, count + 1);
        });

        return resumen;
    }
}





