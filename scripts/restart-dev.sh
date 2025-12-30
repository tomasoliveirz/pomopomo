#!/bin/bash

echo "🛑 Killing all Node/Next.js processes..."
# Kill by port
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
# Kill by name
pkill -f "next-server" || true
pkill -f "next dev" || true
pkill -f "ws-server" || true
pkill -f "tsx watch" || true

echo "🧹 Clearing Next.js cache..."
rm -rf .next

echo "🚀 Starting servers..."
# Start WS server in background
npm run ws:dev &
WS_PID=$!

# Start Next.js server
pnpm dev

# When Next.js exits, kill WS server
kill $WS_PID
