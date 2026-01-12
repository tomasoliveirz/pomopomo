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
    userId?: string | null;
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

        // 1. Try to find by sessionId
        let participant = await this.participantRepo.findBySessionId(room.id, sessionId.toString());

        // 2. If we have a userId, try to find by userId as well
        let userParticipant = input.userId
            ? await this.participantRepo.findByUserId(room.id, input.userId)
            : null;

        if (userParticipant) {
            // If user already has a participant record, that's the one we use
            participant = userParticipant;
        } else if (!participant) {
            // If no participant found at all, create a new one
            participant = new Participant({
                id: uuidv4(),
                roomId: room.id,
                sessionId: sessionId,
                userId: input.userId,
                displayName: input.displayName,
                role: sessionId.equals(room.props.hostSessionId) ? 'host' : 'guest',
                isMuted: false,
                joinedAt: now,
                lastSeenAt: now
            });
            await this.participantRepo.save(participant);
        } else {
            // Upgrade path: if participant exists by sessionId but has no userId, and we now have a userId
            if (!participant.props.userId && input.userId) {
                participant = new Participant({
                    ...participant.props,
                    userId: input.userId
                });
                await this.participantRepo.save(participant);
            }
        }

        // Update lastSeenAt for the chosen participant
        participant = new Participant({
            ...participant.props,
            lastSeenAt: now
        });
        await this.participantRepo.save(participant);

        this.eventsBus.publishRoomJoined(room, participant);

        const token = await this.authService.generateToken({
            roomId: room.id,
            sessionId: sessionId.toString(),
            participantId: participant.id,
            role: participant.role,
            actorType: input.userId ? 'user' : 'guest',
            userId: input.userId
        });

        return {
            room,
            participant,
            token
        };
    }
}
