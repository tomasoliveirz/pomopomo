
import { IMessageRepository } from '../ports/IMessageRepository';
import { IRoomEventsBus } from '../ports/IRoomEventsBus';
import { IClock } from '../ports/IClock';
import { Message } from '../../domain/entities/Message';
import { v4 as uuidv4 } from 'uuid';

export interface PostMessageInput {
    roomId: string;
    participantId: string;
    text: string;
    replyToId?: string;
    isShadowHidden?: boolean;
}

export class PostMessageUseCase {
    constructor(
        private messageRepo: IMessageRepository,
        private eventsBus: IRoomEventsBus,
        private clock: IClock
    ) { }

    async execute(input: PostMessageInput): Promise<Message> {
        let replyToSnapshot;

        if (input.replyToId) {
            const parent = await this.messageRepo.findById(input.replyToId);
            if (parent && parent.props.roomId === input.roomId) {
                // Should we verify parent is from same room? YES
                // Parent ID found, populate snapshot
                replyToSnapshot = {
                    id: parent.id,
                    text: parent.text,
                    participantId: parent.participantId,
                    displayName: parent.props.authorName || 'Unknown'
                };
            }
        }

        const message = new Message({
            id: uuidv4(),
            roomId: input.roomId,
            participantId: input.participantId,
            text: input.text,
            reactions: {},
            isShadowHidden: input.isShadowHidden ?? false,
            createdAt: this.clock.now(),
            replyToId: input.replyToId,
            replyTo: replyToSnapshot
        });

        await this.messageRepo.save(message);

        return message;
    }
}
