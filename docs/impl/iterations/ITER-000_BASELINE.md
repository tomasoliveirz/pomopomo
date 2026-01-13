# ITER-000 — Baseline Analysis
Date: 2026-01-13 | Branch: main | Status: Done

## Docs read
- `docs/roadmap.md`: Full roadmap analysis.
- `prisma/schema.prisma`: Data model verification.
- `src/infrastructure/ws/TimerWorker.ts`: Timer logic check.
- `src/app/api/rooms/[code]/ws-token/route.ts`: Auth logic check.

## Goal / Non-goals
- **Goal**: Analyze current codebase state against `docs/roadmap.md` to determine "Where are we?".
- **Non-goals**: Fixing issues found.

## Implementation Summary

### 1. Identity & Auth (Epic A) — DONE (Ship-Safe)
- **Found**: `Actor` type (`guest` | `user`).
- **Found**: `ws-token` endpoint handles "upgrade" logic (attaching `userId` to `sessionId`).
- **Note**: Verify `getActorFromRequest` implementation usage as an audit follow-up.

### 2. Permissions (Epic B) — PARTIAL
- **Found**: Logic to check `role` in `ws-token`.
- **Gap**: Need to audit all API endpoints for `Actor` based guards.

### 3. Anti-abuse (Epic C) — BASELINE PRESENT (Hardening Incomplete)
- **Found**: `RedisRateLimiter` exists.
- **Found**: DoS guard via `maxHttpBufferSize`.
- **Gap**: No Turnstile. No "chat flood control". No exponential backoff for room creation.

### 4. Timer Refactor (Epic D) — MISSING (POLLING)
- **Status**: The codebase uses **polling/scanning**.
- **Evidence**: `TimerWorker.ts` runs strictly every 1000ms and calls `findRunningRooms()`.
- **Roadmap Requirement**: "Replace scan all rooms every second with event-driven scheduling".
- **Risk**: Cost O(R) per second + write amplification.
- **Conclusion**: This epic is **not implemented**.

### 5. Write-Behind (Epic E) — MISSING
- **Status**: Direct DB writes.
- **Evidence**: `TimerWorker.ts` calls `this.roomRepo.save(nextRoom)` directly inside the loop.
- **Risk**: Write amplification on every second tick per room.

## Next Recommendations
1. **Fix Timer**: The polling architecture will not scale. Prioritize Epic D (Event-driven).
2. **Implement Writer Worker**: Decouple DB writes from the timer loop (Epic E).
3. **Add Anti-abuse**: Before public launch, Turnstile and better rate limits are needed (Epic C).
