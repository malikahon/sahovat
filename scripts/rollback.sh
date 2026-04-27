#!/bin/bash
# ============================================================
# Sahovat — One-Command Manual Rollback
# ============================================================
# Reverts production to the state captured by the most recent
# successful deploy (or the most recent pre-deploy snapshot, in
# the case of a partially-applied deploy).
#
# Reads ~/sahovat/.last-deploy-state which is written by
# .github/workflows/deploy.yml at the start of each deploy.
#
# Usage:
#   bash scripts/rollback.sh                 (prompts for confirmation)
#   bash scripts/rollback.sh --yes           (non-interactive — for workflow use)
#
# What this does, in order:
#   1. Reads ROLLBACK_SHA and SNAPSHOT_FILE from the state file.
#   2. git reset --hard $ROLLBACK_SHA
#   3. Re-tags sahovat-{backend,frontend}:previous → :latest.
#   4. docker compose up -d (no rebuild — uses retagged images).
#   5. bash scripts/restore.sh $SNAPSHOT_FILE --yes
#   6. Polls /api/health for up to 60s. Reports outcome.
#
# Exit codes:
#   0 — rollback completed AND health check passed
#   1 — rollback completed BUT health still failing (manual intervention required)
#   2 — invalid state / preconditions

set -euo pipefail

log() { echo "[rollback] $*" >&2; }
die() { log "FATAL: $*"; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# State file lookup order:
#   1. .last-deploy-state.in-progress  (set by deploy.yml's pre-deploy step;
#                                       present when a deploy failed mid-flight
#                                       and we need to roll back to the prior
#                                       known-good state)
#   2. .last-deploy-state              (set by deploy.yml's post-deploy step
#                                       after a successful deploy; used by
#                                       manual `scripts/rollback.sh` invocations
#                                       to revert a deploy that went green but
#                                       has functional regressions)
IN_PROGRESS_FILE="$PROJECT_DIR/.last-deploy-state.in-progress"
FINAL_FILE="$PROJECT_DIR/.last-deploy-state"

if [ -f "$IN_PROGRESS_FILE" ]; then
  STATE_FILE="$IN_PROGRESS_FILE"
  log "using in-progress state file: $STATE_FILE"
elif [ -f "$FINAL_FILE" ]; then
  STATE_FILE="$FINAL_FILE"
  log "using final state file: $STATE_FILE"
else
  die "no state file (.last-deploy-state.in-progress or .last-deploy-state) — has a deploy ever run with the new pipeline?"
fi

ASSUME_YES="${1:-}"

# Source state file. It's a simple key=value format.
# shellcheck disable=SC1090
source "$STATE_FILE"

: "${ROLLBACK_SHA:?missing ROLLBACK_SHA in state file}"
: "${SNAPSHOT_FILE:?missing SNAPSHOT_FILE in state file}"

if [ ! -f "$SNAPSHOT_FILE" ]; then
  die "snapshot file referenced in state file does not exist: $SNAPSHOT_FILE"
fi

CURRENT_SHA="$(cd "$PROJECT_DIR" && git rev-parse HEAD)"

cat <<EOF >&2

============================================================
                    ROLLBACK CONFIRMATION
============================================================
  current commit:       $CURRENT_SHA
  rolling back to:      $ROLLBACK_SHA
  database snapshot:    $SNAPSHOT_FILE
                        $(du -h "$SNAPSHOT_FILE" 2>/dev/null | cut -f1 || echo '?')
  containers will be:   restored from sahovat-{backend,frontend}:previous tags

This will:
  - hard-reset the working tree to $ROLLBACK_SHA
  - DROP and reload the database from the snapshot
  - restart containers using the previous image tags
============================================================

EOF

if [ "$ASSUME_YES" != "--yes" ]; then
  read -r -p "Type ROLLBACK to confirm: " CONFIRMATION
  if [ "$CONFIRMATION" != "ROLLBACK" ]; then
    log "aborted by user"
    exit 1
  fi
fi

cd "$PROJECT_DIR"

# 1. Source code rollback
log "step 1/5 — git reset to $ROLLBACK_SHA"
git fetch origin
git reset --hard "$ROLLBACK_SHA"

# 2. Container image rollback. The :previous tags were set by deploy.yml
# pre-deploy step; if they're missing this is a serious anomaly.
log "step 2/5 — retagging :previous → :latest for backend + frontend"
if ! docker image inspect sahovat-backend:previous >/dev/null 2>&1; then
  die "sahovat-backend:previous image missing — cannot rollback containers"
fi
if ! docker image inspect sahovat-frontend:previous >/dev/null 2>&1; then
  die "sahovat-frontend:previous image missing — cannot rollback containers"
fi
docker tag sahovat-backend:previous  sahovat-backend:latest
docker tag sahovat-frontend:previous sahovat-frontend:latest

# 3. Container restart with rolled-back images
log "step 3/5 — docker compose up -d (no rebuild)"
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 4. Database restore
log "step 4/5 — restoring database from $SNAPSHOT_FILE"
bash "$SCRIPT_DIR/restore.sh" "$SNAPSHOT_FILE" --yes

# 5. Health verification
log "step 5/5 — polling health for 60s"
if bash "$SCRIPT_DIR/health-check.sh" --max-attempts 6 --interval-seconds 10; then
  log "rollback OK — production is healthy at $ROLLBACK_SHA"
  exit 0
else
  log "rollback applied BUT health still failing — manual intervention required"
  log "  current commit:    $ROLLBACK_SHA"
  log "  snapshot restored: $SNAPSHOT_FILE"
  log "  inspect:           docker compose -f docker-compose.prod.yml logs --tail 100 backend"
  exit 1
fi
