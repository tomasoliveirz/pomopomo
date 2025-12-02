import { IRoomRepository } from '../ports/IRoomRepository';
import { IRoomEventsBus } from '../ports/IRoomEventsBus';
import { ISegmentRepository } from '../ports/ISegmentRepository';
import { Segment } from '../../domain/entities/Segment';
import { v4 as uuidv4 } from 'uuid';

export interface AddSegmentInput {
    roomId: string;
    kind: 'focus' | 'break' | 'long_break' | 'custom';
    durationSec: number;
    label: string;
}

export interface ReplaceQueueInput {
    roomId: string;
    segments: {
        kind: 'focus' | 'break' | 'long_break' | 'custom';
        durationSec: number;
        label: string;
        publicTask?: string;
    }[];
}

export interface ReorderQueueInput {
    roomId: string;
    fromIndex: number;
    toIndex: number;
}

export class UpdateQueueUseCase {
    constructor(
        private roomRepo: IRoomRepository,
        private segmentRepo: ISegmentRepository,
        private eventsBus: IRoomEventsBus
    ) { }

    async addSegment(input: AddSegmentInput): Promise<void> {
        const room = await this.roomRepo.findById(input.roomId);
        if (!room) throw new Error('Room not found');

        const segments = await this.segmentRepo.findByRoomId(input.roomId);
        const newOrder = segments.length;

        const segment = new Segment({
            id: uuidv4(),
            roomId: room.id,
            kind: input.kind,
            label: input.label,
            durationSec: input.durationSec,
            order: newOrder
        });

        await this.segmentRepo.save(segment);

        // Fetch updated list to broadcast
        const updatedSegments = await this.segmentRepo.findByRoomId(input.roomId);
        this.eventsBus.publishQueueUpdated(input.roomId, updatedSegments);
    }

    async replaceQueue(input: ReplaceQueueInput): Promise<void> {
        const room = await this.roomRepo.findById(input.roomId);
        if (!room) throw new Error('Room not found');

        // Delete existing segments
        await this.segmentRepo.deleteAllByRoomId(input.roomId);

        // Create new segments
        const newSegments: Segment[] = [];
        for (let i = 0; i < input.segments.length; i++) {
            const s = input.segments[i];
            const segment = new Segment({
                id: uuidv4(),
                roomId: room.id,
                kind: s.kind,
                label: s.label,
                durationSec: s.durationSec,
                order: i,
                publicTask: s.publicTask || null
            });
            await this.segmentRepo.save(segment);
            newSegments.push(segment);
        }

        this.eventsBus.publishQueueUpdated(input.roomId, newSegments);
    }

    async reorderQueue(input: ReorderQueueInput): Promise<void> {
        const segments = await this.segmentRepo.findByRoomId(input.roomId);
        if (!segments.length) return;

        const { fromIndex, toIndex } = input;
        if (fromIndex < 0 || fromIndex >= segments.length || toIndex < 0 || toIndex >= segments.length) {
            return; // Invalid indices
        }

        const item = segments[fromIndex];
        segments.splice(fromIndex, 1);
        segments.splice(toIndex, 0, item);

        // Update orders
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            // Only update if order changed
            if (seg.order !== i) {
                // We need a way to update order. 
                // Since Segment is immutable-ish in domain, we create new instance or update props?
                // Domain entities usually have methods.
                // But here we just save with new order.
                // Assuming save upserts.
                // We need to mutate the entity or create a copy with new order.
                // Let's assume we can just save it and the repo handles it, 
                // but we need to update the object property first.
                // Accessing private props... we need a method on Segment or use reflection/any.
                // Ideally Segment should have `changeOrder(newOrder)`.
                (seg as any).props.order = i;
                await this.segmentRepo.save(seg);
            }
        }

        this.eventsBus.publishQueueUpdated(input.roomId, segments);
    }
}
