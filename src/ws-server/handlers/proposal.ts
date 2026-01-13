import { Server, Socket } from 'socket.io';
import { SubmitProposalUseCase } from '../../core/application/use-cases/SubmitProposalUseCase';
import { ModerateProposalUseCase } from '../../core/application/use-cases/ModerateProposalUseCase';
import { submitProposalSchema, moderateProposalSchema } from '../../lib/validators';
import type { ClientEvents, ServerEvents } from '../../types';
import { ProposalType, ProposalStatus } from '../../core/domain/types';
import { requireHost } from '../guards';
import { RedisRateLimiter } from '../../infrastructure/security/rateLimit/RedisRateLimiter';
import { RATE_LIMIT_RULES } from '../../infrastructure/security/rateLimit/rules';

export function handleProposalEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: any,
  dependencies: {
    submitProposalUseCase: SubmitProposalUseCase;
    moderateProposalUseCase: ModerateProposalUseCase;
    rateLimiter: RedisRateLimiter;
  }
) {
  const { roomId, participantId } = socket.data;
  const { submitProposalUseCase, moderateProposalUseCase, rateLimiter } = dependencies;

  socket.on('proposal:submit', async (proposalData) => {
    try {
      // Rate limit: 10/min per participant
      const { actor } = socket.data;
      await rateLimiter.rateLimitOrThrow(`ws:proposal:submit:${actor.actorId}`, RATE_LIMIT_RULES.ws.proposal);

      const validated = submitProposalSchema.parse(proposalData);

      const proposal = await submitProposalUseCase.execute({
        roomId,
        participantId,
        type: validated.type as ProposalType,
        payload: validated.payload,
      });

      // Broadcast to all (host will filter)
      io.to(roomId).emit('proposal:updated', proposal);
    } catch (error: any) {
      const payload: any = { message: error.message || 'Failed to submit proposal' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;
      socket.emit('error', payload);
    }
  });

  socket.on('proposal:moderate', async (moderateData, ack) => {
    try {
      requireHost(socket);

      // Rate limit: Host control
      await rateLimiter.rateLimitOrThrow(`ws:proposal:mod:${roomId}`, RATE_LIMIT_RULES.ws.host);

      const validated = moderateProposalSchema.parse(moderateData);

      const proposal = await moderateProposalUseCase.execute({
        id: validated.id,
        roomId,
        role: socket.data.roomRole,
        decision: validated.decision as ProposalStatus,
      });

      // Broadcast updated proposal
      io.to(roomId).emit('proposal:updated', proposal);

      if (ack) ack(true);
    } catch (error: any) {
      const payload: any = { message: error.message || 'Failed to moderate proposal' };
      if (error.name === 'RateLimitError') payload.retryAfterSec = error.retryAfterSec;

      socket.emit('error', payload);
      if (ack) ack(false);
    }
  });
}
