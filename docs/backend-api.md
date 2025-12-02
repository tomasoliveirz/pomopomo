# Backend API

The backend exposes a RESTful API for room management and initial connection setup. All responses follow a standard JSON format.

## Base URL
`/api`

## Standard Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## Endpoints

### Create Room
Creates a new room and returns the room details along with a WebSocket token for the host.

- **URL**: `/rooms`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "theme": "midnight_bloom", // optional
    "hostName": "Alice"        // optional, default "Host"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "room": { ... },
      "participant": { ... },
      "wsToken": "eyJhbG..."
    }
  }
  ```
- **Cookies**: Sets a `sessionId` cookie.

### Join Room
Joins an existing room.

- **URL**: `/rooms/[code]/join`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "displayName": "Bob"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "participant": { ... },
      "room": { ... },
      "wsToken": "eyJhbG..."
    }
  }
  ```

### Get Room Info
Retrieves public information about a room.

- **URL**: `/rooms/[code]`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "room": { ... },
      "participantCount": 5
    }
  }
  ```

### Get Room History
Retrieves historical data for a room (segments, focus time).

- **URL**: `/rooms/[code]/history`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "room": { ... },
      "segments": [ ... ],
      "participantCount": 5,
      "totalFocusMinutes": 120,
      "completedSegments": 4
    }
  }
  ```

## Authentication
The API uses a `sessionId` cookie to identify users across requests.
- **WebSocket Token**: The `wsToken` returned by Create/Join endpoints is a short-lived JWT used to authenticate the WebSocket connection.
