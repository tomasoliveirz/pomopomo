import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        segments: {
          orderBy: { order: 'asc' },
        },
        participants: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
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

    return NextResponse.json({
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
        segments: room.segments,
        participantCount: room.participants.length,
      },
    });
  } catch (error: any) {
    console.error('Get room error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}






