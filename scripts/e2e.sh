#!/usr/bin/env bash
# End-to-end smoke test: boots the full Docker stack, waits for health, then
# runs tests/e2e/smoke.ts against it over HTTP.
#
# Usage (from repo root):
#   ./scripts/e2e.sh             # build + up, run smoke, leave stack running
#   E2E_KEEP=0 ./scripts/e2e.sh  # tear the stack down afterwards
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="infra/docker-compose.yml"
BASE_URL="${E2E_BASE_URL:-http://localhost:8080}"
KEEP="${E2E_KEEP:-1}"

if [[ ! -f .env ]]; then
  echo "[e2e] .env not found at repo root. Copy .env.example to .env and fill it in." >&2
  exit 1
fi

echo "[e2e] bringing up the stack (build)..."
docker compose -f "$COMPOSE" --env-file .env up --build -d

cleanup() {
  if [[ "$KEEP" != "1" ]]; then
    echo "[e2e] tearing down the stack..."
    docker compose -f "$COMPOSE" down
  fi
}
trap cleanup EXIT

echo "[e2e] waiting for $BASE_URL/api/v1/health ..."
for i in $(seq 1 60); do
  if curl -fsS "$BASE_URL/api/v1/health" >/dev/null 2>&1; then
    echo "[e2e] health OK"
    break
  fi
  if [[ "$i" == "60" ]]; then
    echo "[e2e] API never became healthy" >&2
    docker compose -f "$COMPOSE" logs api --tail 50 >&2 || true
    exit 1
  fi
  sleep 2
done

# Run the smoke script with tsx (installed in apps/api).
TSX="apps/api/node_modules/.bin/tsx"
if [[ ! -x "$TSX" ]]; then
  echo "[e2e] tsx not found at $TSX — run 'npm install' in apps/api first." >&2
  exit 1
fi

E2E_BASE_URL="$BASE_URL" E2E_COMPOSE="$COMPOSE" "$TSX" tests/e2e/smoke.ts
