# ITER-003 — Anti-Abuse Hardening (QA Updated)
Date: 2026-01-13 | Branch: main | Status: done

## Docs read
- `src/infrastructure/security/rateLimit/*`
- `ws-server/handlers/*`

## Goal
Implement robust "Defense in Depth" rate limiting for public launch.

## Implementation Details
1.  **Centralized Rules**: `src/infrastructure/security/rateLimit/rules.ts` defines all limits (HTTP/WS) in one place.
2.  **Atomic Redis**: `RedisRateLimiter.ts` uses Lua script to ensure `INCR` + `EXPIRE` are atomic.
    - **Optimization**: Handles `TTL=-1` self-healing logic inside Lua.
3.  **HTTP Protection**:
    - `POST /join`: 10/min (IP) + 30/min (Room).
    - `POST /ws-token`: 20/min (IP).
4.  **Socket Protection**:
    - **Connection**: `x-forwarded-for` aware middleware (20/min IP).
    - **Handlers**: All critical events (`chat`, `whiteboard`, `task`, `proposal`) use `rateLimitOrThrow`.
    - **Host Controls**: Queue/Timer actions limited by Room ID.
5.  **Fixes**:
    - `whiteboard:draw` now fails-closed (throws 429) instead of failing-open.
    - `RoomPage` socket cleanup fixed.

## Verification
- **Static**: Lint passes.
- **Runtime**: `scripts/test-rate-limits.ts` updated to check `whiteboard` and `chat`.
  - *Known Issue*: Local run requires `REDIS_HOST=localhost` and clean build.

## QA Gate Improvements
- [x] **Whiteboard**: Switched from `checkLimit` (hardcoded) to `rules.ts`.
- [x] **Lua**: Removed unused `max` arg; added TTL check.
- [x] **Tests**: Added whiteboard spam simulation.
