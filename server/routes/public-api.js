// Endpoints the public site calls.
const { config, saveConfig, usageToday } = require('../config');
const { send, readJson } = require('../http-utils');
const { rateLimited } = require('../rate-limit');
const { analyzeFace } = require('../gemini');

module.exports = {
  'GET /api/status': (req, res) => {
    send(res, 200, { ai: Boolean(config.aiEnabled && config.geminiKey) });
  },

  'POST /api/analyze': async (req, res) => {
    if (!config.aiEnabled || !config.geminiKey) return send(res, 503, { error: 'ระบบ AI ยังไม่เปิดใช้งาน' });
    if (rateLimited(req, 'analyze', 6, 60_000)) return send(res, 429, { error: 'ใช้บ่อยเกินไป ลองใหม่ในอีกสักครู่' });
    if (usageToday() >= config.dailyLimit) return send(res, 429, { error: 'วันนี้ใช้ครบโควตาแล้ว ลองใหม่พรุ่งนี้' });
    const body = await readJson(req);
    // Counted before the call so failed requests still count toward the cost cap.
    config.usage.count++;
    saveConfig();
    try {
      send(res, 200, await analyzeFace(body));
    } catch (e) {
      if (e.status) throw e;
      console.error('[analyze]', e.message);
      const busy = e.upstreamStatus === 429 || e.upstreamStatus === 503;
      send(res, 502, { error: busy ? 'ตอนนี้ AI มีคนใช้เยอะ ลองอีกครั้งในอีกสักครู่' : 'AI วิเคราะห์ไม่สำเร็จ ลองอีกครั้ง' });
    }
  },
};
