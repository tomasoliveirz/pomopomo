import { IPresenceRepository } from '@core/application/ports/IPresenceRepository';
import { getRedisClient } from './redisClient';

export class RedisPresenceRepository implements IPresenceRepository {
    async addPresence(roomId: string, participantId: string): Promise<void> {
        const client = await getRedisClient();
        await client.sAdd(`room:presence:${roomId}`, participantId);
    }

    async removePresence(roomId: string, participantId: string): Promise<void> {
        const client = await getRedisClient();
        await client.sRem(`room:presence:${roomId}`, participantId);
    }

    async getPresence(roomId: string): Promise<string[]> {
        const client = await getRedisClient();
        return await client.sMembers(`room:presence:${roomId}`);
    }

    async deleteRoomPresence(roomId: string): Promise<void> {
        const client = await getRedisClient();
        await client.del(`room:presence:${roomId}`);
    }
}
