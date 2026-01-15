
import { Server, Socket } from 'socket.io';
import { PostMessageUseCase } from '../../core/application/use-cases/PostMessageUseCase';
import { ToggleReactionUseCase } from '../../core/application/use-cases/ToggleReactionUseCase';
import { sendChatSchema, reactMessageSchema } from '../../lib/validators';
import type { ClientEvents, ServerEvents } from '../../types';
import { RedisRateLimiter } from '../../infrastructure/security/rateLimit/RedisRateLimiter';
import { RATE_LIMIT_RULES } from '../../infrastructure/security/rateLimit/rules';

// Simple bad word filter
const BAD_WORDS = ['spam', 'offensive']; // Expand this list
function containsBadWords(text: string): boolean {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(word => lower.includes(word));
}

export function handleChatEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: any,
  dependencies: {
    postMessageUseCase: PostMessageUseCase;
    toggleReactionUseCase: ToggleReactionUseCase;
    rateLimiter: RedisRateLimiter;
  }
) {
  const { roomId, participantId } = socket.data;
  const { postMessageUseCase, toggleReactionUseCase, rateLimiter } = dependencies;

  // Handle standard chat message (and optional reply via this channel if client prefers)
  socket.on('chat:send', async (chatData) => {
    try {
      const validated = sendChatSchema.parse(chatData);
      const { actor } = socket.data;

      // Rate limit check
      await rateLimiter.rateLimitOrThrow(
        `ws:chat:${actor.actorId}`,
        RATE_LIMIT_RULES.ws.chat
      );

      // Check for bad words
      const isShadowHidden = containsBadWords(validated.text);

      const message = await postMessageUseCase.execute({
        roomId,
        participantId,
        text: validated.text,
        replyToId: validated.replyToId,
        isShadowHidden // Pass derived value
      });

      const msgPayload = {
        id: message.id,
        participantId: message.participantId,
        text: message.text,
        createdAt: message.createdAt.toISOString(),
        reactions: {},
        isShadowHidden: isShadowHidden ? true : false,
        replyTo: message.replyTo
      };

      if (!isShadowHidden) {
        io.to(roomId).emit('chat:message', { ...msgPayload, isShadowHidden: false });
      } else {
        socket.emit('chat:message', { ...msgPayload, isShadowHidden: true });
      }

    } catch (error: any) {
      const payload: any = { message: error.message || 'Failed to send message' };
      if (error.name === 'RateLimitError') {
        payload.retryAfterSec = error.retryAfterSec;
      }
      socket.emit('error', payload);
    }
  });

  // Explicit message:reply event (optional, but requested in spec)
  socket.on('message:reply', async (replyData) => {
    try {
      const validated = sendChatSchema.parse(replyData);
      if (!validated.replyToId) {
        throw new Error('replyToId required for message:reply');
      }

      const { actor } = socket.data;
      await rateLimiter.rateLimitOrThrow(
        `ws:chat:${actor.actorId}`,
        RATE_LIMIT_RULES.ws.chat
      );

      const isShadowHidden = containsBadWords(validated.text);

      const message = await postMessageUseCase.execute({
        roomId,
        participantId,
        text: validated.text,
        replyToId: validated.replyToId,
        isShadowHidden // Pass derived value
      });

      const msgPayload = {
        id: message.id,
        participantId: message.participantId,
        text: message.text,
        createdAt: message.createdAt.toISOString(),
        reactions: {},
        isShadowHidden: isShadowHidden ? true : false,
        replyTo: message.replyTo
      };

      if (!isShadowHidden) {
        io.to(roomId).emit('chat:message', { ...msgPayload, isShadowHidden: false });
      } else {
        socket.emit('chat:message', { ...msgPayload, isShadowHidden: true });
      }

    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to reply' });
    }
  });

  // Reactions
  socket.on('message:react', async (reactData) => {
    try {
      const validated = reactMessageSchema.parse(reactData);
      const { actor } = socket.data;

      await rateLimiter.rateLimitOrThrow(
        `ws:react:${actor.actorId}`,
        { max: 12, windowSec: 10 }
      );

      const result = await toggleReactionUseCase.execute({
        roomId,
        participantId,
        messageId: validated.messageId,
        emoji: validated.emoji
      });

      // Broadcast update
      io.to(roomId).emit('message:reaction', {
        messageId: validated.messageId,
        emoji: validated.emoji,
        action: result.action,
        participantId,
        counts: result.counts
      });

    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to react' });
    }
  });
}
