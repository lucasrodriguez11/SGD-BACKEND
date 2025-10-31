import { NotificationModel } from '@/database/models';
import { eventBus, type NotificationEventPayload } from './EventBus';
import { wsHub } from './WebSocketHub';
import { logger } from '@/logger';

export class NotificationService {
    static async list(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            NotificationModel.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
            NotificationModel.countDocuments({}),
        ]);
        return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
    }

    static async push(evt: NotificationEventPayload) {
        const saved = await NotificationModel.create({
            type: evt.type,
            message: evt.message,
            expedienteId: evt.expedienteId,
            orgTargetId: evt.orgTargetId,
            userTargetId: evt.userTargetId,
            payload: evt.extra,
        });
        logger.info({ id: saved._id, type: saved.type }, 'Notification created');
        eventBus.emit('notification', saved.toJSON());
        wsHub.broadcast('notifications', saved.toJSON());
        return saved;
    }

    static async markRead(id: string) {
        const n = await NotificationModel.findByIdAndUpdate(id, { read: true }, { new: true });
        return n;
    }
}


