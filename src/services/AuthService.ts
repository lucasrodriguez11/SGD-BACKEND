/**
 * Auth Service
 */

import { UserModel, DespachoModel } from '@/database/models';
import { OrganigramaService } from '@/services/OrganigramaService';
import { logger } from '@/logger';
import { getEnvOrFail } from '@/env';
import type { IUser } from '@/types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface LoginResult {
    token: string;
    user: Omit<IUser, 'passwordHash'>;
}

export class AuthService {
    static async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }

    static async comparePassword(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    }

    static generateToken(user: IUser): string {
        const payload = {
            sub: user._id,
            role: user.role,
            desp: user.despachoId ?? null,
        };
        const secret = getEnvOrFail('JWT_SECRET_KEY');
        return jwt.sign(payload, secret, { expiresIn: '7d' });
    }

    static async login(email: string, password: string): Promise<LoginResult> {
        const user = await UserModel.findOne({ email: email.toLowerCase(), active: true });
        if (!user) {
            throw new Error('Credenciales inválidas');
        }
        const ok = await AuthService.comparePassword(password, user.passwordHash);
        if (!ok) throw new Error('Credenciales inválidas');

        const token = AuthService.generateToken(user.toObject());
        const userSafe = user.toObject();
        delete (userSafe as any).passwordHash;
        return { token, user: userSafe };
    }

    /**
     * Register new entity (Despacho) and a user linked to it
     * - If parentId provided, validate and set; otherwise only DIRECCION can be root
     */
    static async registerEntity(params: {
        user: { name: string; email: string; password: string };
        despacho: {
            nombre: string;
            codigo: string;
            tipo: 'DIRECCION' | 'SUBDIRECCIÓN' | 'AREA' | 'DEPARTAMENTO' | 'SECRETARIA';
            descripcion?: string;
            responsable?: string;
            email?: string;
            telefono?: string;
        };
        parentId?: string | null;
    }): Promise<LoginResult> {
        const { user: userData, despacho: dData, parentId } = params;

        const exists = await DespachoModel.findOne({ codigo: dData.codigo.toUpperCase() });
        if (exists) throw new Error('El código de despacho ya existe');

        const passwordHash = await AuthService.hashPassword(userData.password);

        // Create Despacho
        const despacho = await DespachoModel.create({ ...dData, codigo: dData.codigo.toUpperCase() });

        // Set parent (organigrama)
        if (parentId || dData.tipo !== 'DIRECCION') {
            await OrganigramaService.setParent(despacho._id!.toString(), parentId ?? null);
        }

        // Create user linked to despacho (USER by default)
        const user = await UserModel.create({
            name: userData.name,
            email: userData.email.toLowerCase(),
            passwordHash,
            role: 'USER',
            despachoId: despacho._id,
        });

        logger.info({ userId: user._id, despachoId: despacho._id }, 'Entity registered');

        const token = AuthService.generateToken(user.toObject());
        const userSafe = user.toObject();
        delete (userSafe as any).passwordHash;
        return { token, user: userSafe };
    }

    /**
     * Register a USER linked to an existing despacho using its codigo
     */
    static async registerWithCodigo(params: { name: string; email: string; password: string; codigo: string }): Promise<LoginResult> {
        const { name, email, password, codigo } = params;

        const desp = await DespachoModel.findOne({ codigo: codigo.toUpperCase() });
        if (!desp) {
            throw new Error('Código de despacho inválido');
        }

        const existing = await UserModel.findOne({ email: email.toLowerCase() });
        if (existing) {
            throw new Error('El email ya está registrado');
        }

        const passwordHash = await AuthService.hashPassword(password);
        const user = await UserModel.create({
            name,
            email: email.toLowerCase(),
            passwordHash,
            role: 'USER',
            despachoId: desp._id?.toString(),
        });

        const token = AuthService.generateToken(user.toObject());
        const userSafe = user.toObject();
        delete (userSafe as any).passwordHash;
        return { token, user: userSafe };
    }
}


