#!/usr/bin/env bash
#
# End-to-end smoke test for the Many Hands PocketBase backend.
#
# Downloads the pinned PocketBase (checksum-verified), starts it on a random
# free port with a throwaway data dir and this repo's migrations + hooks,
# creates a superuser with the CLI, then runs scripts/smoke_assert.ts with bun.
# It also restarts the server on the same data dir to prove a clean re-open.
#
# The server and data dir are always cleaned up, and the script exits non-zero
# on any failure.
#
# Usage:  apps/pocketbase/scripts/smoke.sh
#
# Requires: curl, jq, bun (get-pocketbase.sh requires curl, sha256sum, unzip).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POCKETBASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$POCKETBASE_DIR/../.." && pwd)"
PB_BIN="$REPO_ROOT/.bin/pocketbase"

for cmd in curl jq bun; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "error: '$cmd' is required" >&2; exit 1; }
done

# Ensure the pinned binary is present (and checksum-verified) first.
"$SCRIPT_DIR/get-pocketbase.sh" >/dev/null

SUPERUSER_EMAIL="smoke-superuser@example.com"
SUPERUSER_PASSWORD="smoke-$(head -c 16 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 16)"

DATA_DIR="$(mktemp -d)"
LOG_FILE="$(mktemp)"
PORT=""
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$DATA_DIR" "$LOG_FILE"
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Pick a random free port. Never 8090 or 18090 (other agents use them).
# ---------------------------------------------------------------------------
find_free_port() {
  local p
  while true; do
    p=$((20000 + (RANDOM % 30000)))
    if [ "$p" = "8090" ] || [ "$p" = "18090" ]; then
      continue
    fi
    if ! (echo >/dev/tcp/127.0.0.1/"$p") 2>/dev/null; then
      PORT="$p"
      return 0
    fi
  done
}
find_free_port

start_server() {
  "$PB_BIN" serve \
    --dir "$DATA_DIR" \
    --migrationsDir "$POCKETBASE_DIR/pb_migrations" \
    --hooksDir "$POCKETBASE_DIR/pb_hooks" \
    --http "127.0.0.1:$PORT" \
    >>"$LOG_FILE" 2>&1 &
  SERVER_PID=$!
}

wait_healthy() {
  local i
  for i in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "error: server did not become healthy in time" >&2
  cat "$LOG_FILE" >&2 || true
  return 1
}

stop_server() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  SERVER_PID=""
}

echo "=== starting PocketBase on 127.0.0.1:$PORT (fresh dir) ==="
start_server
wait_healthy

echo "=== creating superuser ==="
"$PB_BIN" superuser upsert "$SUPERUSER_EMAIL" "$SUPERUSER_PASSWORD" --dir "$DATA_DIR" >/dev/null

echo "=== running assertions ==="
PB_URL="http://127.0.0.1:$PORT" \
PB_SUPERUSER_EMAIL="$SUPERUSER_EMAIL" \
PB_SUPERUSER_PASSWORD="$SUPERUSER_PASSWORD" \
  bun "$SCRIPT_DIR/smoke_assert.ts"

echo "=== restarting on the same data dir (must stay clean) ==="
stop_server
start_server
wait_healthy
stop_server

echo "=== smoke test passed ==="
