# Production Deployment Runbook

## 1. Prerequisites
- **Server**: Ubuntu VPS (e.g. 51.38.190.126)
- **Dependencies**: Docker, Docker Compose, Git, Nginx, Certbot.
- **Port Availability**: 80, 443, 3000 (Internal), 3003 (Internal WS).

## 2. Infrastructure Setup & Troubleshooting
### Docker DNS Fix (Critical for this VPS)
If Docker builds fail with DNS errors, force Google DNS:
```bash
echo '{"dns": ["8.8.8.8", "8.8.4.4"]}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

## 3. Deployment Steps

### A. Update Codebase
```bash
sudo mkdir -p /srv/pomopomo
sudo chown ubuntu:ubuntu /srv/pomopomo
cd /srv/pomopomo
git pull origin v4
```

### B. Secrets
Ensure `.env.production` exists with secure credentials:
```env
DATABASE_URL="postgresql://pomopomo:password@postgres:5432/pomopomo"
REDIS_URL="redis://redis:6379"
# ... other vars
```

### C. Build (Host Network Strategy)
Use manual build to bypass bridge network DNS issues:
```bash
sudo docker build --network host -t pomopomo-web -f Dockerfile .
sudo docker build --network host -t pomopomo-ws -f Dockerfile.ws .
sudo docker build --network host -t pomopomo-worker -f Dockerfile.worker .
```

### D. Start Services
```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

### E. Database Migration (Baselining Strategy)
If deploying over existing data where migrations weren't tracked:
1.  **Sync Schema**: `sudo docker compose ... exec web npx prisma db push`
2.  **Mark Migrations Applied**: 
    ```bash
    sudo docker compose ... exec web npx prisma migrate resolve --applied 20260111173056_init_v4_fixed
    # ... repeat for all migration names in prisma/migrations
    ```
3.  **Verify**: `sudo docker compose ... exec web npx prisma migrate deploy`

### F. Nginx Configuration
1.  Copy configs: `sudo cp docs/ops/nginx/*.conf /etc/nginx/sites-available/`
2.  Link: `sudo ln -sf /etc/nginx/sites-available/pomopomo.conf /etc/nginx/sites-enabled/`
3.  Reload: `sudo systemctl reload nginx`

## 4. Verification
- App: `https://pomopomo.site`
- WebSocket: `wss://pomopomo.site/socket.io/` (Proxied to port 3003)
