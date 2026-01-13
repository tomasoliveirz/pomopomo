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

let envData: z.infer<typeof envSchema>;

if (parsed.success) {
    envData = parsed.data;
} else if (process.env.SKIP_ENV_VALIDATION || process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn('⚠️ Skipping environment validation for build');
    envData = {
        DATABASE_URL: 'postgresql://mock:5432/mock',
        REDIS_URL: 'redis://mock:6379',
        JWT_SECRET: 'mock-secret',
        SESSION_SECRET: 'mock-session-secret',
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        WS_PORT: 3001,
        ROOM_TTL_HOURS: 24,
    };
} else {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
}

export const config = {
    ...envData,
    room: {
        ttlHours: envData.ROOM_TTL_HOURS,
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
        port: envData.WS_PORT,
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
    trustProxy: process.env.TRUST_PROXY === 'true', // Added for socket.io
};
