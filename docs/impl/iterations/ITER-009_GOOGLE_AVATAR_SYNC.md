# ITER-009 — Google Avatar Sync
Date: 2026-01-16 | Branch: main | Status: done

## Goal
Ensure users who sign in with Google (and haven't customized their profile) have their Google Avatar synced to `UserProfile.avatarUrl`.

## Problem
Currently, `UserProfile.avatarUrl` is only set on creation. If a user registered before this logic or if it failed, they see fallback initials ("T") instead of their Google picture. `JoinRoomUseCase` relies strictly on `UserProfile`, ignoring the transient session image.

## Solution
Add `signIn` event handler in `src/lib/auth.ts`:
- On every sign-in, check if `UserProfile.avatarUrl` is null.
- If null, update it with `user.image` (from Google Provider).
- This ensures older accounts or those with missing avatars get auto-healed.

## Changes
- Modified `src/lib/auth.ts` to add `events.signIn`.
- Updated `PrismaParticipantRepository` to fallback to `user.image` if `user.profile.avatarUrl` is null. This accounts for cases where the sync hasn't run yet but the User entity has the image from OAuth.

## Verification
- User must **Sign Out** and **Sign In** again to trigger the sync.
- After relogin, `UserProfile` will have the URL, and `JoinRoomUseCase` will serve it to the Room.
