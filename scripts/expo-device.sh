#!/usr/bin/env bash
# Start Expo Metro for a physical iPhone/Android device (WSL2-friendly).
#
# Usage (from repo root):
#   EXPO_DEV_HOST=192.168.1.146 ./scripts/expo-device.sh lan
#   EXPO_DEV_HOST=192.168.1.146 ./scripts/expo-device.sh tunnel
set -euo pipefail

# #region agent log
DEBUG_LOG="$(cd "$(dirname "$0")/.." && pwd)/.cursor/debug-b4de87.log"
agent_log() {
  local hypothesis_id="$1" location="$2" message="$3"
  shift 3
  local data="${1:-{}}"
  mkdir -p "$(dirname "$DEBUG_LOG")"
  printf '%s\n' "{\"sessionId\":\"b4de87\",\"hypothesisId\":\"${hypothesis_id}\",\"location\":\"${location}\",\"message\":\"${message}\",\"data\":${data},\"timestamp\":$(($(date +%s)*1000)),\"runId\":\"${EXPO_DEBUG_RUN_ID:-expo-device}\"}" >>"$DEBUG_LOG" 2>/dev/null || true
}
# #endregion

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

export EXPO_PUBLIC_API_BASE_URL="http://${EXPO_DEV_HOST}:8080"
export EXPO_DEBUG_RUN_ID="${EXPO_DEBUG_RUN_ID:-$(date +%s)}"

echo "[expo-device] API base URL: $EXPO_PUBLIC_API_BASE_URL"
echo "[expo-device] Metro mode:   $MODE (port $METRO_PORT)"
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
  echo "[expo-device] LAN QR: exp://${EXPO_DEV_HOST}:${METRO_PORT}"
  echo ""
  echo "  iPhone Safari FIRST: http://${EXPO_DEV_HOST}:${METRO_PORT}/status"
  echo "  After QR: wait 1-2 min for first bundle. /status may hang while bundling."
  echo ""
  # #region agent log
  agent_log "H1" "expo-device.sh:lan" "start" "{\"host\":\"${EXPO_DEV_HOST}\",\"port\":${METRO_PORT}}"
  # #endregion
  exec npx expo start --lan --port "$METRO_PORT"
fi
