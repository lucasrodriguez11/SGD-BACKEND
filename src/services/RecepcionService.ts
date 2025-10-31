import { createLogger } from '@/logger';
import { model, Schema, Model } from 'mongoose';
import { NotificationService } from './NotificationService';

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
            RecepcionModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            RecepcionModel.countDocuments(query),
        ]);
        return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
    }

    static async confirmar(id: string, userId?: string | null) {
        const updated = await RecepcionModel.findByIdAndUpdate(
            id,
            { $set: { confirmado: true, recibidoPorId: userId ?? null } },
            { new: true }
        );
        if (!updated) throw new Error('Recepción no encontrada');
        await NotificationService.push({
            type: 'EXPEDIENTE_CONFIRMADO',
            message: 'Recepción confirmada',
            expedienteId: updated.expedienteId,
            orgTargetId: updated.recibidoEn,
        });
        return updated;
    }
}





