import mongoose, { Schema, Model } from 'mongoose';

export interface IInboxMessage {
    _id?: string;
    fromDespachoId: string;
    toDespachoId: string;
    text: string;
    read?: boolean; // read by destination despacho
    createdAt?: Date;
    updatedAt?: Date;
}

const inboxMessageSchema = new Schema<IInboxMessage>(
    {
        fromDespachoId: { type: String, required: true, index: true },
        toDespachoId: { type: String, required: true, index: true },
        text: { type: String, required: true, trim: true },
        read: { type: Boolean, default: false, index: true },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'inbox_messages',
    }
);

inboxMessageSchema.virtual('id').get(function () {
    return this._id?.toString();
});

inboxMessageSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

export const InboxMessageModel: Model<IInboxMessage> = mongoose.models.InboxMessage || mongoose.model<IInboxMessage>('InboxMessage', inboxMessageSchema);




