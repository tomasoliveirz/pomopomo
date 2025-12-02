import { Message } from '../../domain/entities/Message';

export interface IMessageRepository {
    save(message: Message): Promise<void>;
    findByRoomId(roomId: string, limit?: number): Promise<Message[]>;
}
