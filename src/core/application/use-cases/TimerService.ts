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
        private clock: IClock
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

        // Update room status in DB as well
        // We need to mutate the room entity and save it
        // But Room entity is immutable-ish in my implementation (props are readonly)
        // I should add methods to Room to change status
        // For now, I'll just update the repo directly or assume Room has methods
        // Let's assume I can update the room status via repo or create a new Room instance

        // Actually, I should update the Room entity
        const updatedRoom = new Room({
            ...room.props,
            status: 'running',
            startsAt: new Date(segmentEndsAt - remainingSec * 1000) // Approximate start time
        });
        await this.roomRepo.save(updatedRoom);

        this.eventsBus.publishRoomStateUpdated(updatedRoom);
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

        this.eventsBus.publishRoomStateUpdated(updatedRoom);
    }

    async skip(roomId: string): Promise<void> {
        const room = await this.roomRepo.findById(roomId);
        if (!room) throw new Error('Room not found');

        const nextIndex = room.currentSegmentIndex + 1;
        // Check if next index is valid?
        // If we skip the last segment, what happens?
        // Usually it just goes to the next one, or stops if end of queue.

        const newState: RoomTimerState = {
            status: 'idle', // Reset to idle for next segment? Or auto-play?
            // Usually skip means "finish current and go to next"
            // If we want to auto-play, we'd set it to running.
            // Let's assume idle for now.
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

        this.eventsBus.publishRoomStateUpdated(updatedRoom);
    }

    async getState(roomId: string): Promise<RoomTimerState | null> {
        return this.stateRepo.getRoomTimerState(roomId);
    }
}
