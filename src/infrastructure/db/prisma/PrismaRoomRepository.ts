import { IRoomRepository } from '../../../core/application/ports/IRoomRepository';
import { Room } from '../../../core/domain/entities/Room';
import { RoomCode } from '../../../core/domain/value-objects/RoomCode';
import { SessionId } from '../../../core/domain/value-objects/SessionId';
import { prisma } from './prismaClient';
import { Theme, RoomStatus, SegmentKind } from '../../../core/domain/types';
import { Segment } from '../../../core/domain/entities/Segment';

export class PrismaRoomRepository implements IRoomRepository {
    async save(room: Room): Promise<void> {
        await prisma.room.upsert({
            where: { id: room.id },
            update: {
                status: room.status,
                currentSegmentIndex: room.currentSegmentIndex,
                startsAt: room.props.startsAt,
                expiresAt: room.props.expiresAt,
            },
            create: {
                id: room.id,
                code: room.code.toString(),
                hostSessionId: room.props.hostSessionId.toString(),
                hostUserId: room.props.hostUserId,
                theme: room.props.theme,
                status: room.status,
                currentSegmentIndex: room.currentSegmentIndex,
                startsAt: room.props.startsAt,
                createdAt: room.props.createdAt,
                expiresAt: room.props.expiresAt,
            },
        });
    }

    async findByCode(code: RoomCode): Promise<Room | null> {
        const data = await prisma.room.findUnique({
            where: { code: code.toString() },
            include: { segments: true },
        });

        if (!data) return null;

        return this.mapToDomain(data);
    }

    async findById(id: string): Promise<Room | null> {
        const data = await prisma.room.findUnique({
            where: { id },
            include: { segments: true },
        });

        if (!data) return null;

        return this.mapToDomain(data);
    }

    async delete(id: string): Promise<void> {
        await prisma.room.delete({ where: { id } });
    }

    async findRunningRooms(): Promise<Room[]> {
        const data = await prisma.room.findMany({
            where: { status: 'running' },
        });
        return data.map(this.mapToDomain);
    }

    private mapToDomain(data: any): Room {
        return new Room({
            id: data.id,
            code: RoomCode.create(data.code),
            hostSessionId: SessionId.create(data.hostSessionId),
            hostUserId: data.hostUserId,
            theme: data.theme as Theme,
            status: data.status as RoomStatus,
            currentSegmentIndex: data.currentSegmentIndex,
            startsAt: data.startsAt,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
            segments: data.segments?.map((s: any) => new Segment({
                id: s.id,
                roomId: s.roomId,
                kind: s.kind as SegmentKind,
                label: s.label,
                durationSec: s.durationSec,
                order: s.order,
                publicTask: s.publicTask
            })) || [],
        });
    }
}
