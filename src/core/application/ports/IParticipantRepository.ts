import { Participant } from '../../domain/entities/Participant';

export interface IParticipantRepository {
    save(participant: Participant): Promise<void>;
    findByRoomId(roomId: string): Promise<Participant[]>;
    findBySessionId(roomId: string, sessionId: string): Promise<Participant | null>;
    findById(id: string): Promise<Participant | null>;
}
