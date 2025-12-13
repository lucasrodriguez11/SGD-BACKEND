import { createLogger } from '@/logger';
import { model, Schema, Model } from 'mongoose';
import { NotificationService } from './NotificationService';
import { ExpedienteModel, MovimientoModel } from '@/database';

export interface IRecepcion {
    _id?: string;
    expedienteId: string;
    recibidoPorId?: string | null;
    recibidoEn: string; // despacho code/name/id
    confirmado: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const recepcionSchema = new Schema<IRecepcion>(
    {
        expedienteId: { type: Schema.Types.String, required: true, index: true },
        recibidoPorId: { type: Schema.Types.String, default: null },
        recibidoEn: { type: Schema.Types.String, required: true, index: true },
        confirmado: { type: Boolean, default: false, index: true },
    },
    { timestamps: true, versionKey: false, collection: 'recepciones' }
);

recepcionSchema.virtual('id').get(function () {
    return this._id?.toString();
});

export const RecepcionModel: Model<IRecepcion> = model<IRecepcion>('Recepcion', recepcionSchema);

const logger = createLogger('RecepcionService');

export class RecepcionService {
    static async createForMovimiento(expedienteId: string, recibidoEn: string) {
        // Asegurarse de que recibidoEn sea el nombre del despacho (no ID)
        // Si recibidoEn es un ID, buscar el nombre del despacho
        let nombreDespacho = recibidoEn.trim();
        try {
            const { DespachoModel } = await import('@/database/models/Despacho');
            // Si parece un ObjectId (24 caracteres hex), buscar el despacho
            if (/^[0-9a-fA-F]{24}$/.test(recibidoEn.trim())) {
                const despacho = await DespachoModel.findById(recibidoEn.trim()).lean().exec();
                if (despacho) {
                    nombreDespacho = despacho.nombre.trim();
                }
            } else {
                // Aunque no sea un ID, normalizar el nombre (trim)
                nombreDespacho = recibidoEn.trim();
            }
        } catch (error) {
            logger.warn({ error, recibidoEn }, 'Could not resolve despacho name, using as-is');
            nombreDespacho = recibidoEn.trim();
        }

        const rec = await RecepcionModel.create({ expedienteId, recibidoEn: nombreDespacho, confirmado: false });
        logger.info({ id: rec._id, expedienteId, recibidoEn: nombreDespacho, recibidoEnOriginal: recibidoEn }, 'Recepcion created');

        // Obtener número de expediente para el mensaje
        let numeroExpediente = expedienteId;
        try {
            const expediente = await ExpedienteModel.findById(expedienteId).lean().exec();
            if (expediente && expediente.numeroExpediente) {
                numeroExpediente = expediente.numeroExpediente;
            }
        } catch (error) {
            logger.warn({ error, expedienteId }, 'Could not fetch expediente number for notification');
        }

        // Lookup despacho ID for websocket channel
        let despachoId: string | undefined;
        try {
            const { DespachoModel } = await import('@/database/models/Despacho');
            const desp = await DespachoModel.findOne({
                nombre: { $regex: new RegExp(`^${nombreDespacho}$`, 'i') }
            }).lean().exec();
            if (desp) despachoId = desp._id.toString();
        } catch { /* ignore lookup error */ }

        await NotificationService.push({
            type: 'EXPEDIENTE_RECIBIDO',
            message: `Expediente ${numeroExpediente} recibido en ${nombreDespacho}`,
            expedienteId,
            orgTargetId: despachoId || nombreDespacho, // Use ID if found
        });
        return rec;
    }

    static async listPendientes(recibidoEn?: string, page = 1, limit = 20) {
        const query: any = { confirmado: false };
        if (recibidoEn) {
            // Normalizar el nombre del despacho (trim) para búsqueda exacta
            query.recibidoEn = recibidoEn.trim();
            logger.info({ recibidoEn: query.recibidoEn }, 'Searching recepciones by recibidoEn');
        }
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            RecepcionModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            RecepcionModel.countDocuments(query),
        ]);

        logger.info({ recibidoEn: query.recibidoEn, found: items.length, total, sampleRecibidoEn: items[0]?.recibidoEn }, 'Recepciones found');

