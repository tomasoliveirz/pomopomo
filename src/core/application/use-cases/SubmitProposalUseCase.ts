import { IProposalRepository } from '../ports/IProposalRepository';
import { IClock } from '../ports/IClock';
import { ProposalType } from '../../domain/types';
import { v4 as uuidv4 } from 'uuid';

export interface SubmitProposalInput {
    roomId: string;
    participantId: string;
    type: ProposalType;
    payload: any;
}

export class SubmitProposalUseCase {
    constructor(
        private proposalRepo: IProposalRepository,
        private clock: IClock
    ) { }

    async execute(input: SubmitProposalInput): Promise<any> {
        const proposal = {
            id: uuidv4(),
            roomId: input.roomId,
            type: input.type,
            payload: input.payload,
            createdBy: input.participantId,
            status: 'pending',
            createdAt: this.clock.now(),
        };

        await this.proposalRepo.save(proposal as any);
        return proposal;
    }
}
