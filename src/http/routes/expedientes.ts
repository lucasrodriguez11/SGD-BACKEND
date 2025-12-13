/**
 * Expedientes routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ExpedienteService } from '@/services';
import type { ApiResponse } from '@/types';
import {
  createExpedienteSchema,
  updateExpedienteSchema,
  listExpedientesSchema,
  mongoIdSchema,
} from '../validators';
import { createAppError } from '../middleware';
import { requireAuth, requireRole } from '@/http/middleware/auth';

const expedientes = new Hono();

/**
 * GET /expedientes - List expedientes with filters and pagination
 */
expedientes.get('/', zValidator('query', listExpedientesSchema), async (c) => {
  try {
    const query = c.req.valid('query');

    const filters = {
      numeroExpediente: query.numeroExpediente,
      prioridad: query.prioridad,
      tema: query.tema,
      iniciador: query.iniciador,
      despachoActual: query.despachoActual,
      estado: query.estado,
    };

    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await ExpedienteService.findAll(filters, pagination);

    const response: ApiResponse = {
      success: true,
      data: {
        expedientes: result.expedientes,
      },
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };

    return c.json(response, 200);
  } catch (error: any) {
    throw createAppError(error.message, 500, 'EXPEDIENTE_LIST_ERROR');
  }
});

/**
 * POST /expedientes - Create new expediente
 */
expedientes.post('/', requireAuth, zValidator('json', createExpedienteSchema), async (c) => {
  try {
    const data = c.req.valid('json');

    const expediente = await ExpedienteService.create(data);

    const response: ApiResponse = {
      success: true,
      data: { expediente },
    };

    return c.json(response, 201);
  } catch (error: any) {
    if (error.message.includes('ya existe')) {
      throw createAppError(error.message, 409, 'EXPEDIENTE_DUPLICATE');
    }
    throw createAppError(error.message, 500, 'EXPEDIENTE_CREATE_ERROR');
  }
});

/**
 * GET /expedientes/:id - Get expediente by ID
 */
expedientes.get('/:id', zValidator('param', mongoIdSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');

    const expediente = await ExpedienteService.findById(id);

    if (!expediente) {
      throw createAppError('Expediente no encontrado', 404, 'EXPEDIENTE_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { expediente },
    };

    return c.json(response, 200);
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw error;
    }
    throw createAppError(error.message, 500, 'EXPEDIENTE_GET_ERROR');
  }
});

/**
 * GET /expedientes/numero/:numeroExpediente - Get expediente by numero
 */
expedientes.get('/numero/:numeroExpediente', async (c) => {
  try {
    const numeroExpediente = c.req.param('numeroExpediente');

    const expediente = await ExpedienteService.findByNumero(numeroExpediente);

    if (!expediente) {
      throw createAppError('Expediente no encontrado', 404, 'EXPEDIENTE_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { expediente },
    };

    return c.json(response, 200);
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw error;
    }
    throw createAppError(error.message, 500, 'EXPEDIENTE_GET_ERROR');
  }
});

/**
 * PUT /expedientes/:id - Update expediente
 */
expedientes.put(
  '/:id',
  requireAuth,
  zValidator('param', mongoIdSchema),
  zValidator('json', updateExpedienteSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');

      const expediente = await ExpedienteService.update(id, data);

      if (!expediente) {
        throw createAppError('Expediente no encontrado', 404, 'EXPEDIENTE_NOT_FOUND');
      }

      const response: ApiResponse = {
        success: true,
        data: { expediente },
      };

      return c.json(response, 200);
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw error;
      }
      if (error.message.includes('ya existe')) {
        throw createAppError(error.message, 409, 'EXPEDIENTE_DUPLICATE');
      }
      throw createAppError(error.message, 500, 'EXPEDIENTE_UPDATE_ERROR');
    }
  }
);

/**
 * DELETE /expedientes/:id - Archive expediente (soft delete)
 */
expedientes.delete('/:id', requireAuth, zValidator('param', mongoIdSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');

    const expediente = await ExpedienteService.archive(id);

    if (!expediente) {
      throw createAppError('Expediente no encontrado', 404, 'EXPEDIENTE_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { expediente },
    };

    return c.json(response, 200);
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw error;
    }
    throw createAppError(error.message, 500, 'EXPEDIENTE_DELETE_ERROR');
  }
});

/**
 * DELETE /expedientes/:id/delete - Delete expediente permanently (hard delete)
 */
expedientes.delete('/:id/delete', requireAuth, requireRole('ADMIN'), zValidator('param', mongoIdSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');

    const deleted = await ExpedienteService.delete(id);

    if (!deleted) {
      throw createAppError('Expediente no encontrado', 404, 'EXPEDIENTE_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Expediente eliminado permanentemente' },
    };

    return c.json(response, 200);
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw error;
    }
    throw createAppError(error.message, 500, 'EXPEDIENTE_DELETE_ERROR');
  }
});

/**
 * GET /expedientes/statistics - Get expediente statistics
 */
expedientes.get('/stats/all', async (c) => {
  try {
    const statistics = await ExpedienteService.getStatistics();

    const response: ApiResponse = {
      success: true,
      data: { statistics },
    };

    return c.json(response, 200);
  } catch (error: any) {
    throw createAppError(error.message, 500, 'EXPEDIENTE_STATS_ERROR');
  }
});

/**
 * GET /expedientes/despacho/:despachoId - Get expedientes by despacho with optional estado filter
 */
expedientes.get('/despacho/:despachoId', requireAuth, async (c) => {
  try {
    const despachoId = c.req.param('despachoId');
    const estado = c.req.query('estado') || undefined;
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '10', 10);

    // Get despacho nombre from ID
    const { DespachoModel } = await import('@/database/models/Despacho');
    const despacho = await DespachoModel.findById(despachoId).lean().exec();
    if (!despacho) {
      throw createAppError('Despacho no encontrado', 404, 'DESPACHO_NOT_FOUND');
    }

    const filters: any = { despachoActual: despacho.nombre };
    if (estado) filters.estado = estado;

    const pagination = { page, limit };
    const result = await ExpedienteService.findAll(filters, pagination);

    const response: ApiResponse = {
      success: true,
      data: {
        expedientes: result.expedientes,
      },
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };

    return c.json(response, 200);
  } catch (error: any) {
    throw createAppError(error.message, 500, 'EXPEDIENTE_LIST_ERROR');
  }
});

export default expedientes;
