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

    private lastBroadcasts: Map<string, number> = new Map();

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

                    // 1. Check for Segment End (Transition)
                    if (timerState?.segmentEndsAt && timerState.segmentEndsAt <= now) {
                        console.log(`⏰ Segment ended for room ${room.code}, auto - advancing...`);

                        const segments = await this.segmentRepo.findByRoomId(room.id);
                        const nextIndex = timerState.currentIndex + 1;

                        if (nextIndex < segments.length) {
                            const nextSegment = segments[nextIndex];
                            const segmentEndsAt = now + nextSegment.durationSec * 1000;

                            // Update Room
                            // We need to construct a new Room with updated index.
                            const nextRoom = new Room({
                                ...room.props,
                                currentSegmentIndex: nextIndex,
                                startsAt: new Date(now)
                            });
                            await this.roomRepo.save(nextRoom);

                            // Also update Redis state
                            await this.stateRepo.setRoomTimerState(room.id, {
                                status: 'running',
                                currentIndex: nextIndex,
                                segmentEndsAt,
                                remainingSec: nextSegment.durationSec,
                                lastUpdateTime: now
                            });

                            this.eventsBus.publishRoomStateUpdated(nextRoom, {
                                status: 'running',
                                currentIndex: nextIndex,
                                segmentEndsAt,
                                remainingSec: nextSegment.durationSec,
                                lastUpdateTime: now
                            });

                            // Update last broadcast time so we don't double send immediately
                            this.lastBroadcasts.set(room.id, now);

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

                            this.eventsBus.publishRoomStateUpdated(endedRoom, {
                                status: 'ended',
                                currentIndex: timerState.currentIndex,
                                segmentEndsAt: null,
                                remainingSec: 0,
                                lastUpdateTime: now
                            });

                            this.lastBroadcasts.delete(room.id);
                        }
                    }
                    // 2. Heartbeat: Broadcast state every 10 seconds if running
                    else if (timerState && timerState.status === 'running') {
                        const lastBroadcast = this.lastBroadcasts.get(room.id) || 0;
                        if (now - lastBroadcast >= 10000) { // 10 seconds
                            // Calculate current remaining time for accuracy
                            const remainingSec = timerState.segmentEndsAt
                                ? Math.max(0, Math.ceil((timerState.segmentEndsAt - now) / 1000))
                                : 0;

                            this.eventsBus.publishRoomStateUpdated(room, {
                                ...timerState,
                                remainingSec,
                                lastUpdateTime: now
                            });
                            this.lastBroadcasts.set(room.id, now);
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
