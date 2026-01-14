import { IRoomEventsBus } from '@core/application/ports/IRoomEventsBus';
import { Room } from '../../core/domain/entities/Room';
import { Participant } from '../../core/domain/entities/Participant';
import { Segment } from '../../core/domain/entities/Segment';

export class NullRoomEventsBus implements IRoomEventsBus {
    publishRoomCreated(room: Room): void { }
    publishRoomJoined(room: Room, participant: Participant): void { }
    publishRoomStateUpdated(room: Room): void { }
    publishQueueUpdated(roomId: string, segments: Segment[]): void { }
    publishParticipantsUpdated(roomId: string, participants: Participant[]): void { }
    publishParticipantRoleUpdated(roomId: string, participantId: string, newRole: string): void { }
}
