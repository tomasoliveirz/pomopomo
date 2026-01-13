import { Room } from '../../domain/entities/Room';
import { Participant } from '../../domain/entities/Participant';
import { Segment } from '../../domain/entities/Segment';

export interface IRoomEventsBus {
    publishRoomCreated(room: Room): void;
    publishRoomJoined(room: Room, participant: Participant): void;
    publishRoomStateUpdated(room: Room, timerState?: any): void;
    publishQueueUpdated(roomId: string, segments: Segment[]): void;
    publishParticipantsUpdated(roomId: string, participants: Participant[]): void;
    publishParticipantRoleUpdated(roomId: string, participantId: string, newRole: string): void;
}
