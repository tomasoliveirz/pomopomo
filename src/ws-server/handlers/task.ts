import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { setTaskSchema } from '../../lib/validators';
import type { ClientEvents, ServerEvents } from '../../types';

interface SocketData {
  payload: any;
  roomId: string;
  participantId: string;
}

export function handleTaskEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: SocketData
) {
  const { roomId, participantId, payload } = data;

  // New handler for segment:task:set with support for proposals
  socket.on('segment:task:set', async (taskData, ack) => {
    try {
      const validated = setTaskSchema.parse(taskData);
      
      // Verify segment belongs to room
      const segment = await prisma.segment.findFirst({
        where: { id: validated.segmentId, roomId },
      });

      if (!segment) {
        socket.emit('error', { message: 'Segment not found' });
        if (ack) ack(false);
        return;
      }

      // Handle based on visibility
      if (validated.visibility === 'private') {
        // Always allow private tasks
        const task = await prisma.task.upsert({
          where: {
            segmentId_participantId: {
              segmentId: validated.segmentId,
              participantId,
            },
          },
          update: {
            text: validated.text,
            visibility: 'private',
            updatedAt: new Date(),
          },
          create: {
            roomId,
            segmentId: validated.segmentId,
            participantId,
            text: validated.text,
            visibility: 'private',
          },
        });

        // Only send to the participant who created it
        socket.emit('task:private:updated', {
          segmentId: task.segmentId,
          participantId: task.participantId,
          text: task.text,
        });

        if (ack) ack(true);
      } else if (validated.visibility === 'public') {
        // Check if user is host
        if (payload.role === 'host') {
          // Host can directly set public task
          await prisma.segment.update({
            where: { id: validated.segmentId },
            data: { publicTask: validated.text },
          });

          // Broadcast to everyone
          io.to(roomId).emit('task:public:updated', {
            segmentId: validated.segmentId,
            text: validated.text,
          });

          // Also update queue snapshot
          const segments = await prisma.segment.findMany({
            where: { roomId },
            orderBy: { order: 'asc' },
          });
          
          io.to(roomId).emit('queue:updated', { segments: segments as any });

          if (ack) ack(true);
        } else {
          // Guest creates a proposal
          const proposal = await prisma.proposal.create({
            data: {
              roomId,
              type: 'public_task',
              payload: {
                segmentId: validated.segmentId,
                text: validated.text,
              },
              createdBy: participantId,
              status: 'pending',
            },
          });

          // Broadcast proposal to host
          io.to(roomId).emit('task:public:proposed', { proposal: proposal as any });

          if (ack) ack(true);
        }
      }
    } catch (error: any) {
      console.error('Error in segment:task:set:', error);
      socket.emit('error', { message: error.message || 'Failed to set task' });
      if (ack) ack(false);
    }
  });

  // Keep old task:set for backward compatibility
  socket.on('task:set', async (taskData) => {
    try {
      const validated = setTaskSchema.parse(taskData);
      
      // Verify segment belongs to room
      const segment = await prisma.segment.findFirst({
        where: { id: validated.segmentId, roomId },
      });

      if (!segment) {
        socket.emit('error', { message: 'Segment not found' });
        return;
      }

      // Upsert task
      const task = await prisma.task.upsert({
        where: {
          segmentId_participantId: {
            segmentId: validated.segmentId,
            participantId,
          },
        },
        update: {
          text: validated.text,
          visibility: validated.visibility,
          updatedAt: new Date(),
        },
        create: {
          roomId,
          segmentId: validated.segmentId,
          participantId,
          text: validated.text,
          visibility: validated.visibility,
        },
      });

      // Broadcast task update
      if (task.visibility === 'public') {
        io.to(roomId).emit('task:updated', {
          segmentId: task.segmentId,
          participantId: task.participantId,
          patch: { text: task.text, visibility: task.visibility },
        });
      } else {
        // Only send to the participant
        socket.emit('task:updated', {
          segmentId: task.segmentId,
          participantId: task.participantId,
          patch: { text: task.text, visibility: task.visibility },
        });
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to set task' });
    }
  });
}
