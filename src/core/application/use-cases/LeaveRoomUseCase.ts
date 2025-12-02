import { IRoomRepository } from '../ports/IRoomRepository';
import { IParticipantRepository } from '../ports/IParticipantRepository';
import { IPresenceRepository } from '../ports/IPresenceRepository';
import { IRoomEventsBus } from '../ports/IRoomEventsBus';
import { IClock } from '../ports/IClock';
import { Room } from '../../domain/entities/Room';
import { Participant } from '../../domain/entities/Participant';

export interface LeaveRoomInput {
    roomId: string;
    participantId: string;
}

export class LeaveRoomUseCase {
    constructor(
        private roomRepo: IRoomRepository,
        private participantRepo: IParticipantRepository,
        private presenceRepo: IPresenceRepository,
        private eventsBus: IRoomEventsBus,
        private clock: IClock
    ) { }

    async execute(input: LeaveRoomInput): Promise<void> {
        const { roomId, participantId } = input;

        // Remove presence
        await this.presenceRepo.removePresence(roomId, participantId);

        // Update participant last seen
        const participant = await this.participantRepo.findById(participantId);
        if (participant) {
            const updatedParticipant = new Participant({
                ...participant.props,
                lastSeenAt: this.clock.now(),
            });
            await this.participantRepo.save(updatedParticipant);
        }

        // Check if room is empty or needs host transfer
        const activeIds = await this.presenceRepo.getPresence(roomId);
        const allParticipants = await this.participantRepo.findByRoomId(roomId);
        const activeParticipants = allParticipants.filter(p => activeIds.includes(p.id));

        // Broadcast updated participant list
        this.eventsBus.publishParticipantsUpdated(roomId, activeParticipants);

        if (activeParticipants.length > 0) {
            // Check if leaver was host
            // We need to know if the leaver was the host.
            // We can check the room's hostSessionId? No, that's session ID.
            // We can check the participant's role.

            if (participant && participant.role === 'host') {
                // Host left. Assign new host.
                // Find oldest active participant
                const sortedActive = [...activeParticipants].sort((a, b) =>
                    a.props.joinedAt.getTime() - b.props.joinedAt.getTime()
                );

                const newHost = sortedActive[0];
                if (newHost) {
                    // Update new host role
                    const updatedNewHost = new Participant({
                        ...newHost.props,
                        role: 'host'
                    });
                    await this.participantRepo.save(updatedNewHost);

                    // Update leaver role to guest (if they return)
                    const updatedLeaver = new Participant({
                        ...participant.props,
                        role: 'guest'
                    });
                    await this.participantRepo.save(updatedLeaver);

                    // Broadcast new host
                    // We need to broadcast the updated participant list again?
                    // Or a specific event?
                    // The client updates roles based on participant list.
                    // So we should broadcast participants updated again.

                    const updatedActiveParticipants = activeParticipants.map(p =>
                        p.id === newHost.id ? updatedNewHost : p
                    );

                    this.eventsBus.publishParticipantsUpdated(roomId, updatedActiveParticipants);
                }
            }
        } else {
            // Room is empty.
            // We can trigger a cleanup job or just leave it for the worker.
            // For now, we do nothing. The TimerWorker or a CleanupWorker can handle it.
        }
    }
}
