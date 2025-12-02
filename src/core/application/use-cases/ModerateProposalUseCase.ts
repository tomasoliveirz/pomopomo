import { IProposalRepository } from '../ports/IProposalRepository';
import { ISegmentRepository } from '../ports/ISegmentRepository';
import { IRoomEventsBus } from '../ports/IRoomEventsBus';
import { IClock } from '../ports/IClock';
import { ProposalStatus, Role } from '../../domain/types';
import { Segment } from '../../domain/entities/Segment';
import { v4 as uuidv4 } from 'uuid';

export interface ModerateProposalInput {
    id: string;
    roomId: string;
    role: Role;
    decision: ProposalStatus;
}

export class ModerateProposalUseCase {
    constructor(
        private proposalRepo: IProposalRepository,
        private segmentRepo: ISegmentRepository,
        private eventsBus: IRoomEventsBus,
        private clock: IClock
    ) { }

    async execute(input: ModerateProposalInput): Promise<any> {
        if (input.role !== 'host') {
            throw new Error('Only host can moderate proposals');
        }

        const proposal = await this.proposalRepo.findById(input.id);
        if (!proposal) {
            throw new Error('Proposal not found');
        }

        if (proposal.roomId !== input.roomId) {
            throw new Error('Proposal does not belong to this room');
        }

        // Update proposal status
        const updatedProposal = {
            ...proposal,
            status: input.decision,
            moderatedAt: this.clock.now(),
        };
        await this.proposalRepo.save(updatedProposal);

        // If accepted, apply changes
        if (input.decision === 'accepted') {
            await this.applyProposal(proposal);
        }

        return updatedProposal;
    }

    private async applyProposal(proposal: any) {
        if (proposal.type === 'add_segment') {
            const segmentData = proposal.payload;
            const existingSegments = await this.segmentRepo.findByRoomId(proposal.roomId);

            const newSegment = new Segment({
                id: uuidv4(),
                roomId: proposal.roomId,
                kind: segmentData.kind,
                label: segmentData.label,
                durationSec: segmentData.durationSec,
                order: existingSegments.length,
            });

            await this.segmentRepo.save(newSegment);

            // We need to fetch all segments to broadcast queue update
            // But IRoomEventsBus.publishQueueUpdated expects segments?
            // Or we can just let the client fetch?
            // The old code emitted queue:updated with all segments.
            const allSegments = [...existingSegments, newSegment];
            this.eventsBus.publishQueueUpdated(proposal.roomId, allSegments);

        } else if (proposal.type === 'public_task') {
            const taskPayload = proposal.payload;
            if (taskPayload.segmentId && taskPayload.text) {
                const segments = await this.segmentRepo.findByRoomId(proposal.roomId);
                const segment = segments.find(s => s.id === taskPayload.segmentId);

                if (segment) {
                    const updatedSegment = new Segment({
                        ...segment.props,
                        publicTask: taskPayload.text
                    });
                    await this.segmentRepo.save(updatedSegment);

                    // Broadcast public task update
                    // We don't have a specific event in IRoomEventsBus for this yet?
                    // We can use publishQueueUpdated as it contains the updated segment.
                    const updatedSegments = segments.map(s => s.id === updatedSegment.id ? updatedSegment : s);
                    this.eventsBus.publishQueueUpdated(proposal.roomId, updatedSegments);
                }
            }
        } else if (proposal.type === 'edit_segment') {
            const editPayload = proposal.payload;
            if (editPayload.segmentId) {
                const segments = await this.segmentRepo.findByRoomId(proposal.roomId);
                const segment = segments.find(s => s.id === editPayload.segmentId);

                if (segment) {
                    const updatedSegment = new Segment({
                        ...segment.props,
                        label: editPayload.label,
                        durationSec: editPayload.durationSec,
                        kind: editPayload.kind,
                    });
                    await this.segmentRepo.save(updatedSegment);

                    const updatedSegments = segments.map(s => s.id === updatedSegment.id ? updatedSegment : s);
                    this.eventsBus.publishQueueUpdated(proposal.roomId, updatedSegments);
                }
            }
        }
    }
}
