import { createClient } from 'redis';
import type { RoomTimerState } from '@/types';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

// Export the redis client for external use
export { redisClient as redis };

/**
 * Set room timer state in Redis
 */
export async function setRoomTimerState(roomId: string, state: RoomTimerState): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set(`room:timer:${roomId}`, JSON.stringify(state), {
      EX: 86400, // 24 hours expiry
    });
  } catch (error) {
    console.error('Error setting room timer state:', error);
  }
}

/**
 * Get room timer state from Redis
 */
export async function getRoomTimerState(roomId: string): Promise<RoomTimerState | null> {
  try {
    const client = await getRedisClient();
    const data = await client.get(`room:timer:${roomId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting room timer state:', error);
    return null;
  }
}



/**
 * Rate limiting check using Redis
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = `rate:${identifier}`;
    const current = await client.incr(key);

    if (current === 1) {
      // First request in window, set expiry
      await client.pExpire(key, windowMs);
    }

    return current <= maxRequests;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Allow request on error
    return true;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Add participant presence to room
 */
export async function addRoomPresence(roomId: string, participantId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.sAdd(`room:presence:${roomId}`, participantId);
  } catch (error) {
    console.error('Error adding room presence:', error);
  }
}

/**
 * Remove participant presence from room
 */
export async function removeRoomPresence(roomId: string, participantId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.sRem(`room:presence:${roomId}`, participantId);
  } catch (error) {
    console.error('Error removing room presence:', error);
  }
}

/**
 * Get all participants present in room
 */
export async function getRoomPresence(roomId: string): Promise<string[]> {
  try {
    const client = await getRedisClient();
    return await client.sMembers(`room:presence:${roomId}`);
  } catch (error) {
    console.error('Error getting room presence:', error);
    return [];
  }
}

/**
 * Delete all Redis data for a room
 */
export async function deleteRoomData(roomId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await Promise.all([
      client.del(`room:timer:${roomId}`),
      client.del(`room:presence:${roomId}`),
    ]);
  } catch (error) {
    console.error('Error deleting room data from Redis:', error);
  }
}

