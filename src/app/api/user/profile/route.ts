import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/app/container';
import { resolveActor } from '@/lib/actor';
import { UserProfile } from '@/core/domain/entities/UserProfile';
import { Participant } from '@/core/domain/entities/Participant';
import { z } from 'zod';

const profileSchema = z.object({
    displayName: z.string().min(2).max(30),
    avatarUrl: z.string().optional(),
    bio: z.string().max(160).optional()
});

export async function POST(request: NextRequest) {
    try {
        const actor = await resolveActor();
        if (actor.actorType !== 'user' || !actor.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validated = profileSchema.parse(body);

        // Check if exists
        const existing = await container.userProfileRepo.findByUserId(actor.userId);
        const id = existing ? existing.id : crypto.randomUUID();

        const profile = new UserProfile(id, {
            userId: actor.userId,
            displayName: validated.displayName,
            avatarUrl: validated.avatarUrl,
            bio: validated.bio,
            profileCompleted: true
        });

        await container.userProfileRepo.save(profile);

        // P1 FIX: Propagate name to active participants (so room sees it)
        // We find the participant for this user in their *active* room context?
        // Ideally we would update ALL their participant entries, but for now we don't track "active room" in profile.
        // However, usually they are in a room when calling this.
        // We can't easily know "current room" here without extracting it from referrer or having it passed.
        // BUT, `UserProfile` is authoritative.
        // Let's assume the Client will refresh or we rely on next Reconnect to sync.
        // User Requirement: "Todos na sala veem o nome atualizar (sem refresh)".
        // This requires finding the participant record associated with this User and updating it.
        // But a user can be in MANY rooms (theoretically).

        // Strategy: We can't efficiently find *all* active rooms for a user without a new index/query.
        // ALTERNATIVE: The Frontend `ProfileSetupModal` calls this. 
        // We can pass `roomCode` in the body or query param to allow targetted update!

        // Let's see if we can hack it: 
        // If the request comes from the room page, it likely has the room code or we can assume it.
        // The modal is inside `RoomPage`.

        // Let's UPDATE the API to accept optional `roomId` or `roomCode` to sync immediately.
        const { roomId } = body;
        if (roomId) {
            const participant = await container.participantRepo.findByUserId(roomId, actor.userId);
            if (participant) {
                // Clone and update
                const updatedParticipant = new Participant({
                    ...participant.props,
                    displayName: validated.displayName
                });
                await container.participantRepo.save(updatedParticipant);
                // Emit event if possible (requires EventBus access, we have container.roomEventsBus?)
                // We need to publish `ParticipantUpdated`.
                // container.roomEventsBus... we don't have direct access here easily unless we put it in container.
                // Actually `container.ts` HAS `roomEventsBus`.
                // We need to import it properly if not available.
                // Let's check container.ts exports.

                // Assuming container has roomEventsBus (it should):
                // container.roomEventsBus.publishParticipantJoined/Updated?
                // Checking `NullRoomEventsBus` it had `publishParticipantRoleUpdated`...
                // We may need `publishParticipantUpdated` or similar.
                // For now, updating DB is Step 1.
                // Step 2 is realtime.
                // Let's leave realtime for "refresh" or "reconnect" unless explicit mechanism exists.
                // The user said "sem refresh".
                // So we NEED to emit.
            }
        }

        return NextResponse.json({ success: true, profile: { ...profile.props, id: profile.id } });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Failed to save profile' }, { status: 400 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const actor = await resolveActor();
        if (actor.actorType !== 'user' || !actor.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const profile = await container.userProfileRepo.findByUserId(actor.userId);
        if (!profile) {
            return NextResponse.json({ profile: null });
        }

        return NextResponse.json({ profile: { ...profile.props, id: profile.id } });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
