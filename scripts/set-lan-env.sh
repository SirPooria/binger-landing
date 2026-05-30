#!/usr/bin/env bash
# Print / apply LAN API URLs for iPhone + Docker (.env at repo root).
# Usage:
#   ./scripts/set-lan-env.sh              # print suggested lines
#   ./scripts/set-lan-env.sh --write      # patch PUBLIC_API_URL + EXPO_PUBLIC_* in .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

pick_ip() {
  if [[ -n "${EXPO_DEV_HOST:-}" ]]; then
    echo "$EXPO_DEV_HOST"
    return
  fi
  if command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' && return
  fi
  hostname -I 2>/dev/null | awk '{print $1}'
}

IP="$(pick_ip)"
if [[ -z "$IP" ]]; then
  echo "Could not detect LAN IP. Set EXPO_DEV_HOST manually." >&2
  exit 1
fi

# Device dev: API on Metro :8081 (proxied to Docker :8080). :8080 alone often fails on WSL2 phones.
URL="http://${IP}:8081"
echo "Suggested API base URL (device + Metro running): $URL"
echo ""
echo "iPhone Safari test (must return JSON; Metro must be running):"
echo "  ${URL}/api/v1/health"
echo ""
echo "Start Expo:"
echo "  EXPO_DEV_HOST=${IP} ./scripts/expo-device.sh lan"

if [[ "${1:-}" != "--write" ]]; then
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env not found at $ENV_FILE" >&2
  exit 1
fi

python3 - "$ENV_FILE" "$URL" <<'PY'
import re, sys
path, url = sys.argv[1], sys.argv[2]
text = open(path).read()
for key in ("PUBLIC_API_URL", "EXPO_PUBLIC_API_BASE_URL"):
    pat = rf'^{key}=.*$'
    repl = f'{key}={url}'
    text, n = re.subn(pat, repl, text, count=1, flags=re.M)
    if n == 0:
        text += f'\n{repl}\n'
open(path, 'w').write(text)
print(f'Updated {path}')
PY

echo "Restart Docker API/nginx: docker compose -f infra/docker-compose.yml --env-file .env up -d api nginx"
