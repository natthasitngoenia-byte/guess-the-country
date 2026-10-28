// Runtime settings saved by the admin panel (API key, password hash, limits) in data/config.json.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  passwordHash: null,
  geminiKey: '',
  model: 'gemini-3.8-flash',
  aiEnabled: false,
  dailyLimit: 200,
  usage: { date: '', count: 0 },
};

function load() {
  let saved = null;
  try { saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { /* first run, or a host that wipes files */ }
  const cfg = { ...DEFAULT_CONFIG, ...saved };
  // GEMINI_API_KEY lets hosts without a persistent disk (Render free, Railway...) keep the key across restarts.
  // A key saved from /admin takes priority; with only the env key, AI starts switched on.
  if (!cfg.geminiKey && process.env.GEMINI_API_KEY) {
    cfg.geminiKey = process.env.GEMINI_API_KEY.trim();
    if (!saved || saved.aiEnabled === undefined) cfg.aiEnabled = true;
  }
  return cfg;
}

// Mutated in place by the routes, then persisted with saveConfig().
const config = load();

function saveConfig() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, CONFIG_FILE);
}

const today = () => new Date().toISOString().slice(0, 10);
function usageToday() {
  if (config.usage.date !== today()) config.usage = { date: today(), count: 0 };
  return config.usage.count;
}

const maskKey = k => (k ? `••••${k.slice(-4)}` : '');

// What the admin page is allowed to see: never the key itself.
function publicConfig() {
  return {
    hasKey: Boolean(config.geminiKey),
    keyMasked: maskKey(config.geminiKey),
    model: config.model,
    aiEnabled: config.aiEnabled,
    dailyLimit: config.dailyLimit,
    usageToday: usageToday(),
  };
}

module.exports = { ROOT, config, saveConfig, usageToday, publicConfig };
