#!/bin/bash
# ============================================================
# Sahovat — PostgreSQL Daily Backup Script
# ============================================================
# Usage: ./scripts/backup.sh
# Cron:  0 3 * * * /path/to/sahovat/scripts/backup.sh >> /var/log/sahovat-backup.log 2>&1
#
# Keeps last 7 daily backups. Older ones are deleted automatically.

set -euo pipefail

# Load env vars from .env.production if available
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a
  source "$PROJECT_DIR/.env.production"
  set +a
fi

# Config
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sahovat_postgres}"
POSTGRES_USER="${POSTGRES_USER:-sahovat}"
POSTGRES_DB="${POSTGRES_DB:-sahovat}"
RETENTION_DAYS=7

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sahovat_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump and compress
docker exec "$POSTGRES_CONTAINER" pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup created: $BACKUP_FILE ($FILESIZE)"

# Delete old backups
DELETED=$(find "$BACKUP_DIR" -name "sahovat_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Cleaned up $DELETED old backup(s)"
fi

echo "[$(date)] Backup complete."
