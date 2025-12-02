import { Role } from '../types';
import { SessionId } from '../value-objects/SessionId';

export interface ParticipantProps {
    id: string;
    roomId: string;
    sessionId: SessionId;
    displayName: string;
    role: Role;
    isMuted: boolean;
    joinedAt: Date;
    lastSeenAt: Date;
}

export class Participant {
    public readonly props: ParticipantProps;

    constructor(props: ParticipantProps) {
        this.props = props;
    }

    get id() { return this.props.id; }
    get sessionId() { return this.props.sessionId; }
    get displayName() { return this.props.displayName; }
    get role() { return this.props.role; }
    get isMuted() { return this.props.isMuted; }

    public isHost(): boolean {
        return this.props.role === 'host';
    }
}
