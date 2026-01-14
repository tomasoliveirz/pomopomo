# PomoPomo → Social Study Network (Roadmap)

> Goal: evolve the current real-time “rooms + timer” product into a scalable social platform with **hybrid identity** (Guests + Users), **public discovery**, **profiles**, **rankings**, **private messaging**, and **privacy-first dashboards**, shipped in incremental releases.

---

## 0) Product Principles (Non-Negotiables)

### 0.1 Hybrid Identity (Guest + User)
- Guests can participate with minimal friction.
- Authenticated users unlock social features (profile, rankings, DMs, notifications, room hosting, moderation).
- Everything is implemented around an internal **Actor** concept:
  - `actorType`: `guest` | `user`
  - `actorId`: `sessionId` (guest) | `userId` (user)
- A single connection/session can be **upgraded** from guest → user without breaking room participation.

### 0.2 Real-Time UX First, Server Authority Always
- Client can do “smooth UI” (interpolation, optimistic UI), but **server is authoritative** for:
  - timer state
  - room membership
  - moderation actions
  - rate limits / abuse checks
  - stats integrity

### 0.3 Default Privacy + Explicit Sharing
- Goals, focus plans, and personal dashboards are private by default.
- Public info (profile bio/pronouns/language) is opt-in and scoped.

### 0.4 Scale by Design (Avoid Global Scans)
- No “scan all rooms every second” patterns.
- Prefer event-driven scheduling, TTLs, and background jobs.
- Store “hot state” in Redis; persist aggregates in Postgres.

---

## 1) Release Strategy

- **Release 0** (Foundation): Identity + Permissions + Anti-abuse + Core scalability fixes
- **Release 1** (Discovery): Public rooms, languages, 24h “recent rooms”
- **Release 2** (Presence + Profiles): online/offline/busy, profile page, settings
- **Release 3** (Stats + Rankings): weekly/monthly/yearly leaderboards
- **Release 4** (Social): friends + DMs + in-app notifications
- **Release 5** (Private Dashboard): goals, streaks, personal analytics

Each release has:
- **Epics**
- **Backend work**
- **Frontend work**
- **Data model**
- **API/WS changes**
- **Security & abuse**
- **Definition of Done**
- **Success metrics**

---

## 2) Release 0 — Social Foundation (Ship-Safe Core)

### 2.1 Objectives
- Add real authentication (Google OAuth first; optional email later).
- Preserve Guest experience.
- Introduce permissions for “Guest vs User” across REST + WebSocket.
- Add anti-abuse controls required for public launch.
- Fix the known scaling bottlenecks (timer scheduling + write amplification + broadcast storms) enough to support “public discovery”.

### 2.2 Epics

#### Epic A — Identity & Auth
**User stories**
- As a user, I can sign in with Google and keep my identity across devices.
- As a guest, I can still join rooms without signing in.
- As a guest, I can upgrade to a user account without losing my current room session.

**Backend tasks**
- Add `User` model (and Auth provider tables if using Auth.js / NextAuth).
- Create `Actor` abstraction in server code:
  - `actorType`, `actorId`, `sessionId`, `userId?`
- Implement “upgrade path”:
  - If a guest logs in, attach `userId` to the same `sessionId` (or map session → user).
- Issue short-lived `wsToken` that includes:
  - `actorType`, `actorId`
  - `roomId`, `participantId`
  - `roomRole` (host/participant)
  - `exp` (short TTL)

**Frontend tasks**
- Add sign-in / sign-out UI.
- Keep “Continue as Guest” path as default (or explicit choice).

**Definition of Done**
- Guests can join rooms exactly like today.
- Guests can join rooms exactly like today.
- Signed-in users persist identity and have a `userId` attached to presence/messages/stats.
- **[NEW]** Progressive Onboarding: missing profile does not block room entry.

---

#### Epic B — Permissions & Feature Gating
**Policy**
- Guests:
  - ✅ view public rooms list (rate-limited)
  - ✅ join public rooms
  - ✅ join private rooms with invite link/code
  - ✅ chat (rate-limited, anti-spam)
  - 🚫 cannot appear in leaderboards
  - 🚫 cannot send DMs
  - 🚫 cannot create public rooms (optional: allow private/unlisted with strict limits)
- Users:
  - ✅ can create public rooms
  - ✅ can DM, have profile, appear in rankings
  - ✅ can manage notification preferences

**Backend tasks**
- Implement authorization guards in:
  - REST endpoints (create room, list rooms, join room)
  - WebSocket events (dm:send, room:create, moderation events)
- Implement per-event permission checks (not just handshake auth).

**Frontend tasks**
- Hide locked features for guests.
- Show clear “Sign in to unlock” CTAs.

