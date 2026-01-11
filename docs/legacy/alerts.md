# Alerts System

PomoPomo provides a robust alerting system to notify users when a segment ends, even if the tab is in the background.

## Features

### 🔔 Audio Chime
- **Sound**: A short, high-pitched "pop" sound.
- **Customization**:
  - **Repeats**: Can repeat up to 3 times (spaced 2s apart).
  - **Boost**: Increases volume/density for noisy environments.
- **Implementation**: Uses the Web Audio API (`AudioContext`) for precise timing and synthetic sound generation (no external MP3 files).

### 💬 Desktop Notifications
- Uses the browser's `Notification` API.
- Requires user permission (requested on first enable).
- Shows a system banner with the text "Time's up!".

### 📳 Vibration
- Uses the `navigator.vibrate()` API.
- Works primarily on Android devices.
- Pattern: `[200, 100, 200]` (Vibrate-Pause-Vibrate).

### 📑 Tab Title Flashing
- If the tab is hidden when the timer ends, the page title flashes between "⏰ Time's up!" and the original title.
- Helps grab attention in a crowded browser tab bar.

## Technical Details

### Audio Context Unlocking
Browsers (especially iOS Safari) block audio playback until a user interaction occurs.
- The `AlertsSettings` component handles this by calling `unlockAudioOnce()` on the first "Test Sound" click or toggle.
- `useAlarm` hook manages the `AudioContext` state, resuming it if suspended.

### Preferences Persistence
- Settings are saved to `localStorage` under the key `pomopomo-alerts`.
- Loaded automatically on page load via `alerts/prefs.ts`.

### Engine
The core logic resides in `src/alerts/engine.ts`.
- `handleSegmentEnd()`: Called by the `RoomPage` when the WebSocket receives a `segmentEndsAt` event that matches the current time (or when the local countdown hits zero).
