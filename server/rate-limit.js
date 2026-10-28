// Fixed-window, in-memory rate limiting per client IP.

// Behind a reverse proxy (Render, Railway, nginx...) set TRUST_PROXY=1 so limits use the real client IP.
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const buckets = new Map();

function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return req.headers['x-forwarded-for'].split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function rateLimited(req, name, limit, windowMs) {
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { count: 1, reset: now + windowMs }); return false; }
  b.count++;
  return b.count > limit;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}, 60_000).unref();

module.exports = { rateLimited };
