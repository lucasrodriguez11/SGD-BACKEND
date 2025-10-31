/**
 * Movimiento Model
 * MongoDB/Mongoose schema for Movimientos (document movements)
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IMovimiento } from '@/types';

const movimientoSchema = new Schema<IMovimiento>(
    {
        expedienteId: {
            type: String,
            required: [true, 'ID del expediente es requerido'],
            ref: 'Expediente',
            index: true,
        },
        despachoAnterior: {
            type: String,
            required: [true, 'Despacho anterior es requerido'],
            trim: true,
        },
        despachoNuevo: {
            type: String,
            required: [true, 'Despacho nuevo es requerido'],
            trim: true,
            index: true,
        },
        fechaMovimiento: {
            type: Date,
            default: Date.now,
            index: true,
        },
        fojasAgregadas: {
            type: Number,
            default: 0,
            min: [0, 'Las fojas agregadas no pueden ser negativas'],
        },
        estado: {
            type: String,
            required: [true, 'Estado es requerido'],
            enum: {
                values: ['RECEPCIONADO', 'ENVIADO', 'ARCHIVADO'],
                message: '{VALUE} no es un estado válido',
            },
        },
        observaciones: {
            type: String,
            trim: true,
            maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres'],
        },
        usuarioResponsable: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'movimientos',
    }
);

// Indexes for better query performance
movimientoSchema.index({ expedienteId: 1, fechaMovimiento: -1 });
movimientoSchema.index({ despachoNuevo: 1, estado: 1 });

// Virtual for id
movimientoSchema.virtual('id').get(function () {
    return this._id.toString();
});

// Ensure virtual fields are serialized
movimientoSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

export const MovimientoModel: Model<IMovimiento> = mongoose.model<IMovimiento>(
    'Movimiento',
    movimientoSchema
);
