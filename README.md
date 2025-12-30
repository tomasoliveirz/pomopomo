# PomoPomo

A real-time collaborative Pomodoro timer designed for teams to sync their focus sessions, manage shared tasks, and stay in flow together.

> **Note**: The application UI and some operational text are in Portuguese.

## Features

- **Real-time Synchronization**: Room state, timer, and tasks sync instantly across all clients using WebSockets.
- **Collaborative Queue**: Shared timer queue where any participant can add or reorder segments.
- **Task Management**: Public and private tasks linked to specific focus segments.
- **Smart Alerts**: Audio and visual notifications for segment changes and breaks.
- **Clean Architecture**: Built with a separation of concerns (Core, Infrastructure, Application) for maintainability.

## Repository Structure

```
.
├── src/
│   ├── app/          # Next.js Frontend (App Router)
│   ├── ws-server/    # WebSocket Server (Socket.io)
│   ├── core/         # Business Logic & Use Cases
│   └── infrastructure/ # Database, Cache, and Auth adapters
├── docs/             # Documentation Hub
├── scripts/          # Utility and Deployment scripts
└── docker-compose.yml # Local development services
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for PostgreSQL and Redis)

### Setup

1.  **Clone and Install**
    ```bash
    git clone <repo-url>
    cd pomopomo
    npm install
    ```

2.  **Environment Configuration**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```

3.  **Start Infrastructure**
    Start the database and Redis containers:
    ```bash
    docker compose up -d
    ```

4.  **Run Development Servers**
    You can start both the frontend and WebSocket server using the helper script:
    ```bash
    ./scripts/restart-dev.sh
    ```
    
    Or run them individually in separate terminals:
    ```bash
    npm run dev      # Frontend (http://localhost:3000)
    npm run ws:dev   # WebSocket Server (ws://localhost:3001)
    ```

## Configuration

The application is configured via environment variables. See `.env.example` for the list of required variables.

- **Database**: PostgreSQL connection string.
- **Redis**: Used for Socket.io adapter and rate limiting.
- **Auth**: JWT secrets for session management.

## Deployment

For production deployment instructions, please refer to the [Deployment Guide](docs/deployment.md).

## Security

No production credentials are stored in this repository. All sensitive configuration is managed via environment variables.

## Documentation

For more detailed documentation, visit the [Documentation Hub](docs/README.md).
