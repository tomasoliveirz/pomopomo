import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/app/container';
import { getActorFromRequest } from '@/lib/actor';
import { RoomCode } from '@/core/domain/value-objects/RoomCode';
import { Participant } from '@/core/domain/entities/Participant';

export async function POST(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    try {
        const { code } = params;
        const normalizedCode = RoomCode.normalize(code);
        const actor = await getActorFromRequest();
        const roomCode = RoomCode.create(normalizedCode);

        const room = await container.roomRepo.findByCode(roomCode);
        if (!room) {
            return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
        }

        // 1. Find participant by sessionId OR userId
        let participant = await container.participantRepo.findBySessionId(room.id, actor.sessionId);

        if (actor.actorType === 'user') {
            const userParticipant = await container.participantRepo.findByUserId(room.id, actor.userId);
            if (userParticipant) {
                // If user already has a participant record, that's the one we use
                participant = userParticipant;
            }
        }

        if (!participant) {
            return NextResponse.json({ success: false, error: 'Participant not found in this room' }, { status: 403 });
        }

        // 2. Upgrade path: if actor is user and participant.userId is null -> attach userId
        if (actor.actorType === 'user' && !participant.props.userId) {
            participant = new Participant({
                ...participant.props,
                userId: actor.userId
            });
            await container.participantRepo.save(participant);
        }

        // 3. Issue short-lived wsToken (2 minutes)
        const wsToken = await container.authService.generateToken({
            roomId: room.id,
            sessionId: actor.sessionId,
            participantId: participant.id,
            role: participant.role,
            actorType: actor.actorType,
            userId: actor.actorType === 'user' ? actor.userId : null,
        }, '2m');

        return NextResponse.json({
            success: true,
            data: {
                wsToken,
                actorType: actor.actorType,
                participantId: participant.id
            }
        });
    } catch (error: any) {
        console.error('WS token error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to generate WS token' },
            { status: 500 }
        );
    }
}
