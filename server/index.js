// Guess the country backend: serves public/, keeps the Gemini API key server-side,
// and powers the admin panel at /admin. No dependencies (Node 18+).
const http = require('http');
const { send } = require('./http-utils');
const { serveStatic } = require('./static');

const PORT = Number(process.env.PORT) || 3000;
const routes = {
  ...require('./routes/public-api'),
  ...require('./routes/admin-api'),
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);
    const handler = routes[`${req.method} ${pathname}`];
    if (!handler) return send(res, 404, { error: 'ไม่พบ' });
    await handler(req, res);
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
    if (!e.status) console.error(e);
  }
});

server.listen(PORT, () => {
  console.log(`Guess the country: http://localhost:${PORT}`);
  console.log(`หลังบ้าน:           http://localhost:${PORT}/admin`);
});
