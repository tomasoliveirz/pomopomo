import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/app/container';
import { joinRoomSchema } from '@/lib/validators';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const body = await request.json();
    const validated = joinRoomSchema.parse({ ...body, code });

    // Get or create session ID
    const cookieStore = cookies();
    let sessionId = cookieStore.get('sessionId')?.value;

    if (!sessionId) {
      sessionId = container.authService.generateSessionId();
    }

    // Execute Use Case
    const { room, participant, token } = await container.joinRoomUseCase.execute({
      code,
      sessionId,
      displayName: validated.displayName
    });

    const response = NextResponse.json({
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

    // Set session cookie
    response.cookies.set('sessionId', sessionId!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Join room error:', error);
    // Handle specific errors (e.g., RoomNotFound, RoomFull) if Use Case throws them
    // For now, generic error handling
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to join room' },
      { status: 400 }
    );
  }
}

