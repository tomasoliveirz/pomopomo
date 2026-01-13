import 'dotenv/config';
import Redis from 'ioredis';
import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';
import { BullTimerScheduler } from '../src/infrastructure/jobs/bullmq/BullTimerScheduler';
import { TimerProcessor } from '../src/infrastructure/jobs/bullmq/TimerProcessor';
import { RedisRoomEventsBus } from '../src/infrastructure/events/RedisRoomEventsBus';
import { PrismaRoomRepository } from '../src/infrastructure/db/prisma/PrismaRoomRepository';
import { PrismaSegmentRepository } from '../src/infrastructure/db/prisma/PrismaSegmentRepository';
import { RedisStateRepository } from '../src/infrastructure/cache/RedisStateRepository';
import { Room } from '../src/core/domain/entities/Room';
import { RoomCode } from '../src/core/domain/value-objects/RoomCode';
import { SessionId } from '../src/core/domain/value-objects/SessionId';
import { Segment } from '../src/core/domain/entities/Segment';
import { createAdapter } from '@socket.io/redis-adapter';
import { Emitter } from '@socket.io/redis-emitter';

// Mock dependencies
const roomId = 'smoke-test-room-' + Date.now();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function runSmokeTest() {
    console.log('🧪 Starting Smoke Test: Event-Driven Timer');

    // 1. Setup Redis Clients
    const ioRedis = new Redis(redisUrl, { maxRetriesPerRequest: null }); // For BullMQ
    const pubClient = createClient({ url: redisUrl }); // For Emitter
    const subClient = pubClient.duplicate(); // For Listening
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log('✅ Redis Clients Connected');

    // 2. Setup Database & Repos
    const prisma = new PrismaClient();
    const roomRepo = new PrismaRoomRepository(prisma);
    const segmentRepo = new PrismaSegmentRepository(prisma);
    const stateRepo = new RedisStateRepository(ioRedis);
    const eventsBus = new RedisRoomEventsBus(pubClient);
    const scheduler = new BullTimerScheduler(ioRedis);

    // 3. Initialize Worker (Processor)
    const processor = new TimerProcessor(
        ioRedis,
        roomRepo,
        segmentRepo,
        stateRepo,
        eventsBus,
        scheduler
    );
    console.log('✅ Worker Initialized');

    try {
        // 4. Create Test Room & Segments
        console.log(`Creating dummy room: ${roomId}`);
        const segments = [
            new Segment({ id: 'seg1', roomId, kind: 'work', label: 'Work', durationSec: 2, order: 0 }),
            new Segment({ id: 'seg2', roomId, kind: 'break', label: 'Break', durationSec: 2, order: 1 })
        ];

        const room = new Room({
            id: roomId,
            code: RoomCode.create('TEST'),
            hostSessionId: SessionId.create('host-123'),
            hostUserId: null,
            theme: 'classic',
            status: 'running',
            currentSegmentIndex: 0,
            startsAt: new Date(),
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000),
            segments
        });

        // Save Room & Segments
        await roomRepo.save(room);
        await Promise.all(segments.map(s => segmentRepo.save(s)));

        // Save Initial Redis State
        await stateRepo.setRoomTimerState(roomId, {
            status: 'running',
            currentIndex: 0,
            segmentEndsAt: Date.now() + 2000,
            remainingSec: 2,
            lastUpdateTime: Date.now()
        });

        // 5. Setup Listener for Broadcasts (Simulate Client)
        // Socket.IO Redis adapter publishes to: socket.io#/#<room>#
        const channel = `socket.io#/#${roomId}#`;
        await subClient.subscribe(channel, (message) => {
            // socket.io-redis-emitter sends msgpack normally, but we might see something
            // Actually, testing the exact binary format is hard in a simple script.
            // We can just trust the log from the worker, OR use a real socket.io client?
            // Simpler: Just rely on Worker logs + DB state check.
            console.log('📨 Received Broadcast on Redis Channel:', channel);
        });

        // 6. Schedule Job (Trigger the flow)
        console.log('⏳ Scheduling Job in 2 seconds...');
        await scheduler.scheduleSegmentEnd(roomId, 0, 2000);

        // 7. Wait for processing
        console.log('Waiting 4 seconds for job processing...');
        await new Promise(r => setTimeout(r, 4000));

        // 8. Verify State
        const updatedState = await stateRepo.getRoomTimerState(roomId);
        console.log('🔍 Timer State:', updatedState);

        const updatedRoom = await roomRepo.findById(roomId);
        console.log('🔍 Room Entity Status:', updatedRoom?.status);
        console.log('🔍 Room Entity Index:', updatedRoom?.currentSegmentIndex);

        if (updatedState?.currentIndex === 1 && updatedRoom?.currentSegmentIndex === 1) {
            console.log('🎉 SUCCESS: Room transitioned to next segment!');
        } else {
            console.error('❌ FAILURE: Room did not transition correctly.');
            process.exit(1);
        }

    } catch (err) {
        console.error('❌ Test Failed:', err);
    } finally {
        // Cleanup
        console.log('🧹 Cleaning up...');
        await processor.close();
        await ioRedis.quit();
        await pubClient.disconnect();
        await subClient.disconnect();
        await prisma.$disconnect();
    }
}

runSmokeTest();
