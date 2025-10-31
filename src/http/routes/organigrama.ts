/**
 * Organigrama HTTP Routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { OrganigramaService } from '@/services';
import { createErrorResponse } from '@/http/middleware/errorHandler';
import type { ApiResponse } from '@/types';
import {
    setParentSchema,
} from '@/http/validators/organigrama';
import { mongoIdSchema } from '@/http/validators';
import { z } from 'zod';

const organigramaRoutes = new Hono();

/**
 * POST /organigrama/parent - set or change parent
 */
organigramaRoutes.post('/parent', zValidator('json', setParentSchema), async (c) => {
    try {
        const { despachoId, parentId } = c.req.valid('json');
        const result = await OrganigramaService.setParent(despachoId, parentId ?? null);
        const response: ApiResponse = { success: true, data: result };
        return c.json(response, 200);
    } catch (error) {
        return createErrorResponse(
            c,
            { message: error instanceof Error ? error.message : 'Error al configurar parent' },
            400
        );
    }
});

/**
 * GET /organigrama/:id/children - direct children
 */
organigramaRoutes.get('/:id/children', zValidator('param', mongoIdSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const children = await OrganigramaService.getChildren(id);
        const response: ApiResponse = { success: true, data: { children } };
        return c.json(response, 200);
    } catch (error) {
        return createErrorResponse(
            c,
            { message: error instanceof Error ? error.message : 'Error al obtener hijos' },
            500
        );
    }
});

/**
 * GET /organigrama/:id/ancestors - path to root
 */
organigramaRoutes.get('/:id/ancestors', zValidator('param', mongoIdSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const ancestors = await OrganigramaService.getAncestors(id);
        const response: ApiResponse = { success: true, data: { ancestors } };
        return c.json(response, 200);
    } catch (error) {
        return createErrorResponse(
            c,
            { message: error instanceof Error ? error.message : 'Error al obtener ancestros' },
            500
        );
    }
});

/**
 * GET /organigrama/:id/descendants - all descendants
 */
organigramaRoutes.get('/:id/descendants', zValidator('param', mongoIdSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const descendants = await OrganigramaService.getDescendants(id);
        const response: ApiResponse = { success: true, data: { descendants } };
        return c.json(response, 200);
    } catch (error) {
        return createErrorResponse(
            c,
            { message: error instanceof Error ? error.message : 'Error al obtener descendientes' },
            500
        );
    }
});

/**
 * GET /organigrama/tree - full tree
 */
organigramaRoutes.get('/tree', async (c) => {
    try {
        const tree = await OrganigramaService.getTree();
        const response: ApiResponse = { success: true, data: { tree } };
        return c.json(response, 200);
    } catch (error) {
        return createErrorResponse(
            c,
            { message: error instanceof Error ? error.message : 'Error al obtener organigrama' },
            500
        );
    }
});

export default organigramaRoutes;

// Reorder/re-parent (drag-and-drop)
organigramaRoutes.patch('/reordenar', zValidator('json', z.object({ childId: z.string(), newParentId: z.string().nullable() })), async (c) => {
    try {
        const { childId, newParentId } = c.req.valid('json');
        const result = await OrganigramaService.setParent(childId, newParentId);
        const response: ApiResponse = { success: true, data: result };
        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(c, { message: error instanceof Error ? error.message : 'Error al reordenar organigrama' }, 400);
    }
});


