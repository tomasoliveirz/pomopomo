import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
    JWT_SECRET: z.string(),
    SESSION_SECRET: z.string(),
    NEXT_PUBLIC_WS_URL: z.string().default('http://localhost:3001'),
    NEXT_PUBLIC_API_URL: z.string().default('http://localhost:3000'),
    WS_PORT: z.coerce.number().default(3001),
    ROOM_TTL_HOURS: z.coerce.number().default(24),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
}

export const config = {
    ...parsed.data,
    room: {
        ttlHours: parsed.data.ROOM_TTL_HOURS,
        maxParticipants: parseInt(process.env.MAX_PARTICIPANTS_PER_ROOM || '20', 10),
    },
    rateLimit: {
        chat: {
            maxMessages: 5,
            windowSec: 10,
        },
        actions: {
            maxActions: 20,
            windowSec: 60,
        },
        connections: {
            maxPerIp: 10,
            windowSec: 300,
        },
    },
    ws: {
        port: parsed.data.WS_PORT,
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? [
                    'https://pomopomo.site',
                    'https://www.pomopomo.site',
                    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050',
                    'http://51.38.190.126:3050',
                    'http://localhost:3050'
                ]
                : ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true,
        },
    },
};
