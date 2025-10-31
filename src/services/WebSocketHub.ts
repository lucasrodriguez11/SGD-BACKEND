/* WebSocket Hub for realtime notifications */

import { createLogger } from '@/logger';

type Client = WebSocket & { channel?: string };
const logger = createLogger('WSHub');

class WebSocketHub {
    private channels: Map<string, Set<Client>> = new Map();

    addClient(ws: Client, channel: string) {
        ws.channel = channel;
        if (!this.channels.has(channel)) this.channels.set(channel, new Set());
        this.channels.get(channel)!.add(ws);
        logger.info({ channel, clients: this.channels.get(channel)!.size }, 'WebSocket client connected');
    }

    removeClient(ws: Client) {
        const channel = ws.channel;
        if (!channel) return;
        const set = this.channels.get(channel);
        if (!set) return;
        set.delete(ws);
        if (set.size === 0) this.channels.delete(channel);
        logger.info({ channel, clients: set.size }, 'WebSocket client disconnected');
    }

    broadcast(channel: string, payload: unknown) {
        const set = this.channels.get(channel);
        if (!set) return;
        const data = JSON.stringify(payload);
        for (const client of set) {
            try {
                client.send(data);
            } catch {
                // ignore send errors
            }
        }
        logger.info({ channel, delivered: set.size }, 'WebSocket broadcast');
    }
}

export const wsHub = new WebSocketHub();


