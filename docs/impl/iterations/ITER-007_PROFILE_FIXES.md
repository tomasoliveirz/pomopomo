# ITER-007 — Profile API Fixes
Date: 2026-01-15 | Branch: main | Status: done

## Docs read
- `src/app/api/user/profile/route.ts`: PATCH handler
- `src/app/api/user/profile/[id]/route.ts`: GET handler

## Goal / Non-goals
- **Goal**: Resolve persistent 404 errors in browser console causing user confusion.
- **Non-goals**: New features.

## Plan
1) **PATCH Policy**: Change `PATCH /api/user/profile` to support Upsert (Create if missing) so "Edit Profile" works for legacy users.
2) **GET Policy**: Change `GET /api/user/profile/:id` to return `200 { profile: null }` instead of 404, to silence browser console errors.

## Root Cause Analysis (Deep Dive)
The persistent "404 Not Found" errors **after** code fixes were due to the application running in **Production Mode** (`npm run start`).
In this mode, Next.js serves the *compiled* build in `.next/`, effectively freezing the codebase to the last build time. Subsequent source code edits to API routes were ignored by the running server.
**Resolution**: Switched to **Development Mode** (`npm run dev`), which enables Hot Reloading. This ensures the new Upsert logic and 404 suppression fixes are immediately active.

## Implementation summary
- **Backend API**:
  - `PATCH` now creates a new profile if one doesn't exist (Upsert).
  - **Stale Session Handling**: `PATCH` profile and `POST` room now catch "Foreign Key Constraint" errors (User deleted) and return **401 Unauthorized**.
  - `GET [id]` returns 200/null for missing profiles (client handles null gracefully).
- **Frontend**:
  - `UserMenuClient`: Auto-logout if API returns 401 during profile save.

## Files changed
- `src/app/api/user/profile/route.ts`
- `src/app/api/user/profile/[id]/route.ts`

## Issues + fixes
- **Issue**: 404 on "Save Profile" -> **Fix**: PATCH creates profile if missing.
- **Issue**: 404 on "View Profile" (logs) -> **Fix**: Return 200 OK with null body.

## Checklist
- [x] PATCH Upsert works
- [x] GET returns 200 for missing profile
- [x] Console log is clean of 404s
