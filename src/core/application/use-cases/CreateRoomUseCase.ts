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
    hostUserId?: string | null;
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
        const sessionId = SessionId.create(input.hostSessionId);
        const now = this.clock.now();
        const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours TTL

        let attempts = 0;
        const MAX_ATTEMPTS = 10;

        while (attempts < MAX_ATTEMPTS) {
            try {
                const code = RoomCode.generate();

                const room = new Room({
                    id: uuidv4(),
                    code: code,
                    hostSessionId: sessionId,
                    hostUserId: input.hostUserId,
                    theme: input.theme || 'lofi_girl',
                    status: 'idle',
                    currentSegmentIndex: 0,
                    createdAt: now,
                    expiresAt: expiresAt,
                    segments: [],
                    participants: []
                });

                const host = new Participant({
                    id: uuidv4(),
                    roomId: room.id,
                    sessionId: sessionId,
                    userId: input.hostUserId,
                    displayName: input.hostName || 'Host',
                    role: 'host',
                    isMuted: false,
                    joinedAt: now,
                    lastSeenAt: now
                });

                // Transactional save would be ideal, but for now sequential
                await this.roomRepo.save(room);
                await this.participantRepo.save(host);

                this.eventsBus.publishRoomCreated(room);

                return {
                    room,
                    host,
                    code: code.toString()
                };
            } catch (e: any) {
                // Handle Prisma unique constraint violation on 'code'
                if (e.code === 'P2002') {
                    attempts++;
                    continue;
                }
                throw e;
            }
        }

        throw new Error('Failed to allocate unique room code');
    }
}

