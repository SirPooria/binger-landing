const path = require('path');
const appJson = require('./app.json');

// Load repo-root .env when Metro evaluates config (monorepo dev).
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const devHost = process.env.EXPO_DEV_HOST?.trim();
const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const isLocalhost = (url) => !url || /localhost|127\.0\.0\.1/i.test(url);

/** Phone must use PC Wi‑Fi IP — not localhost. EXPO_DEV_HOST wins when .env is still localhost. */
function resolveApiBaseUrl() {
  if (fromEnv && !isLocalhost(fromEnv)) return fromEnv;
  if (devHost) return `http://${devHost}:8080`;
  return fromEnv || appJson.expo.extra?.apiBaseUrl || 'http://localhost:8080';
}

const apiBaseUrl = resolveApiBaseUrl();

if (isLocalhost(apiBaseUrl) && !devHost) {
  console.warn(
    '[Binger] API URL is localhost — iPhone will timeout. Run:\n' +
      '  EXPO_DEV_HOST=<pc-wifi-ip> ./scripts/expo-device.sh lan'
  );
}

module.exports = () => ({
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiBaseUrl,
    },
  },
});
