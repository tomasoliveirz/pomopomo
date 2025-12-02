import { IRoomRepository } from '../ports/IRoomRepository';
import { IRoomEventsBus } from '../ports/IRoomEventsBus';
import { Theme, Role } from '../../domain/types';
import { Room } from '../../domain/entities/Room';

export interface UpdateRoomPrefsInput {
    roomId: string;
    theme?: Theme;
    role: Role;
}

export class UpdateRoomPrefsUseCase {
    constructor(
        private roomRepo: IRoomRepository,
        private eventsBus: IRoomEventsBus
    ) { }

    async execute(input: UpdateRoomPrefsInput): Promise<Room> {
        if (input.role !== 'host') {
            throw new Error('Only host can update room preferences');
        }

        const room = await this.roomRepo.findById(input.roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        let updatedRoom = room;

        if (input.theme) {
            updatedRoom = new Room({
                ...room.props,
                theme: input.theme
            });
        }

        await this.roomRepo.save(updatedRoom);

        // Publish event
        this.eventsBus.publishRoomStateUpdated(updatedRoom);

        return updatedRoom;
    }
}
