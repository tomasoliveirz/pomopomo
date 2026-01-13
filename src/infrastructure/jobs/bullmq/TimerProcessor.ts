import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { IRoomRepository } from '../../../core/application/ports/IRoomRepository';
import { IStateRepository } from '../../../core/application/ports/IStateRepository';
import { ISegmentRepository } from '../../../core/application/ports/ISegmentRepository';
import { IRoomEventsBus } from '../../../core/application/ports/IRoomEventsBus';
import { ITimerScheduler } from '../../../core/application/ports/ITimerScheduler';
import { Room } from '../../../core/domain/entities/Room';

export class TimerProcessor {
    private worker: Worker;

    constructor(
        connection: Redis,
        private roomRepo: IRoomRepository,
        private segmentRepo: ISegmentRepository,
        private stateRepo: IStateRepository,
        private eventsBus: IRoomEventsBus,
        private scheduler: ITimerScheduler
    ) {
        this.worker = new Worker('timer-transitions', this.processJob.bind(this), {
            connection,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 100 }
        });

        this.worker.on('failed', (job, err) => {
            console.error(`❌ Job ${job?.id} failed:`, err);
        });
    }

    async processJob(job: Job) {
        const { roomId, expectedIndex } = job.data;
        console.log(`⚙️ Processing timer transition for room ${roomId} (expected: ${expectedIndex})`);

        const room = await this.roomRepo.findById(roomId);
        if (!room) {
            console.warn(`Room ${roomId} not found, skipping job.`);
            return;
        }

        const timerState = await this.stateRepo.getRoomTimerState(roomId);

        // Validation: Ensure we are processing the right transition
        // If the room is paused/ended or index mismatch, this job is stale.
        if (!timerState || timerState.status !== 'running') {
            console.log(`⚠️ Room ${roomId} is not running (status: ${timerState?.status}), skipping transition.`);
            return;
        }

        if (timerState.currentIndex !== expectedIndex) {
            console.log(`⚠️ Index mismatch for ${roomId}. Job expected ${expectedIndex}, actual is ${timerState.currentIndex}. Skipping.`);
            return;
        }

        // Logic to advance segment (adapted from TImerWorker)
        const segments = await this.segmentRepo.findByRoomId(roomId);
        const nextIndex = timerState.currentIndex + 1;
        const now = Date.now();

        if (nextIndex < segments.length) {
            const nextSegment = segments[nextIndex];
            const segmentEndsAt = now + nextSegment.durationSec * 1000;

            // Update Room Entity
            const nextRoom = new Room({
                ...room.props,
                currentSegmentIndex: nextIndex,
                startsAt: new Date(now),
                status: 'running'
            });
            await this.roomRepo.save(nextRoom);

            // Update Redis State
            const newState = {
                status: 'running' as const,
                currentIndex: nextIndex,
                segmentEndsAt,
                remainingSec: nextSegment.durationSec,
                lastUpdateTime: now
            };
            await this.stateRepo.setRoomTimerState(roomId, newState);

            // Broadcast
            this.eventsBus.publishRoomStateUpdated(nextRoom, newState);
            console.log(`✅ Room ${roomId} advanced to segment ${nextIndex}`);

            // Schedule NEXT segment end
            await this.scheduler.scheduleSegmentEnd(roomId, nextIndex, nextSegment.durationSec * 1000);

        } else {
            // Queue Ended
            const endedRoom = new Room({
                ...room.props,
                status: 'ended'
            });
            await this.roomRepo.save(endedRoom);

            const newState = {
                status: 'ended' as const,
                currentIndex: timerState.currentIndex,
                segmentEndsAt: null,
                remainingSec: 0,
                lastUpdateTime: now
            };
            await this.stateRepo.setRoomTimerState(roomId, newState);

            this.eventsBus.publishRoomStateUpdated(endedRoom, newState);
            console.log(`🏁 Room ${roomId} queue ended.`);
        }
    }

    async close() {
        await this.worker.close();
    }
}
