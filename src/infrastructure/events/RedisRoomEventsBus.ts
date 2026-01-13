import { createClient } from 'redis';
import { Emitter } from '@socket.io/redis-emitter';
import { IRoomEventsBus } from '../../core/application/ports/IRoomEventsBus';
import { Room } from '../../core/domain/entities/Room';
import { Participant } from '../../core/domain/entities/Participant';
import { Segment } from '../../core/domain/entities/Segment';
import { RoomTimerState } from '../../core/application/ports/IStateRepository';

export class RedisRoomEventsBus implements IRoomEventsBus {
    private emitter: Emitter;

    // Accepts a connected node-redis client
    constructor(redisClient: ReturnType<typeof createClient>) {
        this.emitter = new Emitter(redisClient as any);
    }

    publishRoomCreated(room: Room): void {
        // Not strictly needed for broadcast, but good practice
    }

    publishRoomJoined(room: Room, participant: Participant): void {
        this.emitter.to(room.id).emit('participants:updated', {
            list: room.props.participants?.map(this.mapParticipantToDto) || []
        });
    }

    publishRoomStateUpdated(room: Room, timerState?: RoomTimerState): void {
        const payload = timerState ? {
            status: timerState.status,
            currentIndex: timerState.currentIndex,
            serverNow: Date.now(),
            segmentEndsAt: timerState.segmentEndsAt,
            remainingSec: timerState.remainingSec
        } : {
            status: room.status,
            currentIndex: room.currentSegmentIndex,
            serverNow: Date.now(),
            segmentEndsAt: room.props.startsAt ? room.props.startsAt.getTime() + (room.getCurrentSegment()?.durationSec || 0) * 1000 : null,
            remainingSec: 0
        };

        this.emitter.to(room.id).emit('room:state', payload);
        console.log(`[RedisBus] Room ${room.id} state updated to ${room.status} via Emitter`);
    }

    publishQueueUpdated(roomId: string, segments: Segment[]): void {
        this.emitter.to(roomId).emit('queue:updated', {
            segments: segments.map(this.mapSegmentToDto)
        });
    }

    publishParticipantsUpdated(roomId: string, participants: Participant[]): void {
        this.emitter.to(roomId).emit('participants:updated', {
            list: participants.map(this.mapParticipantToDto)
        });
    }

    publishParticipantRoleUpdated(roomId: string, participantId: string, newRole: string): void {
        this.emitter.to(roomId).emit('participant:role_updated', { participantId, newRole });
        this.emitter.serverSideEmit('internal:update_role', participantId, newRole);
    }

    private mapParticipantToDto(p: Participant) {
        return {
            id: p.id,
            displayName: p.displayName,
            role: p.role,
            isMuted: p.isMuted,
            joinedAt: p.props.joinedAt.toISOString(),
            lastSeenAt: p.props.lastSeenAt.toISOString()
        };
    }

    private mapSegmentToDto(s: Segment) {
        return {
            id: s.id,
            kind: s.kind,
            label: s.label,
            durationSec: s.durationSec,
            order: s.order,
            publicTask: s.publicTask || undefined
        };
    }
}
