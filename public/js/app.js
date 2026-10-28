// Entry point: wires the modules together and runs the analysis.
import { $, toast, setModelStatus } from './dom.js';
import { state } from './state.js';
import { loadModel, toCanvas, largestFace, cropThumb } from './face-ai.js';
import { initInput, showInputPanel } from './input.js';
import { initResults, renderResults } from './results.js';
import { checkAiAvailability, analyzeWithAi } from './ai-analyze.js';

async function analyze() {
  if (!state.image) return;
  if (!state.aiAvailable) return toast('ระบบ AI ยังไม่เปิดใช้งาน');
  if (!$('consent-check').checked) return toast('กรุณาติ๊กยินยอมให้ AI วิเคราะห์ภาพก่อน');
  if (!state.ready) return toast('รอโมเดลตรวจจับใบหน้าโหลดเสร็จก่อนนะ');

  const overlay = $('scanning-overlay');
  const status = $('scan-status-text');
  overlay.classList.replace('hidden', 'flex');
  $('btn-analyze').disabled = $('btn-reset').disabled = true;
  try {
    // Detect and crop the face locally first, so only the face (not the whole photo) is sent.
    status.textContent = 'กำลังตรวจหาใบหน้า...';
    const canvas = await toCanvas(state.image);
    const face = await largestFace(canvas);
    if (!face) throw new Error('ไม่พบใบหน้าในภาพ ลองใช้ภาพหน้าตรงที่ชัดกว่านี้');
    status.textContent = 'AI กำลังวิเคราะห์โครงหน้าและลุคของคุณ...';
    const faceImage = cropThumb(canvas, face.box, 512);
    const result = await analyzeWithAi(faceImage);
    renderResults(face, result, faceImage);
  } catch (e) {
    console.error(e);
    toast(e.message || 'วิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้ง');
  } finally {
    overlay.classList.replace('flex', 'hidden');
    $('btn-analyze').disabled = $('btn-reset').disabled = false;
  }
}

lucide.createIcons();
initInput();
initResults({ onRetry: showInputPanel });
$('btn-analyze').addEventListener('click', analyze);

checkAiAvailability();
try {
  await loadModel();
  state.ready = true;
  setModelStatus('ready', 'พร้อมวิเคราะห์');
} catch (e) {
  console.error(e);
  setModelStatus('error', 'โหลดโมเดลตรวจจับใบหน้าไม่สำเร็จ ลองรีเฟรชหน้า');
}
