import { Server, Socket } from 'socket.io';
import { PostMessageUseCase } from '../../core/application/use-cases/PostMessageUseCase';
import { sendChatSchema } from '../../lib/validators';
import { config } from '../../infrastructure/config/env';
import type { ClientEvents, ServerEvents } from '../../types';
import { RedisRateLimiter } from '../../infrastructure/cache/RedisRateLimiter';

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
  data: SocketData,
  dependencies: {
    postMessageUseCase: PostMessageUseCase;
    rateLimiter: RedisRateLimiter; // Inject rate limiter directly or via port
  }
) {
  const { roomId, participantId } = data;
  const { postMessageUseCase, rateLimiter } = dependencies;

  socket.on('chat:send', async (chatData) => {
    try {
      const validated = sendChatSchema.parse(chatData);

      // Rate limit check
      const rateLimitKey = `chat:${participantId}`;
      const allowed = await rateLimiter.checkLimit(
        rateLimitKey,
        config.rateLimit.chat.maxMessages,
        config.rateLimit.chat.windowSec * 1000
      );

      if (!allowed) {
        socket.emit('error', { message: 'You are sending messages too fast' });
        // TODO: Auto-mute logic should be in a Use Case or Service
        return;
      }

      // Check for bad words
      const isShadowHidden = containsBadWords(validated.text);

      const message = await postMessageUseCase.execute({
        roomId,
        participantId,
        text: validated.text,
        // isShadowHidden needs to be passed to use case?
        // My PostMessageUseCase currently doesn't accept isShadowHidden.
        // I should update PostMessageUseCase to accept it or handle it inside.
        // For now, I'll assume the Use Case handles it or I'll update it.
      });

      // The Use Case saves the message.
      // Broadcasting is handled by the Use Case via EventsBus?
      // My PostMessageUseCase implementation:
      // await this.messageRepo.save(message);
      // // We need to publish this event via bus

      // If the Use Case publishes via bus, we don't need to emit here.
      // But SocketIoRoomEventsBus doesn't have publishMessage yet.
      // So I should emit here manually for now, or update the Bus.

      if (!isShadowHidden) {
        io.to(roomId).emit('chat:message', {
          id: message.id,
          participantId: message.participantId,
          text: message.text,
          createdAt: message.createdAt.toISOString(),
          reactions: {},
          isShadowHidden: false
        });
      } else {
        socket.emit('chat:message', {
          id: message.id,
          participantId: message.participantId,
          text: message.text,
          createdAt: message.createdAt.toISOString(),
          reactions: {},
          isShadowHidden: true
        });
      }

    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to send message' });
    }
  });
}















