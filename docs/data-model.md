# Data Model

The application uses **PostgreSQL** with **Prisma ORM**. Below is the schema overview.

## Core Entities

### Room
Represents a focus session room.
- `id`: UUID.
- `code`: Unique 6-character code (e.g., `POMO-X`).
- `hostSessionId`: The session ID of the current host.
- `theme`: Visual theme (e.g., `midnight_bloom`).
- `status`: `idle`, `running`, `paused`, `ended`.
- `currentSegmentIndex`: Index of the active segment in the queue.
- `expiresAt`: Timestamp when the room is eligible for cleanup.

### Segment
A time block within a room's queue.
- `kind`: `focus`, `break`, `long_break`, `custom`.
- `durationSec`: Duration in seconds.
- `order`: Position in the queue (0-indexed).
- `publicTask`: Optional shared task for this segment.

### Participant
A user in a room.
- `sessionId`: Unique ID from the user's cookie (persists across reloads).
- `role`: `host` or `guest`.
- `isMuted`: Whether the user is auto-muted for spam.
- `lastSeenAt`: Timestamp of last activity.

### Task
A user's task for a specific segment.
- `visibility`: `private` (only visible to user) or `public` (visible to all).
- `text`: The task description.

### Proposal
A request from a guest to modify the room state (e.g., add a public task).
- `type`: `add_segment`, `edit_segment`, `public_task`.
- `status`: `pending`, `accepted`, `rejected`.
- `payload`: JSON data describing the change.

### Message
A chat message.
- `text`: Content.
- `isShadowHidden`: If true, only visible to the sender (spam protection).

## Statistics

### DailyStatistic
Aggregated metrics for reporting.
- `date`: The date of the stats.
- `roomsCreated`: Number of rooms created.
- `totalParticipants`: Total unique participants joined.
- `totalSessions`: Total unique sessions.
- `totalFocusMinutes`: Sum of duration of all completed focus segments.

## Data Lifecycle

1. **Creation**: Rooms are created with an `expiresAt` timestamp (default 72 hours).
2. **Active Use**: Real-time state is mirrored in **Redis** for performance (`room:timer:*`, `room:presence:*`).
3. **Cleanup**: The `clean-rooms.ts` script runs periodically (via cron or manual trigger).
   - It iterates over all rooms.
   - It aggregates usage data into `DailyStatistic`.
   - It **deletes** the rooms from Postgres (cascading to segments, participants, etc.).
   - It clears associated keys from Redis.
