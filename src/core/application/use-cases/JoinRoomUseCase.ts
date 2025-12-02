import { Room } from '../../domain/entities/Room';
import { Participant } from '../../domain/entities/Participant';
import { RoomCode } from '../../domain/value-objects/RoomCode';
import { SessionId } from '../../domain/value-objects/SessionId';
import { IRoomRepository } from '../ports/IRoomRepository';
import { IParticipantRepository } from '../ports/IParticipantRepository';
import { IRoomEventsBus } from '../ports/IRoomEventsBus';
import { IClock } from '../ports/IClock';
import { v4 as uuidv4 } from 'uuid';

export interface JoinRoomInput {
    code: string;
    displayName: string;
    sessionId: string;
}

import { IAuthService } from '../ports/IAuthService';

export interface JoinRoomOutput {
    room: Room;
    participant: Participant;
    token: string;
}

export class JoinRoomUseCase {
    constructor(
        private roomRepo: IRoomRepository,
        private participantRepo: IParticipantRepository,
        private authService: IAuthService,
        private eventsBus: IRoomEventsBus,
        private clock: IClock
    ) { }

    async execute(input: JoinRoomInput): Promise<JoinRoomOutput> {
        const code = RoomCode.create(input.code);
        const room = await this.roomRepo.findByCode(code);

        if (!room) {
            throw new Error('Room not found');
        }

        const sessionId = SessionId.create(input.sessionId);
        const now = this.clock.now();

        // Check if already joined
        let participant = await this.participantRepo.findBySessionId(room.id, sessionId.toString());

        if (!participant) {
            participant = new Participant({
                id: uuidv4(),
                roomId: room.id,
                sessionId: sessionId,
                displayName: input.displayName,
                role: sessionId.equals(room.props.hostSessionId) ? 'host' : 'guest',
                isMuted: false,
                joinedAt: now,
                lastSeenAt: now
            });
            await this.participantRepo.save(participant);
        }

        this.eventsBus.publishRoomJoined(room, participant);

        const token = await this.authService.generateToken({
            roomId: room.id,
            sessionId: sessionId.toString(),
            participantId: participant.id,
            role: participant.role
        });

        return {
            room,
            participant,
            token
        };
    }
}
