import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/app/container';
import { joinRoomSchema } from '@/lib/validators';
import { getActorFromRequest } from '@/lib/actor';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const body = await request.json();
    const validated = joinRoomSchema.parse({ ...body, code });

    const actor = await getActorFromRequest();

    // Execute Use Case
    const { room, participant, token } = await container.joinRoomUseCase.execute({
      code,
      sessionId: actor.sessionId,
      userId: actor.actorType === 'user' ? actor.userId : null,
      displayName: validated.displayName
    });

    return NextResponse.json({
      success: true,
      data: {
        participant: {
          id: participant.id,
          displayName: participant.displayName,
          role: participant.role,
          joinedAt: participant.props.joinedAt.toISOString(),
        },
        room: {
          id: room.id,
          code: room.code.toString(),
          theme: room.props.theme,
          status: room.status,
          currentSegmentIndex: room.currentSegmentIndex,
          createdAt: room.props.createdAt.toISOString(),
          expiresAt: room.props.expiresAt.toISOString(),
        },
        wsToken: token,
      },
    });
  } catch (error: any) {
    console.error('Join room error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to join room' },
      { status: 400 }
    );
  }
}

