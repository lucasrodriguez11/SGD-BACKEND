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
        const rec = await RecepcionModel.create({ expedienteId, recibidoEn, confirmado: false });
        logger.info({ id: rec._id, expedienteId, recibidoEn }, 'Recepcion created');
        await NotificationService.push({
            type: 'EXPEDIENTE_RECIBIDO',
            message: `Expediente recibido en ${recibidoEn}`,
            expedienteId,
            orgTargetId: recibidoEn,
        });
        return rec;
    }

    static async listPendientes(recibidoEn?: string, page = 1, limit = 20) {
        const query: any = { confirmado: false };
        if (recibidoEn) query.recibidoEn = recibidoEn;
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            RecepcionModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            RecepcionModel.countDocuments(query),
        ]);

        // Enriquecer datos con información del expediente y movimiento
        const enriched = await Promise.all(
            items.map(async (item: any) => {
                const expedienteIdStr = typeof item.expedienteId === 'object' && item.expedienteId && '_id' in item.expedienteId
                    ? (item.expedienteId as any)._id?.toString() ?? item.expedienteId.toString()
                    : item.expedienteId.toString();

                // Buscar el expediente para obtener número y despacho origen
                const expediente = await ExpedienteModel.findById(expedienteIdStr).lean().exec();
                // Buscar el movimiento más reciente para este expediente que tenga despachoNuevo = recibidoEn
                const movimiento = await MovimientoModel.findOne({
                    expedienteId: expedienteIdStr,
                    despachoNuevo: item.recibidoEn,
                }).sort({ fechaMovimiento: -1 }).lean().exec();

                return {
                    _id: item._id?.toString(),
                    expedienteId: expediente?.numeroExpediente ?? expedienteIdStr,
                    despachoOrigenId: movimiento?.despachoAnterior ?? (expediente?.despachoActual ? String(expediente.despachoActual) : 'Desconocido'),
                    despachoDestinoId: String(item.recibidoEn),
                    fechaEnvio: movimiento?.fechaMovimiento ?? item.createdAt,
                    status: item.confirmado ? 'CONFIRMADO' : 'PENDIENTE',
                    createdAt: item.createdAt,
                };
            })
        );

        return { items: enriched, page, limit, total, totalPages: Math.ceil(total / limit) };
    }

    static async confirmar(id: string, userId?: string | null) {
        const updated = await RecepcionModel.findByIdAndUpdate(
            id,
            { $set: { confirmado: true, recibidoPorId: userId ?? null } },
            { new: true }
        );
        if (!updated) throw new Error('Recepción no encontrada');

        // Actualizar el movimiento y expediente a RECEPCIONADO
        const movimiento = await MovimientoModel.findOne({
            expedienteId: updated.expedienteId,
            despachoNuevo: updated.recibidoEn,
        }).sort({ fechaMovimiento: -1 }).exec();

        if (movimiento && movimiento.estado === 'ENVIADO') {
            movimiento.estado = 'RECEPCIONADO';
            await movimiento.save();

            // Actualizar el expediente también
            const expediente = await ExpedienteModel.findById(updated.expedienteId).exec();
            if (expediente && expediente.estado === 'ENVIADO') {
                expediente.estado = 'RECEPCIONADO';
                await expediente.save();
            }
        }

        await NotificationService.push({
            type: 'EXPEDIENTE_CONFIRMADO',
            message: 'Recepción confirmada',
            expedienteId: updated.expedienteId,
            orgTargetId: updated.recibidoEn,
        });
        return updated;
    }
}





