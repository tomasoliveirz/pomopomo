import { Server } from 'socket.io';
import { IRoomEventsBus } from '@core/application/ports/IRoomEventsBus';
import { Room } from '@core/domain/entities/Room';
import { Participant } from '@core/domain/entities/Participant';
import { Segment } from '@core/domain/entities/Segment';
import { ServerEvents, InterServerEvents, RoomStatus } from '@/types'; // Legacy types for compatibility

export class SocketIoRoomEventsBus implements IRoomEventsBus {
    constructor(private io: Server<any, ServerEvents, InterServerEvents>) { }

    publishRoomCreated(room: Room): void {
        // Room creation is usually a request-response flow, but we can broadcast if needed
        // For now, we might not need to broadcast "created" to everyone, but maybe to the creator
    }

    publishRoomJoined(room: Room, participant: Participant): void {
        // Emit 'room:joined' to the specific socket is handled by the handler usually
        // But we can broadcast 'participants:updated' to the room
        this.io.to(room.id).emit('participants:updated', {
            list: room.props.participants?.map(this.mapParticipantToDto) || []
        });
    }

    publishRoomStateUpdated(room: Room, timerState?: any): void {
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
            remainingSec: 0 // Fallback
        };

        this.io.to(room.id).emit('room:state', payload);
    }

    publishQueueUpdated(roomId: string, segments: Segment[]): void {
        this.io.to(roomId).emit('queue:updated', {
            segments: segments.map(this.mapSegmentToDto)
        });
    }

    publishParticipantsUpdated(roomId: string, participants: Participant[]): void {
        this.io.to(roomId).emit('participants:updated', {
            list: participants.map(this.mapParticipantToDto)
        });
    }

    publishParticipantRoleUpdated(roomId: string, participantId: string, newRole: string): void {
        // 1. Broadcast to all clients in the room
        this.io.to(roomId).emit('participant:role_updated', { participantId, newRole });

        // 2. Broadcast to all server nodes to update their local socket.data
        this.io.serverSideEmit('internal:update_role', participantId, newRole);
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
