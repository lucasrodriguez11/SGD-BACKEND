import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { RecepcionService } from '@/services/RecepcionService';
import type { ApiResponse } from '@/types';
import { requireAuth } from '@/http/middleware/auth';
import { DespachoModel } from '@/database/models/Despacho';

const recepcionesRoutes = new Hono();

const listSchema = z.object({
    recibidoEn: z.string().optional(),
    despachoDestinoId: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
});

recepcionesRoutes.get('/', requireAuth, zValidator('query', listSchema), async (c) => {
    const q = c.req.valid('query');
    const page = q.page ? parseInt(q.page, 10) : 1;
    const limit = q.limit ? parseInt(q.limit, 10) : 20;
    let recibidoEn = q.recibidoEn;
    // Si se pasa despachoDestinoId, buscar el nombre del despacho
    if (q.despachoDestinoId && !recibidoEn) {
        const despacho = await DespachoModel.findById(q.despachoDestinoId).lean().exec();
        if (despacho) recibidoEn = despacho.nombre;
    }
    const { items, total, totalPages } = await RecepcionService.listPendientes(recibidoEn, page, limit);
    const response: ApiResponse = { success: true, data: { recepciones: items }, meta: { page, limit, total, totalPages } };
    return c.json(response, 200 as any);
});

// Endpoint específico para pending con despachoId
recepcionesRoutes.get('/pending', requireAuth, zValidator('query', listSchema), async (c) => {
    const q = c.req.valid('query');
    const page = q.page ? parseInt(q.page, 10) : 1;
    const limit = q.limit ? parseInt(q.limit, 10) : 20;
    let recibidoEn = q.recibidoEn;
    // Si se pasa despachoDestinoId, buscar el nombre del despacho
    if (q.despachoDestinoId && !recibidoEn) {
        const despacho = await DespachoModel.findById(q.despachoDestinoId).lean().exec();
        if (despacho) recibidoEn = despacho.nombre;
    }
    const { items, total, totalPages } = await RecepcionService.listPendientes(recibidoEn, page, limit);
    const response: ApiResponse = { success: true, data: { recepciones: items }, meta: { page, limit, total, totalPages } };
    return c.json(response, 200 as any);
});

recepcionesRoutes.patch('/:id/confirmar', requireAuth, async (c) => {
    const id = c.req.param('id');
    // @ts-expect-error - Hono context type doesn't include auth from requireAuth middleware
    const auth = c.get('auth') as any;
    const userId = auth?.sub ?? null;
    const updated = await RecepcionService.confirmar(id, userId);
    const response: ApiResponse = { success: true, data: { recepcion: updated } };
    return c.json(response, 200 as any);
});

recepcionesRoutes.patch('/:id/confirm', requireAuth, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    // @ts-expect-error - Hono context type doesn't include auth from requireAuth middleware
    const auth = c.get('auth') as any;
    const userId = body.userId ?? auth?.sub ?? null;
    const updated = await RecepcionService.confirmar(id, userId);
    const response: ApiResponse = { success: true, data: { recepcion: updated } };
    return c.json(response, 200 as any);
});

export default recepcionesRoutes;





