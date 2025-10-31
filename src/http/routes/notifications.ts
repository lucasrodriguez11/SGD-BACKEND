import { Hono } from 'hono';
import type { ApiResponse } from '@/types';
import { NotificationService } from '@/services/NotificationService';
import { eventBus } from '@/services/EventBus';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const notificationsRoutes = new Hono();

// List notifications (simple pagination)
notificationsRoutes.get('/', async (c) => {
    const page = Number(c.req.query('page') ?? '1');
    const limit = Number(c.req.query('limit') ?? '20');
    const { items, total, totalPages } = await NotificationService.list(page, limit);
    const response: ApiResponse = {
        success: true,
        data: { notifications: items },
        meta: { page, limit, total, totalPages },
    };
    return c.json(response, 200 as any);
});

// SSE stream
notificationsRoutes.get('/stream', async (c) => {
    const stream = new ReadableStream({
        start(controller) {
            const send = (data: unknown) => {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
            };
            const onEvt = (payload: unknown) => send(payload);
            eventBus.on('notification', onEvt);
            // heartbeat
            const hb = setInterval(() => send({ type: 'heartbeat', t: Date.now() }), 30000);
            // initial hello
            send({ type: 'hello' });
            c.req.raw.signal.addEventListener('abort', () => {
                clearInterval(hb);
                eventBus.off('notification', onEvt);
            });
        },
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
});

export default notificationsRoutes;
// mark as read
notificationsRoutes.put('/:id/read', zValidator('param', z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid('param');
    const n = await NotificationService.markRead(id);
    const response: ApiResponse = { success: true, data: { notification: n } };
    return c.json(response, 200 as any);
});


