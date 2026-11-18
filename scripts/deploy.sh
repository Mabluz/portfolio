#!/bin/sh
# Build and start the portfolio container on the server, keeping the
# previous image so a failed deploy rolls back automatically.
#
# Run from the deploy folder (the one with docker-compose.yml), e.g. by
# .github/workflows/deploy.yml:
#   DEPLOY_SHA=<git sha> sh scripts/deploy.sh
#
# Manual rollback to an earlier deploy:
#   docker images portfolio          # list deployed SHAs
#   ROLLBACK_TO=<sha> sh scripts/deploy.sh
set -eu

SERVICE="${SERVICE:-portfolio}"
REPO="${IMAGE_REPO:-portfolio}"
KEEP="${KEEP_IMAGES:-5}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"
SHA="${DEPLOY_SHA:-manual-$(date +%Y%m%d%H%M%S)}"

IMAGE="$(docker compose config --images "$SERVICE" | head -n 1)"
[ -n "$IMAGE" ] || { echo "Could not resolve image name for $SERVICE"; exit 1; }

wait_healthy() {
  container="$(docker compose ps -q "$SERVICE")"
  [ -n "$container" ] || return 1
  elapsed=0
  while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || echo missing)"
    case "$status" in
      healthy) return 0 ;;
      # No HEALTHCHECK on the container: accept it once it has stayed up 10 s
      running) [ "$elapsed" -ge 10 ] && return 0 ;;
      unhealthy|exited|dead|missing|restarting) return 1 ;;
    esac
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

# Migrations in image $1 that image $2 doesn't have. Prisma never reverts them, so after a
# rollback the old code runs against the newer schema (see "Migrations" in README.md).
new_migrations() {
  list() { docker run --rm --entrypoint ls "$1" /opt/migrate/prisma/migrations 2>/dev/null | grep -v '\.toml$' | sort; }
  list "$1" > /tmp/portfolio-mig-new.$$ || true
  list "$2" > /tmp/portfolio-mig-old.$$ || true
  comm -23 /tmp/portfolio-mig-new.$$ /tmp/portfolio-mig-old.$$
  rm -f /tmp/portfolio-mig-new.$$ /tmp/portfolio-mig-old.$$
}

start() {
  docker compose up -d --no-build "$SERVICE"
  wait_healthy
}

if [ -n "${ROLLBACK_TO:-}" ]; then
  echo "Rolling back $SERVICE to $REPO:$ROLLBACK_TO"
  docker tag "$REPO:$ROLLBACK_TO" "$IMAGE"
  start && echo "Rollback healthy" && exit 0
  echo "Rolled-back version is not healthy either"; exit 1
fi

# Remember the image that is running now
if docker image inspect "$IMAGE" > /dev/null 2>&1; then
  docker tag "$IMAGE" "$REPO:previous"
  HAVE_PREVIOUS=1
else
  HAVE_PREVIOUS=0
fi

# BUILD_CMD can be overridden (used by the local test of this script)
sh -c "${BUILD_CMD:-docker compose build $SERVICE}"
docker tag "$IMAGE" "$REPO:$SHA"

if start; then
  echo "Deployed $SHA, container is healthy"
else
  echo "New version did not become healthy. Last logs:"
  docker compose logs --tail 80 "$SERVICE" || true
  if [ "$HAVE_PREVIOUS" = "1" ]; then
    echo "Rolling back to the previous image"
    APPLIED="$(new_migrations "$REPO:$SHA" "$REPO:previous" || true)"
    if [ -n "$APPLIED" ]; then
      echo "WARNING: these migrations may already be applied and are NOT reverted by the rollback:"
      echo "$APPLIED" | sed 's/^/  /'
      echo "The previous version only works if they are backward compatible (expand/contract)."
    fi
    docker tag "$REPO:previous" "$IMAGE"
    start && echo "Rollback healthy" || echo "Rollback is not healthy either!"
  fi
  exit 1
fi

# Keep only the newest $KEEP deploy tags
docker images "$REPO" --format '{{.CreatedAt}}|{{.Tag}}' \
  | grep -v -E '\|(previous|latest|<none>)$' \
  | sort -r \
  | awk -F'|' -v keep="$KEEP" 'NR > keep { print $2 }' \
  | while read -r tag; do docker rmi "$REPO:$tag" > /dev/null 2>&1 || true; done
