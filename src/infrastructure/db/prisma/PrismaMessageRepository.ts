
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
                reactions: {}, // legacy json, we rely on reactionRows now
                isShadowHidden: message.props.isShadowHidden,
                createdAt: message.props.createdAt,
                replyToId: message.props.replyToId || undefined
            },
        });
    }

    async findByRoomId(roomId: string, limit: number = 50): Promise<Message[]> {
        const data = await prisma.message.findMany({
            where: { roomId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                reactionRows: true,
                replyTo: {
                    select: {
                        id: true,
                        text: true,
                        participantId: true,
                        participant: {
                            select: { displayName: true }
                        }
                    }
                }
            }
        });

        return data.reverse().map(m => {
            const reactionsMap: Record<string, string[]> = {};
            const summaryMap: Record<string, number> = {};

            m.reactionRows.forEach(row => {
                if (!reactionsMap[row.emoji]) {
                    reactionsMap[row.emoji] = [];
                    summaryMap[row.emoji] = 0;
                }
                reactionsMap[row.emoji].push(row.participantId);
                summaryMap[row.emoji]++;
            });

            const reactionSummary = Object.entries(summaryMap).map(([emoji, count]) => ({ emoji, count }));

            return new Message({
                id: m.id,
                roomId: m.roomId,
                participantId: m.participantId,
                text: m.text,
                reactions: reactionsMap,
                isShadowHidden: m.isShadowHidden,
                createdAt: m.createdAt,
                reactionSummary, // Populate summary
                replyToId: m.replyToId,
                replyTo: m.replyTo ? {
                    id: m.replyTo.id,
                    text: m.replyTo.text,
                    participantId: m.replyTo.participantId,
                    displayName: m.replyTo.participant.displayName
                } : undefined
            });
        });
    }

    async findById(id: string): Promise<Message | null> {
        const m = await prisma.message.findUnique({
            where: { id },
            include: {
                reactionRows: true,
                participant: { select: { displayName: true } }, // FETCH AUTHOR
                replyTo: {
                    select: {
                        id: true,
                        text: true,
                        participantId: true,
                        participant: { select: { displayName: true } }
                    }
                }
            }
        });

        if (!m) return null;

        const reactionsMap: Record<string, string[]> = {};
        const summaryMap: Record<string, number> = {};

        m.reactionRows.forEach(row => {
            if (!reactionsMap[row.emoji]) {
                reactionsMap[row.emoji] = [];
                summaryMap[row.emoji] = 0;
            }
            reactionsMap[row.emoji].push(row.participantId);
            summaryMap[row.emoji]++;
        });

        const reactionSummary = Object.entries(summaryMap).map(([emoji, count]) => ({ emoji, count }));

        return new Message({
            id: m.id,
            roomId: m.roomId,
            participantId: m.participantId,
            authorName: m.participant?.displayName,
            text: m.text,
            reactions: reactionsMap,
            isShadowHidden: m.isShadowHidden,
            createdAt: m.createdAt,
            reactionSummary,
            replyToId: m.replyToId,
            replyTo: m.replyTo ? {
                id: m.replyTo.id,
                text: m.replyTo.text,
                participantId: m.replyTo.participantId,
                displayName: m.replyTo.participant.displayName
            } : undefined
        });
    }

    async toggleReaction(messageId: string, participantId: string, emoji: string): Promise<{ action: 'added' | 'removed', counts: Record<string, number> }> {
        let action: 'added' | 'removed' = 'added';

        // Check existence
        const existing = await prisma.messageReaction.findUnique({
            where: {
                messageId_participantId_emoji: {
                    messageId,
                    participantId,
                    emoji
                }
            }
        });

        if (existing) {
            await prisma.messageReaction.delete({
                where: { id: existing.id }
            });
            action = 'removed';
        } else {
            await prisma.messageReaction.create({
                data: {
                    messageId,
                    participantId,
                    emoji
                }
            });
        }

        // Aggregate counts
        const grouped = await prisma.messageReaction.groupBy({
            by: ['emoji'],
            where: { messageId },
            _count: { emoji: true }
        });

        const counts: Record<string, number> = {};
        grouped.forEach(g => {
            counts[g.emoji] = g._count.emoji;
        });

        return { action, counts };
    }
}
