import { Task } from '../../domain/entities/Task';

export interface ITaskRepository {
    save(task: Task): Promise<void>;
    findBySegmentId(segmentId: string): Promise<Task[]>;
    findByParticipantId(segmentId: string, participantId: string): Promise<Task | null>;
}
