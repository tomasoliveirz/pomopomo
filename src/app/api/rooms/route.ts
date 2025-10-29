import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateRoomCode, generateSessionId, createWsToken } from '@/lib/auth';
import { createRoomSchema } from '@/lib/validators';
import { config } from '@/lib/config';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createRoomSchema.parse(body);
    const hostName = body.hostName || 'Host';

    // Get or create session ID
    const cookieStore = cookies();
    let sessionId = cookieStore.get('sessionId')?.value;
    
    if (!sessionId) {
      sessionId = generateSessionId();
    }

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    while (await prisma.room.findUnique({ where: { code } })) {
      code = generateRoomCode();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate unique room code' },
          { status: 500 }
        );
      }
    }

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.room.ttlHours);

    // Create room
    const room = await prisma.room.create({
      data: {
        code,
        hostSessionId: sessionId,
        theme: validated.theme || 'midnight_bloom',
        expiresAt,
      },
    });

    // Create host participant
    const participant = await prisma.participant.create({
      data: {
        roomId: room.id,
        sessionId,
        displayName: hostName,
        role: 'host',
      },
    });

    // Create WS token
    const wsToken = await createWsToken({
      roomId: room.id,
      sessionId,
      participantId: participant.id,
      role: 'host',
    });

    const response = NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          code: room.code,
          theme: room.theme,
          status: room.status,
          currentSegmentIndex: room.currentSegmentIndex,
          createdAt: room.createdAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
        },
        participant: {
          id: participant.id,
          displayName: participant.displayName,
          role: participant.role,
          joinedAt: participant.joinedAt.toISOString(),
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
    console.error('Create room error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create room' },
      { status: 400 }
    );
  }
}

