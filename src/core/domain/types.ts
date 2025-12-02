export type Theme =
    | 'midnight_bloom'
    | 'lilac_mist'
    | 'solar_cream'
    | 'verdant_dew'
    | 'sakura_ink'
    | 'arctic_drift'
    | 'amber_dusk'
    | 'coral_velvet'
    | 'noir_mint';

export type SegmentKind = 'focus' | 'break' | 'long_break' | 'custom';
export type RoomStatus = 'idle' | 'running' | 'paused' | 'ended';
export type Role = 'host' | 'guest';
export type Visibility = 'private' | 'public';
export type ProposalType = 'add_segment' | 'edit_segment' | 'public_task';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected';