**Definition of Done**
- No “guest bypass” for locked features (server-enforced).
- Audit log lines for denied actions (for debugging + abuse review).

---

#### Epic C — Anti-Abuse & Rate Limiting (Required for Public Rooms)
**Backend tasks**
- Global rate limits (Redis):
  - per IP
  - per sessionId (guest)
  - per userId (user)
- Add Turnstile (or equivalent) protection for:
  - create room
  - spammy endpoints (optional)
- Add “chat flood control”:
  - per actor message rate
  - per room message rate
- Add “room create limits”:
  - guest: very low (or disabled)
  - user: reasonable + exponential backoff

**Frontend tasks**
- Render Turnstile widget on room creation for guests (or for everyone initially).
- UX for “you are doing that too fast”.

**Definition of Done**
- Bots cannot create thousands of rooms quickly.
- Chat spam is throttled before it becomes a broadcast storm.

---

#### Epic D — Timer Scheduling Refactor (Remove Global Scan)
**Backend tasks**
- Replace “scan all rooms every second” with event-driven scheduling:
  - On state transition, enqueue a delayed job for the next transition timestamp.
  - On room pause/reset, cancel/replace scheduled job (idempotent).
- Ensure correctness under concurrency:
  - per room distributed lock (Redis)
  - idempotency keys for scheduled jobs
- Worker design:
  - minimal job payload: `{ roomId, expectedStateVersion }`
  - validate the room state version before applying

**Definition of Done**
- CPU usage does not scale linearly with number of active rooms.
- Timers remain accurate when many rooms are running.

---

#### Epic E — Reduce Database Write Amplification (Write-Behind)
**Backend tasks**
- Keep “hot state” in Redis (timer state, presence, ephemeral counters).
- Persist to Postgres only:
  - room created/ended
  - membership changes (coalesced)
  - aggregated stats (batch/periodic)
- Add a “persister” worker:
  - batches writes
  - uses backpressure
  - retries with exponential backoff
  - guarantees monotonic progress

**Definition of Done**
- Postgres write rate stays stable under high timer churn.
- No per-second writes per active room.

---

#### Epic F — Broadcast Storm Controls (Real-Time Scalability)
**Backend tasks**
- Event throttling & dedupe:
  - timer ticks: do NOT broadcast every second to everyone
  - instead broadcast only transitions + occasional sync pulses
- “Volatile” delivery for non-critical updates.
- Per-room “fanout budget”:
  - detect when a room is producing too many events
  - degrade gracefully (less frequent sync)

**Frontend tasks**
- Timer interpolation on client:
  - smooth UI using last sync time + drift correction
- Reconnect behavior:
  - request a full state snapshot on reconnect

**Definition of Done**
- Large rooms do not melt the server with tick spam.
- Clients stay visually smooth.

---

### 2.3 Release 0 — Success Metrics
- Room create/list endpoints stable under load testing.
- WebSocket connection stability under burst reconnects.
- P95 room “state sync” latency < target.
- Postgres write QPS reduced vs baseline.

---

## 3) Release 1 — Public Discovery + Languages + “Recent Rooms (24h)”

### 3.1 Objectives
- Turn rooms into discoverable content.
- Add language tags to create “rooms by language”.
- Provide a “recent rooms” concept limited to last 24h.

### 3.2 Epics

#### Epic A — Room Visibility Modes
- `visibility`: `public` | `unlisted` | `private`
  - public: listed
  - unlisted: not listed; join via link
  - private: join via code/invite; never listed

#### Epic B — Room Discovery Page
- Filters:
  - language: `pt`, `en`, `es`, `intl`, …
  - size (participants)
  - status (active/idle)
  - tags (future)
- Pagination + caching.

#### Epic C — “My Recent Rooms” (24h)
- For signed-in users: server-stored list (TTL 24h)
- For guests: localStorage list (TTL 24h)

### 3.3 Data Model (High Level)
- `Room.visibility`
- `Room.language`
- `Room.lastActiveAt`
- `UserRecentRoom` (optional) with TTL semantics

### 3.4 DoD
- Public rooms discoverable with stable pagination.
- Private rooms never appear in public listing.
- Recent rooms logic proven with tests.

---

## 4) Release 2 — Presence + Profiles + Settings

### 4.1 Objectives
- Online/offline/busy presence.
- Public profile page (bio/pronouns/language).
- Private settings (notification preferences, privacy toggles).

### 4.2 Epics

#### Epic A — Presence System
- Presence state: `offline` | `online` | `busy`
- Stored in Redis with TTL + heartbeat.
- “Busy” automatically when user is in an active room (configurable).

#### Epic B — Profile
- Public fields:
  - display name
  - avatar
  - bio
  - pronouns
  - languages
