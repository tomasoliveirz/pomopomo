import { Segment } from '../../domain/entities/Segment';

export interface ISegmentRepository {
    save(segment: Segment): Promise<void>;
    delete(id: string): Promise<void>;
    findByRoomId(roomId: string): Promise<Segment[]>;
    deleteAllByRoomId(roomId: string): Promise<void>;
}
