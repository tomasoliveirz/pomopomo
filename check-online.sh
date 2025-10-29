#!/bin/bash
# Script to check how many users are online on pomopomo.site

echo "🍅 POMOPOMO - ONLINE USERS CHECK"
echo "================================"
echo ""

# Get Redis container ID
REDIS_CONTAINER=$(docker ps -q -f name=redis)

if [ -z "$REDIS_CONTAINER" ]; then
    echo "❌ Redis container not found!"
    exit 1
fi

# Count active rooms
ACTIVE_ROOMS=$(docker exec -i $REDIS_CONTAINER redis-cli KEYS "room:presence:*" | wc -l)
echo "🏠 Active rooms: $ACTIVE_ROOMS"

# Count total online users
TOTAL_ONLINE=0
if [ $ACTIVE_ROOMS -gt 0 ]; then
    TOTAL_ONLINE=$(docker exec -i $REDIS_CONTAINER redis-cli --raw KEYS "room:presence:*" | while read key; do 
        docker exec -i $REDIS_CONTAINER redis-cli SCARD "$key"
    done | awk '{sum += $1} END {print sum}')
fi

echo "👥 Users online: $TOTAL_ONLINE"
echo ""

# Show breakdown by room
if [ $ACTIVE_ROOMS -gt 0 ]; then
    echo "📊 Breakdown by room:"
    echo "-------------------"
    docker exec -i $REDIS_CONTAINER redis-cli --raw KEYS "room:presence:*" | while read key; do
        ROOM_ID=$(echo $key | sed 's/room:presence://')
        USER_COUNT=$(docker exec -i $REDIS_CONTAINER redis-cli SCARD "$key")
        
        # Get room code from database
        ROOM_CODE=$(docker exec -i pomopomo-postgres psql -U pomopomo -d pomopomo -t -c "SELECT code FROM rooms WHERE id = '$ROOM_ID';" 2>/dev/null | xargs)
        
        if [ -n "$ROOM_CODE" ]; then
            echo "  🔹 $ROOM_CODE: $USER_COUNT user(s)"
        else
            echo "  🔹 ${ROOM_ID:0:8}...: $USER_COUNT user(s)"
        fi
    done
fi

echo ""
echo "✅ Check completed at $(date '+%Y-%m-%d %H:%M:%S')"




