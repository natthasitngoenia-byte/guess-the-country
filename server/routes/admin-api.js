// Admin panel endpoints (/admin page). Everything except state/setup/login/logout needs a session.
const { config, saveConfig, publicConfig } = require('../config');
const { send, readJson } = require('../http-utils');
const { rateLimited } = require('../rate-limit');
const { testConnection } = require('../gemini');
const auth = require('../auth');

const loginOk = (req, res) => send(res, 200, { ok: true }, { 'Set-Cookie': auth.sessionCookie(auth.createSession(), req) });

// Open routes
const open = {
  'GET /api/admin/state': (req, res) => {
    send(res, 200, {
      setUp: auth.isSetUp(),
      canSetUp: !auth.isSetUp() && auth.isDirectLocalRequest(req),
      passwordFromEnv: auth.passwordFromEnv(),
      loggedIn: Boolean(auth.getSession(req)),
    });
  },

  'POST /api/admin/setup': async (req, res) => {
    if (auth.isSetUp()) return send(res, 409, { error: 'ตั้งรหัสผ่านไปแล้ว' });
    if (!auth.isDirectLocalRequest(req)) return send(res, 403, { error: 'ตั้งรหัสผ่านครั้งแรกได้จากเครื่องที่รันเซิร์ฟเวอร์เท่านั้น หรือกำหนด ADMIN_PASSWORD' });
    const { password } = await readJson(req);
    if (typeof password !== 'string' || password.length < 8) return send(res, 400, { error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' });
    config.passwordHash = auth.hashPassword(password);
    saveConfig();
    loginOk(req, res);
  },

  'POST /api/admin/login': async (req, res) => {
    if (rateLimited(req, 'login', 5, 60_000)) return send(res, 429, { error: 'ลองหลายครั้งเกินไป รอ 1 นาที' });
    const { password } = await readJson(req);
    if (typeof password !== 'string' || !auth.checkAdminPassword(password)) return send(res, 401, { error: 'รหัสผ่านไม่ถูกต้อง' });
    loginOk(req, res);
  },

  'POST /api/admin/logout': (req, res) => {
    const sid = auth.getSession(req);
    if (sid) auth.endSession(sid);
    send(res, 200, { ok: true }, { 'Set-Cookie': auth.clearSessionCookie(req) });
  },
};

// Session-protected routes
const protectedRoutes = {
  'GET /api/admin/config': (req, res) => send(res, 200, publicConfig()),

  'POST /api/admin/config': async (req, res) => {
    const b = await readJson(req);
    if (typeof b.geminiKey === 'string' && b.geminiKey.trim()) config.geminiKey = b.geminiKey.trim();
    if (b.clearKey === true) { config.geminiKey = ''; config.aiEnabled = false; }
    if (typeof b.model === 'string' && /^[a-z0-9.\-]{3,60}$/i.test(b.model.trim())) config.model = b.model.trim();
    if (typeof b.aiEnabled === 'boolean') config.aiEnabled = b.aiEnabled && Boolean(config.geminiKey);
    if (Number.isInteger(b.dailyLimit) && b.dailyLimit >= 0 && b.dailyLimit <= 100000) config.dailyLimit = b.dailyLimit;
    saveConfig();
    send(res, 200, publicConfig());
  },

  'POST /api/admin/test': async (req, res) => {
    if (!config.geminiKey) return send(res, 400, { error: 'ยังไม่ได้ใส่ API Key' });
    try {
      send(res, 200, { ok: true, ...(await testConnection()) });
    } catch (e) {
      send(res, 200, { ok: false, error: e.message.slice(0, 300) });
    }
  },

  'POST /api/admin/password': async (req, res) => {
    if (auth.passwordFromEnv()) return send(res, 400, { error: 'รหัสผ่านถูกกำหนดด้วย ADMIN_PASSWORD ให้เปลี่ยนที่ค่า environment แทน' });
    const { current, next } = await readJson(req);
    if (typeof current !== 'string' || !auth.checkAdminPassword(current)) return send(res, 401, { error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    if (typeof next !== 'string' || next.length < 8) return send(res, 400, { error: 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร' });
    config.passwordHash = auth.hashPassword(next);
    saveConfig();
    auth.endAllSessions();
    loginOk(req, res);
  },
};

function requireSession(handler) {
  return (req, res) => (auth.getSession(req) ? handler(req, res) : send(res, 401, { error: 'กรุณาเข้าสู่ระบบ' }));
}

module.exports = {
  ...open,
  ...Object.fromEntries(Object.entries(protectedRoutes).map(([k, h]) => [k, requireSession(h)])),
};
