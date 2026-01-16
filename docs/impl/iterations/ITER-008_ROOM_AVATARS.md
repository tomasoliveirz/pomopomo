# ITER-008 — Room Avatars & Profile Integration
Date: 2026-01-15 | Branch: main | Status: planned

## Docs read
- `src/core/domain/entities/Participant.ts`: Missing `avatarUrl`.
- `src/infrastructure/repositories/PrismaParticipantRepository.ts`: Needs mapping update.
- `src/components/room/RoomClient.tsx`: UI for circles.

## Goal / Non-goals
- **Goal**: Display user avatars in Room Circles and Chat List. Make avatars clickable to view profile.
- **Non-goals**: Changing avatar from inside the room (already handled in User Menu).

## Implementation summary
- **Domain**: Added `avatarUrl` to `Participant` (prop/getter/updater).
- **Repo**: Updated `PrismaParticipantRepository` to fetch `user.profile.avatarUrl`.
- **Use Case**: `JoinRoomUseCase` now populates `avatarUrl` for existing users.
- **Frontend**:
  - `Participant` type updated.
  - `MemberList.tsx`: Renders `<img src={avatarUrl}>`, shows fallback initials if null.
  - Added interaction: Clicking participant circle opens `UserProfileSheet` via `onParticipantClick`.
- **Real-time**: Updated `ws-server` to sync avatar changes live to all participants.

## Files changed
- `src/core/domain/entities/Participant.ts`
- `src/infrastructure/db/prisma/PrismaParticipantRepository.ts`
- `src/core/application/use-cases/JoinRoomUseCase.ts`
- `src/ws-server/index.ts`
- `src/components/room/MemberList.tsx`
- `src/components/room/RoomClient.tsx`
- `src/types/index.ts`

## Verification Plan
1) **Join Room**: Join as a user with an avatar.
2) **Visual Check**: Verify avatar appears in the circle.
3) **Visual Check**: Verify avatar appears in the chat list.
4) **Interaction**: Click avatar -> Profile Sheet opens.
