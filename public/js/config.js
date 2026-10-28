// Shared constants for the front end.

export const HUMAN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6';

// Codes must match the list the server gives the AI (server/gemini.js).
export const COUNTRIES = {
  TH: ['ไทย', '🇹🇭'], KR: ['เกาหลีใต้', '🇰🇷'], JP: ['ญี่ปุ่น', '🇯🇵'], CN: ['จีน', '🇨🇳'],
  TW: ['ไต้หวัน', '🇹🇼'], VN: ['เวียดนาม', '🇻🇳'], PH: ['ฟิลิปปินส์', '🇵🇭'], ID: ['อินโดนีเซีย', '🇮🇩'],
  MY: ['มาเลเซีย', '🇲🇾'], LA: ['ลาว', '🇱🇦'], MM: ['เมียนมา', '🇲🇲'], IN: ['อินเดีย', '🇮🇳'],
  US: ['สหรัฐอเมริกา', '🇺🇸'], GB: ['สหราชอาณาจักร', '🇬🇧'], FR: ['ฝรั่งเศส', '🇫🇷'], DE: ['เยอรมนี', '🇩🇪'],
  IT: ['อิตาลี', '🇮🇹'], ES: ['สเปน', '🇪🇸'], RU: ['รัสเซีย', '🇷🇺'], TR: ['ตุรกี', '🇹🇷'],
  BR: ['บราซิล', '🇧🇷'], MX: ['เม็กซิโก', '🇲🇽'], NG: ['ไนจีเรีย', '🇳🇬'], AU: ['ออสเตรเลีย', '🇦🇺'],
};

export function country(code) {
  const c = COUNTRIES[code];
  return c ? { name: c[0], flag: c[1] } : { name: code, flag: '🏳️' };
}

export const CHART_COLORS = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#475569'];

export const EMOTIONS = {
  happy: 'ยิ้มแย้ม', neutral: 'นิ่งสงบ', sad: 'เศร้า', angry: 'ดุดัน',
  surprise: 'ประหลาดใจ', fear: 'กังวล', disgust: 'ไม่พอใจ',
};
