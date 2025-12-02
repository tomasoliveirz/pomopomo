import { IMessageRepository } from '../../../core/application/ports/IMessageRepository';
import { Message } from '../../../core/domain/entities/Message';
import { prisma } from './prismaClient';

export class PrismaMessageRepository implements IMessageRepository {
    async save(message: Message): Promise<void> {
        await prisma.message.create({
            data: {
                id: message.id,
                roomId: message.props.roomId,
                participantId: message.props.participantId,
                text: message.props.text,
                reactions: message.props.reactions,
                isShadowHidden: message.props.isShadowHidden,
                createdAt: message.props.createdAt,
            },
        });
    }

    async findByRoomId(roomId: string, limit: number = 50): Promise<Message[]> {
        const data = await prisma.message.findMany({
            where: { roomId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return data.reverse().map(m => new Message({
            id: m.id,
            roomId: m.roomId,
            participantId: m.participantId,
            text: m.text,
            reactions: m.reactions as Record<string, string[]>,
            isShadowHidden: m.isShadowHidden,
            createdAt: m.createdAt,
        }));
    }
}
