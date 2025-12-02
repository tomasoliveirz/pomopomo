import { Server, Socket } from 'socket.io';
import { TimerService } from '../../core/application/use-cases/TimerService';
import { UpdateQueueUseCase } from '../../core/application/use-cases/UpdateQueueUseCase';
import type { ClientEvents, ServerEvents } from '../../types';

interface SocketData {
  payload: any;
  roomId: string;
  participantId: string;
}

export function handleQueueEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket<ClientEvents, ServerEvents>,
  data: SocketData,
  dependencies: {
    timerService: TimerService;
    updateQueueUseCase: UpdateQueueUseCase;
  }
) {
  const { roomId, payload } = data;
  const { timerService, updateQueueUseCase } = dependencies;

  // Only host can modify queue
  const requireHost = (callback: Function) => {
    if (payload.role !== 'host') {
      socket.emit('error', { message: 'Only host can perform this action', code: 'FORBIDDEN' });
      return false;
    }
    return true;
  };

  socket.on('queue:play', async (playData) => {
    if (!requireHost(() => { })) return;
    try {
      // TODO: Handle play specific index if needed by TimerService
      // Currently TimerService.start() resumes or starts current.
      // If playData.index is provided, we might need to skip to that index first.
      // But TimerService doesn't support "jump to index" yet.
      // For now, let's just call start().
      await timerService.start(roomId);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to play queue' });
    }
  });

  socket.on('queue:pause', async () => {
    if (!requireHost(() => { })) return;
    try {
      await timerService.pause(roomId);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to pause queue' });
    }
  });

  socket.on('queue:skip', async () => {
    if (!requireHost(() => { })) return;
    try {
      await timerService.skip(roomId);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to skip segment' });
    }
  });

  socket.on('queue:replace', async (data, callback) => {
    if (!requireHost(callback || (() => { }))) return;
    try {
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
    if (!requireHost(callback || (() => { }))) return;
    try {
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
    if (!requireHost(callback || (() => { }))) return;
    try {
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

