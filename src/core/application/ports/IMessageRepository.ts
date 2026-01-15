import { Message } from '../../domain/entities/Message';

export interface IMessageRepository {
    save(message: Message): Promise<void>;
    findByRoomId(roomId: string, limit?: number): Promise<Message[]>;
    findById(id: string): Promise<Message | null>;
    toggleReaction(messageId: string, participantId: string, emoji: string): Promise<{ action: 'added' | 'removed', counts: Record<string, number> }>;
}
