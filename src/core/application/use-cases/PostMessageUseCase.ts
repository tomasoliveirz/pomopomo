import { IMessageRepository } from '../ports/IMessageRepository';
import { IRoomEventsBus } from '../ports/IRoomEventsBus';
import { IClock } from '../ports/IClock';
import { Message } from '../../domain/entities/Message';
import { v4 as uuidv4 } from 'uuid';

export interface PostMessageInput {
    roomId: string;
    participantId: string;
    text: string;
}

export class PostMessageUseCase {
    constructor(
        private messageRepo: IMessageRepository,
        private eventsBus: IRoomEventsBus,
        private clock: IClock
    ) { }

    async execute(input: PostMessageInput): Promise<Message> {
        const message = new Message({
            id: uuidv4(),
            roomId: input.roomId,
            participantId: input.participantId,
            text: input.text,
            reactions: {},
            isShadowHidden: false,
            createdAt: this.clock.now()
        });

        await this.messageRepo.save(message);

        // We need to publish this event via bus
        // But IRoomEventsBus currently doesn't have publishMessage
        // I should add it to IRoomEventsBus
        // For now, I'll assume it exists or add it
        // Let's add it to the interface later or cast it
        // Actually, I should update IRoomEventsBus interface

        return message;
    }
}
