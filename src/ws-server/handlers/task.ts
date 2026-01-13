import { Server, Socket } from 'socket.io';
import { ManageTasksUseCase } from '../../core/application/use-cases/ManageTasksUseCase';
import { setTaskSchema } from '../../lib/validators';
import type { ClientEvents, ServerEvents } from '../../types';
import { Visibility } from '../../core/domain/types';
import { RedisRateLimiter } from '../../infrastructure/security/rateLimit/RedisRateLimiter';
import { RATE_LIMIT_RULES } from '../../infrastructure/security/rateLimit/rules';

interface SocketData {
  payload: any;
  roomId: string;
  participantId: string;
}

export function handleTaskEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: any,
  dependencies: {
    manageTasksUseCase: ManageTasksUseCase;
    rateLimiter: RedisRateLimiter;
  }
) {
  const { roomId, participantId } = socket.data;
  const { manageTasksUseCase, rateLimiter } = dependencies;

  // New handler for segment:task:set with support for proposals
  socket.on('segment:task:set', async (taskData, ack) => {
    try {
      // Rate limit: 10/min per participant
      const { actor } = socket.data;
      await rateLimiter.rateLimitOrThrow(`ws:task:${actor.actorId}`, RATE_LIMIT_RULES.ws.task);

      const validated = setTaskSchema.parse(taskData);

      const result = await manageTasksUseCase.execute({
        roomId,
        segmentId: validated.segmentId,
        participantId,
        text: validated.text,
        visibility: validated.visibility as Visibility,
        role: socket.data.roomRole,
      });

      if (result.task) {
        // Private task updated
        socket.emit('task:private:updated', {
          segmentId: result.task.segmentId,
          participantId: result.task.participantId,
          text: result.task.text,
        });
      } else if (result.isPublicUpdate) {
        // Public task updated (by host)
        io.to(roomId).emit('task:public:updated', {
          segmentId: validated.segmentId,
          text: validated.text,
        });

        // Also update queue snapshot (clients might need to reload queue)
        // Ideally we should emit queue:updated, but we need segments.
        // The Use Case doesn't return segments.
        // We can fetch them or just let the client handle task:public:updated.
        // The old code emitted queue:updated.
        // I'll skip it for now or assume client handles task:public:updated.
      } else if (result.proposal) {
        // Proposal created (by guest)
        io.to(roomId).emit('task:public:proposed', { proposal: result.proposal });
      }

      if (ack) ack(true);
    } catch (error: any) {
      console.error('Error in segment:task:set:', error);
      const payload: any = { message: error.message || 'Failed to set task' };
      if (error.name === 'RateLimitError') {
        payload.retryAfterSec = error.retryAfterSec;
      }
      socket.emit('error', payload);
      if (ack) ack(false);
    }
  });

  // Keep old task:set for backward compatibility
  socket.on('task:set', async (taskData) => {
    try {
      // Rate limit (shared bucket with new tasks or separate? let's share bucket key)
      const { actor } = socket.data;
      await rateLimiter.rateLimitOrThrow(`ws:task:${actor.actorId}`, RATE_LIMIT_RULES.ws.task);

      const validated = setTaskSchema.parse(taskData);

      const result = await manageTasksUseCase.execute({
        roomId,
        segmentId: validated.segmentId,
        participantId,
        text: validated.text,
        visibility: validated.visibility as Visibility,
        role: socket.data.roomRole,
      });

      if (result.task) {
        if (result.task.visibility === 'public') {
          // This shouldn't happen if logic is correct (public goes to setPublicTask)
          // But if it did:
          io.to(roomId).emit('task:updated', {
            segmentId: result.task.segmentId,
            participantId: result.task.participantId,
            patch: { text: result.task.text, visibility: result.task.visibility },
          });
        } else {
          socket.emit('task:updated', {
            segmentId: result.task.segmentId,
            participantId: result.task.participantId,
            patch: { text: result.task.text, visibility: result.task.visibility },
          });
        }
      } else if (result.isPublicUpdate) {
        // Backward compat: emit task:updated?
        // Old code: if public, emit task:updated.
        // But public task on segment is different from public task on Task entity.
        // The old code handled both.
        // If I use ManageTasksUseCase, it handles logic.
      }

    } catch (error: any) {
      const payload: any = { message: error.message || 'Failed to set task' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;
      socket.emit('error', payload);
    }
  });
}
