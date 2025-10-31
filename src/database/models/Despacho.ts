/**
 * Despacho Model
 * MongoDB/Mongoose schema for Despachos
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IDespacho } from '@/types/despacho';

const despachoSchema = new Schema<IDespacho>(
    {
        nombre: {
            type: String,
            required: [true, 'Nombre del despacho es requerido'],
            trim: true,
            index: true,
        },
        codigo: {
            type: String,
            required: [true, 'Código del despacho es requerido'],
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        tipo: {
            type: String,
            required: [true, 'Tipo de despacho es requerido'],
            enum: {
                values: ['DIRECCION', 'SUBDIRECCIÓN', 'AREA', 'DEPARTAMENTO', 'SECRETARIA'],
                message: '{VALUE} no es un tipo válido',
            },
            index: true,
        },
        descripcion: {
            type: String,
            trim: true,
            maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
        },
        responsable: {
            type: String,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
        },
        telefono: {
            type: String,
            trim: true,
        },
        estado: {
            type: String,
            enum: {
                values: ['ACTIVO', 'INACTIVO'],
                message: '{VALUE} no es un estado válido',
            },
            default: 'ACTIVO',
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'despachos',
    }
);

// Índices compuestos
despachoSchema.index({ tipo: 1, estado: 1 });
despachoSchema.index({ nombre: 'text' });

// Virtual para ID
despachoSchema.virtual('id').get(function () {
    return this._id.toString();
});

// Transform para JSON
despachoSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

export const DespachoModel: Model<IDespacho> = mongoose.model<IDespacho>(
    'Despacho',
    despachoSchema
);



