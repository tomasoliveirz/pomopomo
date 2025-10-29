#!/bin/bash
set -e

echo "🍅 POMOPOMO Deployment (PM2 Mode)"
echo "=================================="

cd /home/ubuntu/pomopomo

echo "📦 Installing dependencies..."
npm install --production=false

echo "🔨 Generating Prisma Client..."
npx prisma generate

echo "🏗️  Building Next.js..."
npm run build

echo "🗃️  Setting up database..."
# Use existing PostgreSQL
export DATABASE_URL="postgresql://pomopomo:pomopomo2024@localhost:5433/pomopomo?schema=public"
npx prisma db push --skip-generate || npx prisma migrate deploy || echo "Database already configured"

echo "📁 Creating logs directory..."
mkdir -p logs

echo "🚀 Starting with PM2..."
pm2 delete pomopomo-web pomopomo-ws 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Status:"
pm2 list | grep pomopomo

echo ""
echo "🌐 Access:"
echo "   Web: http://51.38.190.126:3050"
echo "   WebSocket: ws://51.38.190.126:3051"
echo ""
echo "📝 Logs:"
echo "   pm2 logs pomopomo-web"
echo "   pm2 logs pomopomo-ws"





