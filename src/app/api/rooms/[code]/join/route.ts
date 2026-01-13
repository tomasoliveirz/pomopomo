import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/app/container';
import { joinRoomSchema } from '@/lib/validators';
import { resolveActor } from '@/lib/actor';
import { config } from '@/infrastructure/config/env';
import { RoomCode } from '@/core/domain/value-objects/RoomCode';
import { getClientIp } from '@/infrastructure/security/rateLimit/getClientIp';
import { RATE_LIMIT_RULES } from '@/infrastructure/security/rateLimit/rules';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const normalizedCode = RoomCode.normalize(code);
    const actor = await resolveActor();

    // Rate limit check for join room
    const ip = getClientIp(request);

    // 1. Limit by IP (Anti-spam generic)
    await container.rateLimiter.rateLimitOrThrow(
      `join:ip:${ip}`,
      RATE_LIMIT_RULES.http.join.ip
    );

    // 2. Limit by Room (Anti-room-spam)
    // Note: This limits TOTAL joins to a room per minute, which might be aggressive for big events.
    // But for now it fits the "Anti-Abuse" requirement.
    await container.rateLimiter.rateLimitOrThrow(
      `join:room:${normalizedCode}`,
      RATE_LIMIT_RULES.http.join.room
    );


    const body = await request.json();
    const validated = joinRoomSchema.parse({ ...body, code: normalizedCode });

    // Execute Use Case
    const { room, participant, token } = await container.joinRoomUseCase.execute({
      code: normalizedCode,
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
    if (error.name === 'RateLimitError') {
      return NextResponse.json(
        { success: false, error: 'Too Many Requests', retryAfterSec: error.retryAfterSec },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfterSec.toString() }
        }
      );
    }
    console.error('Join room error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to join room' },
      { status: 400 }
    );
  }
}

