import 'dotenv/config';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { TimerProcessor } from '../infrastructure/jobs/bullmq/TimerProcessor';
import { BullTimerScheduler } from '../infrastructure/jobs/bullmq/BullTimerScheduler';
import { PrismaRoomRepository } from '../infrastructure/db/prisma/PrismaRoomRepository';
import { PrismaSegmentRepository } from '../infrastructure/db/prisma/PrismaSegmentRepository';
import { RedisStateRepository } from '../infrastructure/cache/RedisStateRepository';
import { RedisRoomEventsBus } from '../infrastructure/events/RedisRoomEventsBus';

async function bootstrap() {
    console.log('🚀 Starting Worker Process...');

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

    // Check connection
    redis.on('error', (err) => console.error('Redis Client Error', err));
    await redis.ping();
    console.log('✅ Connected to Redis (BullMQ/IOredis)');

    // Setup node-redis for Emitter (EventsBus)
    const { createClient } = await import('redis');
    const pubClient = createClient({ url: redisUrl });
    pubClient.on('error', (err) => console.error('Redis Pub Client Error', err));
    await pubClient.connect();
    console.log('✅ Connected to Redis (Pub/Emitter)');

    const prisma = new PrismaClient();

    // Repositories (Prisma repos use internal singleton or passed instance)
    const roomRepo = new PrismaRoomRepository(prisma);
    const segmentRepo = new PrismaSegmentRepository(prisma);
    const stateRepo = new RedisStateRepository();
    const eventsBus = new RedisRoomEventsBus(pubClient);
    const scheduler = new BullTimerScheduler(redis);

    // Initialize Processor (Worker)
    const processor = new TimerProcessor(
        redis,
        roomRepo,
        segmentRepo,
        stateRepo,
        eventsBus,
        scheduler
    );

    console.log('✅ TimerProcessor initialized and listening for jobs.');

    // Graceful Shutdown
    const shutdown = async () => {
        console.log('🛑 Shutting down worker...');
        await processor.close();
        await scheduler.close();
        await redis.quit(); // IOredis (BullMQ)
        await pubClient.disconnect(); // Node-redis (Emitter)
        await prisma.$disconnect();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
    console.error('❌ Worker failed to start:', err);
    process.exit(1);
});
