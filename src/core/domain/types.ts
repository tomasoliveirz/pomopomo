export type Theme =
    | 'lofi_girl'
    | 'matcha_latte'
    | 'sky_blue'
    | 'night_mode'
    | 'strawberry';

export type SegmentKind = 'focus' | 'break' | 'long_break' | 'custom';
export type RoomStatus = 'idle' | 'running' | 'paused' | 'ended';
export type Role = 'host' | 'guest';
export type Visibility = 'private' | 'public';
export type ProposalType = 'add_segment' | 'edit_segment' | 'public_task';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected';
