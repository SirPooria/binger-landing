const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const { withApiProxy } = require('./metro-api-proxy');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Phone on LAN hits Metro :8081; proxy /api to Docker nginx on :8080 (WSL2 often blocks :8080).
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => withApiProxy(metroMiddleware),
};

// Monorepo: watch the workspace root so @binger/shared resolves.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
