// Country analysis by Gemini, proxied by the backend (the API key lives on the server, see /admin).
import { $ } from './dom.js';
import { state } from './state.js';

export async function checkAiAvailability() {
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    state.aiAvailable = res.ok && (await res.json()).ai === true;
  } catch {
    state.aiAvailable = false; // backend not running
  }
  $('ai-off-notice').classList.toggle('hidden', state.aiAvailable);
}

// Resolves to { breakdown: [{ code, pct }], nickname, description, highlights, model }.
export async function analyzeWithAi(faceImage) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: faceImage }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'AI วิเคราะห์ไม่สำเร็จ ลองอีกครั้ง');
  return data;
}
