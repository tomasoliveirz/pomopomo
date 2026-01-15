
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@infra/db/prisma/prismaClient';
import { z } from 'zod';

const completeProfileSchema = z.object({
    username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
    displayName: z.string().min(2).max(50),
    bio: z.string().max(280).optional(),
    avatarUrl: z.string().optional(),
    roomId: z.string().optional(), // For instant update in room
});

const RESERVED = ['admin', 'support', 'pomopomo', 'api', 'room', 'signin', 'signup', 'auth', 'user', 'settings', 'me'];

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { username, displayName, bio, avatarUrl, roomId } = completeProfileSchema.parse(body);

        if (RESERVED.includes(username)) {
            return NextResponse.json({ error: 'Username reserved' }, { status: 409 });
        }

        const userId = session.user.id;

        // Transaction to ensure integrity
        await prisma.$transaction(async (tx) => {
            // 1. Get current profile to check if already set
            let profile = await tx.userProfile.findUnique({ where: { userId } });

            if (!profile) {
                // Should exist from hooks, but safety net
                profile = await tx.userProfile.create({
                    data: { userId, displayName, profileCompleted: false }
                });
            }

            if (profile.usernameSetAt) {
                // Already set - immutable!
                // BUT if they are re-submitting with same username (idempotency), maybe okay? 
                // Stricter: If username is different, reject.
                if (profile.username !== username) {
                    throw new Error('Username is immutable and already set.');
                }
            }

            // 2. Check global uniqueness (if changing/setting)
            if (profile.username !== username) {
                const conflict = await tx.userProfile.findUnique({ where: { username } });
                if (conflict) {
                    throw new Error('Username taken');
                }
            }

            // 3. Update Profile
            await tx.userProfile.update({
                where: { userId },
                data: {
                    username,
                    displayName,
                    bio,
                    avatarUrl,
                    profileCompleted: true,
                    // Set timestamp only if not already set
                    usernameSetAt: profile.usernameSetAt ? undefined : new Date(),
                }
            });

            // 4. Update core User name/image if needed
            await tx.user.update({
                where: { id: userId },
                data: { name: displayName, image: avatarUrl || undefined }
            });

            // 5. If in a room, update Participant identity
            if (roomId) {
                // Verify participant belongs to this user in this room
                const participant = await tx.participant.findUnique({
                    where: { roomId_userId: { roomId, userId } }
                });
                if (participant) {
                    await tx.participant.update({
                        where: { id: participant.id },
                        data: { displayName }
                    });
                    // Note: Real-time update via socket is needed? 
                    // The client will likely reload or refetch, or socket event could be triggered here if we had access to IO.
                    // For now, DB update is enough, UI will catch up on refresh/revalidate.
                }
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Profile complete error:', error);
        if (error.message === 'Username taken' || error.message.includes('Username is immutable')) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
