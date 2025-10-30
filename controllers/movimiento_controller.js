// src/controllers/movimiento.controller.js
import { Movimiento } from '../models/movimiento_model.js';
import { Expediente } from '../models/expediente_model.js';

export const movimientoController = {
  // Registrar nuevo movimiento
  registrar: async (req, res) => {
    try {
      const { expedienteId, despachoNuevo, fojasAgregadas, estado } = req.body;
      
      // Obtener expediente actual
      const expediente = await Expediente.findById(expedienteId);
      
      // Crear movimiento
      const movimiento = new Movimiento({
        expedienteId,
        despachoAnterior: expediente.despachoActual,
        despachoNuevo,
        fojasAgregadas,
        estado
      });
      
      // Actualizar expediente
      expediente.despachoActual = despachoNuevo;
      expediente.fojas += fojasAgregadas;
      expediente.estado = estado;
      
      await Promise.all([
        movimiento.save(),
        expediente.save()
      ]);
      
      res.status(201).json(movimiento);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Obtener historial de movimientos
  obtenerHistorial: async (req, res) => {
    try {
      const movimientos = await Movimiento.find({ expedienteId: req.params.expedienteId })
        .sort({ fechaMovimiento: -1 });
      res.json(movimientos);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};