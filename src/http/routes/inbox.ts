import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ApiResponse } from '@/types';
import { requireAuth } from '@/http/middleware/auth';
import { InboxService } from '@/services/InboxService';

const inboxRoutes = new Hono();

inboxRoutes.get('/messages', requireAuth, async (c) => {
    const toDespachoId = c.req.query('toDespachoId') || undefined;
    const fromDespachoId = c.req.query('fromDespachoId') || undefined;
    const limit = Number(c.req.query('limit') ?? '50');
    const messages = await InboxService.list(toDespachoId, fromDespachoId, limit);
    const response: ApiResponse = { success: true, data: { messages } };
    return c.json(response, 200 as any);
});

inboxRoutes.post('/messages', requireAuth, zValidator('json', z.object({ toDespachoId: z.string(), text: z.string().min(1), fromDespachoId: z.string().optional() })), async (c) => {
    const auth = c.get('auth') as any;
    const { toDespachoId, text, fromDespachoId } = c.req.valid('json');
    const from = fromDespachoId ?? (auth?.desp as string | undefined);
    if (!from || from === 'null') {
        return c.json({ success: false, error: { message: 'No tenés un despacho asignado. Contactá a un administrador.' } } as ApiResponse, 400 as any);
    }
    const msg = await InboxService.send(from, toDespachoId, text);
    const response: ApiResponse = { success: true, data: { message: msg } };
    return c.json(response, 201 as any);
});

 // Threads summary for my despacho
 inboxRoutes.get('/threads', requireAuth, async (c) => {
     const auth = c.get('auth') as any;
     const myDesp = auth?.desp as string | null | undefined;
     if (!myDesp || myDesp === 'null') {
         return c.json({ success: false, error: { message: 'No tenés un despacho asignado' } } as ApiResponse, 400 as any);
     }
     const threads = await InboxService.listThreads(myDesp);
     return c.json({ success: true, data: { threads } } as ApiResponse, 200 as any);
 });

 // Conversation messages between my despacho and a peer
 inboxRoutes.get('/messages/conversation/:peerId', requireAuth, async (c) => {
     const auth = c.get('auth') as any;
     const myDesp = auth?.desp as string | null | undefined;
     if (!myDesp || myDesp === 'null') {
         return c.json({ success: false, error: { message: 'No tenés un despacho asignado' } } as ApiResponse, 400 as any);
     }
     const peerId = c.req.param('peerId');
     const limit = Number(c.req.query('limit') ?? '100');
     const messages = await InboxService.listConversation(myDesp, peerId, limit);
     return c.json({ success: true, data: { messages } } as ApiResponse, 200 as any);
 });

 // Mark thread as read
 inboxRoutes.post('/threads/:peerId/read', requireAuth, async (c) => {
     const auth = c.get('auth') as any;
     const myDesp = auth?.desp as string | null | undefined;
     if (!myDesp || myDesp === 'null') {
         return c.json({ success: false, error: { message: 'No tenés un despacho asignado' } } as ApiResponse, 400 as any);
     }
     const peerId = c.req.param('peerId');
     await InboxService.markRead(myDesp, peerId);
     return c.json({ success: true, data: { ok: true } } as ApiResponse, 200 as any);
 });

export default inboxRoutes;


