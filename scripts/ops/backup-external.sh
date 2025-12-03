#!/bin/bash

# Configuration
BACKUP_ROOT="/home/ubuntu/backups/pomopomo"
PROJECT_ROOT="/home/ubuntu/pomopomo"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$BACKUP_ROOT/backup_$TIMESTAMP"
DB_CONTAINER="pomopomo-postgres"
DB_USER="pomopomo"
DB_NAME="pomopomo"

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo "📂 Created backup directory: $BACKUP_DIR"

# 1. Database Dump (Full SQL)
echo "💾 Dumping database..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/full_dump.sql"

# 2. Export Statistics to CSV
echo "📊 Exporting statistics to CSV..."

# Daily Statistics
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "COPY (SELECT * FROM daily_statistics ORDER BY date DESC) TO STDOUT WITH CSV HEADER" > "$BACKUP_DIR/daily_statistics.csv"

# Rooms (Active & Recent)
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "COPY (SELECT id, code, status, theme, created_at, expires_at FROM rooms ORDER BY created_at DESC) TO STDOUT WITH CSV HEADER" > "$BACKUP_DIR/rooms_list.csv"

# Participants Summary
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "COPY (SELECT count(*) as total_joins, count(distinct session_id) as unique_users FROM participants) TO STDOUT WITH CSV HEADER" > "$BACKUP_DIR/participants_summary.csv"

# 3. Archive Logs
echo "📝 Archiving logs..."
# Check in project root or potential locations
if [ -d "$PROJECT_ROOT/logs" ]; then
    tar -czf "$BACKUP_DIR/logs_archive.tar.gz" -C "$PROJECT_ROOT" logs
elif [ -f "$PROJECT_ROOT/api.log" ] || [ -f "$PROJECT_ROOT/web.log" ]; then
     # Archive individual log files if directory doesn't exist
    tar -czf "$BACKUP_DIR/logs_archive.tar.gz" -C "$PROJECT_ROOT" *.log
else
    echo "⚠️ Logs not found in standard locations."
fi

# 4. Compress Backup
echo "📦 Compressing backup..."
cd "$BACKUP_ROOT"
tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP"
rm -rf "backup_$TIMESTAMP"

echo "✅ Backup completed successfully!"
echo "📍 Location: $BACKUP_ROOT/backup_$TIMESTAMP.tar.gz"
echo "📏 Size: $(du -h "$BACKUP_ROOT/backup_$TIMESTAMP.tar.gz" | cut -f1)"
