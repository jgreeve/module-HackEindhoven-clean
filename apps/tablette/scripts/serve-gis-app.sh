#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
# SPDX-License-Identifier: MIT
#
# Serve one generated GIS app from bimr/gis-apps as a standalone static site.
#
# This is the app alone (no Studio shell). Use `make serve` for the Studio
# itself; this target is `make serve-app`.
#
# The app is a self-contained index.html; serving its directory (rather than
# opening the file, or using Forgejo's text/plain raw URL) gives the browser the
# right Content-Type and a real HTTP origin for the OSM tile requests.
#
# Usage:
#   scripts/serve-gis-app.sh [app] [port]
#   APP=rennes-parks PORT=8091 scripts/serve-gis-app.sh
#
# Environment:
#   GIS_APPS_REPO  clone URL (default: https://artefacts.bimr.net/bimr/gis-apps.git)
#   GIS_APPS_DIR   local checkout (default: .gis-apps)
#   GIS_APPS_APP   app slug (default: first positional argument, else rennes-parks)
#   GIS_APPS_PORT  port (default: first positional argument, else 8091)
#   GIS_APPS_HOST  bind address (default: 127.0.0.1)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPO="${GIS_APPS_REPO:-https://artefacts.bimr.net/bimr/gis-apps.git}"
DIR="${GIS_APPS_DIR:-.gis-apps}"
APP="${1:-${GIS_APPS_APP:-rennes-parks}}"
PORT="${2:-${GIS_APPS_PORT:-8091}}"
HOST="${GIS_APPS_HOST:-127.0.0.1}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required to serve the app" >&2
  exit 1
fi

if [ -d "$DIR/.git" ]; then
  echo "Updating $DIR from $REPO"
  if ! git -C "$DIR" pull --ff-only; then
    echo "warning: could not update $DIR; serving the existing checkout" >&2
  fi
else
  echo "Cloning $REPO into $DIR"
  git clone --depth 1 "$REPO" "$DIR"
fi

APP_DIR="$DIR/apps/$APP"
if [ ! -f "$APP_DIR/index.html" ]; then
  echo "error: no app \"$APP\" at $APP_DIR/index.html" >&2
  echo "available apps:" >&2
  find "$DIR/apps" -mindepth 1 -maxdepth 1 -type d -printf '  %f\n' 2>/dev/null || true
  exit 1
fi

if ! python3 - "$HOST" "$PORT" <<'PY'
import socket
import sys

host, port = sys.argv[1], int(sys.argv[2])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    sock.bind((host, port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
then
  echo "error: cannot listen on $HOST:$PORT (already in use?)" >&2
  echo "choose another port, e.g. make serve PORT=8091" >&2
  exit 1
fi

echo
echo "Serving $APP from $APP_DIR"
echo "  http://$HOST:$PORT/"
echo "Press Ctrl+C to stop."
echo

cd "$APP_DIR"
exec python3 -m http.server "$PORT" --bind "$HOST"
