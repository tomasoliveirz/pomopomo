import { Server, Socket } from 'socket.io';
import { TimerService } from '../../core/application/use-cases/TimerService';
import { UpdateQueueUseCase } from '../../core/application/use-cases/UpdateQueueUseCase';
import type { ClientEvents, ServerEvents } from '../../types';
import { requireHost } from '../guards';
import { RedisRateLimiter } from '../../infrastructure/security/rateLimit/RedisRateLimiter';
import { RATE_LIMIT_RULES } from '../../infrastructure/security/rateLimit/rules';

export function handleQueueEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents>,
  data: any,
  dependencies: {
    timerService: TimerService;
    updateQueueUseCase: UpdateQueueUseCase;
    rateLimiter: RedisRateLimiter;
  }
) {
  const { roomId } = socket.data;
  const { timerService, updateQueueUseCase, rateLimiter } = dependencies;

  socket.on('queue:play', async (playData) => {
    try {
      requireHost(socket);
      // Rate limit: 20 per min per room for timer controls
      await rateLimiter.rateLimitOrThrow(`ws:timer:${roomId}`, RATE_LIMIT_RULES.ws.host);

      await timerService.start(roomId);
    } catch (error: any) {
      const payload: any = { message: error.message || 'Failed to play queue' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;
      socket.emit('error', payload);
    }
  });

  socket.on('queue:pause', async () => {
    try {
      requireHost(socket);
      await rateLimiter.rateLimitOrThrow(`ws:timer:${roomId}`, RATE_LIMIT_RULES.ws.host);
      await timerService.pause(roomId);
    } catch (error: any) {
      const payload: any = { message: error.message || 'Failed to pause queue' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;
      socket.emit('error', payload);
    }
  });

  socket.on('queue:skip', async () => {
    try {
      requireHost(socket);
      await rateLimiter.rateLimitOrThrow(`ws:timer:${roomId}`, RATE_LIMIT_RULES.ws.host);
      await timerService.skip(roomId);
    } catch (error: any) {
      const payload: any = { message: error.message || 'Failed to skip segment' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;
      socket.emit('error', payload);
    }
  });

  socket.on('queue:replace', async (data, callback) => {
    try {
      requireHost(socket);
      // Host limit
      await rateLimiter.rateLimitOrThrow(`ws:queue:mod:${roomId}`, RATE_LIMIT_RULES.ws.host);

      await updateQueueUseCase.replaceQueue({
        roomId,
        segments: data.segments.map(s => ({
          kind: s.kind,
          durationSec: s.durationSec,
          label: s.label,
          publicTask: s.publicTask || undefined
        }))
      });
      if (callback) callback(true);
    } catch (error: any) {
      console.error('queue:replace error', error);
      if (callback) callback(false);
      const payload: any = { message: error.message || 'Failed to replace queue' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;
      socket.emit('error', payload);
    }
  });

  socket.on('queue:reorder', async (data, callback) => {
    try {
      requireHost(socket);
      // Host limit
      await rateLimiter.rateLimitOrThrow(`ws:queue:mod:${roomId}`, RATE_LIMIT_RULES.ws.host);

      await updateQueueUseCase.reorderQueue({
        roomId,
        fromIndex: data.from,
        toIndex: data.to
      });
      if (callback) callback(true);
    } catch (error: any) {
      console.error('queue:reorder error', error);
      if (callback) callback(false);
      const payload: any = { message: error.message || 'Failed to reorder queue' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;
      socket.emit('error', payload);
    }
  });

  socket.on('queue:add', async (data, callback) => {
    try {
      requireHost(socket);
      // Host limit
      await rateLimiter.rateLimitOrThrow(`ws:queue:mod:${roomId}`, RATE_LIMIT_RULES.ws.host);

      await updateQueueUseCase.addSegment({
        roomId,
        kind: data.segment.kind,
        durationSec: data.segment.durationSec,
        label: data.segment.label
      });
      if (callback) callback(true);
    } catch (error: any) {
      console.error('queue:add error', error);
      if (callback) callback(false);
      const payload: any = { message: error.message || 'Failed to add segment' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;
      socket.emit('error', payload);
    }
  });
}

