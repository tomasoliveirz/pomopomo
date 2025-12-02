import { ITaskRepository } from '../../../core/application/ports/ITaskRepository';
import { Task } from '../../../core/domain/entities/Task';
import { prisma } from './prismaClient';
import { Visibility } from '../../../core/domain/types';

export class PrismaTaskRepository implements ITaskRepository {
    async save(task: Task): Promise<void> {
        await prisma.task.upsert({
            where: { id: task.id },
            update: {
                visibility: task.props.visibility,
                text: task.props.text,
                updatedAt: task.props.updatedAt,
            },
            create: {
                id: task.id,
                roomId: task.props.roomId,
                segmentId: task.props.segmentId,
                participantId: task.props.participantId,
                visibility: task.props.visibility,
                text: task.props.text,
                createdAt: task.props.createdAt,
                updatedAt: task.props.updatedAt,
            },
        });
    }

    async findBySegmentId(segmentId: string): Promise<Task[]> {
        const data = await prisma.task.findMany({
            where: { segmentId },
        });

        return data.map(this.mapToDomain);
    }

    async findByParticipantId(segmentId: string, participantId: string): Promise<Task | null> {
        const data = await prisma.task.findUnique({
            where: {
                segmentId_participantId: {
                    segmentId,
                    participantId,
                },
            },
        });

        if (!data) return null;

        return this.mapToDomain(data);
    }

    private mapToDomain(data: any): Task {
        return new Task({
            id: data.id,
            roomId: data.roomId,
            segmentId: data.segmentId,
            participantId: data.participantId,
            visibility: data.visibility as Visibility,
            text: data.text,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        });
    }
}
