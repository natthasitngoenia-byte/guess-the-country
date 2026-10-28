// In-browser face detection, crop, age and emotion (Human library). Nothing here leaves the browser.
import { Human } from 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/dist/human.esm.js';
import { HUMAN_URL } from './config.js';

const human = new Human({
  modelBasePath: `${HUMAN_URL}/models/`,
  debug: false,
  cacheSensitivity: 0,
  face: {
    enabled: true,
    detector: { rotation: true, maxDetected: 5, minConfidence: 0.3, return: false },
    mesh: { enabled: true },
    attention: { enabled: false },
    iris: { enabled: false },
    description: { enabled: true },
    emotion: { enabled: true },
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },
  body: { enabled: false }, hand: { enabled: false }, object: { enabled: false },
  gesture: { enabled: false }, segmentation: { enabled: false },
});

export async function loadModel() {
  await human.load();
  await human.warmup();
}

// Draw a File/Blob or data URL onto a canvas, downscaled so the longest side is at most `max`.
export async function toCanvas(src, max = 1024) {
  const url = src instanceof Blob ? URL.createObjectURL(src) : src;
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    if (src instanceof Blob) URL.revokeObjectURL(url);
  }
}

export async function largestFace(canvas) {
  const res = await human.detect(canvas);
  const faces = (res.face || []).filter(f => f.embedding && f.embedding.length);
  if (!faces.length) return null;
  return faces.reduce((a, b) => (a.box[2] * a.box[3] >= b.box[2] * b.box[3] ? a : b));
}

export function cropThumb(canvas, box, size = 112) {
  const [x, y, w, h] = box;
  const s = Math.max(w, h) * 1.35;
  const t = document.createElement('canvas');
  t.width = t.height = size;
  t.getContext('2d').drawImage(canvas, x + w / 2 - s / 2, y + h / 2 - s / 2, s, s, 0, 0, size, size);
  return t.toDataURL('image/jpeg', 0.8);
}
