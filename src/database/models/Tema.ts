import mongoose, { Schema, Model } from 'mongoose';

export interface ITema {
    _id?: string;
    nombre: string; // uppercase unique
    activo: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const temaSchema = new Schema<ITema>(
    {
        nombre: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
        activo: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, versionKey: false, collection: 'temas' }
);

temaSchema.virtual('id').get(function () {
    return this._id?.toString();
});

export const TemaModel: Model<ITema> = (mongoose.models.Tema as Model<ITema>) || mongoose.model<ITema>('Tema', temaSchema);




