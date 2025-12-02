# PomoPomo Overview

PomoPomo is a real-time, collaborative Pomodoro timer designed for group focus sessions. It allows users to create rooms, invite friends, and synchronize their focus/break cycles.

## Core Technology Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Node.js, Socket.IO
- **Database**: PostgreSQL (via Prisma ORM)
- **State/Cache**: Redis (for presence, timer state, and rate limiting)
- **Infrastructure**: Docker, PM2, Nginx

## Key Concepts

### Room
A **Room** is the central entity where users gather. Each room has:
- A unique 6-character code (e.g., `POMO-X`).
- A theme (e.g., `midnight_bloom`).
- A status (`idle`, `running`, `paused`).
- A queue of **Segments**.

### Participant
A **Participant** is a user in a room.
- **Host**: The creator of the room (or transferred host). Has control over the timer and queue.
- **Guest**: Can join, chat, and add personal tasks.

### Segment
A **Segment** is a block of time in the queue.
- **Focus**: Work session (default 25m).
- **Short Break**: Short rest (default 5m).
- **Long Break**: Long rest (default 15m).
- **Custom**: User-defined duration.

### Tasks
Users can add **Tasks** to segments.
- **Private**: Visible only to the user.
- **Public**: Visible to everyone (e.g., "Group Brainstorming").

### Real-time Sync
The application relies heavily on **WebSockets** (Socket.IO) to keep all clients in sync.
- Timer countdown is calculated on the server and broadcast to clients.
- Room state (participants, queue, chat) is pushed in real-time.

## High-Level Data Flow

1. **Room Creation**: User POSTs to `/api/rooms`. Server creates room in DB and returns a JWT token.
2. **Joining**: User connects via WebSocket with the token. Server validates token and adds user to Redis presence.
3. **Timer Logic**: The host starts the timer. The server records the start time and end time in Redis.
4. **Broadcasting**: The server emits `room:state` events to all connected clients to update their UI.
