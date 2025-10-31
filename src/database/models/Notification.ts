import mongoose, { Schema, Model } from 'mongoose';

export interface INotification {
    _id?: string;
    type: 'NUEVO_MOVIMIENTO' | 'EXPEDIENTE_RECIBIDO' | 'EXPEDIENTE_CONFIRMADO' | 'EXPEDIENTE_ARCHIVADO';
    message: string;
    expedienteId?: string;
    orgTargetId?: string;
    userTargetId?: string;
    payload?: Record<string, unknown>;
    readAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        type: { type: String, required: true, index: true },
        message: { type: String, required: true },
        expedienteId: { type: Schema.Types.String, ref: 'Expediente', index: true },
        orgTargetId: { type: Schema.Types.String, ref: 'Despacho', index: true },
        userTargetId: { type: Schema.Types.String, ref: 'User', index: true },
        payload: { type: Schema.Types.Mixed },
        readAt: { type: Date, default: null, index: true },
    },
    { timestamps: true, versionKey: false, collection: 'notifications' }
);

notificationSchema.virtual('id').get(function () {
    return this._id?.toString();
});

notificationSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

export const NotificationModel: Model<INotification> =
    (mongoose.models.Notification as Model<INotification>) ||
    mongoose.model<INotification>('Notification', notificationSchema);


