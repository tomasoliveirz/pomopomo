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

    // Calculate total focus time
    const focusSegments = room.segments.filter(
      seg => seg.kind === 'focus' || seg.kind === 'custom'
    );
    const totalFocusMinutes = focusSegments.reduce(
      (sum, seg) => sum + Math.floor(seg.durationSec / 60),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          code: room.code,
          theme: room.theme,
          status: room.status,
          createdAt: room.createdAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
        },
        segments: room.segments,
        participantCount: room.participants.length,
        totalFocusMinutes,
        completedSegments: room.currentSegmentIndex,
      },
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}






