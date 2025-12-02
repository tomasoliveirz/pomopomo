import { IRateLimiter } from '@core/application/ports/IRateLimiter';
import { getRedisClient } from './redisClient';

export class RedisRateLimiter implements IRateLimiter {
    async checkLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): Promise<boolean> {
        try {
            const client = await getRedisClient();
            const key = `rate:${identifier}`;
            const current = await client.incr(key);

            if (current === 1) {
                await client.pExpire(key, windowMs);
            }

            return current <= maxRequests;
        } catch (error) {
            console.error('Error checking rate limit:', error);
            return true; // Fail open
        }
    }
}
