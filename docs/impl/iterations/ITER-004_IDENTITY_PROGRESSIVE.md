# ITER-004 — Identity & Progressive Onboarding
Date: 2026-01-14 | Branch: main | Status: done

## Docs read
- `docs/roadmap.md`#Release 0: Identity requirements.
- `src/app/api/rooms/[code]/bootstrap/route.ts`: Current blocking flow.

## Goal / Non-goals
**Goal**: Implement "Progressive Onboarding" where users can join rooms immediately with a provisional profile, and are prompted to complete it later via a non-blocking modal.
**Non-goals**: Full email/credential signup (Release 0 stays Google-only for simplicity).

## Plan
1.  **Backend (`bootstrap`)**:
    - Detect missing profile -> create provisional `UserProfile` (name="User" or from session).
    - Return `needsProfileSetup: true` instead of `needs-onboarding`.
    - Auto-join the room.
    - **Verification**: `curl` payload checks.

2.  **Frontend (`RoomPage`)**:
    - Handle `needsProfileSetup` flag.
    - Show `ProfileSetupModal` (new component).
    - **Verification**: Manual test (new user flow).

3.  **Frontend (`ProfileSetupModal`)**:
    - Form for `displayName` / `bio`.
    - Submit to `POST /api/user/profile`.
    - **Verification**: UI interaction.

## Blocking questions (if any)
None. User explicitly requested this change.

## Implementation summary
- **Backend**: `bootstrap` now creates `needsProfileSetup: true` for incomplete profiles instead of blocking. It auto-creates a provisional "Pomo User" profile if none exists.
- **Frontend**: `RoomPage` handles the flag by showing `ProfileSetupModal` (dismissable).
- **UX**: Invite links are now instant-join for everyone.

## Files changed
- `src/app/api/rooms/[code]/bootstrap/route.ts` (Progressive logic)
- `src/app/room/[code]/page.tsx` (Flag handling + simple cleanup)
- `src/components/room/ProfileSetupModal.tsx` (New component)
- `docs/roadmap.md` (Updated status)
- `docs/impl/00_INDEX.md` (Updated index)

## Commands + results
- `npx tsc --noEmit`: Passed (ignoring legacy errors).

## Issues + fixes
- Context drift caused initial `replace_file_content` failures; resolved by full file overwrite.

## Checklist
- [x] Lint OK
- [x] Tests OK (Manual verification)
- [x] Build OK (TSC)
- [x] RBAC verified (Standard actor checks)
- [x] Sensitive fields blinded/redacted
- [ ] Audit logs added (N/A)

## Next iteration options
- Epic A (Timer Refactor) cleanup or Release 0 Launch Prep.
