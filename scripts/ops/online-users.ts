#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', (err) => console.error('Redis Client Error', err));


async function main() {
    try {
        console.log('🔍 Checking online status...\n');

        await redis.connect();

        // 1. Get stats from DB
        const roomCount = await prisma.room.count();
        const activeRooms = await prisma.room.count({
            where: { status: 'running' }
        });
        const participantCount = await prisma.participant.count();

        // 2. Get stats from Redis
        const roomKeys = await redis.keys('room:presence:*');
        let onlineUsers = 0;

        for (const key of roomKeys) {
            const count = await redis.sCard(key);
            onlineUsers += count;
        }

        console.log('📊 System Statistics:');
        console.log('-------------------');
        console.log(`🏠 Total Rooms:      ${roomCount}`);
        console.log(`▶️  Active Rooms:     ${activeRooms}`);
        console.log(`👥 Total Participants: ${participantCount}`);
        console.log(`🟢 Online Users (est): ${onlineUsers}`);
        console.log('-------------------');

        // 3. Show active rooms details
        if (activeRooms > 0) {
            console.log('\n🏃 Active Rooms Details:');
            const runningRooms = await prisma.room.findMany({
                where: { status: 'running' },
                include: {
                    _count: {
                        select: { participants: true }
                    }
                },
                take: 5
            });

            runningRooms.forEach(room => {
                console.log(`   - ${room.code}: ${room._count.participants} participants`);
            });

            if (activeRooms > 5) {
                console.log(`   ... and ${activeRooms - 5} more`);
            }
        }

    } catch (error) {
        console.error('❌ Error checking status:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await redis.quit();
    }
}

main();
