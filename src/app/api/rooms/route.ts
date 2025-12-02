import { NextRequest, NextResponse } from 'next/server';
import { container } from '../../container';
import { createRoomSchema } from '@/lib/validators';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createRoomSchema.parse(body);

    // Get or create session ID
    const cookieStore = cookies();
    let sessionId = cookieStore.get('sessionId')?.value;

    if (!sessionId) {
      sessionId = container.authService.generateSessionId();
    }

    const { room, host, code: roomCode } = await container.createRoomUseCase.execute({
      theme: validated.theme,
      hostSessionId: sessionId,
      hostName: body.hostName
    });

    // Create WS token
    const wsToken = await container.authService.generateToken({
      roomId: room.id,
      sessionId,
      participantId: host.id,
      role: 'host',
    });

    const response = NextResponse.json({
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

    // Set session cookie
    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create room' },
      { status: 400 }
    );
  }
}

