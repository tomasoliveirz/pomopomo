import { ProposalType, ProposalStatus } from '../../domain/types';

export interface Proposal {
    id: string;
    roomId: string;
    type: ProposalType;
    payload: any;
    createdBy: string;
    status: ProposalStatus;
    createdAt: Date;
}

export interface IProposalRepository {
    save(proposal: Proposal): Promise<void>;
    findById(id: string): Promise<Proposal | null>;
    findByRoomId(roomId: string): Promise<Proposal[]>;
}
