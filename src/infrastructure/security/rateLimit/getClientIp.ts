import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

export function getClientIp(request: NextRequest): string {
    // Try to get IP from x-forwarded-for header (standard for proxies/Vercel)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    // Fallback to x-real-ip
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Default fallback (local dev usually)
    return '127.0.0.1';
}