        // Enriquecer datos con información del expediente y movimiento
        const enriched = await Promise.all(
            items.map(async (item: any) => {
                try {
                    const expedienteIdStr = typeof item.expedienteId === 'object' && item.expedienteId && '_id' in item.expedienteId
                        ? (item.expedienteId as any)._id?.toString() ?? item.expedienteId.toString()
                        : item.expedienteId.toString();

                    // Buscar el expediente para obtener número y despacho origen
                    const expediente = await ExpedienteModel.findById(expedienteIdStr).lean().exec();
                    // Buscar el movimiento más reciente para este expediente que tenga despachoNuevo = recibidoEn
                    // Normalizar ambos lados con trim para búsqueda exacta
                    const movimiento = await MovimientoModel.findOne({
                        expedienteId: expedienteIdStr,
                        despachoNuevo: item.recibidoEn.trim(),
                    }).sort({ fechaMovimiento: -1 }).lean().exec();

                    const enrichedItem = {
                        _id: item._id?.toString(),
                        expedienteId: expediente?.numeroExpediente ?? expedienteIdStr,
                        despachoOrigenId: movimiento?.despachoAnterior ?? (expediente?.despachoActual ? String(expediente.despachoActual) : 'Desconocido'),
                        despachoDestinoId: String(item.recibidoEn),
                        fechaEnvio: movimiento?.fechaMovimiento ?? item.createdAt,
                        status: item.confirmado ? 'CONFIRMADO' : 'PENDIENTE',
                        createdAt: item.createdAt,
                    };

                    logger.debug({ itemId: item._id, expedienteId: expedienteIdStr, enrichedItem }, 'Enriched recepcion item');
                    return enrichedItem;
                } catch (error) {
                    logger.error({ error, item }, 'Error enriching recepcion item');
                    // Devolver item básico si hay error en enriquecimiento
                    return {
                        _id: item._id?.toString(),
                        expedienteId: String(item.expedienteId),
                        despachoOrigenId: 'Desconocido',
                        despachoDestinoId: String(item.recibidoEn),
                        fechaEnvio: item.createdAt,
                        status: item.confirmado ? 'CONFIRMADO' : 'PENDIENTE',
                        createdAt: item.createdAt,
                    };
                }
            })
        );

