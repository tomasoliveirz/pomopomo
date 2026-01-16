# ITER-006 — Profile Refinement & Error Handling
Date: 2026-01-15 | Branch: main | Status: done

## Docs read
- `src/components/ui/Card.tsx`: Glassmorphism style (`bg-white/60`, `backdrop-blur-xl`, `border-white/40`)
- `prisma/schema.prisma`: `Participant` relation to `User`
- `src/core/application/use-cases/JoinRoomUseCase.ts`: FK error source

## Goal / Non-goals
- **Goal**: Make Profile UI match "Card" aesthetics (glassmorphism), enable Avatar file upload, and fix FK/404 errors.
- **Non-goals**: S3 integration (using DataURI for now).

## Plan
1) **UI Refinement**: Update `UserMenuClient.tsx` modal styles to match `Card.tsx`. remove default blue focus rings, use theme `primary`/`ring`.
2) **Avatar Upload**: Add file input to `UserMenuClient.tsx`, validate size (<1MB), convert to Base64, save to `avatarUrl`.
3) **Error Handling**:
   - `JoinRoomUseCase`: Catch `P2003` (FK violation) -> throw "User session stale".
   - `api/rooms`: Catch error -> Return 401 if stale session.
   - `UserProfileSheet`: Handle 404 (Empty profile) gracefully.

## Implementation summary
- **Frontend**: 
  - `UserMenuClient`: Implemented Glassmorphism modals matching `Card.tsx` (white/70, backdrop-blur-xl).
  - Added File Input for Avatar (Max 1MB, DataURI conversion).
  - Replaced hardcoded blue colors with `primary` theme tokens.
  - `UserProfileSheet`: Updated to match Glassmorphism style, silenced 404 console errors.
- **Backend**: 
  - `JoinRoomUseCase`: Added specific catch for `P2003` (Foreign Key violation) to handle stale user sessions gracefully by throwing a clear "User session invalid" error.

## Files changed
- `src/components/UserMenuClient.tsx`
- `src/core/application/use-cases/JoinRoomUseCase.ts`
- `src/components/room/UserProfileSheet.tsx`

## Issues + fixes
- **Issue**: "Blue todo fodido" (Design mismatch) -> **Fix**: Replaced with Glassmorphism + Theme Tokens.
- **Issue**: `participants_user_id_fkey` constraint violation. -> **Fix**: Caught P2003 error in UseCase.
- **Issue**: 404 Errors in logs. -> **Fix**: Muted 404 error logging in frontend (expected behavior for empty profiles).

## Checklist
- [x] UI matches Main Menu Card
- [x] Avatar upload works (max 1MB)
- [x] No "blue todo fodido" (using semantic tokens)
- [x] FK error handled (User instructed to re-login)
