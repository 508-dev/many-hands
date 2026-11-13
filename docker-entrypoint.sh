#!/bin/sh
# Ensure a PocketBase superuser when deployment credentials are provided.
set -eu

if [ -n "${PB_SUPERUSER_EMAIL:-}" ] && [ -n "${PB_SUPERUSER_PASSWORD:-}" ]; then
  /pb/pocketbase superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" >/dev/null
  echo "entrypoint: superuser ensured for $PB_SUPERUSER_EMAIL"
fi

exec /pb/pocketbase serve --http=0.0.0.0:8090 "$@"
