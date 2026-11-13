#!/usr/bin/env sh
set -eu

# Ports are overridable so parallel worktrees can run side by side:
#   PB_PORT=18101 WEB_PORT=5201 ./scripts/dev.sh

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"

if [ ! -x "$ROOT/.bin/pocketbase" ]; then
  "$ROOT/apps/pocketbase/scripts/get-pocketbase.sh"
fi

PB_PID=
WEB_PID=
cleanup() {
  trap - EXIT INT TERM
  if [ -n "$WEB_PID" ]; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
  if [ -n "$PB_PID" ]; then
    kill "$PB_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

"$ROOT/.bin/pocketbase" serve \
  --http="127.0.0.1:${PB_PORT:-8090}" \
  --dir "$ROOT/.pb_data_dev${PB_PORT:+_$PB_PORT}" \
  --migrationsDir "$ROOT/apps/pocketbase/pb_migrations" \
  --hooksDir "$ROOT/apps/pocketbase/pb_hooks" &
PB_PID=$!

cd "$ROOT/apps/web"
PB_PORT="${PB_PORT:-8090}" bun run dev -- --host 127.0.0.1 --port "${WEB_PORT:-5173}" --strictPort &
WEB_PID=$!

wait "$WEB_PID"
