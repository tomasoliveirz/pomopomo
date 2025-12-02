import { IProposalRepository, Proposal } from '../../../core/application/ports/IProposalRepository';
import { prisma } from './prismaClient';
import { ProposalType, ProposalStatus } from '../../../core/domain/types';

export class PrismaProposalRepository implements IProposalRepository {
    async save(proposal: Proposal): Promise<void> {
        await prisma.proposal.upsert({
            where: { id: proposal.id },
            update: {
                status: proposal.status,
            },
            create: {
                id: proposal.id,
                roomId: proposal.roomId,
                type: proposal.type,
                payload: proposal.payload,
                createdBy: proposal.createdBy,
                status: proposal.status,
                createdAt: proposal.createdAt,
            },
        });
    }

    async findById(id: string): Promise<Proposal | null> {
        const data = await prisma.proposal.findUnique({ where: { id } });
        if (!data) return null;
        return this.mapToDomain(data);
    }

    async findByRoomId(roomId: string): Promise<Proposal[]> {
        const data = await prisma.proposal.findMany({ where: { roomId } });
        return data.map(this.mapToDomain);
    }

    private mapToDomain(data: any): Proposal {
        return {
            id: data.id,
            roomId: data.roomId,
            type: data.type as ProposalType,
            payload: data.payload,
            createdBy: data.createdBy,
            status: data.status as ProposalStatus,
            createdAt: data.createdAt,
        };
    }
}
