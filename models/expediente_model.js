import mongoose from 'mongoose';

const expedienteSchema = new mongoose.Schema({
  numeroExpediente: { 
    type: String, 
    required: true,
    unique: true  // Asegura que no haya duplicados
  },
  iniciador: { type: String, required: true },
  tema: { 
    type: String, 
    required: true,
    enum: ['BARRIDO', 'DESMALEZAMIENTO', 'INSPECCION', 'PODA', 'CORTE AL RAS', 
           'LIMPIEZA', 'REPARACION', 'PLANITES/ARBOL', 'COLABORACION - DONACION', 
           'EVENTOS', 'RRHH']
  },
  prioridad: { 
    type: String, 
    required: true,
    enum: ['Baja', 'Normal', 'Alta']
  },
  extracto: { type: String },
  fojas: { type: Number, default: 0 },
  despachoActual: { type: String, required: true },
  fechaIngreso: { type: Date, default: Date.now },
  estado: { 
    type: String,
    enum: ['RECEPCIONADO', 'ENVIADO'],
    default: 'RECEPCIONADO'
  }
});

export const Expediente = mongoose.model('Expediente', expedienteSchema);