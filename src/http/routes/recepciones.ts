import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { RecepcionService } from '@/services/RecepcionService';
import type { ApiResponse } from '@/types';
import { requireAuth } from '@/http/middleware/auth';

const recepcionesRoutes = new Hono();

const listSchema = z.object({
    recibidoEn: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
});

recepcionesRoutes.get('/', zValidator('query', listSchema), async (c) => {
    const q = c.req.valid('query');
    const page = q.page ? parseInt(q.page, 10) : 1;
    const limit = q.limit ? parseInt(q.limit, 10) : 20;
    const { items, total, totalPages } = await RecepcionService.listPendientes(q.recibidoEn, page, limit);
    const response: ApiResponse = { success: true, data: { recepciones: items }, meta: { page, limit, total, totalPages } };
    return c.json(response, 200 as any);
});

recepcionesRoutes.patch('/:id/confirmar', requireAuth, async (c) => {
    const id = c.req.param('id');
    // if we had auth payload, could use c.get('auth').sub as userId
    const updated = await RecepcionService.confirmar(id);
    const response: ApiResponse = { success: true, data: { recepcion: updated } };
    return c.json(response, 200 as any);
});

export default recepcionesRoutes;




