# PomoPomo

PomoPomo is a real-time, collaborative Pomodoro timer designed for group focus sessions.

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- **[Overview](docs/overview.md)**: High-level architecture and concepts.
- **[Frontend](docs/frontend.md)**: Next.js app structure and components.
- **[Backend API](docs/backend-api.md)**: REST API endpoints.
- **[WebSocket Server](docs/ws-server.md)**: Real-time event protocols.
- **[Data Model](docs/data-model.md)**: Database schema and Redis usage.
- **[Operations](docs/operations.md)**: Deployment, management scripts, and monitoring.
- **[Alerts](docs/alerts.md)**: Audio and notification system.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start database (Docker)
docker-compose up -d

# Run migrations
npm run prisma:migrate

# Start development server (App + WS)
npm run dev
npm run ws:dev
```

### Operations

We provide a TypeScript CLI for common tasks:

```bash
# Check online users
npm run ops:online-users

# View statistics
npm run ops:view-stats

# Clean expired rooms
npm run ops:clean-rooms
```

See [docs/operations.md](docs/operations.md) for full deployment instructions.
