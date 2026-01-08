#!/bin/bash

# Deploy Script for PomoPomo
# Usage: ./deploy.sh [USER@HOST]

set -e

# Check if running from root
if [ ! -f "package.json" ]; then
  echo "❌ Please run this script from the project root: ./scripts/deploy.sh user@host"
  exit 1
fi

TARGET="$1"
DEPLOY_DIR="~/pomopomo"

echo "🚀 Deploying to $TARGET..."

# 1. Create directory on server
echo "📂 Creating directory structure..."
ssh "$TARGET" "mkdir -p $DEPLOY_DIR"

# 2. Sync files
echo "📦 Syncing files..."
# Exclude node_modules, .next, .git, etc. to save bandwidth
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'dist' \
  --exclude 'data' \
  ./ "$TARGET:$DEPLOY_DIR/"

# 3. Copy production env
echo "🔑 Configuring environment..."
# Check if .env exists
if [ -f ".env" ]; then
  scp .env "$TARGET:$DEPLOY_DIR/.env"
else
  echo "⚠️  Local .env not found. Assuming remote environment is already configured."
fi

# 4. Run Docker Compose
echo "🐳 Starting containers..."
ssh "$TARGET" "cd $DEPLOY_DIR && DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose -f docker-compose.prod.yml up -d --build"

echo "✅ Deployment complete!"
echo "   App should be running at http://$(echo $TARGET | cut -d@ -f2):3000"
