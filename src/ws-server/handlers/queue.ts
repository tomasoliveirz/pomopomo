import { Server, Socket } from 'socket.io';
import { TimerService } from '../../core/application/use-cases/TimerService';
import { UpdateQueueUseCase } from '../../core/application/use-cases/UpdateQueueUseCase';
import type { ClientEvents, ServerEvents } from '../../types';
import { requireHost } from '../guards';

export function handleQueueEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents>,
  data: any,
  dependencies: {
    timerService: TimerService;
    updateQueueUseCase: UpdateQueueUseCase;
  }
) {
  const { roomId } = socket.data;
  const { timerService, updateQueueUseCase } = dependencies;

  socket.on('queue:play', async (playData) => {
    try {
      requireHost(socket);
      await timerService.start(roomId);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to play queue' });
    }
  });

  socket.on('queue:pause', async () => {
    try {
      requireHost(socket);
      await timerService.pause(roomId);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to pause queue' });
    }
  });

  socket.on('queue:skip', async () => {
    try {
      requireHost(socket);
      await timerService.skip(roomId);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to skip segment' });
    }
  });

  socket.on('queue:replace', async (data, callback) => {
    try {
      requireHost(socket);
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
      socket.emit('error', { message: error.message || 'Failed to replace queue' });
    }
  });

  socket.on('queue:reorder', async (data, callback) => {
    try {
      requireHost(socket);
      await updateQueueUseCase.reorderQueue({
        roomId,
        fromIndex: data.from,
        toIndex: data.to
      });
      if (callback) callback(true);
    } catch (error: any) {
      console.error('queue:reorder error', error);
      if (callback) callback(false);
      socket.emit('error', { message: error.message || 'Failed to reorder queue' });
    }
  });

  socket.on('queue:add', async (data, callback) => {
    try {
      requireHost(socket);
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
      socket.emit('error', { message: error.message || 'Failed to add segment' });
    }
  });
}

