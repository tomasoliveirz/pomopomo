import { ITaskRepository } from '../ports/ITaskRepository';
import { ISegmentRepository } from '../ports/ISegmentRepository';
import { IProposalRepository } from '../ports/IProposalRepository';
import { IClock } from '../ports/IClock';
import { Task } from '../../domain/entities/Task';
import { Segment } from '../../domain/entities/Segment';
import { Visibility, Role } from '../../domain/types';
import { v4 as uuidv4 } from 'uuid';

export interface SetTaskInput {
    roomId: string;
    segmentId: string;
    participantId: string;
    text: string;
    visibility: Visibility;
    role: Role; // Needed to check if host
}

export class ManageTasksUseCase {
    constructor(
        private taskRepo: ITaskRepository,
        private segmentRepo: ISegmentRepository,
        private proposalRepo: IProposalRepository,
        private clock: IClock
    ) { }

    async execute(input: SetTaskInput): Promise<{ task?: Task; proposal?: any; isPublicUpdate?: boolean }> {
        if (input.visibility === 'private') {
            const task = await this.setPrivateTask(input);
            return { task };
        } else {
            if (input.role === 'host') {
                await this.setPublicTask(input);
                return { isPublicUpdate: true };
            } else {
                const proposal = await this.createPublicTaskProposal(input);
                return { proposal };
            }
        }
    }

    private async setPrivateTask(input: SetTaskInput): Promise<Task> {
        let task = await this.taskRepo.findByParticipantId(input.segmentId, input.participantId);
        const now = this.clock.now();

        if (task) {
            task = new Task({
                ...task.props,
                text: input.text,
                visibility: 'private',
                updatedAt: now
            });
        } else {
            task = new Task({
                id: uuidv4(),
                roomId: input.roomId,
                segmentId: input.segmentId,
                participantId: input.participantId,
                text: input.text,
                visibility: 'private',
                createdAt: now,
                updatedAt: now
            });
        }

        await this.taskRepo.save(task);
        return task;
    }

    private async setPublicTask(input: SetTaskInput): Promise<void> {
        const segments = await this.segmentRepo.findByRoomId(input.roomId);
        const segment = segments.find(s => s.id === input.segmentId);

        if (segment) {
            const updatedSegment = new Segment({
                ...segment.props,
                publicTask: input.text
            });
            await this.segmentRepo.save(updatedSegment);
        }
    }

    private async createPublicTaskProposal(input: SetTaskInput): Promise<any> {
        const proposal = {
            id: uuidv4(),
            roomId: input.roomId,
            type: 'public_task',
            payload: {
                segmentId: input.segmentId,
                text: input.text,
            },
            createdBy: input.participantId,
            status: 'pending',
            createdAt: this.clock.now(),
        };

        await this.proposalRepo.save(proposal as any);
        return proposal;
    }
}
