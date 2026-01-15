import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { container } from '@/app/container';

export async function POST() {
    try {
        // 1. Ensure authenticated
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get Guest Session ID (Truth from cookie)
        const cookieStore = cookies();
        const sessionId = cookieStore.get('sessionId')?.value;

        if (!sessionId) {
            return NextResponse.json({ success: true, message: 'No guest session to merge' });
        }

        // 3. Perform Merge (Idempotent)
        // Logic: Find all participants with this sessionId AND no userId, and link them to this userId.
        // We use the participantRepo for this.
        const result = await container.participantRepo.linkGuestToUser(sessionId, session.user.id);

        return NextResponse.json({ success: true, merged: result });

    } catch (error: any) {
        console.error('Identity claim error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to claim identity' },
            { status: 500 }
        );
    }
}
