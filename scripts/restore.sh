#!/bin/bash
# ============================================================
# Sahovat — PostgreSQL Restore from Snapshot
# ============================================================
# Restores the running postgres container from a gzipped pg_dump.
# Used by:
#   - scripts/rollback.sh (manual rollback)
#   - .github/workflows/deploy.yml (auto-rollback on health fail)
#
# Usage:
#   bash scripts/restore.sh <dump-file>          (interactive — prompts)
#   bash scripts/restore.sh <dump-file> --yes    (non-interactive)
#
# WARNING: --clean dumps DROP and recreate every object. There is a
# brief window where the database has no data. Acceptable for the
# Sahovat pre-demo single-node deployment; would be replaced by
# point-in-time recovery in a higher-availability tier.

set -euo pipefail

log()  { echo "[restore] $*" >&2; }
die()  { log "FATAL: $*"; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ "${1:-}" = "" ]; then
  die "usage: $0 <dump-file> [--yes]"
fi

DUMP_FILE="$1"
ASSUME_YES="${2:-}"

if [ ! -f "$DUMP_FILE" ]; then
  die "dump file not found: $DUMP_FILE"
fi

if [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env.production"
  set +a
else
  die ".env.production not found at $PROJECT_DIR/.env.production"
fi

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sahovat_postgres}"
POSTGRES_USER="${POSTGRES_USER:-sahovat}"
POSTGRES_DB="${POSTGRES_DB:-sahovat}"

if ! docker ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  die "postgres container '$POSTGRES_CONTAINER' is not running"
fi

log "restore target: $POSTGRES_CONTAINER ($POSTGRES_USER@$POSTGRES_DB)"
log "dump file:      $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

if [ "$ASSUME_YES" != "--yes" ]; then
  echo ""
  echo "WARNING: this will DROP existing objects and restore from the dump."
  echo "         Active connections may be terminated. The database will be"
  echo "         momentarily unavailable."
  echo ""
  read -r -p "Type RESTORE to confirm: " CONFIRMATION
  if [ "$CONFIRMATION" != "RESTORE" ]; then
    log "aborted by user"
    exit 1
  fi
fi

START_TS=$(date +%s)
log "restore started at $(date -Iseconds)"

# Pipe gunzipped dump into psql inside the container. ON_ERROR_STOP=1
# makes psql exit non-zero on the first SQL error so we don't get a
# half-restored DB silently.
if ! gunzip -c "$DUMP_FILE" | docker exec -i \
        -e PGOPTIONS="-c client_min_messages=warning" \
        "$POSTGRES_CONTAINER" \
        psql -v ON_ERROR_STOP=1 \
             -U "$POSTGRES_USER" \
             -d "$POSTGRES_DB" >/dev/null; then
  die "psql restore failed — database may be in an inconsistent state"
fi

END_TS=$(date +%s)
log "restore completed in $((END_TS - START_TS))s at $(date -Iseconds)"
