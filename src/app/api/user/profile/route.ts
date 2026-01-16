import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/app/container';
import { resolveActor } from '@/lib/actor';
import { UserProfile } from '@/core/domain/entities/UserProfile';
import { Participant } from '@/core/domain/entities/Participant';
import { z } from 'zod';
import type { PublicProfile } from '@/types/publicProfile';
import { getRedisClient } from '@/lib/redis';

const profileSchema = z.object({
    displayName: z.string().min(2).max(30),
    avatarUrl: z.string().optional().nullable(),
    bio: z.string().max(160).optional().nullable()
});

// Helper to publish profile update to Redis for real-time sync
async function publishProfileUpdate(userId: string, displayName: string, avatarUrl: string | null, bio: string | null) {
    try {
        const redis = await getRedisClient();
        await redis.publish('profile.updated', JSON.stringify({
            userId,
            displayName,
            avatarUrl,
            bio
        }));
    } catch (err) {
        console.error('Failed to publish profile update:', err);
    }
}

/**
 * PATCH /api/user/profile - Update profile (displayName, bio, avatarUrl)
 * This is the preferred method for profile edits.
 */
import { v4 as uuidv4 } from 'uuid';

export async function PATCH(request: NextRequest) {
    try {
        const actor = await resolveActor();
        if (actor.actorType !== 'user' || !actor.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validated = profileSchema.parse(body);

        let existing = await container.userProfileRepo.findByUserId(actor.userId);

        // Upsert Logic: Create if not exists
        let profile;
        if (!existing) {
            profile = new UserProfile(uuidv4(), {
                userId: actor.userId,
                displayName: validated.displayName,
                avatarUrl: validated.avatarUrl,
                bio: validated.bio,
                profileCompleted: true
            });
        } else {
            profile = new UserProfile(existing.id, {
                ...existing.props,
                displayName: validated.displayName,
                avatarUrl: validated.avatarUrl ?? existing.props.avatarUrl,
                bio: validated.bio ?? existing.props.bio
            });
        }

        await container.userProfileRepo.save(profile);

        // Publish update for real-time sync
        await publishProfileUpdate(
            actor.userId,
            validated.displayName,
            validated.avatarUrl ?? (existing?.props.avatarUrl ?? null),
            validated.bio ?? (existing?.props.bio ?? null)
        );

        const publicProfile: PublicProfile = {
            userId: actor.userId,
            displayName: profile.props.displayName,
            username: profile.props.username ?? null,
            avatarUrl: profile.props.avatarUrl ?? null,
            bio: profile.props.bio ?? null
        };

        return NextResponse.json({ success: true, profile: publicProfile });
    } catch (e: any) {
        console.error('Profile Update Error:', e);
        // Handle FK violation (User deleted) -> 401
        if (e.code === 'P2003' || e.message?.includes('Foreign key constraint violated')) {
            return NextResponse.json({ error: 'User session stale. Please re-login.' }, { status: 401 });
        }
        return NextResponse.json({ error: e.message || 'Failed to update profile' }, { status: 400 });
    }
}

/**
 * POST /api/user/profile - Create/Update profile (legacy, prefer PATCH for edits)
 */
export async function POST(request: NextRequest) {
    try {
        const actor = await resolveActor();
        if (actor.actorType !== 'user' || !actor.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validated = profileSchema.parse(body);

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

        // Publish update for real-time sync
        await publishProfileUpdate(
            actor.userId,
            validated.displayName,
            validated.avatarUrl ?? null,
            validated.bio ?? null
        );

        // Optionally sync with participant (if roomId provided)
        const { roomId } = body;
        if (roomId) {
            const participant = await container.participantRepo.findByUserId(roomId, actor.userId);
            if (participant) {
                const updatedParticipant = new Participant({
                    ...participant.props,
                    displayName: validated.displayName
                });
                await container.participantRepo.save(updatedParticipant);
            }
        }

        const publicProfile: PublicProfile = {
            userId: actor.userId,
            displayName: profile.props.displayName,
            username: profile.props.username ?? null,
            avatarUrl: profile.props.avatarUrl ?? null,
            bio: profile.props.bio ?? null
        };

        return NextResponse.json({ success: true, profile: publicProfile });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Failed to save profile' }, { status: 400 });
    }
}

/**
 * GET /api/user/profile - Get own profile (authenticated)
 */
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

        // For own profile, we can return more fields (including profileCompleted for UI logic)
        return NextResponse.json({
            profile: {
                id: profile.id,
                userId: profile.props.userId,
                displayName: profile.props.displayName,
                username: profile.props.username,
                avatarUrl: profile.props.avatarUrl,
                bio: profile.props.bio,
                profileCompleted: profile.props.profileCompleted
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

