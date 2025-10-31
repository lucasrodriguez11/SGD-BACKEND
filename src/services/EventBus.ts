import { EventEmitter } from 'events';

type NotificationType =
    | 'NUEVO_MOVIMIENTO'
    | 'EXPEDIENTE_CREADO'
    | 'EXPEDIENTE_RECIBIDO'
    | 'EXPEDIENTE_CONFIRMADO'
    | 'EXPEDIENTE_ARCHIVADO';

export interface NotificationEventPayload {
    type: NotificationType;
    message: string;
    expedienteId?: string;
    orgTargetId?: string;
    userTargetId?: string;
    extra?: Record<string, unknown>;
}

class EventBus extends EventEmitter { }

export const eventBus = new EventBus();


