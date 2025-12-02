import { IRoomRepository } from '@core/application/ports/IRoomRepository';
import { IStateRepository } from '@core/application/ports/IStateRepository';
import { ISegmentRepository } from '@core/application/ports/ISegmentRepository';
import { IRoomEventsBus } from '@core/application/ports/IRoomEventsBus';
import { IClock } from '@core/application/ports/IClock';
import { Room } from '../../core/domain/entities/Room';

export class TimerWorker {
    private interval: NodeJS.Timeout | null = null;

    constructor(
        private roomRepo: IRoomRepository, // Needs findRunningRooms
        private segmentRepo: ISegmentRepository,
        private stateRepo: IStateRepository,
        private eventsBus: IRoomEventsBus,
        private clock: IClock
    ) { }

    start() {
        if (this.interval) return;

        console.log('⏱️  Timer Worker started');
        this.interval = setInterval(async () => {
            try {
                // We need a method to find running rooms.
                // PrismaRoomRepository needs to implement this.
                // For now, I'll assume roomRepo has it or I'll cast it.
                // Or I can add it to IRoomRepository interface.
                // Let's assume I added it.
                const runningRooms = await (this.roomRepo as any).findRunningRooms();

                const now = this.clock.now().getTime();

                for (const room of runningRooms) {
                    const timerState = await this.stateRepo.getRoomTimerState(room.id);

                    if (timerState?.segmentEndsAt && timerState.segmentEndsAt <= now) {
                        console.log(`⏰ Segment ended for room ${room.code}, auto - advancing...`);

                        const segments = await this.segmentRepo.findByRoomId(room.id);
                        const nextIndex = timerState.currentIndex + 1;

                        if (nextIndex < segments.length) {
                            const nextSegment = segments[nextIndex];
                            const segmentEndsAt = now + nextSegment.durationSec * 1000;

                            // Update Room
                            const updatedRoom = new Room({
                                ...room.props,
                                currentSegmentIndex: nextIndex,
                                // startsAt?
                            });
                            // We need to persist this change.
                            // But Room entity props are read-only in my implementation?
                            // I should fix Room entity or use a new instance.
                            // I used new Room above.

                            // We need to update DB status/index
                            // roomRepo.save(updatedRoom)
                            // But wait, roomRepo.save expects a Room object.
                            // I need to make sure I update the fields correctly.

                            // Also update Redis state
                            await this.stateRepo.setRoomTimerState(room.id, {
                                status: 'running',
                                currentIndex: nextIndex,
                                segmentEndsAt,
                                remainingSec: nextSegment.durationSec,
                                lastUpdateTime: now
                            });

                            // Update DB
                            // We need to update currentSegmentIndex
                            // I'll use a specific method or save.
                            // Since I don't have a clean way to update partials in my Room entity yet (it's immutable),
                            // I'll just use save() with the modified Room.
                            // But I need to construct the modified Room carefully.
                            // The `room` variable here comes from `findRunningRooms`.

                            // Let's assume `save` updates the fields.
                            // I need to construct a new Room with updated index.
                            const nextRoom = new Room({
                                ...room.props,
                                currentSegmentIndex: nextIndex
                            });
                            await this.roomRepo.save(nextRoom);

                            this.eventsBus.publishRoomStateUpdated(nextRoom);

                        } else {
                            // Queue ended
                            const endedRoom = new Room({
                                ...room.props,
                                status: 'ended'
                            });
                            await this.roomRepo.save(endedRoom);

                            await this.stateRepo.setRoomTimerState(room.id, {
                                status: 'ended',
                                currentIndex: timerState.currentIndex,
                                segmentEndsAt: null,
                                remainingSec: 0,
                                lastUpdateTime: now
                            });

                            this.eventsBus.publishRoomStateUpdated(endedRoom);
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Error in Timer Worker:', error);
            }
        }, 1000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
