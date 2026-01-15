
import { NextResponse } from 'next/server';
import { prisma } from '@infra/db/prisma/prismaClient';
import { z } from 'zod';

// Reserved words list
const RESERVED = ['admin', 'support', 'pomopomo', 'api', 'room', 'signin', 'signup', 'auth', 'user', 'settings', 'me'];

const querySchema = z.object({
    u: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores allowed"),
});

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const u = searchParams.get('u');

        if (!u) {
            return NextResponse.json({ available: false, error: 'Missing username' }, { status: 400 });
        }

        const username = u.trim().toLowerCase();

        // 1. Check format & reserved
        const format = querySchema.safeParse({ u: username });
        if (!format.success) {
            return NextResponse.json({ available: false, error: 'Invalid format' });
        }

        if (RESERVED.includes(username)) {
            return NextResponse.json({ available: false, error: 'Reserved username' });
        }

        // 2. Check DB (citext handles case-insensitivity but we lowered anyway)
        const conflict = await prisma.userProfile.findUnique({
            where: { username },
        });

        return NextResponse.json({ available: !conflict });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ available: false }, { status: 500 });
    }
}
