import { Server, Socket } from 'socket.io';
import { SubmitProposalUseCase } from '../../core/application/use-cases/SubmitProposalUseCase';
import { ModerateProposalUseCase } from '../../core/application/use-cases/ModerateProposalUseCase';
import { submitProposalSchema, moderateProposalSchema } from '../../lib/validators';
import type { ClientEvents, ServerEvents } from '../../types';
import { ProposalType, ProposalStatus } from '../../core/domain/types';
import { requireHost } from '../guards';

export function handleProposalEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: any,
  dependencies: {
    submitProposalUseCase: SubmitProposalUseCase;
    moderateProposalUseCase: ModerateProposalUseCase;
  }
) {
  const { roomId, participantId } = socket.data;
  const { submitProposalUseCase, moderateProposalUseCase } = dependencies;

  socket.on('proposal:submit', async (proposalData) => {
    try {
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
      socket.emit('error', { message: error.message || 'Failed to submit proposal' });
    }
  });

  socket.on('proposal:moderate', async (moderateData, ack) => {
    try {
      requireHost(socket);
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
      socket.emit('error', { message: error.message || 'Failed to moderate proposal' });
      if (ack) ack(false);
    }
  });
}
