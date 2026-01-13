import { Server, Socket } from 'socket.io';
import { UpdateRoomPrefsUseCase } from '../../core/application/use-cases/UpdateRoomPrefsUseCase';
import type { ClientEvents, ServerEvents } from '../../types';
import { Theme } from '../../core/domain/types';
import { requireHost } from '../guards';
import { RedisRateLimiter } from '../../infrastructure/security/rateLimit/RedisRateLimiter';
import { RATE_LIMIT_RULES } from '../../infrastructure/security/rateLimit/rules';

export function handleRoomEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: any, // Using any for now to avoid circular dependency or just use the fields
  dependencies: {
    updateRoomPrefsUseCase: UpdateRoomPrefsUseCase;
    rateLimiter: RedisRateLimiter;
  }
) {
  const { roomId } = socket.data;
  const { updateRoomPrefsUseCase, rateLimiter } = dependencies;

  socket.on('prefs:update', async (updateData) => {
    try {
      requireHost(socket);

      // Rate limit: 20/min per room for host controls
      await rateLimiter.rateLimitOrThrow(`ws:room:update:${roomId}`, RATE_LIMIT_RULES.ws.host);

      if (updateData.theme) {
        await updateRoomPrefsUseCase.execute({
          roomId,
          theme: updateData.theme as Theme,
          role: socket.data.roomRole,
        });
      }
    } catch (error: any) {
      const payload: any = { message: error.message || 'Failed to update preferences' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;
      socket.emit('error', payload);
    }
  });
}















