import { Theme } from '../../domain/types';
import { Room } from '../../domain/entities/Room';
import { Participant } from '../../domain/entities/Participant';
import { RoomCode } from '../../domain/value-objects/RoomCode';
import { SessionId } from '../../domain/value-objects/SessionId';
import { IRoomRepository } from '../ports/IRoomRepository';
import { IParticipantRepository } from '../ports/IParticipantRepository';
import { IRoomEventsBus } from '../ports/IRoomEventsBus';
import { IClock } from '../ports/IClock';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRoomInput {
    theme?: Theme;
    hostSessionId: string;
    hostName?: string;
}

export interface CreateRoomOutput {
    room: Room;
    host: Participant;
    code: string;
}

export class CreateRoomUseCase {
    constructor(
        private roomRepo: IRoomRepository,
        private participantRepo: IParticipantRepository,
        private eventsBus: IRoomEventsBus,
        private clock: IClock
    ) { }

    async execute(input: CreateRoomInput): Promise<CreateRoomOutput> {
        const codeStr = this.generateRoomCode();
        const code = RoomCode.create(codeStr);
        const sessionId = SessionId.create(input.hostSessionId);
        const now = this.clock.now();
        const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours TTL

        const room = new Room({
            id: uuidv4(),
            code: code,
            hostSessionId: sessionId,
            theme: input.theme || 'lofi_girl',
            status: 'idle',
            currentSegmentIndex: 0,
            createdAt: now,
            expiresAt: expiresAt,
            segments: [], // Default segments would be added here or in a separate step
            participants: []
        });

        const host = new Participant({
            id: uuidv4(),
            roomId: room.id,
            sessionId: sessionId,
            displayName: input.hostName || 'Host',
            role: 'host',
            isMuted: false,
            joinedAt: now,
            lastSeenAt: now
        });

        await this.roomRepo.save(room);
        await this.participantRepo.save(host);

        this.eventsBus.publishRoomCreated(room);

        return {
            room,
            host,
            code: code.toString()
        };
    }

    private generateRoomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'pomo-';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}

