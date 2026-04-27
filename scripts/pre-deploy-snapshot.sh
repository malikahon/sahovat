#!/bin/bash
# ============================================================
# Sahovat — Pre-Deploy Database Snapshot
# ============================================================
# On-demand pg_dump taken immediately before a production deploy.
# Companion to scripts/backup.sh (daily 7-day rolling cron).
# This script keeps the LAST 3 pre-deploy snapshots, retained
# separately from the daily backups so a rollback after a few
# bad deploys is still possible.
#
# Usage:
#   bash scripts/pre-deploy-snapshot.sh
#
# Output (stdout):
#   On success: prints the absolute path of the snapshot file
#   on the last line. Callers (deploy.yml) capture this for the
#   state file. All log lines go to stderr.
#
# Exit codes:
#   0 — success
#   1 — pg_dump failed
#   2 — environment / preconditions invalid

set -euo pipefail

# Logging helpers — go to stderr so stdout stays clean for the
# snapshot-path capture by callers.
log()  { echo "[pre-deploy-snapshot] $*" >&2; }
die()  { log "FATAL: $*"; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env.production"
  set +a
else
  die ".env.production not found at $PROJECT_DIR/.env.production"
fi

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sahovat_postgres}"
POSTGRES_USER="${POSTGRES_USER:-sahovat}"
POSTGRES_DB="${POSTGRES_DB:-sahovat}"
PRE_DEPLOY_RETENTION="${PRE_DEPLOY_RETENTION:-3}"

# Sanity: container must be running.
if ! docker ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  die "postgres container '$POSTGRES_CONTAINER' is not running"
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
# Short SHA of HEAD (best-effort — works inside repo, ignored if not).
SHORT_SHA="$(cd "$PROJECT_DIR" && git rev-parse --short HEAD 2>/dev/null || echo nogit)"
SNAPSHOT_FILE="$BACKUP_DIR/pre-deploy-${TIMESTAMP}-${SHORT_SHA}.sql.gz"

log "starting snapshot: $SNAPSHOT_FILE"

# Dump and compress. Same flags as scripts/backup.sh for compatibility.
if ! docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists | gzip > "$SNAPSHOT_FILE"; then
  log "pg_dump failed; removing partial file"
  rm -f "$SNAPSHOT_FILE"
  exit 1
fi

FILESIZE=$(du -h "$SNAPSHOT_FILE" | cut -f1)
log "snapshot ok: $SNAPSHOT_FILE ($FILESIZE)"

# Trim to last N pre-deploy snapshots (separately retained from daily).
# Sorted by mtime descending; anything past the retention count is removed.
mapfile -t OLD_SNAPSHOTS < <(
  ls -1t "$BACKUP_DIR"/pre-deploy-*.sql.gz 2>/dev/null | tail -n "+$((PRE_DEPLOY_RETENTION + 1))"
)
if [ ${#OLD_SNAPSHOTS[@]} -gt 0 ]; then
  for f in "${OLD_SNAPSHOTS[@]}"; do
    log "pruning old snapshot: $f"
    rm -f "$f"
  done
fi

# Print the path to stdout for caller capture.
echo "$SNAPSHOT_FILE"
