import { InboxMessageModel, type IInboxMessage } from '@/database/models/InboxMessage';
import { wsHub } from './WebSocketHub';

export class InboxService {
    static async send(fromDespachoId: string, toDespachoId: string, text: string): Promise<IInboxMessage> {
        const msg = await InboxMessageModel.create({ fromDespachoId, toDespachoId, text, read: false });
        wsHub.broadcast('inbox', msg.toJSON());
        return msg.toObject();
    }

    static async list(toDespachoId?: string, fromDespachoId?: string, limit = 50): Promise<IInboxMessage[]> {
        const query: any = {};
        if (toDespachoId) query.toDespachoId = toDespachoId;
        if (fromDespachoId) query.fromDespachoId = fromDespachoId;
        const items = await InboxMessageModel.find(query).sort({ createdAt: -1 }).limit(limit).lean().exec();
        return items as IInboxMessage[];
    }

    static async listConversation(myDespachoId: string, peerDespachoId: string, limit = 100): Promise<IInboxMessage[]> {
        const items = await InboxMessageModel
            .find({ $or: [
                { fromDespachoId: myDespachoId, toDespachoId: peerDespachoId },
                { fromDespachoId: peerDespachoId, toDespachoId: myDespachoId },
            ] })
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean()
            .exec();
        return items as IInboxMessage[];
    }

    static async listThreads(myDespachoId: string): Promise<Array<{ peerId: string; lastMessage: IInboxMessage | null; unread: number }>> {
        const pipeline = [
            { $match: { $or: [ { toDespachoId: myDespachoId }, { fromDespachoId: myDespachoId } ] } },
            { $addFields: {
                peerId: { $cond: [ { $eq: [ '$fromDespachoId', myDespachoId ] }, '$toDespachoId', '$fromDespachoId' ] }
            } },
            { $sort: { createdAt: -1 } },
            { $group: {
                _id: '$peerId',
                lastMessage: { $first: '$$ROOT' },
                unread: { $sum: { $cond: [ { $and: [ { $eq: [ '$toDespachoId', myDespachoId ] }, { $eq: [ '$read', false ] } ] }, 1, 0 ] } }
            } },
            { $project: { _id: 0, peerId: '$_id', lastMessage: 1, unread: 1 } }
        ] as any[];
        const res = await (InboxMessageModel as any).aggregate(pipeline).exec();
        return res as Array<{ peerId: string; lastMessage: IInboxMessage | null; unread: number }>;
    }

    static async markRead(myDespachoId: string, peerDespachoId: string): Promise<number> {
        const res = await InboxMessageModel.updateMany({ fromDespachoId: peerDespachoId, toDespachoId: myDespachoId, read: false }, { $set: { read: true } }).exec();
        return res.modifiedCount ?? 0;
    }
}




