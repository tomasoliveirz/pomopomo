#!/bin/bash

# POMOPOMO Deployment Script
# This script deploys POMOPOMO to an Ubuntu server

set -e

echo "🍅 POMOPOMO Deployment Script"
echo "================================"

# Configuration
REMOTE_USER="root"
REMOTE_HOST="51.38.190.126"
REMOTE_DIR="/opt/pomopomo"
DOMAIN="pomopomo.yourdomain.com"  # Change this

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production settings."
    exit 1
fi

echo "📦 Building project locally..."
npm install
npm run prisma:generate

echo "📤 Uploading files to server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           --exclude 'postgres_data' \
           --exclude 'redis_data' \
           ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

echo "🔧 Setting up on server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /opt/pomopomo

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    apt-get update
    apt-get install -y docker.io docker-compose
    systemctl enable docker
    systemctl start docker
fi

# Copy production env
cp .env.production .env

# Stop existing containers (if any)
docker-compose -f docker-compose.prod.yml down || true

# Build and start containers
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for database
echo "Waiting for database..."
sleep 10

# Run migrations
docker-compose -f docker-compose.prod.yml exec -T web npx prisma migrate deploy

echo "✅ Deployment complete!"
echo ""
echo "Services running:"
docker-compose -f docker-compose.prod.yml ps
ENDSSH

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure Nginx on your server"
echo "2. Set up SSL with Let's Encrypt"
echo "3. Update DNS to point to ${REMOTE_HOST}"
echo ""
echo "Nginx config template is in nginx.conf"



















