// src/controllers/expediente.controller.js
import { Expediente } from '../models/expediente_model.js';


export const expedienteController = {
    // Crear nuevo expediente
    crear: async (req, res) => {
      try {
        const expediente = new Expediente(req.body);
        await expediente.save();
        res.status(201).json(expediente);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },
  
  // Listar expedientes con paginación y filtros
listar: async (req, res) => {
    const { numeroExpediente, prioridad, tema, iniciador } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
  
    try {
      // Crear filtro con posibles parámetros de búsqueda
      const filtro = {};
      if (numeroExpediente) filtro.numeroExpediente = new RegExp(numeroExpediente, 'i');
      if (prioridad) filtro.prioridad = prioridad;
      if (tema) filtro.tema = tema;
      if (iniciador) filtro.iniciador = new RegExp(iniciador, 'i');
  
      // Obtener expedientes filtrados con paginación
      const expedientes = await Expediente.find(filtro)
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();
  
      // Contar el total de documentos para el cálculo de páginas
      const count = await Expediente.countDocuments(filtro);
  
      res.json({
        expedientes,
        totalPaginas: Math.ceil(count / limit),
        paginaActual: page
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
    // Actualizar expediente
    actualizar: async (req, res) => {
      try {
        const expediente = await Expediente.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true }
        );
        res.json(expediente);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  };