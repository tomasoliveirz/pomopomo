import { NextRequest, NextResponse } from 'next/server';
import { container } from '../../container';
import { createRoomSchema } from '@/lib/validators';
import { resolveActor } from '@/lib/actor';
import { config } from '@/infrastructure/config/env';

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveActor();

    // Rate limit check for room creation
    const allowed = await container.rateLimiter.checkLimit(
      `room_create:${actor.actorId}`,
      5, // Max 5 rooms per window
      60 * 1000 // 1 minute window
    );

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many room creation requests' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = createRoomSchema.parse(body);

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

    if (error.message?.includes('User session invalid') || error.code === 'P2003') {
      return NextResponse.json(
        { success: false, error: 'User session stale. Please re-login.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create room' },
      { status: 400 }
    );
  }
}

