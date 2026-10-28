// Gemini API calls. The key never leaves the server.
const { config } = require('./config');
const { httpError } = require('./http-utils');

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Used, in order, when the chosen model stays overloaded ("high demand" 503) after retries.
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];

async function callModel(model, body, attempts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let res, data;
  for (let i = 1; i <= attempts; i++) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25_000),
      });
    } catch (e) {
      // A timed-out or dropped request counts as an overloaded model, so the fallback models get tried.
      throw Object.assign(new Error(`Gemini ไม่ตอบกลับภายในเวลา (${model})`), { upstreamStatus: 504 });
    }
    data = await res.json().catch(() => ({}));
    if (res.ok || !RETRYABLE.has(res.status) || i === attempts) break;
    await sleep(1000 * i);
  }
  if (!res.ok) throw Object.assign(new Error(data.error?.message || `Gemini HTTP ${res.status}`), { upstreamStatus: res.status });
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
  if (!text) throw new Error(`Gemini ไม่ตอบกลับ (${data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'ไม่ทราบสาเหตุ'})`);
  return text;
}

// Gemini regularly answers 503 "high demand", so retry with backoff, then fall back to lighter models.
// Returns { text, model } so callers can tell which model answered.
async function callGemini(body) {
  const models = [config.model, ...FALLBACK_MODELS.filter(m => m !== config.model)];
  let lastError;
  for (const model of models) {
    try {
      return { text: await callModel(model, body, 2), model };
    } catch (e) {
      lastError = e;
      // Only overload/server errors move on to the next model; a bad key or bad request won't improve.
      if (!RETRYABLE.has(e.upstreamStatus)) throw e;
    }
  }
  throw lastError;
}

async function testConnection() {
  const { text, model } = await callGemini({ contents: [{ role: 'user', parts: [{ text: 'ตอบคำว่า "พร้อม" คำเดียว' }] }] });
  return { reply: text.trim().slice(0, 100), model };
}

// Countries the AI may pick from; codes match public/js/config.js (flags and Thai names live there).
const COUNTRIES = {
  TH: 'ไทย', KR: 'เกาหลีใต้', JP: 'ญี่ปุ่น', CN: 'จีน', TW: 'ไต้หวัน', VN: 'เวียดนาม', PH: 'ฟิลิปปินส์',
  ID: 'อินโดนีเซีย', MY: 'มาเลเซีย', LA: 'ลาว', MM: 'เมียนมา', IN: 'อินเดีย', US: 'สหรัฐอเมริกา',
  GB: 'สหราชอาณาจักร', FR: 'ฝรั่งเศส', DE: 'เยอรมนี', IT: 'อิตาลี', ES: 'สเปน', RU: 'รัสเซีย',
  TR: 'ตุรกี', BR: 'บราซิล', MX: 'เม็กซิโก', NG: 'ไนจีเรีย', AU: 'ออสเตรเลีย',
};

const ANALYZE_SYSTEM = [
  'คุณคือ AI ของเว็บบันเทิง "หน้าคุณคล้ายคนประเทศไหน"',
  'ดูภาพใบหน้าแล้วประเมินว่าโครงหน้า ดวงตา จมูก ทรงผม และลุคโดยรวมดูคล้ายคนจากประเทศไหนมากที่สุด เลือกจากรายการรหัสประเทศที่กำหนดเท่านั้น',
  'ให้ 5 ประเทศ เรียงจากคล้ายมากไปน้อย พร้อมเปอร์เซ็นต์ที่รวมกันได้ 100',
  'เขียนด้วยน้ำเสียงสนุก เป็นกันเอง และเชิงบวกเสมอ ห้ามดูถูก ห้ามเหมารวมเชิงลบ ห้ามวิจารณ์รูปร่างหน้าตาในแง่ลบ ห้ามพูดถึงศาสนา สุขภาพ หรือเพศวิถี',
  'ชื่อเล่น (nickname) ให้สนุกและได้แรงบันดาลใจจากวัฒนธรรมป๊อปหรือสถานที่ของประเทศอันดับหนึ่ง',
  'จุดเด่น (highlights) 4 ข้อ ให้บรรยายลักษณะที่มองเห็นได้ในภาพ เช่น รูปหน้า ดวงตา รอยยิ้ม ทรงผม',
  'ตอบเป็นภาษาไทยเท่านั้น',
].join('\n');

const ANALYZE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    breakdown: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { country: { type: 'STRING', enum: Object.keys(COUNTRIES) }, percentage: { type: 'NUMBER' } },
        required: ['country', 'percentage'],
      },
    },
    nickname: { type: 'STRING' },
    description: { type: 'STRING' },
    highlights: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, detail: { type: 'STRING' } }, required: ['title', 'detail'] },
    },
  },
  required: ['breakdown', 'nickname', 'description', 'highlights'],
};

// Integer percentages that add up to exactly 100 (largest remainder), whatever the model returned.
function normalizePercentages(rows) {
  const total = rows.reduce((s, r) => s + r.percentage, 0) || 1;
  const raw = rows.map(r => (r.percentage / total) * 100);
  const floors = raw.map(Math.floor);
  const order = raw.map((v, i) => [v - floors[i], i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; j < 100 - floors.reduce((a, b) => a + b, 0); j++) floors[order[j % order.length][1]]++;
  return rows.map((r, i) => ({ code: r.country, pct: floors[i] }));
}

async function analyzeFace({ image }) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image || '');
  if (!m) throw httpError(400, 'รูปภาพไม่ถูกต้อง');
  const list = Object.entries(COUNTRIES).map(([code, name]) => `${code}=${name}`).join(', ');
  const { text, model } = await callGemini({
    systemInstruction: { parts: [{ text: ANALYZE_SYSTEM }] },
    contents: [{
      role: 'user',
      parts: [
        { text: `รหัสประเทศที่เลือกได้: ${list}\nวิเคราะห์ใบหน้าในภาพนี้` },
        { inlineData: { mimeType: m[1], data: m[2] } },
      ],
    }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: ANALYZE_SCHEMA, temperature: 0.4 },
  });
  const out = JSON.parse(text);

  // Keep valid, unique countries with positive shares; the schema enum usually guarantees this already.
  const seen = new Set();
  const rows = (Array.isArray(out.breakdown) ? out.breakdown : [])
    .filter(r => COUNTRIES[r.country] && Number(r.percentage) > 0 && !seen.has(r.country) && seen.add(r.country))
    .map(r => ({ country: r.country, percentage: Number(r.percentage) }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);
  if (!rows.length) throw new Error('AI ไม่ได้ส่งผลประเทศกลับมา');

  return {
    breakdown: normalizePercentages(rows),
    nickname: String(out.nickname || '').slice(0, 80),
    description: String(out.description || '').slice(0, 400),
    highlights: (Array.isArray(out.highlights) ? out.highlights : []).slice(0, 4).map(h => ({
      title: String(h.title || '').slice(0, 60),
      detail: String(h.detail || '').slice(0, 200),
    })),
    model,
  };
}

module.exports = { testConnection, analyzeFace };

