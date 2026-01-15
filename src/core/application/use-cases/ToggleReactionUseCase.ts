
import { IMessageRepository } from '../ports/IMessageRepository';

export interface ToggleReactionInput {
    roomId: string; // Added to verify ownership
    messageId: string;
    participantId: string;
    emoji: string;
}

export interface ToggleReactionOutput {
    action: 'added' | 'removed';
    counts: Record<string, number>;
}

export class ToggleReactionUseCase {
    constructor(
        private messageRepo: IMessageRepository
    ) { }

    async execute(input: ToggleReactionInput): Promise<ToggleReactionOutput> {
        const message = await this.messageRepo.findById(input.messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        if (message.props.roomId !== input.roomId) {
            throw new Error('Message mismatch (room)');
        }

        return this.messageRepo.toggleReaction(input.messageId, input.participantId, input.emoji);
    }
}
