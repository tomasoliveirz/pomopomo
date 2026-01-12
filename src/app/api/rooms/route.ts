import { NextRequest, NextResponse } from 'next/server';
import { container } from '../../container';
import { createRoomSchema } from '@/lib/validators';
import { getActorFromRequest } from '@/lib/actor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createRoomSchema.parse(body);

    const actor = await getActorFromRequest();

    const { room, host, code: roomCode } = await container.createRoomUseCase.execute({
      theme: validated.theme,
      hostSessionId: actor.sessionId,
      hostUserId: actor.actorType === 'user' ? actor.userId : null,
      hostName: body.hostName
    });

    // Create WS token
    const wsToken = await container.authService.generateToken({
      roomId: room.id,
      sessionId: actor.sessionId,
      participantId: host.id,
      role: 'host',
      actorType: actor.actorType,
      userId: actor.actorType === 'user' ? actor.userId : null,
    });

    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          code: roomCode,
          theme: room.props.theme,
          status: room.status,
          currentSegmentIndex: room.currentSegmentIndex,
          createdAt: room.props.createdAt.toISOString(),
          expiresAt: room.props.expiresAt.toISOString(),
        },
        participant: {
          id: host.id,
          displayName: host.displayName,
          role: host.role,
          joinedAt: host.props.joinedAt.toISOString(),
        },
        wsToken,
      },
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create room' },
      { status: 400 }
    );
  }
}

