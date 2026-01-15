// Core types matching Prisma schema
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

// Entity interfaces
export interface Segment {
  id: string;
  kind: SegmentKind;
  label: string;
  durationSec: number;
  order: number;
  publicTask?: string | null;
}

export interface Room {
  id: string;
  code: string;
  hostParticipantId: string;
  theme: Theme;
  status: RoomStatus;
  currentSegmentIndex: number;
  startsAt?: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface Participant {
  id: string;
  displayName: string;
  role: Role;
  isMuted: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

export interface Task {
  id: string;
  segmentId: string;
  participantId: string;
  visibility: Visibility;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;
  type: ProposalType;
  payload: any;
  status: ProposalStatus;
  createdBy: string;
  createdAt: string;
  moderatedAt?: string | null;
}

export interface Message {
  id: string;
  participantId: string;
  text: string;
  reactions: Record<string, string[]>; // Legacy
  isShadowHidden: boolean;
  createdAt: string;
  // Social features
  replyTo?: {
    id: string;
    text: string;
    participantId: string;
    displayName: string;
  };
  reactionSummary?: { emoji: string; count: number }[];
  myReactions?: string[];
}

export type ShapeType = 'pen' | 'rect' | 'circle' | 'text';

export interface Stroke {
  id: string;
  userId: string;
  type: ShapeType;
  color: string;
  points: number[][]; // [x, y, pressure]
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  content?: string; // For text
  strokeWidth?: number;
  fontSize?: number;
}

// Socket.IO event types
export interface ClientEvents {
  'room:create': (data: { theme?: Theme }, callback: (response: any) => void) => void;
  'room:join': (data: { code: string; displayName: string }, callback: (response: any) => void) => void;
  'queue:get': (callback: (response: any) => void) => void;
  'queue:replace': (data: { segments: Segment[]; clientVersion?: number }, callback?: (ok: boolean) => void) => void;
  'queue:reorder': (data: { from: number; to: number; clientVersion?: number }, callback?: (ok: boolean) => void) => void;
  'queue:add': (data: { segment: Omit<Segment, 'id'>; clientTempId?: string; clientVersion?: number }, callback?: (ok: boolean) => void) => void;
  'queue:remove': (data: { segmentId: string; clientVersion?: number }, callback?: (ok: boolean) => void) => void;
  'queue:play': (data: { index?: number }) => void;
  'queue:pause': () => void;
  'queue:skip': () => void;
  'segment:task:set': (data: { segmentId: string; text: string; visibility: Visibility }, callback?: (ok: boolean) => void) => void;
  'task:set': (data: { segmentId: string; text: string; visibility: Visibility }) => void;
  'proposal:submit': (data: { type: ProposalType; payload: any }) => void;
  'proposal:moderate': (data: { id: string; decision: 'accepted' | 'rejected' }, callback?: (ok: boolean) => void) => void;
  'chat:send': (data: { text: string }) => void;
  'message:reply': (data: { text: string; replyToId: string }) => void;
  'message:react': (data: { messageId: string; emoji: string }) => void;
  'prefs:update': (data: { tickEnabled?: boolean; compactUI?: boolean; theme?: Theme }) => void;
  'whiteboard:draw': (data: { roomId: string; stroke: Stroke }) => void;
  'whiteboard:erase': (data: { roomId: string; strokeId: string }) => void;
  'whiteboard:clear': (roomId: string) => void;
  'whiteboard:request-state': (roomId: string) => void;
  'pong': () => void;
}

export interface ServerEvents {
  'room:created': (data: { room: Room; code: string }) => void;
  'room:joined': (data: { room: Room; me: Participant; participants: Participant[]; queue: Segment[]; messages: Message[] }) => void;
  'room:state': (data: { status: RoomStatus; currentIndex: number; serverNow: number; segmentEndsAt: number | null; remainingSec?: number }) => void;
  'room:host-transferred': (data: { newHostId: string; newHostName: string; room: Room }) => void;
  'queue:snapshot': (data: { segments: Segment[]; version: number }) => void;
  'queue:updated': (data: { segments: Segment[] }) => void;
  'queue:patched': (data: { patch: any; version: number }) => void;
  'segment:consumed': (data: { segmentId: string }) => void;
  'participants:updated': (data: { list: Participant[] }) => void;
  'task:updated': (data: { segmentId: string; participantId: string; patch: Partial<Task> }) => void;
  'task:private:updated': (data: { segmentId: string; participantId: string; text: string }) => void;
  'task:public:proposed': (data: { proposal: Proposal }) => void;
  'task:public:updated': (data: { segmentId: string; text: string }) => void;
  'proposal:updated': (data: Proposal) => void;
  'chat:message': (data: Message) => void;
  'message:reaction': (data: { messageId: string; emoji: string; action: 'added' | 'removed'; participantId: string; counts: Record<string, number> }) => void;
  'whiteboard:state': (strokes: Stroke[]) => void;
  'whiteboard:new-stroke': (stroke: Stroke) => void;
  'whiteboard:erase': (strokeId: string) => void;
  'whiteboard:clear': () => void;
  'toast': (data: { level: 'info' | 'error' | 'success'; message: string }) => void;
  'error': (data: { message: string; code?: string }) => void;
  'ping': (data: { timestamp: number }) => void;
  'participant:role_updated': (data: { participantId: string; newRole: string }) => void;
}

export interface InterServerEvents {
  'internal:update_role': (participantId: string, newRole: string) => void;
}

// WebSocket JWT payload
export interface WsTokenPayload {
  roomId: string;
  sessionId: string;
  participantId: string;
  role: Role;
  actorType: 'user' | 'guest';
  userId?: string | null;
  exp: number;
}

// Room timer state (in Redis)
export interface RoomTimerState {
  status: RoomStatus;
  currentIndex: number;
  segmentEndsAt: number | null; // timestamp
  remainingSec: number; // for paused state
  lastUpdateTime: number;
  serverNow: number;
}




