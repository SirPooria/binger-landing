#!/usr/bin/env bash
# Start Expo Metro for a physical iPhone/Android device (WSL2-friendly).
#
# Usage (from repo root):
#   EXPO_DEV_HOST=192.168.1.146 ./scripts/expo-device.sh lan
#   EXPO_DEV_HOST=192.168.1.146 ./scripts/expo-device.sh tunnel
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-lan}"
EXPO_DEV_HOST="${EXPO_DEV_HOST:-}"
METRO_PORT="${METRO_PORT:-8081}"

if [[ "$MODE" != "tunnel" && "$MODE" != "lan" ]]; then
  echo "Usage: EXPO_DEV_HOST=192.168.x.x $0 [tunnel|lan]" >&2
  exit 1
fi

if [[ -z "$EXPO_DEV_HOST" ]]; then
  echo "[expo-device] EXPO_DEV_HOST is required (Windows Wi-Fi IPv4 from ipconfig)." >&2
  exit 1
fi

# API goes through Metro on :8081 (metro-api-proxy.js → Docker :8080). Phones on WSL2 often cannot reach :8080.
export EXPO_PUBLIC_API_BASE_URL="http://${EXPO_DEV_HOST}:${METRO_PORT}"
export PUBLIC_API_URL="http://${EXPO_DEV_HOST}:${METRO_PORT}"
export BINGER_API_PROXY_TARGET="http://127.0.0.1:8080"

echo "[expo-device] Metro (bundle / Expo Go / web):  exp://${EXPO_DEV_HOST}:${METRO_PORT}"
echo "[expo-device] API (via Metro proxy):            $EXPO_PUBLIC_API_BASE_URL"
echo "[expo-device]   → Docker: docker compose -f infra/docker-compose.yml --env-file .env up -d api nginx"
echo "[expo-device]   → iPhone Safari test: ${EXPO_PUBLIC_API_BASE_URL}/api/v1/health"
echo "[expo-device]   → Metro must stay running (API + magic links use :8081, not :8080)"
echo "[expo-device] Metro mode: $MODE"
echo ""

if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$METRO_PORT" 2>/dev/null | grep -q ":$METRO_PORT"; then
  echo "[expo-device] Port $METRO_PORT in use — stopping stale Metro..."
  fuser -k "$METRO_PORT/tcp" 2>/dev/null || pkill -f "expo start" 2>/dev/null || true
  sleep 1
fi

cd "$ROOT/apps/mobile"

if [[ "$MODE" == "tunnel" ]]; then
  if [[ ! -d "$ROOT/node_modules/@expo/ngrok" ]]; then
    echo "[expo-device] Installing @expo/ngrok..."
    npm install --save-dev @expo/ngrok@^4.1.0 --workspace=apps/mobile 2>/dev/null || npm install --save-dev @expo/ngrok@^4.1.0
  fi
  echo "[expo-device] Tunnel mode — delete Binger from Expo Go recents before scanning."
  exec npx expo start --tunnel --port "$METRO_PORT"
else
  export REACT_NATIVE_PACKAGER_HOSTNAME="$EXPO_DEV_HOST"
  echo "  Metro status: http://${EXPO_DEV_HOST}:${METRO_PORT}/status"
  echo "  API health:   ${EXPO_PUBLIC_API_BASE_URL}/api/v1/health"
  echo "  After QR: wait 1-2 min for first bundle."
  echo ""
  exec npx expo start --lan --port "$METRO_PORT"
fi
