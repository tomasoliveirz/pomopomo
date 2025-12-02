# WebSocket Server

The PomoPomo WebSocket server handles real-time communication, timer synchronization, and state management. It is built with **Socket.IO** and uses **Redis** for horizontal scaling and state persistence.

## Connection

- **URL**: `ws://<host>:<port>` (e.g., `ws://localhost:3001`)
- **Transports**: `websocket`, `polling`
- **Authentication**: Requires a JWT `token` in the handshake auth object.

```javascript
const socket = io('ws://localhost:3001', {
  auth: { token: 'eyJhbG...' }
});
```

## Events

### Room Management

#### `room:joined` (Server -> Client)
Sent immediately after connection. Contains full room state.
```typescript
{
  room: Room;
  me: Participant;
  participants: Participant[];
  queue: Segment[];
}
```

#### `room:state` (Server -> Client)
Broadcasted whenever the timer or room status changes.
```typescript
{
  status: 'idle' | 'running' | 'paused' | 'ended';
  currentIndex: number;
  serverNow: number; // Current server timestamp
  segmentEndsAt: number | null; // Timestamp when current segment ends
  remainingSec?: number; // Only present when paused
}
```

#### `room:host-transferred` (Server -> Client)
Broadcasted when the host changes (e.g., previous host disconnected).
```typescript
{
  newHostId: string;
  newHostName: string;
  room: Room;
}
```

### Queue Management

#### `queue:updated` (Server -> Client)
Broadcasted when the queue structure changes (add/remove/reorder segments).
```typescript
{
  segments: Segment[];
}
```

#### `queue:replace` (Client -> Server)
**Host only**. Replaces the entire queue with new segments.
```typescript
{
  segments: Segment[];
}
```

#### `queue:reorder` (Client -> Server)
**Host only**. Moves a segment from one index to another.
```typescript
{
  from: number;
  to: number;
}
```

#### `queue:play` (Client -> Server)
**Host only**. Starts or resumes the timer. Optionally jumps to a specific index.
```typescript
{
  index?: number;
}
```

#### `queue:pause` (Client -> Server)
**Host only**. Pauses the timer.

#### `queue:skip` (Client -> Server)
**Host only**. Skips the current segment.

### Tasks

#### `segment:task:set` (Client -> Server)
Sets a task for a specific segment.
```typescript
{
  segmentId: string;
  text: string;
  visibility: 'private' | 'public';
}
```
- If `private`: Updates only for the sender.
- If `public` (Host): Updates for everyone.
- If `public` (Guest): Creates a **Proposal**.

#### `task:public:proposed` (Server -> Client)
Sent to the host when a guest proposes a public task.
```typescript
{
  proposal: Proposal;
}
```

### Chat

#### `chat:send` (Client -> Server)
Sends a chat message.
```typescript
{
  text: string;
}
```

#### `chat:message` (Server -> Client)
Broadcasted when a new message is received.
```typescript
{
  id: string;
  participantId: string;
  text: string;
  createdAt: string;
}
```

### Proposals

#### `proposal:submit` (Client -> Server)
Submit a generic proposal (add segment, edit segment, etc.).

#### `proposal:moderate` (Client -> Server)
**Host only**. Accept or reject a proposal.
```typescript
{
  id: string;
  decision: 'accepted' | 'rejected';
}
```
