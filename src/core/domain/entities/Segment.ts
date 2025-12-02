import { SegmentKind } from '../types';

export interface SegmentProps {
    id: string;
    roomId: string;
    kind: SegmentKind;
    label: string;
    durationSec: number;
    order: number;
    publicTask?: string | null;
}

export class Segment {
    public readonly props: SegmentProps;

    constructor(props: SegmentProps) {
        this.props = props;
    }

    get id() { return this.props.id; }
    get kind() { return this.props.kind; }
    get label() { return this.props.label; }
    get durationSec() { return this.props.durationSec; }
    get order() { return this.props.order; }
    get publicTask() { return this.props.publicTask; }

    public isFocus(): boolean {
        return this.props.kind === 'focus';
    }
}
