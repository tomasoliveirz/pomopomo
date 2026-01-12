import { RoomStatus, Theme } from '../types';
import { RoomCode } from '../value-objects/RoomCode';
import { SessionId } from '../value-objects/SessionId';
import { Participant } from './Participant';
import { Segment } from './Segment';

export interface RoomProps {
    id: string;
    code: RoomCode;
    hostSessionId: SessionId;
    hostUserId?: string | null;
    theme: Theme;
    status: RoomStatus;
    currentSegmentIndex: number;
    startsAt?: Date | null;
    createdAt: Date;
    expiresAt: Date;
    segments?: Segment[];
    participants?: Participant[];
}

export class Room {
    public readonly props: RoomProps;

    constructor(props: RoomProps) {
        this.props = props;
    }

    get id() { return this.props.id; }
    get code() { return this.props.code; }
    get status() { return this.props.status; }
    get currentSegmentIndex() { return this.props.currentSegmentIndex; }
    get segments() { return this.props.segments || []; }

    public isRunning(): boolean {
        return this.props.status === 'running';
    }

    public getCurrentSegment(): Segment | undefined {
        return this.props.segments?.find(s => s.order === this.props.currentSegmentIndex);
    }

    public transferHost(newHostSessionId: SessionId): void {
        this.props.hostSessionId = newHostSessionId;
    }
}
