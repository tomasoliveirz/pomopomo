# Operations & Deployment

This guide covers how to deploy, manage, and monitor the PomoPomo application.

## Prerequisites

- **Node.js**: v18+
- **PostgreSQL**: v15+
- **Redis**: v7+
- **PM2**: For process management
- **Docker** (optional): For running database services

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/pomopomo?schema=public"
REDIS_URL="redis://localhost:6379"

# Security
JWT_SECRET="your-secret-key"
SESSION_SECRET="your-session-secret"

# App
NODE_ENV="production"
NEXT_PUBLIC_WS_URL="ws://your-domain.com:3051"
NEXT_PUBLIC_API_URL="http://your-domain.com:3050"
```

## Deployment

### Using PM2 (Recommended)

1. **Build the application**:
   ```bash
   npm install
   npx prisma generate
   npm run build
   ```

2. **Start services**:
   ```bash
   # Start Web App (Next.js)
   pm2 start npm --name "pomopomo-web" -- start -- -p 3050

   # Start WebSocket Server
   pm2 start npm --name "pomopomo-ws" -- run ws
   ```

3. **Save configuration**:
   ```bash
   pm2 save
   pm2 startup
   ```

### Using Docker

Refer to `docker-compose.prod.yml` (if available).

## Management Scripts

We provide a TypeScript CLI for common operations. All scripts are located in `scripts/ops/`.

### View Statistics
View real-time and historical usage stats without modifying data.
```bash
npm run ops:view-stats
```

### Clean Rooms
Cleanup expired rooms while preserving aggregated statistics in the `daily_statistics` table.
```bash
npm run ops:clean-rooms
```
*Recommendation: Run this script daily via cron.*

### Check Online Users
Check how many users are currently connected via WebSocket and view active rooms.
```bash
npm run ops:online-users
```

### Fix Room Host
Transfer host privileges if the original host disconnected.
```bash
npm run ops:fix-room-host
```

## Monitoring & Troubleshooting

### PM2 Commands
```bash
# View status
pm2 list

# View logs
pm2 logs pomopomo-web
pm2 logs pomopomo-ws

# Restart services
pm2 restart pomopomo-web pomopomo-ws
```

### Database Access
```bash
# Access PostgreSQL
docker exec -it pomopomo-postgres psql -U pomopomo -d pomopomo

# View tables
docker exec pomopomo-postgres psql -U pomopomo -d pomopomo -c "\dt"
```

### Health Check
```bash
curl -I http://localhost:3050
```

