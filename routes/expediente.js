// src/routes/expediente.routes.js
import express from 'express';
import { expedienteController } from '../controllers/expediente_controller.js';

const router = express.Router();

// Ruta para crear un nuevo expediente
router.post('/crear', expedienteController.crear);

// Ruta para listar expedientes con paginación y filtros
router.get('/listar', expedienteController.listar);

// Ruta para actualizar un expediente por ID
router.put('/:id', expedienteController.actualizar);

export default router;
