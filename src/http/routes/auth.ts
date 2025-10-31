import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AuthService } from '@/services/AuthService';
import { createErrorResponse, createAppError } from '@/http/middleware/errorHandler';
import { requireAuth, requireRole } from '@/http/middleware/auth';
import type { ApiResponse } from '@/types';

const authRoutes = new Hono();

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(4),
});

const registerEntitySchema = z.object({
    user: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
    }),
    despacho: z.object({
        nombre: z.string().min(2),
        codigo: z.string().min(2).toUpperCase(),
        tipo: z.enum(['DIRECCION', 'SUBDIRECCIÓN', 'AREA', 'DEPARTAMENTO', 'SECRETARIA']),
        descripcion: z.string().optional(),
        responsable: z.string().optional(),
        email: z.string().email().optional(),
        telefono: z.string().optional(),
    }),
    parentId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
});

const registerWithCodeSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    codigo: z.string().min(2),
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
    try {
        const { email, password } = c.req.valid('json');
        const result = await AuthService.login(email, password);
        const response: ApiResponse = { success: true, data: result };
        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(
            c,
            createAppError(error instanceof Error ? error.message : 'Error de login', 401),
            401 as any
        );
    }
});

authRoutes.post(
    '/register-entity',
    requireAuth,
    requireRole('ADMIN'),
    zValidator('json', registerEntitySchema),
    async (c) => {
        try {
            const payload = c.req.valid('json');
            const result = await AuthService.registerEntity(payload);
            const response: ApiResponse = { success: true, data: result };
            return c.json(response, 201 as any);
        } catch (error) {
            return createErrorResponse(
                c,
                createAppError(error instanceof Error ? error.message : 'Error al registrar entidad', 400),
                400 as any
            );
        }
    }
);

authRoutes.post('/register-with-code', zValidator('json', registerWithCodeSchema), async (c) => {
    try {
        const { name, email, password, codigo } = c.req.valid('json');
        const result = await AuthService.registerWithCodigo({ name, email, password, codigo });
        const response: ApiResponse = { success: true, data: result };
        return c.json(response, 201 as any);
    } catch (error) {
        return createErrorResponse(
            c,
            createAppError(error instanceof Error ? error.message : 'Error en registro', 400),
            400 as any
        );
    }
});

export default authRoutes;


