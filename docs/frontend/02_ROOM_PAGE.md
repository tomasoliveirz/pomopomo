# Room Page Documentation
**Path**: `src/app/room/[code]/page.tsx`

## Overview
The Room Page is the core application experience. It is a "Fatal" (critical) component that acts as a Single Page Application (SPA) within the route. It initiates the WebSocket connection, manages real-time synchronization of state (Timer, Tasks, Chat), and handles user identity resolution.

## 1. Bootstrap & Initialization Flow
The room does **not** rely solely on the URL code. It performs a robust "Bootstrap" sequence:

### Step A: API Bootstrap (`POST /api/rooms/[code]/bootstrap`)
Before connecting to WebSockets, the page calls this endpoint to:
1.  **Resolve Actor**: Identify if the user is a Guest (cookie) or Authenticated User (Session).
2.  **Check Room Status**: Verify existence and expiration.
3.  **Determine Identity**:
    - If new: creates a Participant record.
    - If existing: resumes the session.
    - **Guest Upgrade**: If a user logs in but had a guest session, the backend merges them.
4.  **Return Tokens**: Returns a specific `wsToken` (JWT) for the Socket handshake.
5.  **Profile Check**: Returns `needsProfileSetup: true` if the user is Authenticated but has an incomplete profile.

### Step B: Socket Connection
- **Library**: `socket.io-client`
- **Auth**: Connects using `auth: { token: wsToken }`.
- **Resilience**: Configured with `reconnectionAttempts: 5`.
- **Events Subscribed**:
  - `room:joined`: Initial state dump (Participants, Chat, Segments).
  - `room:state`: Real-time Timer updates (tick/tock).
  - `participants:updated`: Roster changes.
  - `tasks:updated` / `queue:updated`: Task management events.

## 2. Component Architecture (The "Control Center")

### State Management
The Page component acts as the central store (`useState` heavy) for the active room:
- **`room`**: Static room config (Theme, Code).
- **`me`**: Current user's Participant entity (Role, Name).
- **`timerState`**: Current running status (Paused/Running/Ended).
- **`segments` / `queue`**: The Pomodoro sequence.

### Sub-Components
- **`TimerCard`**: Displays the active countdown and current segment.
- **`ControlDock`**: Bottom bar for toggling overlays (Chat, Queue, Settings).
- **`QueuePanel` (Right Drawer)**: Shows the timeline of segments and tasks.
- **`ChatDrawer` (Left Drawer)**: Real-time chat.
- **`ProfileSetupModal`**: Conditional modal for name/bio setup.

## 3. Key Logic Branches

### A. The "Join Form" State
If `bootstrap` returns `status: 'needs-join'`, the user is a **new guest**:
- **UI**: Renders a dedicated "Join Room" name input screen.
- **Action**: Calls `/api/rooms/[code]/join`.
- **Result**: Stores tokens in LocalStorage and reloads to start Bootstrap Step A again.

### B. The "Progressive Onboarding" State
If `bootstrap` returns `needsProfileSetup: true`:
- **UI**: Rendering the Room normally but **immediately opens** `ProfileSetupModal`.
- **Reason**: Allows user to see the room (low friction) but prompts for "Profile Completion" (Name/Bio) non-blockingly.
- **Logic**: Passing `modalRoomId` ensures the API call updates the specific participant in this room immediately.

### C. Error Handling
- **Room Not Found**: Renders specific `<RoomNotFound />` component.
- **Connection Lost**: Displays specific error toast/banner.
- **Global Crash**: Wrapped in `<ErrorBoundary>` (react-error-boundary) to show a "Try Again" UI instead of white screen.

## 4. Edge Case Handling

1.  **Timer Drift**:
    - The client compares local time vs `segmentEndsAt`.
    - If the timer hits `00:00` but server hasn't sent "Next Segment" signal within 3s, client emits `room:request-sync` to force state correction.

2.  **Stale Closures**:
    - Where possible, `refs` (`socketRef`) are used to hold mutable instances (Socket) without triggering re-renders or getting captured in stale effects.

3.  **Optimistic Updates**:
    - When updating profile name, `setMe` is called immediately while the API processes (UX perceived speed).

4.  ** Theme Injection**:
    - `useEffect` watches `room.theme` and applies `data-theme` attribute to `document.body` for global CSS variable switching.
