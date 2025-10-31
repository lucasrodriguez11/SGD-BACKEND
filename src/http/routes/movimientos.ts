/**
 * Movimientos routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { MovimientoService } from '@/services';
import type { ApiResponse } from '@/types';
import { createMovimientoSchema, mongoIdSchema } from '../validators';
import { createAppError } from '../middleware';
import { requireAuth } from '@/http/middleware/auth';

const movimientos = new Hono();

/**
 * POST /movimientos - Register new movement
 */
movimientos.post('/', requireAuth, zValidator('json', createMovimientoSchema), async (c) => {
  try {
    const data = c.req.valid('json');

    const movimiento = await MovimientoService.registrarMovimiento(data);

    const response: ApiResponse = {
      success: true,
      data: { movimiento },
    };

    return c.json(response, 201);
  } catch (error: any) {
    if (error.message.includes('no encontrado')) {
      throw createAppError(error.message, 404, 'EXPEDIENTE_NOT_FOUND');
    }
    throw createAppError(error.message, 500, 'MOVIMIENTO_CREATE_ERROR');
  }
});

/**
 * GET /movimientos/expediente/:expedienteId/historial - Get movement history
 */
movimientos.get(
  '/expediente/:expedienteId/historial',
  zValidator('param', mongoIdSchema.extend({ expedienteId: mongoIdSchema.shape.id })),
  async (c) => {
    try {
      const { expedienteId } = c.req.valid('param');

      const movimientos = await MovimientoService.getHistorial(expedienteId);

      const response: ApiResponse = {
        success: true,
        data: { movimientos },
      };

      return c.json(response, 200);
    } catch (error: any) {
      throw createAppError(error.message, 500, 'MOVIMIENTO_HISTORY_ERROR');
    }
  }
);

/**
 * GET /movimientos/expediente/:expedienteId/latest - Get latest movement
 */
movimientos.get(
  '/expediente/:expedienteId/latest',
  zValidator('param', mongoIdSchema.extend({ expedienteId: mongoIdSchema.shape.id })),
  async (c) => {
    try {
      const { expedienteId } = c.req.valid('param');

      const movimiento = await MovimientoService.getLatestMovimiento(expedienteId);

      if (!movimiento) {
        throw createAppError(
          'No se encontraron movimientos para este expediente',
          404,
          'MOVIMIENTO_NOT_FOUND'
        );
      }

      const response: ApiResponse = {
        success: true,
        data: { movimiento },
      };

      return c.json(response, 200);
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw error;
      }
      throw createAppError(error.message, 500, 'MOVIMIENTO_GET_ERROR');
    }
  }
);

/**
 * GET /movimientos/despacho/:despacho - Get movements by despacho
 */
movimientos.get('/despacho/:despacho', async (c) => {
  try {
    const despacho = c.req.param('despacho');
    const limit = parseInt(c.req.query('limit') || '50', 10);

    const movimientos = await MovimientoService.getByDespacho(despacho, limit);

    const response: ApiResponse = {
      success: true,
      data: { movimientos },
    };

    return c.json(response, 200);
  } catch (error: any) {
    throw createAppError(error.message, 500, 'MOVIMIENTO_GET_ERROR');
  }
});

/**
 * GET /movimientos/stats/:despacho? - Get movement statistics
 */
movimientos.get('/stats/:despacho?', async (c) => {
  try {
    const despacho = c.req.param('despacho');

    const statistics = await MovimientoService.getStatistics(despacho);

    const response: ApiResponse = {
      success: true,
      data: { statistics },
    };

    return c.json(response, 200);
  } catch (error: any) {
    throw createAppError(error.message, 500, 'MOVIMIENTO_STATS_ERROR');
  }
});

/**
 * GET /movimientos/despacho/:despachoId/enviados - Get movements sent from despacho
 */
movimientos.get('/despacho/:despachoId/enviados', requireAuth, async (c) => {
  try {
    const despachoId = c.req.param('despachoId');
    const limit = parseInt(c.req.query('limit') || '50', 10);

    const movimientos = await MovimientoService.getEnviadosByDespacho(despachoId, limit);

    const response: ApiResponse = {
      success: true,
      data: { movimientos },
    };

    return c.json(response, 200);
  } catch (error: any) {
    throw createAppError(error.message, 500, 'MOVIMIENTO_GET_ERROR');
  }
});

/**
 * GET /movimientos/despacho/:despachoId/recepcionados - Get movements received by despacho
 */
movimientos.get('/despacho/:despachoId/recepcionados', requireAuth, async (c) => {
  try {
    const despachoId = c.req.param('despachoId');
    const limit = parseInt(c.req.query('limit') || '50', 10);

    const movimientos = await MovimientoService.getRecepcionadosByDespacho(despachoId, limit);

    const response: ApiResponse = {
      success: true,
      data: { movimientos },
    };

    return c.json(response, 200);
  } catch (error: any) {
    throw createAppError(error.message, 500, 'MOVIMIENTO_GET_ERROR');
  }
});

export default movimientos;
