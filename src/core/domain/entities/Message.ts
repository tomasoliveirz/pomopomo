export interface MessageProps {
    id: string;
    roomId: string;
    participantId: string;
    text: string;
    reactions: Record<string, string[]>;
    isShadowHidden: boolean;
    createdAt: Date;
}

export class Message {
    public readonly props: MessageProps;

    constructor(props: MessageProps) {
        this.props = props;
    }

    get id() { return this.props.id; }
    get roomId() { return this.props.roomId; }
    get participantId() { return this.props.participantId; }
    get text() { return this.props.text; }
    get createdAt() { return this.props.createdAt; }
}
