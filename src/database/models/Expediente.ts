/**
 * Expediente Model
 * MongoDB/Mongoose schema for Expedientes
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IExpediente } from '@/types';

const expedienteSchema = new Schema<IExpediente>(
    {
        numeroExpediente: {
            type: String,
            required: [true, 'Número de expediente es requerido'],
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        iniciador: {
            type: String,
            required: [true, 'Iniciador es requerido'],
            trim: true,
            index: true,
        },
        tema: {
            type: String,
            required: [true, 'Tema es requerido'],
            trim: true,
            uppercase: true,
            index: true,
        },
        prioridad: {
            type: String,
            required: [true, 'Prioridad es requerida'],
            enum: {
                values: ['Baja', 'Normal', 'Alta'],
                message: '{VALUE} no es una prioridad válida',
            },
            default: 'Normal',
            index: true,
        },
        extracto: {
            type: String,
            trim: true,
            maxlength: [1000, 'El extracto no puede exceder 1000 caracteres'],
        },
        fojas: {
            type: Number,
            default: 0,
            min: [0, 'Las fojas no pueden ser negativas'],
        },
        despachoActual: {
            type: String,
            required: [true, 'Despacho actual es requerido'],
            trim: true,
            index: true,
        },
        fechaIngreso: {
            type: Date,
            default: Date.now,
            index: true,
        },
        fechaVencimiento: {
            type: Date,
            required: false,
            index: true,
        },
        estado: {
            type: String,
            enum: {
                values: ['RECEPCIONADO', 'ENVIADO', 'ARCHIVADO'],
                message: '{VALUE} no es un estado válido',
            },
            default: 'RECEPCIONADO',
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'expedientes',
    }
);

// Indexes for better query performance
expedienteSchema.index({ despachoActual: 1, estado: 1 });
expedienteSchema.index({ fechaIngreso: -1 });
expedienteSchema.index({ prioridad: 1, estado: 1 });

// Virtual for id
expedienteSchema.virtual('id').get(function () {
    return this._id.toString();
});

// Ensure virtual fields are serialized
expedienteSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

export const ExpedienteModel: Model<IExpediente> = mongoose.model<IExpediente>(
    'Expediente',
    expedienteSchema
);
