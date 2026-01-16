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
            include: { user: { include: { profile: true } } }
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
            include: { user: { include: { profile: true } } }
        });

        if (!data) return null;

        return this.mapToDomain(data);
    }

    async findById(id: string): Promise<Participant | null> {
        const data = await prisma.participant.findUnique({
            where: { id },
            include: { user: { include: { profile: true } } }
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
            include: { user: { include: { profile: true } } }
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
            avatarUrl: data.user?.profile?.avatarUrl || data.user?.image || null,
            role: data.role as Role,
            isMuted: data.isMuted,
            joinedAt: data.joinedAt,
            lastSeenAt: data.lastSeenAt,
        });
    }

    async linkGuestToUser(sessionId: string, userId: string): Promise<void> {
        const guestParticipations = await prisma.participant.findMany({
            where: { sessionId, userId: null }
        });

        for (const gp of guestParticipations) {
            // Check for collision: is this user already capable of being in this room?
            const existingUser = await prisma.participant.findUnique({
                where: {
                    roomId_userId: {
                        roomId: gp.roomId,
                        userId
                    }
                }
            });

            if (!existingUser) {
                // No collision, claim the participant record
                await prisma.participant.update({
                    where: { id: gp.id },
                    data: { userId }
                });
            }
            // If existingUser exists, we do nothing (the user already has a distinct participant record in this room)
            // Ideally we might merge stats, but that's advanced
        }
    }
}
