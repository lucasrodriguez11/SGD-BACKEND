// src/routes/movimiento.routes.js
import express from 'express';
import { movimientoController } from '../controllers/movimiento_controller.js';

const router = express.Router();

// Ruta para registrar un nuevo movimiento
router.post('/registrarmov', movimientoController.registrar);

// Ruta para obtener historial de movimientos por ID de expediente
router.get('/:expedienteId/historial', movimientoController.obtenerHistorial);

export default router;
