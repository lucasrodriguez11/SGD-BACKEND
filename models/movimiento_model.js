import mongoose from 'mongoose';

const movimientoSchema = new mongoose.Schema({
    expedienteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expediente',  // Referencia al modelo Expediente
      required: true
    },
    despachoAnterior: { type: String, required: true },
    despachoNuevo: { type: String, required: true },
    fechaMovimiento: { type: Date, default: Date.now },
    fojasAgregadas: { type: Number, default: 0 },
    estado: {
      type: String,
      enum: ['RECEPCIONADO', 'ENVIADO'],
      required: true
    }
  });
  
  export const Movimiento = mongoose.model('Movimiento', movimientoSchema);