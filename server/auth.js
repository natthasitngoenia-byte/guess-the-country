// Admin password hashing and cookie sessions.
const crypto = require('crypto');
const { config } = require('./config');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `${salt.toString('hex')}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}

function verifyPassword(pw, stored) {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(':');
  const actual = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// ADMIN_PASSWORD env var takes priority over the password saved through the setup screen.
function checkAdminPassword(pw) {
  if (process.env.ADMIN_PASSWORD) {
    const a = Buffer.from(pw), b = Buffer.from(process.env.ADMIN_PASSWORD);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  return verifyPassword(pw, config.passwordHash);
}

const passwordFromEnv = () => Boolean(process.env.ADMIN_PASSWORD);
const isSetUp = () => Boolean(process.env.ADMIN_PASSWORD || config.passwordHash);

// First-run setup is only allowed from this machine, so nobody else can claim a fresh deployment.
function isDirectLocalRequest(req) {
  const ip = req.socket.remoteAddress || '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip) && !req.headers['x-forwarded-for'];
}

function createSession() {
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, Date.now() + SESSION_TTL_MS);
  return id;
}

function getSession(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  if (!m) return null;
  const exp = sessions.get(m[1]);
  if (!exp || exp < Date.now()) { sessions.delete(m[1]); return null; }
  return m[1];
}

const endSession = id => sessions.delete(id);
const endAllSessions = () => sessions.clear();

function sessionCookie(id, req, maxAgeSec = SESSION_TTL_MS / 1000) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted ? '; Secure' : '';
  return `sid=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}${secure}`;
}
const clearSessionCookie = req => sessionCookie('', req, 0);

setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of sessions) if (exp < now) sessions.delete(k);
}, 60_000).unref();

module.exports = {
  hashPassword, checkAdminPassword, passwordFromEnv, isSetUp, isDirectLocalRequest,
  createSession, getSession, endSession, endAllSessions, sessionCookie, clearSessionCookie,
};
