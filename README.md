# 🍅 POMOPOMO

A clean, theme-able, privacy-first Pomodoro web app for solo or group focus sessions.

## Features

- 🎯 **Focus Together**: Create or join rooms for group Pomodoro sessions
- 🎨 **5 Beautiful Themes**: Night, Purple, Sunny, Spring, Japan
- 🔒 **Privacy First**: No login required, ephemeral sessions
- ⚡ **Real-time Sync**: WebSocket-powered synchronization
- 💬 **Chat**: Communicate with your focus group
- 📋 **Personal Tasks**: Track what you're working on (private or public)
- 👑 **Host Controls**: Build custom queues with focus blocks and breaks

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes + Socket.IO
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for real-time state and rate limiting
- **Deployment**: Docker, Nginx

## Quick Start (Development)

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or pnpm

### Setup

1. Clone the repository:
```bash
git clone <your-repo>
cd pomopomo
```

2. Install dependencies:
```bash
npm install
```

3. Start PostgreSQL and Redis:
```bash
docker-compose up -d
```

4. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your settings
```

5. Run database migrations:
```bash
npm run prisma:migrate
```

6. Start development servers:

Terminal 1 (Next.js):
```bash
npm run dev
```

Terminal 2 (WebSocket):
```bash
npm run ws:dev
```

7. Open http://localhost:3000

## Production Deployment

### Prepare Environment

1. Create `.env` file with production settings:
```bash
cp .env.production .env
# Edit .env and set strong secrets!
```

2. Update `nginx.conf` with your domain

3. Update `deploy.sh` with your server details

### Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

### Post-Deployment

1. SSH into your server:
```bash
ssh root@51.38.190.126
```

2. Copy nginx config to a new site (don't overwrite main nginx.conf):
```bash
cp /opt/pomopomo/nginx.conf /etc/nginx/sites-available/pomopomo
ln -s /etc/nginx/sites-available/pomopomo /etc/nginx/sites-enabled/
```

3. Install SSL certificate with Let's Encrypt:
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d pomopomo.yourdomain.com
```

4. Test and reload Nginx:
```bash
nginx -t
systemctl reload nginx
```

5. Check services:
```bash
cd /opt/pomopomo
docker-compose -f docker-compose.prod.yml ps
```

## Project Structure

```
pomopomo/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # REST API routes
│   │   ├── room/[code]/       # Room page
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   └── room/              # Room-specific components
│   ├── lib/                   # Utilities
│   │   ├── prisma.ts         # Prisma client
│   │   ├── redis.ts          # Redis client
│   │   ├── auth.ts           # JWT & session handling
│   │   ├── validators.ts     # Zod schemas
│   │   └── config.ts         # Configuration
│   ├── types/                 # TypeScript types
│   └── ws-server/            # WebSocket server
│       ├── index.ts          # Main server
│       └── handlers/         # Event handlers
├── prisma/
│   └── schema.prisma         # Database schema
├── docker-compose.yml        # Dev compose
├── docker-compose.prod.yml   # Production compose
├── Dockerfile                # Web app image
├── Dockerfile.ws             # WebSocket image
├── nginx.conf                # Nginx config
└── deploy.sh                 # Deployment script
```

## Security Features

- ✅ HTTPS/WSS only in production
- ✅ Strict CSP headers
- ✅ HttpOnly, Secure, SameSite cookies
- ✅ Input validation with Zod
- ✅ Rate limiting (chat, actions, connections)
- ✅ JWT tokens for WebSocket auth
- ✅ Spam detection and auto-mute
- ✅ No PII storage

## Available Scripts

- `npm run dev` - Start Next.js dev server
- `npm run ws` - Start WebSocket server
- `npm run ws:dev` - Start WebSocket server with watch
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio

## Environment Variables

See `.env.example` for all available variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT signing
- `SESSION_SECRET` - Secret for session cookies
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL
- `ROOM_TTL_HOURS` - Room expiration time (default: 72)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

---

Made with 🍅 and ☕



















