# Pomopomo Timer & Queue Architecture

This document details the internal workings of the timer and queue system in Pomopomo, analyzing the flow of data, state management, and potential failure modes.

## 1. Core Components

### A. Data Sources
1.  **PostgreSQL (Primary Source of Truth):**
    *   Stores `Room` configuration, `Segments` (the queue), and persistent state.
    *   Key fields: `status` ('running', 'paused', 'idle'), `currentSegmentIndex`, `startsAt`.
2.  **Redis (Hot State):**
    *   Stores the active countdown state for high-frequency access.
    *   Key fields: `segmentEndsAt`, `remainingSec`, `lastUpdateTime`.
    *   TTL: 24 hours.

### B. Services
1.  **`TimerService`:**
    *   Handles user actions: `start`, `pause`, `skip`.
    *   Updates both Redis and PostgreSQL.
    *   Publishes events to `RoomEventsBus`.
2.  **`TimerWorker`:**
    *   Background process running every **1 second**.
    *   Responsibilities:
        *   Finds all rooms with `status: 'running'`.
        *   Checks if the current segment has ended (`now >= segmentEndsAt`).
        *   Auto-advances to the next segment.
        *   Updates Redis and PostgreSQL.
        *   Broadcasts `room:state` events.

### C. Event Bus (`SocketIoRoomEventsBus`)
*   Broadcasts real-time updates to connected clients via WebSockets.
*   Events: `room:state`, `queue:updated`, `participants:updated`.

---

## 2. The Timer Flow

### Scenario: Auto-Advancing to Next Segment

1.  **Check:** `TimerWorker` wakes up (every 1s).
2.  **Query:** Fetches running rooms from DB.
3.  **State Check:** For each room, gets `RoomTimerState` from Redis.
4.  **Condition:** If `timerState.segmentEndsAt <= now`:
    *   **Transition:** Calculates `nextIndex = currentIndex + 1`.
    *   **Update Redis:** Sets new `segmentEndsAt`, `remainingSec`, and `currentIndex`.
    *   **Update DB:** Updates `Room` entity with `currentSegmentIndex` and **`startsAt: now`**.
    *   **Broadcast:** Emits `room:state` with the new segment info.

### Scenario: Client-Side Consumption

1.  **Receive Event:** Client receives `room:state`.
2.  **Sync:** Updates local `timerState` (index, status, end time).
3.  **Countdown:** Local interval decrements the timer based on `segmentEndsAt - now`.
4.  **Transition:** When `room:state` with a *new* index arrives, the client switches the active segment and resets the timer display.

---

## 3. Analysis of the "Paused at 00:00" Bug

**Symptom:** The timer reaches 00:00 (end of segment) but stays there. The next segment does not start automatically.

**Root Causes:**

1.  **Missed WebSocket Event (Most Likely):**
    *   The `TimerWorker` successfully transitions the state on the server (Redis/DB are correct).
    *   The `room:state` event is emitted.
    *   **Failure:** The client does not receive this specific event due to a temporary network glitch or packet loss.
    *   **Result:** The client thinks it's still on the old segment. Since `now > segmentEndsAt`, the math results in `0` (or negative clamped to 0). The client waits indefinitely for a server signal to change segments.

2.  **Worker Lag / Race Condition:**
    *   If the `TimerWorker` is delayed or crashes, the transition never happens on the server.
    *   *Mitigation:* The worker runs every second. Even if one tick fails, the next should catch it.

3.  **State Desync (Fixed):**
    *   Previously, `startsAt` wasn't updated in the DB. If Redis data was lost, the fallback calculation used the *old* `startsAt`, resulting in a finished timer.
    *   *Status:* **Fixed** in the previous deployment.

## 4. Implemented Solution: "Heartbeat" & Client Polling

To make the system "bulletproof" against network issues, we implemented redundancy:

### A. Server-Side Heartbeat (Proactive)
The `TimerWorker` emits a `room:state` event periodically (every 10 seconds) for *all* running rooms, even if the segment hasn't changed.
*   **Benefit:** If a client misses the "transition" event, they will catch the next "heartbeat" event within a few seconds and correct their state.

### B. Client-Side Safety Check (Reactive)
The client knows when the timer *should* end.
*   **Logic:** If the local timer reaches `00:00` and stays there for > 2 seconds without receiving a state update:
    *   **Action:** Client emits a `room:request-sync` event.
    *   **Server:** Responds with the current full state.