        logger.info({ recibidoEn: query.recibidoEn, enrichedCount: enriched.length, enrichedItems: enriched.map(e => ({ _id: e._id, expedienteId: e.expedienteId })) }, 'Recepciones enriched and ready to return');
        return { items: enriched, page, limit, total, totalPages: Math.ceil(total / limit) };
    }

    static async confirmar(id: string, userId?: string | null) {
        const updated = await RecepcionModel.findByIdAndUpdate(
            id,
            { $set: { confirmado: true, recibidoPorId: userId ?? null } },
            { new: true }
        );
        if (!updated) throw new Error('Recepción no encontrada');

        // Obtener el nombre del usuario si se proporciona userId
        let usuarioNombre: string | undefined = undefined;
        if (userId) {
            try {
                const { UserModel } = await import('@/database/models/User');
                const user = await UserModel.findById(userId).lean().exec();
                if (user && user.name) {
                    usuarioNombre = user.name;
                }
            } catch (error) {
                logger.warn({ error, userId }, 'Could not fetch user name for movimiento');
            }
        }

        // Crear un nuevo movimiento RECEPCIONADO para trazabilidad completa
        // Buscar el movimiento más reciente que esté ENVIADO para este expediente y despacho destino
        const movimientoEnviado = await MovimientoModel.findOne({
            expedienteId: updated.expedienteId,
            despachoNuevo: updated.recibidoEn.trim(),
            estado: 'ENVIADO',
        }).sort({ fechaMovimiento: -1 }).exec();

        if (movimientoEnviado) {
            // Crear un nuevo movimiento RECEPCIONADO (no actualizar el existente para mantener trazabilidad)
            const nuevoMovimiento = new MovimientoModel({
                expedienteId: updated.expedienteId,
                despachoAnterior: movimientoEnviado.despachoAnterior,
                despachoNuevo: updated.recibidoEn.trim(),
                fojasAgregadas: 0, // No se agregan fojas al recepcionar
                estado: 'RECEPCIONADO',
                usuarioResponsable: usuarioNombre,
                fechaMovimiento: new Date(), // Fecha de recepción
            });
            await nuevoMovimiento.save();
            logger.info({ movimientoId: nuevoMovimiento._id, usuarioResponsable: usuarioNombre }, 'Nuevo movimiento RECEPCIONADO creado');

            // Actualizar el expediente también - AHORA SÍ cambiar despachoActual y estado
            const expediente = await ExpedienteModel.findById(updated.expedienteId).exec();
            if (expediente && expediente.estado === 'ENVIADO') {
                expediente.estado = 'RECEPCIONADO';
                expediente.despachoActual = updated.recibidoEn.trim(); // Cambiar despacho solo al confirmar
                await expediente.save();
            }
        }

        // Lookup despacho ID for websocket channel
        let despachoId: string | undefined;
        try {
            const { DespachoModel } = await import('@/database/models/Despacho');
            const desp = await DespachoModel.findOne({
                nombre: { $regex: new RegExp(`^${updated.recibidoEn.trim()}$`, 'i') }
            }).lean().exec();
            if (desp) despachoId = desp._id.toString();
        } catch { /* ignore lookup error */ }

        await NotificationService.push({
            type: 'EXPEDIENTE_CONFIRMADO',
            message: 'Recepción confirmada',
            expedienteId: updated.expedienteId,
            orgTargetId: despachoId || updated.recibidoEn, // Use ID if found
        });
        return updated;
    }


    static async reject(id: string, userId: string) {
        const session = await model('Recepcion').startSession();
        session.startTransaction();
        try {
            // 1. Buscar la recepción
            const recepcion = await RecepcionModel.findById(id).session(session);
            if (!recepcion) throw new Error('Recepción no encontrada');

            // 2. Buscar el movimiento asociado (el último ENVIADO a este despacho)
            const movimiento = await MovimientoModel.findOne({
                expedienteId: recepcion.expedienteId,
                despachoNuevo: recepcion.recibidoEn.trim(),
                estado: 'ENVIADO'
            }).sort({ fechaMovimiento: -1 }).session(session);

            if (!movimiento) {
                // Si no hay movimiento, solo borramos la recepción
                logger.warn({ recepcionId: id }, 'Rechazando recepción sin movimiento asociado');
                await RecepcionModel.findByIdAndDelete(id).session(session);
                await session.commitTransaction();
                return { success: true };
            }

            // 3. Revertir el expediente
            const expediente = await ExpedienteModel.findById(recepcion.expedienteId).session(session);
            if (!expediente) throw new Error('Expediente no encontrado');

            // Restar fojas agregadas si las hubo
            if (movimiento.fojasAgregadas > 0) {
                expediente.fojas -= movimiento.fojasAgregadas;
            }

            // Volver estado a RECEPCIONADO (estado anterior en origen)
            expediente.estado = 'RECEPCIONADO';
            await expediente.save({ session });

            // 4. Marcar movimiento como RECHAZADO (en lugar de borrar)
            movimiento.estado = 'RECHAZADO';
            await movimiento.save({ session });

            // 5. Eliminar la recepción pendiente
            await RecepcionModel.findByIdAndDelete(id).session(session);

            // 6. Enviar notificaciones (usando IDs para asegurar entrega)
            const { DespachoModel } = await import('@/database/models/Despacho');

            // Búsqueda insensible a mayúsculas/minúsculas
            const sender = await DespachoModel.findOne({
                nombre: { $regex: new RegExp(`^${movimiento.despachoAnterior.trim()}$`, 'i') }
            }).session(session);

            const receiver = await DespachoModel.findOne({
                nombre: { $regex: new RegExp(`^${recepcion.recibidoEn.trim()}$`, 'i') }
            }).session(session);

            // Notificar al emisor (origen)
            if (sender) {
                await NotificationService.push({
                    type: 'EXPEDIENTE_RECHAZADO',
                    message: `El envío del expediente ${expediente.numeroExpediente} fue rechazado por ${recepcion.recibidoEn}`,
                    expedienteId: expediente._id.toString(),
                    orgTargetId: sender._id.toString(), // ID del despacho origen
                    extra: { from: recepcion.recibidoEn, to: movimiento.despachoAnterior }
                });
            } else {
                logger.warn({ despacho: movimiento.despachoAnterior }, 'No se encontró el despacho origen para notificar rechazo');
            }

            // Notificar al receptor (quien rechazó) para que aparezca en su feed
            if (receiver) {
                await NotificationService.push({
                    type: 'EXPEDIENTE_RECHAZADO',
                    message: `Has rechazado el expediente ${expediente.numeroExpediente} proveniente de ${movimiento.despachoAnterior}`,
                    expedienteId: expediente._id.toString(),
                    orgTargetId: receiver._id.toString(), // ID del despacho actual
                    extra: { from: recepcion.recibidoEn, to: movimiento.despachoAnterior }
                });
            }

            await session.commitTransaction();

            logger.info({
                recepcionId: id,
                expedienteId: expediente._id,
                movimientoId: movimiento._id,
                userId
            }, 'Recepción rechazada y movimiento marcado como RECHAZADO');

            return { success: true };

        } catch (error) {
            await session.abortTransaction();
            logger.error({ error, recepcionId: id }, 'Error rejecting recepcion');
            throw error;
        } finally {
            session.endSession();
        }
    }
}





