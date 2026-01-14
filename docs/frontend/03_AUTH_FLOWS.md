# Auth & Onboarding Documentation

## 1. Onboarding Page
**Path**: `src/app/onboarding/page.tsx`

### Purpose
Dedicated page for setting up a User Profile (DisplayName, Bio) when the "In-Room Modal" is insufficient or when explicitly redirected by legacy flows.

### Flows
- **Incoming**: Redirected from `/auth/signin` or manually accessed.
- **Params**: supports `?callbackUrl=...` to return user to previous context (e.g., a room).
- **Logic**:
  1. Checks if User is authenticated.
  2. Fetches current profile (if exists).
  3. Form submission calls `POST /api/user/profile`.
  4. On success, redirects to `callbackUrl` or `/`.

## 2. Identity Bridge (Component)
**Path**: `src/components/auth/IdentityBridge.tsx`

### Purpose
A headless (invisible) component mounted in `RootLayout`. It acts as the "Session Sync" layer.

### Responsibilities
- **Session -> LocalStorage**: Watches the Auth.js Session.
- **Sync**: If a user logs in, it ensures relevant local storage flags are cleared or set to avoid conflicts with Guest tokens.
- **Future**: Ideal place for initializing analytics or global user tracking.

## 3. Authentication Strategy (Auth.js)

### Providers
- **Google**: Primary production provider (`auth-google-id`).
- **Dev Login (Credentials)**:
  - **Enabled Only In**: Development (`NODE_ENV=development` OR localhost).
  - **Purpose**: Allows testing "Authenticated User" flows (like Guest Upgrade) without needing real Google API keys/Redirect URIs configured.

### Guest vs User Handling
- **Guest**: Identified by `sessionId` cookie (managed by Next.js middleware or client-generated UUID stored in localStorage/cookie).
- **User**: Identified by `session.user.id` (Auth.js JWT).
- **Conflict Resolution**: The Backend (`bootstrap`) is the source of truth for merging these identites.
