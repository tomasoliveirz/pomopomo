import { Room } from '../../domain/entities/Room';
import { RoomCode } from '../../domain/value-objects/RoomCode';

export interface IRoomRepository {
    save(room: Room): Promise<void>;
    findByCode(code: RoomCode): Promise<Room | null>;
    findById(id: string): Promise<Room | null>;
    delete(id: string): Promise<void>;
}
