import { ITimerScheduler } from '../ports/ITimerScheduler';
import { IRoomRepository } from '../ports/IRoomRepository';
import { IStateRepository, RoomTimerState } from '../ports/IStateRepository';
import { IRoomEventsBus } from '../ports/IRoomEventsBus';
import { IClock } from '../ports/IClock';
import { Room } from '../../domain/entities/Room';

export class TimerService {
    constructor(
        private roomRepo: IRoomRepository,
        private stateRepo: IStateRepository,
        private eventsBus: IRoomEventsBus,
        private clock: IClock,
        private scheduler: ITimerScheduler
    ) { }

    async start(roomId: string): Promise<void> {
        const room = await this.roomRepo.findById(roomId);
        if (!room) throw new Error('Room not found');

        const currentState = await this.stateRepo.getRoomTimerState(roomId);
        const now = this.clock.now().getTime();

        let segmentEndsAt: number;
        let remainingSec = 0;

        if (currentState && currentState.status === 'paused') {
            remainingSec = currentState.remainingSec;
            segmentEndsAt = now + remainingSec * 1000;
        } else {
            const segment = room.getCurrentSegment();
            if (!segment) return; // No segment to play
            remainingSec = segment.durationSec;
            segmentEndsAt = now + remainingSec * 1000;
        }

        const newState: RoomTimerState = {
            status: 'running',
            currentIndex: room.currentSegmentIndex,
            segmentEndsAt,
            remainingSec,
            lastUpdateTime: now,
        };

        await this.stateRepo.setRoomTimerState(roomId, newState);

        const updatedRoom = new Room({
            ...room.props,
            status: 'running',
            startsAt: new Date(segmentEndsAt - remainingSec * 1000) // Approximate start time
        });
        await this.roomRepo.save(updatedRoom);

        this.eventsBus.publishRoomStateUpdated(updatedRoom, newState);

        // Schedule event-driven transition
        if (process.env.TIMER_MODE === 'bullmq') {
            await this.scheduler.scheduleSegmentEnd(
                roomId,
                room.currentSegmentIndex,
                Math.max(0, segmentEndsAt - now)
            );
        }
    }

    async pause(roomId: string): Promise<void> {
        const room = await this.roomRepo.findById(roomId);
        if (!room) throw new Error('Room not found');

        const currentState = await this.stateRepo.getRoomTimerState(roomId);
        if (!currentState || currentState.status !== 'running') return;

        const now = this.clock.now().getTime();
        const endsAt = currentState.segmentEndsAt || now;
        const remainingSec = Math.max(0, Math.ceil((endsAt - now) / 1000));

        const newState: RoomTimerState = {
            status: 'paused',
            currentIndex: room.currentSegmentIndex,
            segmentEndsAt: null,
            remainingSec,
            lastUpdateTime: now,
        };

        await this.stateRepo.setRoomTimerState(roomId, newState);

        const updatedRoom = new Room({
            ...room.props,
            status: 'paused'
        });
        await this.roomRepo.save(updatedRoom);

        this.eventsBus.publishRoomStateUpdated(updatedRoom, newState);

        // Cancel scheduled transition
        if (process.env.TIMER_MODE === 'bullmq') {
            // Use state index as source of truth for the running job
            await this.scheduler.cancelSegmentEnd(roomId, currentState.currentIndex);
        }
    }

    async skip(roomId: string): Promise<void> {
        const room = await this.roomRepo.findById(roomId);
        if (!room) throw new Error('Room not found');

        const nextIndex = room.currentSegmentIndex + 1;

        const newState: RoomTimerState = {
            status: 'idle',
            currentIndex: nextIndex,
            segmentEndsAt: null,
            remainingSec: 0,
            lastUpdateTime: this.clock.now().getTime(),
        };

        await this.stateRepo.setRoomTimerState(roomId, newState);

        const updatedRoom = new Room({
            ...room.props,
            status: 'idle',
            currentSegmentIndex: nextIndex,
            startsAt: null
        });
        await this.roomRepo.save(updatedRoom);

        this.eventsBus.publishRoomStateUpdated(updatedRoom, newState);

        // Cancel previous segment's job
        if (process.env.TIMER_MODE === 'bullmq') {
            await this.scheduler.cancelSegmentEnd(roomId, room.currentSegmentIndex);
        }
    }

    async getState(roomId: string): Promise<RoomTimerState | null> {
        return this.stateRepo.getRoomTimerState(roomId);
    }
}
