/**
 * Organigrama Model
 * Adjacency list to represent parent-child relationships between Despachos
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IOrganigrama } from '@/types/organigrama';

const organigramaSchema = new Schema<IOrganigrama>(
    {
        despachoId: {
            type: Schema.Types.String,
            ref: 'Despacho',
            required: true,
            unique: true,
            index: true,
        },
        parentId: {
            type: Schema.Types.String,
            ref: 'Despacho',
            required: false,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'organigrama',
    }
);

// Virtual for ID
organigramaSchema.virtual('id').get(function () {
    return this._id?.toString();
});

organigramaSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

export const OrganigramaModel: Model<IOrganigrama> = mongoose.model<IOrganigrama>(
    'Organigrama',
    organigramaSchema
);


