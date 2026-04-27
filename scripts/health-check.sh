#!/bin/bash
# ============================================================
# Sahovat — Production Health Check
# ============================================================
# Polls https://sahovat.tech/api/health (or override via $HEALTH_URL)
# until both HTTP 200 AND JSON `status==ok` are observed, OR the
# attempt budget is exhausted.
#
# Used by:
#   - .github/workflows/deploy.yml (auto-rollback trip-wire)
#   - scripts/rollback.sh (verify recovery)
#   - manual troubleshooting
#
# Usage:
#   bash scripts/health-check.sh
#   bash scripts/health-check.sh --max-attempts 6 --interval-seconds 10
#   HEALTH_URL=http://localhost/api/health bash scripts/health-check.sh
#
# Exit codes:
#   0 — healthy
#   1 — exhausted attempts without 200+ok
#   2 — invalid arguments

set -euo pipefail

HEALTH_URL="${HEALTH_URL:-https://sahovat.tech/api/health}"
MAX_ATTEMPTS=6
INTERVAL_SECONDS=10
TIMEOUT_SECONDS=10

while [ $# -gt 0 ]; do
  case "$1" in
    --max-attempts)     MAX_ATTEMPTS="$2";     shift 2 ;;
    --interval-seconds) INTERVAL_SECONDS="$2"; shift 2 ;;
    --url)              HEALTH_URL="$2";       shift 2 ;;
    --timeout-seconds)  TIMEOUT_SECONDS="$2";  shift 2 ;;
    -h|--help)
      sed -n '2,21p' "$0"
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

log() { echo "[health-check] $*" >&2; }

log "url=$HEALTH_URL attempts=$MAX_ATTEMPTS interval=${INTERVAL_SECONDS}s"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  # Capture body to a temp file and HTTP code to a variable.
  BODY_FILE=$(mktemp)
  HTTP_CODE=$(curl --silent --show-error --location \
                   --max-time "$TIMEOUT_SECONDS" \
                   --output "$BODY_FILE" \
                   --write-out '%{http_code}' \
                   "$HEALTH_URL" || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    BODY=$(cat "$BODY_FILE")
    rm -f "$BODY_FILE"
    # Look for status:"ok" in the JSON. Tolerant of whitespace.
    if echo "$BODY" | grep -qE '"status"[[:space:]]*:[[:space:]]*"ok"'; then
      log "ok (attempt $attempt/$MAX_ATTEMPTS): $BODY"
      exit 0
    else
      log "200 but status!=ok (attempt $attempt/$MAX_ATTEMPTS): $BODY"
    fi
  else
    log "http=$HTTP_CODE (attempt $attempt/$MAX_ATTEMPTS)"
    rm -f "$BODY_FILE"
  fi

  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    sleep "$INTERVAL_SECONDS"
  fi
done

log "exhausted $MAX_ATTEMPTS attempts without healthy response"
exit 1
