# Pomopomo Social Platform Architecture

## 1. Overview
Transform Pomopomo from a transient room-based timer into a persistent social productivity platform.
**Goal:** Support millions of users with secure authentication, social connections, gamification, and private productivity spaces, while maintaining the existing guest experience.

## 2. Core Features

### 2.1 Authentication & Identity
-   **Hybrid Model:** Support both Guest (anonymous) and Authenticated Users.
-   **Auth Provider:** NextAuth.js (v5).
    -   Providers: Google, GitHub, Email/Password (Magic Links preferred for security).
-   **Roles:** `USER`, `ADMIN`.

### 2.2 User Persistence
-   **Profile:** Display name, avatar, bio, social links.
-   **History:** List of recently visited rooms (if active < 24h).
-   **Preferences:** Default theme, sound settings, favorite rooms.

### 2.3 Social Graph
-   **Friendships:** Bi-directional (Request -> Accept).
-   **Messaging:** Real-time DMs (Direct Messages) using Socket.io.
-   **Presence:** See if friends are online/studying (and in which room).

### 2.4 Gamification & Stats
-   **Tracking:**
    -   Total Focus Time (Global/Weekly/Monthly).
    -   Sessions Completed.
    -   Days Streaks.
-   **Leaderboards:**
    -   Global Rankings (Redis Sorted Sets for performance).
    -   Friends Rankings.
-   **Achievements:** Badges for milestones (e.g., "Early Bird", "Marathoner").

### 2.5 Private Space
-   **Private Whiteboard:** Persistent per user.
-   **Private Tasks:** Persistent todo list.
-   **Motivational Vault:** User's collection of quotes.

## 3. Technical Architecture

### 3.1 Database Schema (PostgreSQL + Prisma)

#### New Models:
-   `User`: The core identity.
-   `Account`: For OAuth providers (NextAuth).
-   `Session`: For database sessions (if not using JWT).
-   `Friendship`: Self-referential many-to-many on User.
-   `Message`: DMs between users.
-   `UserStats`: Aggregated statistics.
-   `PrivateBoard`: User's private canvas data.
-   `PrivateTask`: User's private todos.

### 3.2 Scalability Strategy (Millions of Users)

#### Database
-   **Indexing:** Heavy indexing on `userId` for all relational tables.
-   **Partitioning:** Consider partitioning `Message` and `DailyStatistic` tables by time if growth explodes.
-   **Connection Pooling:** PgBouncer (already critical).

#### Caching (Redis)
-   **Leaderboards:** Use Redis `Sorted Sets` (ZSET) for real-time ranking.
    -   `leaderboard:weekly`
    -   `leaderboard:alltime`
-   **Session Caching:** Store active user sessions.
-   **Presence:** Track `userId` -> `roomId` / `status`.

#### Real-time (Socket.io)
-   **User Rooms:** Each user joins a socket room `user:ID` for private notifications/DMs.
-   **Global Events:** Avoid broadcasting to "all". Use targeted events.

## 4. Implementation Phases

### Phase 1: Foundation (Auth)
-   Install `next-auth`.
-   Implement `User`, `Account`, `Session` schema.
-   Create Login/Signup pages.
-   Update `NavBar` to show User Profile / Login button.

### Phase 2: Persistence & Stats
-   Track "Time Spent" in `TimerWorker` or `TimerService`.
-   Update `UserStats` on segment completion.
-   Create Profile Page (`/u/[username]`).

### Phase 3: Social (Friends & DMs)
-   Implement Friend Request logic.
-   Create "Friends Drawer" in UI.
-   Implement 1-on-1 Chat.

### Phase 4: Private Space
-   Create `/me` dashboard.
-   Implement Private Whiteboard/Tasks persistence.

### Phase 5: Gamification
-   Implement Leaderboards using Redis.
-   Create "Rankings" page.

## 5. Security
-   **RBAC:** Role-Based Access Control for Admin routes.
-   **Data Privacy:** Private tasks/whiteboards must strictly check `userId`.
-   **Rate Limiting:** Strict limits on Friend Requests and DMs to prevent spam.
