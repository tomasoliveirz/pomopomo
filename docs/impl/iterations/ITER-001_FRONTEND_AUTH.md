# ITER-001 — Frontend Auth & Hybrid Identity
Date: 2026-01-13 | Branch: feature/frontend-auth | Status: Planned

## Docs read
- `docs/impl/frontend_auth_plan.md`: Previous analysis.
- `src/app/layout.tsx`: Root layout structure.
- `src/app/room/[code]/page.tsx`: Socket connection logic.

## Goal / Non-goals
- **Goal**: Implement "Hybrid Identity" where users can upgrade from Guest -> User without losing context.
- **Non-goals**: Complex profile settings page (just the menu for now).

## Plan (Execution by Commits)

### Commit 1: Auth Foundations (Providers + Actor + Bridge)
The "invisible" plumbing.
*   **[NEW]** `src/components/providers/AuthProvider.tsx`: Client wrapper for `SessionProvider`.
*   **[NEW]** `src/lib/actor.ts`: `resolveActor(req)` helper that checks NextAuth session -> then Guest cookie.
*   **[NEW]** `src/app/api/identity/claim/route.ts`: Endpoint to "merge" guest session into user account (idempotent).
*   **[NEW]** `src/components/auth/IdentityBridge.tsx`: Global component that:
    1.  Watches `status === 'authenticated'`.
    2.  Calls `/api/identity/claim`.
    3.  Updates local `wsToken` if a new one is returned (or triggers reload).
*   **[MOD]** `src/app/layout.tsx`: Wrap app in `AuthProvider` and add `<IdentityBridge />`.

### Commit 2: UI Components (UserMenu)
The visible part.
*   **[NEW]** `src/components/UserMenu.tsx`:
    *   `unauthenticated`: "Sign In" button.
    *   `authenticated`: Avatar + Dropdown (Sign Out).
    *   `guest`: Optional "Guest" label.
*   **[MOD]** `src/app/page.tsx`: Add `UserMenu` to top-right.
*   **[MOD]** `src/components/room/RoomHeader.tsx`: Add `UserMenu` to header.

### Commit 3: Room Code Migration (4-char)
Cleanup "pomo-" prefix.
*   **[MOD]** `src/core/domain/value-objects/RoomCode.ts`:
    *   Update validation regex to `^[A-Z0-9]{4}$`.
    *   Update `normalize` to strip `pomo-` prefix if present (backwards compat).
*   **[MOD]** `src/components/JoinRoom.tsx`: Update input validation.

### Commit 4: WebSocket Reconnect Logic
Ensure the "live" room connection respects the new identity.
*   **[MOD]** `src/app/room/[code]/page.tsx`:
    *   Listen for `localStorage` changes (event) or custom event from `IdentityBridge`.
    *   If token changes, `socket.disconnect()` -> update auth -> `socket.connect()`.
    *   *Alternative*: `IdentityBridge` triggers `window.location.reload()` on successful claim (Simpler, Robust).

## Verification Plan

### Automated Tests
*   **Unit**: Test `RoomCode.normalize` with `pomo-ABCD`, `abcd`, `ABCD`.
*   **Unit**: Test `resolveActor` mock scenarios (Session vs Cookie).

### Manual Verification
1.  **Guest Flow**: Open Incognito -> Join Room `ABCD` -> Verify "Guest" label in participants.
2.  **Upgrade Flow**: Click "Sign In" -> Complete Google Auth -> Verify "Claiming identity..." toast -> Verify "Guest" label disappears / Avatar appears.
3.  **Persistence**: Reload page -> Still logged in, still in room.
4.  **Legacy Link**: Open `localhost:3000/room/pomo-ABCD` -> Should redirect or work as `ABCD`.
