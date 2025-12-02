import { createClient } from 'redis';
import { config } from '../config/env';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
    if (!redisClient) {
        redisClient = createClient({ url: config.REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis Client Error', err));
        await redisClient.connect();
    }
    return redisClient;
}

export async function closeRedisConnection() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
