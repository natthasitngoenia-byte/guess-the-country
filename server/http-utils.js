// Response and request-body helpers.

const MAX_BODY = 4 * 1024 * 1024;

const httpError = (status, message) => Object.assign(new Error(message), { status });

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

// Only JSON bodies are accepted; this (with SameSite=Strict cookies) blocks cross-site form posts.
function readJson(req, maxBody = MAX_BODY) {
  return new Promise((resolve, reject) => {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return reject(httpError(415, 'ต้องส่งเป็น JSON'));
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > maxBody) { reject(httpError(413, 'ไฟล์ใหญ่เกินไป')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(httpError(400, 'JSON ไม่ถูกต้อง')); }
    });
    req.on('error', reject);
  });
}

module.exports = { send, readJson, httpError };
