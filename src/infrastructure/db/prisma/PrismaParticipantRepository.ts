import { IParticipantRepository } from '../../../core/application/ports/IParticipantRepository';
import { Participant } from '../../../core/domain/entities/Participant';
import { SessionId } from '../../../core/domain/value-objects/SessionId';
import { prisma } from './prismaClient';
import { Role } from '../../../core/domain/types';

export class PrismaParticipantRepository implements IParticipantRepository {
    async save(participant: Participant): Promise<void> {
        await prisma.participant.upsert({
            where: { id: participant.id },
            update: {
                displayName: participant.displayName,
                role: participant.role,
                isMuted: participant.isMuted,
                lastSeenAt: participant.props.lastSeenAt,
                userId: participant.props.userId,
            },
            create: {
                id: participant.id,
                roomId: participant.props.roomId,
                sessionId: participant.sessionId.toString(),
                userId: participant.props.userId,
                displayName: participant.displayName,
                role: participant.role,
                isMuted: participant.isMuted,
                joinedAt: participant.props.joinedAt,
                lastSeenAt: participant.props.lastSeenAt,
            },
        });
    }

    async findByRoomId(roomId: string): Promise<Participant[]> {
        const data = await prisma.participant.findMany({
            where: { roomId },
        });

        return data.map(this.mapToDomain);
    }

    async findBySessionId(roomId: string, sessionId: string): Promise<Participant | null> {
        const data = await prisma.participant.findUnique({
            where: {
                roomId_sessionId: {
                    roomId,
                    sessionId,
                },
            },
        });

        if (!data) return null;

        return this.mapToDomain(data);
    }

    async findById(id: string): Promise<Participant | null> {
        const data = await prisma.participant.findUnique({
            where: { id },
        });

        if (!data) return null;

        return this.mapToDomain(data);
    }

    async findByUserId(roomId: string, userId: string): Promise<Participant | null> {
        const data = await prisma.participant.findUnique({
            where: {
                roomId_userId: {
                    roomId,
                    userId,
                },
            },
        });

        if (!data) return null;

        return this.mapToDomain(data);
    }

    private mapToDomain(data: any): Participant {
        return new Participant({
            id: data.id,
            roomId: data.roomId,
            sessionId: SessionId.create(data.sessionId),
            userId: data.userId,
            displayName: data.displayName,
            role: data.role as Role,
            isMuted: data.isMuted,
            joinedAt: data.joinedAt,
            lastSeenAt: data.lastSeenAt,
        });
    }
}
