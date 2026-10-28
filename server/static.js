// Serves files from public/ only. Nothing outside it (server code, data/) is reachable.
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./config');
const { send } = require('./http-utils');

const PUBLIC_DIR = path.join(ROOT, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const ALIASES = { '/': '/index.html', '/admin': '/admin.html' };

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed');
  let rel;
  try { rel = decodeURIComponent(ALIASES[pathname] || pathname); } catch { return send(res, 400, 'bad request'); }
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!file.startsWith(PUBLIC_DIR + path.sep) || !type) return send(res, 404, 'not found');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'not found');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

module.exports = { serveStatic };
