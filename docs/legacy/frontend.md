# Frontend Architecture

The PomoPomo frontend is built with **Next.js 14 (App Router)**, **React**, and **Tailwind CSS**. It focuses on a clean, distraction-free UI with real-time updates.

## Project Structure

- `src/app/`: Next.js App Router pages and layouts.
  - `page.tsx`: Landing page.
  - `create/page.tsx`: Room creation form.
  - `join/page.tsx`: Room join form.
  - `room/[code]/page.tsx`: The main room interface.
  - `layout.tsx`: Global layout (fonts, metadata).
  - `globals.css`: Global styles and Tailwind directives.

- `src/components/`: Reusable UI components.
  - `room/`: Components specific to the room interface.
  - `AdBanner.tsx`: Placeholder for ads.
  - `Logo.tsx`: SVG Logo component.
  - `Toast.tsx`: Notification component.

- `src/hooks/`: Custom React hooks.
  - `useAlarm.ts`: Manages audio context and plays focus/break alarms.
  - `useSaveStatus.ts`: Handles auto-saving state with visual feedback.

## Key Components

### Room Page (`src/app/room/[code]/page.tsx`)
This is the core of the application. It handles:
- WebSocket connection initialization.
- Room state management (`room`, `participants`, `segments`, `timerState`).
- Event listeners for real-time updates (`room:state`, `queue:updated`, etc.).

### TimerCard (`src/components/room/TimerCard.tsx`)
Displays the countdown timer and current segment status.
- Calculates remaining time based on server timestamp (`segmentEndsAt`).
- Handles local tick updates (every second).
- Plays alarms using `useAlarm` when timer reaches zero.

### QueuePanel (`src/components/room/QueuePanel.tsx`)
Displays the list of upcoming segments (Focus, Break, etc.).
- Allows the host to add, remove, or reorder segments.
- Shows predicted end times for future segments.
- Supports inline editing of segment labels and durations.

### TaskDock (`src/components/room/TaskDock.tsx`)
*Note: This component was removed during cleanup as it was unused.*

## Theming
Themes are applied via CSS variables defined in `globals.css`.
The `RoomPage` applies a `data-theme` attribute to the `<body>` tag based on the room's setting (e.g., `midnight_bloom`, `solar_cream`).

## WebSocket Integration
The frontend connects to the WebSocket server using `socket.io-client`.
- **Connection**: Establishes connection in `useEffect` within `RoomPage`.
- **Authentication**: Sends a JWT token (stored in `localStorage`) during handshake.
- **Reconnection**: Automatically attempts to reconnect on disconnect.
