import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { ITimerScheduler } from '../../../core/application/ports/ITimerScheduler';

export class BullTimerScheduler implements ITimerScheduler {
    private queue: Queue;

    constructor(connection: Redis) {
        this.queue = new Queue('timer-transitions', {
            connection,
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: true,
            }
        });
    }

    async scheduleSegmentEnd(roomId: string, expectedIndex: number, delayMs: number): Promise<void> {
        // Strategy A: Unique Job ID per segment transition
        // Prevents collision if previous job is still "Active" (processing) when we schedule the next one.
        const jobId = `timer:${roomId}:${expectedIndex}`;

        // Ensure no stale job exists for this specific segment (idempotency)
        await this.cancelSegmentEnd(roomId, expectedIndex);

        await this.queue.add(
            'segment-end',
            { roomId, expectedIndex },
            {
                delay: delayMs,
                jobId
            }
        );
        console.log(`📅 Scheduled segment ${expectedIndex} end for room ${roomId} in ${delayMs / 1000}s`);
    }

    async cancelSegmentEnd(roomId: string, expectedIndex: number): Promise<void> {
        const jobId = `timer:${roomId}:${expectedIndex}`;
        const job = await this.queue.getJob(jobId);
        if (job) {
            // If checking strict state, one might verify job.data.expectedIndex matches
            await job.remove();
            console.log(`🛑 Cancelled scheduled segment ${expectedIndex} end for room ${roomId}`);
        }
    }

    async close(): Promise<void> {
        await this.queue.close();
    }
}
