import { UserModel, DespachoModel } from '@/database/models';
import { logger } from '@/logger';
import type { IUser, UserRole } from '@/types';
import bcrypt from 'bcryptjs';

export class UserService {
    static async create(params: {
        name: string;
        email: string;
        password: string;
        despachoId?: string;
        role?: UserRole;
    }): Promise<IUser> {
        const { name, email, password, despachoId, role = 'USER' } = params;

        const exists = await UserModel.findOne({ email: email.toLowerCase() });
        if (exists) throw new Error('El email ya está registrado');

        if (despachoId) {
            const dep = await DespachoModel.findById(despachoId);
            if (!dep) throw new Error('Despacho no existe');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await UserModel.create({
            name,
            email: email.toLowerCase(),
            passwordHash,
            role,
            despachoId,
            active: true,
        });

        logger.info({ id: user._id, email: user.email, role, despachoId }, 'User created');
        return user;
    }

    static async seedSuperAdmin(email: string, password: string, name = 'Super Admin'): Promise<void> {
        const existing = await UserModel.findOne({ email: email.toLowerCase() });
        if (existing) return;
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await UserModel.create({ name, email: email.toLowerCase(), passwordHash, role: 'ADMIN', active: true });
        logger.info({ email }, 'Super admin seeded');
    }
}


