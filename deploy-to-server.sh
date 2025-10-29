#!/bin/bash

# POMOPOMO Safe Deployment Script
# Deploys to Ubuntu server with existing sites (careful mode)

set -e

echo "🍅 POMOPOMO Safe Deployment Script"
echo "===================================="
echo ""
echo "⚠️  IMPORTANT: This server has other sites running!"
echo "    We will deploy POMOPOMO to /opt/pomopomo"
echo "    and configure it on a separate port/subdomain."
echo ""

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="51.38.190.126"
REMOTE_DIR="/home/ubuntu/pomopomo"
APP_PORT="3050"
WS_PORT="3051"

read -p "Continue with deployment? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "📋 Pre-flight checks..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production settings."
    exit 1
fi

echo "✅ Environment file found"

echo ""
echo "📤 Uploading files to server..."

# Create remote directory
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

# Upload files
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           --exclude 'postgres_data' \
           --exclude 'redis_data' \
           --exclude '*.log' \
           ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

echo "✅ Files uploaded"

echo ""
echo "🔧 Setting up on server..."

ssh ${REMOTE_USER}@${REMOTE_HOST} << ENDSSH
set -e

cd ${REMOTE_DIR}

echo "📦 Installing Docker (if needed)..."
if ! command -v docker &> /dev/null; then
    apt-get update
    apt-get install -y docker.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

echo ""
echo "🔐 Generating secrets..."

# Generate secure secrets if not in .env
if ! grep -q "JWT_SECRET=" .env.production || grep -q "CHANGE_THIS" .env.production; then
    JWT_SECRET=\$(openssl rand -base64 32)
    SESSION_SECRET=\$(openssl rand -base64 32)
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=\${JWT_SECRET}|g" .env.production
    sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=\${SESSION_SECRET}|g" .env.production
    echo "✅ Secrets generated"
fi

# Update ports in .env.production
sed -i "s|WS_PORT=.*|WS_PORT=${WS_PORT}|g" .env.production

# Copy to .env
cp .env.production .env

echo ""
echo "🐳 Building and starting containers..."

# Update docker-compose ports
cat > docker-compose.custom.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: pomopomo-postgres
    environment:
      POSTGRES_USER: pomopomo
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-pomopomo_secure_$(openssl rand -hex 8)}
      POSTGRES_DB: pomopomo
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    networks:
      - pomopomo-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pomopomo"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: pomopomo-redis
    volumes:
      - ./data/redis:/data
    networks:
      - pomopomo-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pomopomo-web
    environment:
      - DATABASE_URL=postgresql://pomopomo:\${POSTGRES_PASSWORD:-pomopomo_secure}@postgres:5432/pomopomo?schema=public
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - JWT_SECRET=\${JWT_SECRET}
      - SESSION_SECRET=\${SESSION_SECRET}
      - NEXT_PUBLIC_WS_URL=\${NEXT_PUBLIC_WS_URL}
      - NEXT_PUBLIC_API_URL=\${NEXT_PUBLIC_API_URL}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - pomopomo-network
    restart: unless-stopped
    ports:
      - "${APP_PORT}:3000"

  ws:
    build:
      context: .
      dockerfile: Dockerfile.ws
    container_name: pomopomo-ws
    environment:
      - DATABASE_URL=postgresql://pomopomo:\${POSTGRES_PASSWORD:-pomopomo_secure}@postgres:5432/pomopomo?schema=public
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - JWT_SECRET=\${JWT_SECRET}
      - WS_PORT=3001
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - pomopomo-network
    restart: unless-stopped
    ports:
      - "${WS_PORT}:3001"

networks:
  pomopomo-network:
    driver: bridge
EOF

# Stop existing containers (if any)
docker compose -f docker-compose.custom.yml down 2>/dev/null || true

# Build and start
docker compose -f docker-compose.custom.yml up -d --build

echo "⏳ Waiting for services to be ready..."
sleep 15

echo ""
echo "🗃️  Running database migrations..."
docker compose -f docker-compose.custom.yml exec -T web npx prisma migrate deploy || \
docker compose -f docker-compose.custom.yml exec -T web npx prisma db push

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.custom.yml ps

echo ""
echo "🌐 Services are running on:"
echo "   Web App: http://localhost:${APP_PORT}"
echo "   WebSocket: ws://localhost:${WS_PORT}"
echo ""
echo "📝 Next steps:"
echo "   1. Configure Nginx to proxy to port ${APP_PORT}"
echo "   2. Set up SSL with Let's Encrypt"
echo "   3. Update DNS if needed"
echo ""
echo "💡 Example Nginx location block:"
echo ""
echo "   location /pomopomo/ {"
echo "       proxy_pass http://localhost:${APP_PORT}/;"
echo "       # ... other proxy settings"
echo "   }"
echo ""

ENDSSH

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "🔍 To check logs:"
echo "   ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd ${REMOTE_DIR} && docker compose -f docker-compose.custom.yml logs -f'"
echo ""
echo "🛑 To stop:"
echo "   ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd ${REMOTE_DIR} && docker compose -f docker-compose.custom.yml down'"
echo ""

