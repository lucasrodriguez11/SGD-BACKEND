/**
 * Despachos HTTP Routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { DespachoService } from '@/services';
import {
    createDespachoSchema,
    updateDespachoSchema,
    listDespachosSchema,
} from '@/http/validators/despacho';
import { mongoIdSchema } from '@/http/validators';
import { createErrorResponse, createAppError } from '@/http/middleware/errorHandler';
import type { ApiResponse } from '@/types';
import { requireAuth, requireRole, type AuthPayload } from '@/http/middleware/auth';

const despachosRoutes = new Hono();

/**
 * GET /despachos - List all despachos
 */
despachosRoutes.get('/', zValidator('query', listDespachosSchema), async (c) => {
    try {
        const params = c.req.valid('query');
        const { despachos, pagination } = await DespachoService.list(params);

        const response: ApiResponse = {
            success: true,
            data: { despachos },
            meta: pagination,
        };

        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(
            c,
            createAppError(error instanceof Error ? error.message : 'Error al listar despachos', 500),
            500 as any
        );
    }
});

/**
 * GET /despachos/activos - Get all active despachos
 */
despachosRoutes.get('/activos', async (c) => {
    try {
        const despachos = await DespachoService.getActivos();

        const response: ApiResponse = {
            success: true,
            data: { despachos },
        };

        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(
            c,
            createAppError(error instanceof Error ? error.message : 'Error al obtener despachos activos', 500),
            500 as any
        );
    }
});

/**
 * GET /despachos/:id - Get despacho by ID
 */
despachosRoutes.get('/:id', zValidator('param', mongoIdSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const despacho = await DespachoService.getById(id);

        if (!despacho) {
            return createErrorResponse(c, createAppError('Despacho no encontrado', 404), 404 as any);
        }

        const response: ApiResponse = {
            success: true,
            data: { despacho },
        };

        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(
            c,
            createAppError(error instanceof Error ? error.message : 'Error al obtener despacho', 500),
            500 as any
        );
    }
});

/**
 * GET /despachos/codigo/:codigo - Get despacho by codigo
 */
despachosRoutes.get('/codigo/:codigo', async (c) => {
    try {
        const codigo = c.req.param('codigo');
        const despacho = await DespachoService.getByCodigo(codigo);

        if (!despacho) {
            return createErrorResponse(c, createAppError('Despacho no encontrado', 404), 404 as any);
        }

        const response: ApiResponse = {
            success: true,
            data: { despacho },
        };

        return c.json(response, 200);
    } catch (error) {
        return createErrorResponse(
            c,
            createAppError(error instanceof Error ? error.message : 'Error al obtener despacho', 500),
            500 as any
        );
    }
});

/**
 * POST /despachos - Create new despacho
 */
despachosRoutes.post('/', requireAuth, requireRole('ADMIN'), zValidator('json', createDespachoSchema), async (c) => {
    try {
        const data = c.req.valid('json');
        const despacho = await DespachoService.create(data);

        const response: ApiResponse = {
            success: true,
            data: { despacho },
        };

        return c.json(response, 201 as any);
    } catch (error) {
        return createErrorResponse(
            c,
            createAppError(error instanceof Error ? error.message : 'Error al crear despacho', 400),
            400 as any
        );
    }
});

/**
 * PUT /despachos/:id - Update despacho
 */
despachosRoutes.put(
    '/:id',
    requireAuth,
    zValidator('param', mongoIdSchema),
    zValidator('json', updateDespachoSchema),
    async (c) => {
        try {
            const auth = c.get('auth') as AuthPayload | undefined;
            const { id } = c.req.valid('param');

            // Autorización: ADMIN o dueño del despacho
            if (!auth || (auth.role !== 'ADMIN' && auth.desp !== id)) {
                return c.json({ success: false, error: { message: 'Prohibido' } }, 403 as any);
            }

            const data = c.req.valid('json');
            const despacho = await DespachoService.update(id, data);

            if (!despacho) {
                return createErrorResponse(c, createAppError('Despacho no encontrado', 404), 404 as any);
            }

            const response: ApiResponse = {
                success: true,
                data: { despacho },
            };

            return c.json(response, 200 as any);
        } catch (error) {
            return createErrorResponse(
                c,
                createAppError(error instanceof Error ? error.message : 'Error al actualizar despacho', 400),
                400 as any
            );
        }
    }
);

/**
 * DELETE /despachos/:id - Deactivate despacho
 */
despachosRoutes.delete('/:id', requireAuth, requireRole('ADMIN'), zValidator('param', mongoIdSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const despacho = await DespachoService.delete(id);

        if (!despacho) {
            return createErrorResponse(c, createAppError('Despacho no encontrado', 404), 404 as any);
        }

        const response: ApiResponse = {
            success: true,
            data: { message: 'Despacho desactivado exitosamente', despacho },
        };

        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(
            c,
            createAppError(error instanceof Error ? error.message : 'Error al desactivar despacho', 500),
            500 as any
        );
    }
});

export default despachosRoutes;

