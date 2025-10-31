import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { getEnvOrFail } from '@/env';

export interface AuthPayload {
    sub: string;
    role: 'ADMIN' | 'USER';
    desp: string | null;
    iat?: number;
    exp?: number;
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
    const header = c.req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
        return c.json({ success: false, error: { message: 'No autorizado' } }, 401 as any);
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, getEnvOrFail('JWT_SECRET_KEY')) as AuthPayload;
        c.set('auth', payload);
        await next();
        return;
    } catch {
        return c.json({ success: false, error: { message: 'Token inválido' } }, 401 as any);
    }
}

export function requireRole(role: 'ADMIN' | 'USER') {
    return async (c: Context, next: Next): Promise<Response | void> => {
        const auth = c.get('auth') as AuthPayload | undefined;
        if (!auth || (role === 'ADMIN' && auth.role !== 'ADMIN')) {
            return c.json({ success: false, error: { message: 'Prohibido' } }, 403 as any);
        }
        await next();
        return;
    };
}


