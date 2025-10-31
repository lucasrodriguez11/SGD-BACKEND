import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ApiResponse } from '@/types';
import { TemaService } from '@/services/TemaService';
import { requireAuth, requireRole } from '@/http/middleware/auth';

const temasRoutes = new Hono();

temasRoutes.get('/', async (c) => {
    const all = c.req.query('all') === 'true';
    const temas = all ? await TemaService.listAll() : await TemaService.listActivos();
    const response: ApiResponse = { success: true, data: { temas } };
    return c.json(response, 200 as any);
});

temasRoutes.post('/', requireAuth, requireRole('ADMIN'), zValidator('json', z.object({ nombre: z.string().min(2) })), async (c) => {
    const { nombre } = c.req.valid('json');
    const tema = await TemaService.create(nombre);
    const response: ApiResponse = { success: true, data: { tema } };
    return c.json(response, 201 as any);
});

export default temasRoutes;

// Update tema (ADMIN)
temasRoutes.put(
    '/:id',
    requireAuth,
    requireRole('ADMIN'),
    zValidator('json', z.object({ nombre: z.string().min(2).optional(), activo: z.boolean().optional() })),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const tema = await TemaService.update(id, data);
        const response: ApiResponse = { success: true, data: { tema } };
        return c.json(response, 200 as any);
    }
);

// Delete tema (ADMIN)
temasRoutes.delete(
    '/:id',
    requireAuth,
    requireRole('ADMIN'),
    async (c) => {
        const id = c.req.param('id');
        const tema = await TemaService.remove(id);
        const response: ApiResponse = { success: true, data: { tema } };
        return c.json(response, 200 as any);
    }
);


