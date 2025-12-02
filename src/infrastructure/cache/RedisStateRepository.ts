import { IStateRepository, RoomTimerState } from '@core/application/ports/IStateRepository';
import { getRedisClient } from './redisClient';

export class RedisStateRepository implements IStateRepository {
    async getRoomTimerState(roomId: string): Promise<RoomTimerState | null> {
        const client = await getRedisClient();
        const data = await client.get(`room:timer:${roomId}`);
        return data ? JSON.parse(data) : null;
    }

    async setRoomTimerState(roomId: string, state: RoomTimerState): Promise<void> {
        const client = await getRedisClient();
        await client.set(`room:timer:${roomId}`, JSON.stringify(state), {
            EX: 86400, // 24 hours
        });
    }

    async deleteRoomState(roomId: string): Promise<void> {
        const client = await getRedisClient();
        await client.del(`room:timer:${roomId}`);
    }
}
