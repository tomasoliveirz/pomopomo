import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { submitProposalSchema, moderateProposalSchema } from '../../lib/validators';
import type { ClientEvents, ServerEvents } from '../../types';

interface SocketData {
  payload: any;
  roomId: string;
  participantId: string;
}

export function handleProposalEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: SocketData
) {
  const { roomId, participantId, payload } = data;

  socket.on('proposal:submit', async (proposalData) => {
    try {
      const validated = submitProposalSchema.parse(proposalData);
      
      const proposal = await prisma.proposal.create({
        data: {
          roomId,
          type: validated.type,
          payload: validated.payload,
          createdBy: participantId,
          status: 'pending',
        },
      });

      // Broadcast to all (host will filter)
      io.to(roomId).emit('proposal:updated', proposal as any);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to submit proposal' });
    }
  });

  socket.on('proposal:moderate', async (moderateData, ack) => {
    if (payload.role !== 'host') {
      socket.emit('error', { message: 'Only host can moderate proposals' });
      if (ack) ack(false);
      return;
    }

    try {
      const validated = moderateProposalSchema.parse(moderateData);
      
      const proposal = await prisma.proposal.update({
        where: { id: validated.id },
        data: {
          status: validated.decision,
          moderatedAt: new Date(),
        },
      });

      // Broadcast updated proposal
      io.to(roomId).emit('proposal:updated', proposal as any);

      // If accepted, apply the change
      if (validated.decision === 'accepted') {
        if (proposal.type === 'add_segment') {
          const segmentData = proposal.payload as any;
          const existingSegments = await prisma.segment.findMany({
            where: { roomId },
            orderBy: { order: 'asc' },
          });

          await prisma.segment.create({
            data: {
              roomId,
              kind: segmentData.kind,
              label: segmentData.label,
              durationSec: segmentData.durationSec,
              order: existingSegments.length,
            },
          });

          const updatedSegments = await prisma.segment.findMany({
            where: { roomId },
            orderBy: { order: 'asc' },
          });

          io.to(roomId).emit('queue:updated', { segments: updatedSegments as any });
        } else if (proposal.type === 'public_task') {
          // Handle public task proposal acceptance
          const taskPayload = proposal.payload as any;
          
          if (taskPayload.segmentId && taskPayload.text) {
            await prisma.segment.update({
              where: { id: taskPayload.segmentId },
              data: { publicTask: taskPayload.text },
            });

            // Broadcast the accepted public task
            io.to(roomId).emit('task:public:updated', {
              segmentId: taskPayload.segmentId,
              text: taskPayload.text,
            });

            // Also update queue snapshot to reflect the change
            const updatedSegments = await prisma.segment.findMany({
              where: { roomId },
              orderBy: { order: 'asc' },
            });

            io.to(roomId).emit('queue:updated', { segments: updatedSegments as any });
          }
        } else if (proposal.type === 'edit_segment') {
          // Handle edit segment proposal acceptance
          const editPayload = proposal.payload as any;
          
          if (editPayload.segmentId) {
            await prisma.segment.update({
              where: { id: editPayload.segmentId },
              data: {
                label: editPayload.label,
                durationSec: editPayload.durationSec,
                kind: editPayload.kind,
              },
            });

            const updatedSegments = await prisma.segment.findMany({
              where: { roomId },
              orderBy: { order: 'asc' },
            });

            io.to(roomId).emit('queue:updated', { segments: updatedSegments as any });
          }
        }
      }

      if (ack) ack(true);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to moderate proposal' });
      if (ack) ack(false);
    }
  });
}