- Privacy toggles:
  - show/hide presence
  - show/hide “currently in a room”

#### Epic C — Preferences
- Notification settings:
  - DMs
  - friend requests
  - room invites
- Optional email notifications later.

### 4.3 DoD
- Presence updates are cheap (no broadcast storms).
- Profile page renders fast and is cacheable.
- Settings are enforced on server.

---

## 5) Release 3 — Stats + Rankings (Week / Month / Year)

### 5.1 Objectives
- Track “focus hours studied” with integrity.
- Provide leaderboards:
  - weekly, monthly, yearly
- Prevent obvious gaming.

### 5.2 Epics

#### Epic A — Stats Tracking (Server-Side)
- Record focus time from:
  - room participation + timer state transitions
- Stats integrity rules:
  - only count time while user is in a room and timer is “running”
  - cap per day
  - ignore suspicious bursts

#### Epic B — Leaderboards
- Fast leaderboards in Redis (sorted sets).
- Periodic persistence in Postgres for history/analytics.
- Views:
  - global
  - by language (optional)
  - friends-only (later)

### 5.3 DoD
- Leaderboards update in near real-time without heavy DB writes.
- Weekly rollover logic is correct across timezones.
- Anti-cheat heuristics prevent trivial exploitation.

---

## 6) Release 4 — Social Core: Friends + DMs + Notifications

### 6.1 Objectives
- Private messaging (1:1).
- Friend requests and friend graph.
- In-app notifications (with opt-out).

### 6.2 Epics

#### Epic A — Friend Graph
- Friend requests:
  - send / accept / reject / block
- Privacy:
  - allow DMs: everyone | friends | nobody
- Abuse controls:
  - request rate limits
  - blocklist

#### Epic B — DMs (Real-Time + Reliable-ish)
- WebSocket DM channel per user:
  - join `user:<userId>`
- Message persistence:
  - store messages in Postgres (or partition by conversation)
- Delivery semantics:
  - at-least-once with client dedupe
  - “read receipts” optional later

#### Epic C — Notifications
- In-app notifications stream (WebSocket)
- Notification center UI
- Preferences + mute controls

### 6.3 DoD
- DMs are rate-limited and abuse-protected.
- Blocklist works across DMs, room interactions, and presence visibility.
- Notifications respect user preferences.

---

## 7) Release 5 — Private Dashboard: Goals + Personal Analytics

### 7.1 Objectives
- Private goals page per user.
- Streaks and progress charts.
- Optional “share a goal” public mode.

### 7.2 Epics
- Goals CRUD:
  - daily/weekly targets
  - long-term goals
- Analytics:
  - focus time by day/week/month
  - language breakdown
  - room participation patterns
- Privacy:
  - goals private by default
  - share toggles per goal

### 7.3 DoD
- Goals are private and encrypted at rest if desired (optional).
- Analytics queries are optimized (materialized aggregates, not raw scans).

---

## 8) Cross-Cutting Engineering Workstreams (Ongoing)

### 8.1 Observability
- Structured logs with:
  - actorType/actorId
  - roomId
  - event name
- Metrics:
  - WS connections
  - events/sec
  - Redis ops/sec
  - DB writes/sec
  - job queue delay

### 8.2 Testing Strategy
- Unit tests:
  - permission gates
  - stats integrity
- Integration tests:
  - join/create flows
  - wsToken handshake
- Load tests:
  - room list endpoints
  - WS fanout scenarios
  - timer transitions at scale

### 8.3 Data & Migration Safety
- Add new tables/fields in backwards-compatible steps.
- Feature flags for:
  - new auth flow
  - new scheduling worker
  - new listing endpoint
- Backfill jobs for new aggregates.

---

## 9) “What Do I Build First?” (Immediate Execution Order)

1. **Release 0 / Epic A+B**: Identity + Permissions (Actor model, wsToken claims, server enforcement)
2. **Release 0 / Epic C**: Anti-abuse (rate limits + Turnstile on create room)
3. **Release 0 / Epic D**: Event-driven timer scheduling
4. **Release 0 / Epic E+F**: Reduce DB writes + prevent broadcast storms
5. **Release 0 / Epic G**: Progressive Onboarding (UX Polish + Hardening) - *Done*
5. **Release 1**: Public discovery + languages + visibility modes
6. **Release 2**: Presence + profiles
7. **Release 3**: Stats + leaderboards
8. **Release 4**: Friends + DMs + notifications
9. **Release 5**: Goals + personal analytics

---

## 10) Notes / Guardrails

- Keep “Guest mode” extremely lightweight and safe.
- Restrict room creation for guests unless you have strong abuse controls.
- Never broadcast per-second timer ticks to all clients.
- Treat everything user-generated as untrusted input (validation + quotas).
