import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { generateRoomCode, createWsToken } from '../../lib/auth';
import { createRoomSchema } from '../../lib/validators';
import { config } from '../../lib/config';
import type { ClientEvents, ServerEvents } from '../../types';

interface SocketData {
  payload: any;
  roomId: string;
  participantId: string;
}

export function handleRoomEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: SocketData
) {
  // Note: room:create and room:join are handled via HTTP API
  // This handler can be used for room-specific events like updating theme
  
  socket.on('prefs:update', async (updateData) => {
    const { participantId, roomId } = data;
    
    // Update room theme if user is host and theme is provided
    if (updateData.theme && data.payload.role === 'host') {
      try {
        const room = await prisma.room.update({
          where: { id: roomId },
          data: { theme: updateData.theme },
        });
        
        // Broadcast theme change to all participants
        io.to(roomId).emit('room:state', {
          status: room.status,
          currentIndex: room.currentSegmentIndex,
          serverNow: Date.now(),
          segmentEndsAt: null,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to update theme' });
      }
    }
  });
}






