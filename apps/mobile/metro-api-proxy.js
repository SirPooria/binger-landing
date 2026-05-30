/**
 * Dev-only: proxy /api/* from Metro (:8081) to Docker nginx (:8080).
 * WSL2 phones can reach Metro on the LAN IP but often not Docker's published :8080.
 */
const http = require('http');
const https = require('https');

const targetOrigin =
  process.env.BINGER_API_PROXY_TARGET?.trim() || 'http://127.0.0.1:8080';

function proxyApiRequest(req, res) {
  let upstream;
  try {
    upstream = new URL(req.url || '/', targetOrigin);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'bad_request' }));
    return;
  }

  const headers = { ...req.headers, host: upstream.host };
  delete headers.connection;

  const transport = upstream.protocol === 'https:' ? https : http;
  const proxyReq = transport.request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
      path: upstream.pathname + upstream.search,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'api_proxy_error',
          message: err.message,
          hint: 'Start Docker: docker compose -f infra/docker-compose.yml up -d api nginx',
        })
      );
    }
  });

  req.pipe(proxyReq);
}

/** @param {import('connect').NextHandleFunction} metroMiddleware */
function withApiProxy(metroMiddleware) {
  return (req, res, next) => {
    const path = (req.url || '').split('?')[0];
    if (path === '/api' || path.startsWith('/api/')) {
      proxyApiRequest(req, res);
      return;
    }
    return metroMiddleware(req, res, next);
  };
}

module.exports = { withApiProxy, targetOrigin };
