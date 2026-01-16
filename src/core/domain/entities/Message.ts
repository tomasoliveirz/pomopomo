
export interface MessageProps {
    id: string;
    roomId: string;
    participantId: string;
    authorName?: string; // Snapshot of author name
    text: string;
    reactions: Record<string, string[]>;
    reactionSummary?: { emoji: string; count: number }[];
    isShadowHidden: boolean;
    replyToId?: string | null;
    replyTo?: {
        id: string;
        text: string;
        participantId: string;
        displayName: string;
        isShadowHidden?: boolean;
    };
    createdAt: Date;
}

export class Message {
    public props: MessageProps;

    constructor(props: MessageProps) {
        this.props = props;
    }

    get id() { return this.props.id; }
    get participantId() { return this.props.participantId; }
    get text() { return this.props.text; }
    get reactions() { return this.props.reactions; }
    get reactionSummary() { return this.props.reactionSummary; }
    get replyTo() { return this.props.replyTo; }
    get replyToId() { return this.props.replyToId; }
    get isShadowHidden() { return this.props.isShadowHidden; }
    get createdAt() { return this.props.createdAt; }
}
