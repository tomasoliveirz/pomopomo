# Frontend Auth & Hybrid Identity Plan

## 1. Current State Analysis
- **Guest-First Architecture**: The app currently assigns a `sessionId` cookie to every visitor via `middleware.ts`. This is excellent and should be preserved.
- **NextAuth Configured**: `lib/auth.ts` exists with Google Provider, but is not active in the UI.
- **No Global Auth Context**: `layout.tsx` does not wrap the app in `<SessionProvider>`, so `useSession` hook will not work yet.
- **UI**: No "Sign In", "Sign Out", or "Profile" buttons exist.

## 2. The "Hybrid Identity" Challenge
Use case:
1. User visits as Guest -> has `sessionId: abc-123`.
2. Guest joins a room, earns some "focus stats" (recorded against `sessionId: abc-123`).
3. Guest decides to "Log in to save progress".
4. **Requirement**: The stats for `sessionId: abc-123` must be moved or linked to the exciting new `userId`.

## 3. Implementation Strategy

### 3.1 Session Merging (Backend)
We need to ensure that when `NextAuth` creates a session, it respects the existing context.
*   **Trigger**: On successful sign-in callback in `lib/auth.ts`.
*   **Action**: Link the `sessionId` from cookies to the new `User` record (or ensure the `Actor` resolution logic looks up `User` by `sessionId` temporarily).
*   **Better Approach**: The `ws-token` endpoint *already* has logic for this: `if (actor.actorType === 'user' && !participant.props.userId) ...`. This suggests the "Link" happens when the user *joins a room* while authenticated.
    *   *Refinement*: We should keep this "Lazy Linking" for now to avoid complex auth callbacks.

### 3.2 Frontend Integration Steps

#### Step 1: Add SessionProvider
Wrap `children` in `src/app/layout.tsx`:
```tsx
<SessionProvider>
  {children}
</SessionProvider>
```

#### Step 2: Create `UserMenu` Component
A new component `src/components/UserMenu.tsx` that handles the hybrid state:
- If `status === 'loading'`: Show skeleton.
- If `status === 'unauthenticated'`: Show "Sign In" button (triggers `signIn('google')`).
- If `status === 'authenticated'`: Show User Avatar + Dropdown (Sign Out, Profile, Settings).

#### Step 3: Integrate into Pages
- **Home Page**: Place `UserMenu` in absolute top-right.
- **Room Page**: Place `UserMenu` in the header/navbar.
- **Join Room**: Use `session.user.name` to pre-fill the "Display Name" field.

### 3.3 Auth State & API
When calling API endpoints (e.g. `POST /api/rooms`), we need to send the Auth Token.
- **NextAuth** handles cookies automatically.
- **Backend** `getActorFromRequest` needs to check **BOTH**:
    1.  NextAuth Session (JWT/Database) -> if present, `actorType = 'user'`.
    2.  If missing, fall back to `sessionId` cookie -> `actorType = 'guest'`.

## 4. Proposed File Changes

### `src/app/layout.tsx`
- Import `SessionProvider` from a new client component wrapper (since layout is server).

### `src/components/auth/AuthWrapper.tsx` (New)
- Client component to wrap `SessionProvider`.

### `src/components/UserMenu.tsx` (New)
- The main UI for login/logout.

### `src/lib/actor.ts` (Backend)
- Verify it checks `getServerSession` first.

## 5. Verification
- **Scenario A (Guest)**: Incognito window -> Join room -> Verify `actorType: guest` in WS token.
- **Scenario B (User)**: Login -> Join room -> Verify `actorType: user` in WS token.
- **Scenario C (Upgrade)**: Join as guest -> Click "Login" -> Redirect back -> Verify `userId` is attached to participant.
