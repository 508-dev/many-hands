#!/usr/bin/env bash
#
# Downloads the pinned PocketBase release into <repo root>/.bin/pocketbase,
# verifying the archive against the official checksums.txt. It does nothing if
# that exact version is already installed.
#
# The frontend's `scripts/dev.sh` calls this before running PocketBase.

set -euo pipefail

VERSION="0.40.6"
ARCH="linux_amd64"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# apps/pocketbase/scripts -> repo root
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BIN_DIR="$REPO_ROOT/.bin"
PB_BIN="$BIN_DIR/pocketbase"

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "error: '$1' is required" >&2; exit 1; }
}
require curl
require sha256sum
require unzip

# Already present with the right version? Do nothing.
if [ -x "$PB_BIN" ] && "$PB_BIN" --version 2>/dev/null | grep -q "version $VERSION"; then
  echo "pocketbase $VERSION already present at $PB_BIN"
  exit 0
fi

BASE="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}"
ZIP="pocketbase_${VERSION}_${ARCH}.zip"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "downloading $BASE/$ZIP ..."
curl -fsSL --retry 3 -o "$TMP/$ZIP" "$BASE/$ZIP"
curl -fsSL --retry 3 -o "$TMP/checksums.txt" "$BASE/checksums.txt"

# Verify the archive against the official checksums.txt entry.
EXPECTED="$(grep " $ZIP\$" "$TMP/checksums.txt" | awk '{ print $1 }')"
if [ -z "$EXPECTED" ]; then
  echo "error: no checksum entry for $ZIP in checksums.txt" >&2
  exit 1
fi
ACTUAL="$(sha256sum "$TMP/$ZIP" | awk '{ print $1 }')"
if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "error: checksum mismatch for $ZIP" >&2
  echo "  expected: $EXPECTED" >&2
  echo "  actual:   $ACTUAL" >&2
  exit 1
fi

mkdir -p "$BIN_DIR"
unzip -o "$TMP/$ZIP" -d "$BIN_DIR" "pocketbase"
chmod +x "$PB_BIN"

echo "installed pocketbase $VERSION at $PB_BIN"
"$PB_BIN" --version
