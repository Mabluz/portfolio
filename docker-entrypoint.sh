#!/bin/sh
# Runs as root only long enough to fix volume ownership and apply migrations,
# then drops to the unprivileged `node` user.
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOAD_DIR"
  find "$UPLOAD_DIR" \! -user node -exec chown node:node {} +
  chown node:node "$UPLOAD_DIR"

  echo "Applying database migrations..."
  (cd /opt/migrate && ./node_modules/.bin/prisma migrate deploy)

  exec su-exec node "$@"
fi

exec "$@"
