import { Visibility } from '../types';

export interface TaskProps {
    id: string;
    roomId: string;
    segmentId: string;
    participantId: string;
    visibility: Visibility;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}

export class Task {
    public readonly props: TaskProps;

    constructor(props: TaskProps) {
        this.props = props;
    }

    get id() { return this.props.id; }
    get segmentId() { return this.props.segmentId; }
    get participantId() { return this.props.participantId; }
    get text() { return this.props.text; }
    get visibility() { return this.props.visibility; }
}
