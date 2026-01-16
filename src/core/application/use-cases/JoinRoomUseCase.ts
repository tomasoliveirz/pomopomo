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

import { IUserProfileRepository } from '../ports/IUserProfileRepository';

export class JoinRoomUseCase {
    constructor(
        private roomRepo: IRoomRepository,
        private participantRepo: IParticipantRepository,
        private userProfileRepo: IUserProfileRepository,
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

        // Enforce Source of Truth for Identity
        // Enforce Source of Truth for Identity
        let displayName = input.displayName;
        let avatarUrl: string | null = null;

        if (input.userId) {
            const profile = await this.userProfileRepo.findByUserId(input.userId);
            if (profile) {
                if (profile.displayName) displayName = profile.displayName;
                avatarUrl = profile.avatarUrl ?? null;
            }
            // If profile doesn't exist yet, we stick with input.displayName -> which might be provisional
        }

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
                displayName: displayName, // Use enforced name
                avatarUrl: avatarUrl,     // Use profile avatar
                role: sessionId.equals(room.props.hostSessionId) ? 'host' : 'guest',
                isMuted: false,
                joinedAt: now,
                lastSeenAt: now
            });
            try {
                await this.participantRepo.save(participant);
            } catch (error: any) {
                // Handle potential race condition: P2002 Unique constraint failed
                if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
                    const existing = input.userId
                        ? await this.participantRepo.findByUserId(room.id, input.userId)
                        : null;

                    if (existing) {
                        participant = existing;
                    } else {
                        throw error;
                    }
                }
                // Handle FK violation (User ID invalid/deleted) - P2003
                else if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
                    console.error(`[JoinRoom] Invalid userId ${input.userId} - user likely deleted.`);
                    throw new Error('User session invalid. Please sign out and sign in again.');
                }
                else {
                    throw error;
                }
            }
        } else {
            // Upgrade path: if participant exists by sessionId but has no userId, and we now have a userId
            if (!participant.props.userId && input.userId) {
                participant = new Participant({
                    ...participant.props,
                    userId: input.userId,
                    displayName: displayName, // Update name to profile name
                    avatarUrl: avatarUrl      // Update avatar to profile avatar
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
