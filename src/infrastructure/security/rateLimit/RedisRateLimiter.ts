import { IRateLimiter } from '../../../core/application/ports/IRateLimiter';
import { getRedisClient } from '../../cache/redisClient';
import { RateLimitError } from './RateLimitError';

export interface RateLimitRule {
    max: number;
    windowSec: number;
}

const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local window = tonumber(ARGV[1])

local count = redis.call("INCR", key)
local ttl = redis.call("TTL", key)

if count == 1 or ttl == -1 then
  redis.call("EXPIRE", key, window)
  ttl = window
end

return {count, ttl}
`;

export class RedisRateLimiter implements IRateLimiter {
    /**
     * Legacy wrapper for boolean check.
     * Wraps rateLimitOrThrow.
     */
    async checkLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): Promise<boolean> {
        try {
            await this.rateLimitOrThrow(identifier, {
                max: maxRequests,
                windowSec: Math.ceil(windowMs / 1000)
            });
            return true;
        } catch (error) {
            if (error instanceof RateLimitError) {
                return false;
            }
            // Log unexpected errors but fail open to avoid blocking valid traffic if Redis fails
            console.error('Error checking rate limit (fail-open):', error);
            return true;
        }
    }

    /**
     * Enforces rate limit and throws RateLimitError if exceeded.
     * Uses Lua script for atomic INCR + EXPIRE.
     */
    async rateLimitOrThrow(identifier: string, rule: RateLimitRule): Promise<void> {
        const client = await getRedisClient();
        const key = `rl:${identifier}`;

        // returns [count, ttl]
        const result = await client.eval(
            RATE_LIMIT_SCRIPT,
            {
                keys: [key],
                arguments: [String(rule.windowSec)]
            }
        ) as [number, number];

        const [count, ttl] = result;

        if (count > rule.max) {
            const retryAfter = (ttl && ttl > 0) ? ttl : rule.windowSec;
            console.warn(`[RateLimit] Hit: ${identifier} (count=${count}, max=${rule.max})`);
            throw new RateLimitError('Too Many Requests', retryAfter);
        }
    }
}
