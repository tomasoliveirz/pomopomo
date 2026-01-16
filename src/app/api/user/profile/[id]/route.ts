
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@infra/db/prisma/prismaClient';
import type { PublicProfile } from '@/types/publicProfile';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = params.id;

        const profile = await prisma.userProfile.findUnique({
            where: { userId },
            select: {
                displayName: true,
                username: true,
                bio: true,
                avatarUrl: true
                // NOTE: profileCompleted is INTERNAL - never return it publicly
            }
        });

        if (!profile) {
            // Return null profile with 200 status to avoid console error logs
            return NextResponse.json({ profile: null });
        }

        // Return only PublicProfile fields
        const publicProfile: PublicProfile = {
            userId,
            displayName: profile.displayName,
            username: profile.username,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio
        };

        return NextResponse.json({ profile: publicProfile });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
