import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { checkRateLimit } from '../../lib/redis';
import { sendChatSchema } from '../../lib/validators';
import { config } from '../../lib/config';
import type { ClientEvents, ServerEvents } from '../../types';

interface SocketData {
  payload: any;
  roomId: string;
  participantId: string;
}

// Simple bad word filter
const BAD_WORDS = ['spam', 'offensive']; // Expand this list
function containsBadWords(text: string): boolean {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(word => lower.includes(word));
}

export function handleChatEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: SocketData
) {
  const { roomId, participantId } = data;

  socket.on('chat:send', async (chatData) => {
    try {
      const validated = sendChatSchema.parse(chatData);
      
      // Check if participant is muted
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
      });

      if (participant?.isMuted) {
        socket.emit('error', { message: 'You are muted' });
        return;
      }

      // Rate limit check
      const rateLimitKey = `chat:${participantId}`;
      const allowed = await checkRateLimit(
        rateLimitKey,
        config.rateLimit.chat.maxMessages,
        config.rateLimit.chat.windowSec
      );

      if (!allowed) {
        socket.emit('error', { message: 'You are sending messages too fast' });
        
        // Auto-mute if spam detected
        await prisma.participant.update({
          where: { id: participantId },
          data: { isMuted: true },
        });
        return;
      }

      // Check for bad words
      const isShadowHidden = containsBadWords(validated.text);

      // Create message
      const message = await prisma.message.create({
        data: {
          roomId,
          participantId,
          text: validated.text,
          reactions: {},
          isShadowHidden,
        },
      });

      // Broadcast message
      if (!isShadowHidden) {
        io.to(roomId).emit('chat:message', message as any);
      } else {
        // Only send to sender (shadow hide)
        socket.emit('chat:message', message as any);
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to send message' });
    }
  });
}















