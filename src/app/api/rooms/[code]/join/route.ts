import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSessionId, createWsToken } from '@/lib/auth';
import { joinRoomSchema } from '@/lib/validators';
import { config } from '@/lib/config';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const body = await request.json();
    const validated = joinRoomSchema.parse({ ...body, code });

    // Find room
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        participants: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > room.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Room has expired' },
        { status: 410 }
      );
    }

    // Check participant limit
    if (room.participants.length >= config.room.maxParticipants) {
      return NextResponse.json(
        { success: false, error: 'Room is full' },
        { status: 403 }
      );
    }

    // Get or create session ID
    const cookieStore = cookies();
    let sessionId = cookieStore.get('sessionId')?.value;
    
    if (!sessionId) {
      sessionId = generateSessionId();
    }

    // Check if already joined
    let participant = await prisma.participant.findFirst({
      where: {
        roomId: room.id,
        sessionId,
      },
    });

    if (!participant) {
      // Create new participant
      participant = await prisma.participant.create({
        data: {
          roomId: room.id,
          sessionId,
          displayName: validated.displayName,
          role: 'guest',
        },
      });
    } else {
      // Update display name if changed
      participant = await prisma.participant.update({
        where: { id: participant.id },
        data: {
          displayName: validated.displayName,
          lastSeenAt: new Date(),
        },
      });
    }

    // Create WS token
    const wsToken = await createWsToken({
      roomId: room.id,
      sessionId,
      participantId: participant.id,
      role: participant.role,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        participant: {
          id: participant.id,
          displayName: participant.displayName,
          role: participant.role,
          joinedAt: participant.joinedAt.toISOString(),
        },
        room: {
          id: room.id,
          code: room.code,
          theme: room.theme,
          status: room.status,
          currentSegmentIndex: room.currentSegmentIndex,
          createdAt: room.createdAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
        },
        wsToken,
      },
    });

    // Set session cookie
    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: false, // Set to true only when using HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Join room error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to join room' },
      { status: 400 }
    );
  }
}

