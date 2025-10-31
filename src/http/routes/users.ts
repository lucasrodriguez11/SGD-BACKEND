import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ApiResponse } from '@/types';
import { createErrorResponse } from '@/http/middleware/errorHandler';
import { requireAuth, requireRole } from '@/http/middleware/auth';
import { UserService } from '@/services/UserService';
import { UserRoleEnum } from '@/types';
import { UserModel } from '@/database/models';
import { AuthService } from '@/services/AuthService';

const usersRoutes = new Hono();

const createUserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    despachoId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    role: UserRoleEnum.optional().default('USER'),
});

// ADMIN only
usersRoutes.post('/', requireAuth, requireRole('ADMIN'), zValidator('json', createUserSchema), async (c) => {
    try {
        const data = c.req.valid('json');
        const user = await UserService.create(data);
        const response: ApiResponse = { success: true, data: { user } };
        return c.json(response, 201);
    } catch (error) {
        return createErrorResponse(
            c,
            { message: error instanceof Error ? error.message : 'Error al crear usuario' },
            400
        );
    }
});

// Change role (ADMIN only)
usersRoutes.patch(
    '/:id/role',
    requireAuth,
    requireRole('ADMIN'),
    zValidator('json', z.object({ role: UserRoleEnum })),
    async (c) => {
        try {
            const id = c.req.param('id');
            const { role } = c.req.valid('json');
            const user = await UserModel.findByIdAndUpdate(id, { role }, { new: true });
            if (!user) return createErrorResponse(c, { message: 'Usuario no encontrado' }, 404);
            const response: ApiResponse = { success: true, data: { user } };
            return c.json(response, 200 as any);
        } catch (error) {
            return createErrorResponse(c, { message: error instanceof Error ? error.message : 'Error al cambiar rol' }, 400);
        }
    }
);

// Admin: update arbitrary user fields (name/email/role/despachoId)
usersRoutes.put(
    '/:id',
    requireAuth,
    requireRole('ADMIN'),
    zValidator(
        'json',
        z.object({
            name: z.string().min(2).optional(),
            email: z.string().email().optional(),
            role: UserRoleEnum.optional(),
            despachoId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
        })
    ),
    async (c) => {
        try {
            const id = c.req.param('id');
            const payload = c.req.valid('json');
            const update: any = {};
            if (payload.name) update.name = payload.name;
            if (payload.email) update.email = payload.email.toLowerCase();
            if (payload.role) update.role = payload.role;
            if (payload.despachoId !== undefined) update.despachoId = payload.despachoId;
            const user = await UserModel.findByIdAndUpdate(id, update, { new: true });
            if (!user) return createErrorResponse(c, { message: 'Usuario no encontrado' }, 404);
            const response: ApiResponse = { success: true, data: { user } };
            return c.json(response, 200 as any);
        } catch (error) {
            return createErrorResponse(c, { message: error instanceof Error ? error.message : 'Error al actualizar usuario' }, 400);
        }
    }
);

// Admin: reset password (no current required)
usersRoutes.post(
    '/:id/password',
    requireAuth,
    requireRole('ADMIN'),
    zValidator('json', z.object({ newPassword: z.string().min(6) })),
    async (c) => {
        try {
            const id = c.req.param('id');
            const { newPassword } = c.req.valid('json');
            const user = await UserModel.findById(id);
            if (!user) return createErrorResponse(c, { message: 'Usuario no encontrado' }, 404);
            user.passwordHash = await AuthService.hashPassword(newPassword);
            await user.save();
            const response: ApiResponse = { success: true, data: { ok: true } };
            return c.json(response, 200 as any);
        } catch (error) {
            return createErrorResponse(c, { message: error instanceof Error ? error.message : 'Error al cambiar contraseña' }, 400);
        }
    }
);

// Admin: delete user
usersRoutes.delete('/:id', requireAuth, requireRole('ADMIN'), async (c) => {
    try {
        const id = c.req.param('id');
        const deleted = await UserModel.findByIdAndDelete(id);
        if (!deleted) return createErrorResponse(c, { message: 'Usuario no encontrado' }, 404);
        const response: ApiResponse = { success: true, data: { ok: true } };
        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(c, { message: error instanceof Error ? error.message : 'Error al eliminar usuario' }, 400);
    }
});

// Update current user profile
usersRoutes.put('/me', requireAuth, zValidator('json', z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
})), async (c) => {
    try {
        const auth = c.get('auth') as any;
        const { name, email } = c.req.valid('json');
        const update: any = {};
        if (name) update.name = name;
        if (email) update.email = email.toLowerCase();
        const user = await UserModel.findByIdAndUpdate(auth.sub, update, { new: true });
        if (!user) return createErrorResponse(c, { message: 'Usuario no encontrado' }, 404);
        const response: ApiResponse = { success: true, data: { user } };
        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(c, { message: error instanceof Error ? error.message : 'Error al actualizar perfil' }, 400);
    }
});

// Change password
usersRoutes.post('/me/password', requireAuth, zValidator('json', z.object({
    currentPassword: z.string().min(4),
    newPassword: z.string().min(6),
})), async (c) => {
    try {
        const auth = c.get('auth') as any;
        const { currentPassword, newPassword } = c.req.valid('json');
        const user = await UserModel.findById(auth.sub);
        if (!user) return createErrorResponse(c, { message: 'Usuario no encontrado' }, 404);
        const ok = await AuthService.comparePassword(currentPassword, user.passwordHash);
        if (!ok) return createErrorResponse(c, { message: 'Contraseña actual incorrecta' }, 400);
        user.passwordHash = await AuthService.hashPassword(newPassword);
        await user.save();
        const response: ApiResponse = { success: true, data: { ok: true } };
        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(c, { message: error instanceof Error ? error.message : 'Error al cambiar contraseña' }, 400);
    }
});

// Get users by despacho ID (ADMIN or same despacho)
usersRoutes.get('/by-despacho/:despachoId', requireAuth, async (c) => {
    try {
        const auth = c.get('auth') as any;
        const despachoId = c.req.param('despachoId');

        // Only ADMIN or users from the same despacho can list users
        if (auth.role !== 'ADMIN' && auth.desp !== despachoId) {
            return createErrorResponse(c, { message: 'Prohibido' }, 403);
        }

        const users = await UserModel.find({ despachoId }).select('-passwordHash').lean().exec();
        const response: ApiResponse = { success: true, data: { users } };
        return c.json(response, 200 as any);
    } catch (error) {
        return createErrorResponse(c, { message: error instanceof Error ? error.message : 'Error al obtener usuarios por despacho' }, 400);
    }
});

export default usersRoutes;

