import { Role } from '../types';
import { SessionId } from '../value-objects/SessionId';

export interface ParticipantProps {
    id: string;
    roomId: string;
    sessionId: SessionId;
    userId?: string | null;
    displayName: string;
    avatarUrl?: string | null;
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
    get userId() { return this.props.userId; }
    get displayName() { return this.props.displayName; }
    get avatarUrl() { return this.props.avatarUrl; }
    get role() { return this.props.role; }
    get isMuted() { return this.props.isMuted; }

    public isHost(): boolean {
        return this.props.role === 'host';
    }

    public updateDisplayName(newName: string): void {
        (this.props as any).displayName = newName;
    }

    public updateAvatarUrl(newUrl: string | null): void {
        (this.props as any).avatarUrl = newUrl;
    }
}
