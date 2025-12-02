import { ISegmentRepository } from '../../../core/application/ports/ISegmentRepository';
import { Segment } from '../../../core/domain/entities/Segment';
import { prisma } from './prismaClient';
import { SegmentKind } from '../../../core/domain/types';

export class PrismaSegmentRepository implements ISegmentRepository {
    async save(segment: Segment): Promise<void> {
        await prisma.segment.upsert({
            where: { id: segment.id },
            update: {
                kind: segment.kind,
                label: segment.label,
                durationSec: segment.durationSec,
                order: segment.order,
                publicTask: segment.publicTask,
            },
            create: {
                id: segment.id,
                roomId: segment.props.roomId,
                kind: segment.kind,
                label: segment.label,
                durationSec: segment.durationSec,
                order: segment.order,
                publicTask: segment.publicTask,
            },
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.segment.delete({ where: { id } });
    }

    async findByRoomId(roomId: string): Promise<Segment[]> {
        const data = await prisma.segment.findMany({
            where: { roomId },
            orderBy: { order: 'asc' },
        });

        return data.map(s => new Segment({
            id: s.id,
            roomId: s.roomId,
            kind: s.kind as SegmentKind,
            label: s.label,
            durationSec: s.durationSec,
            order: s.order,
            publicTask: s.publicTask,
        }));
    }

    async deleteAllByRoomId(roomId: string): Promise<void> {
        await prisma.segment.deleteMany({ where: { roomId } });
    }
}
