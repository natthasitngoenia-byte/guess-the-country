// Photo input: upload / drag-and-drop, webcam capture, and the preview panel.
import { $, toast } from './dom.js';
import { state } from './state.js';

const TAB_ON = 'bg-indigo-600 text-white shadow-md';
const TAB_OFF = 'text-slate-400 hover:text-slate-200';

export function setMode(mode) {
  state.mode = mode;
  for (const [id, m] of [['tab-upload', 'upload'], ['tab-webcam', 'webcam']]) {
    const t = $(id);
    t.classList.remove(...TAB_ON.split(' '), ...TAB_OFF.split(' '));
    t.classList.add(...(m === mode ? TAB_ON : TAB_OFF).split(' '));
  }
  showInputPanel();
}

export function showInputPanel() {
  state.image = null;
  $('panel-preview').classList.add('hidden');
  $('panel-upload').classList.toggle('hidden', state.mode !== 'upload');
  $('panel-webcam').classList.toggle('hidden', state.mode !== 'webcam');
  if (state.mode === 'webcam') startWebcam(); else stopWebcam();
}

function showPreview(dataUrl) {
  state.image = dataUrl;
  $('image-preview').src = dataUrl;
  $('panel-upload').classList.add('hidden');
  $('panel-webcam').classList.add('hidden');
  $('panel-preview').classList.remove('hidden');
}

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return toast('กรุณาเลือกไฟล์รูปภาพ');
  const reader = new FileReader();
  reader.onload = e => showPreview(e.target.result);
  reader.readAsDataURL(file);
}

async function startWebcam() {
  const err = $('webcam-error');
  err.classList.add('hidden');
  if (state.stream) return;
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    $('webcam-video').srcObject = state.stream;
  } catch (e) {
    err.textContent = 'เปิดกล้องไม่ได้ ตรวจสอบว่าอนุญาตให้เว็บนี้ใช้กล้องแล้ว หรือใช้การอัปโหลดรูปแทน';
    err.classList.remove('hidden');
  }
}

function stopWebcam() {
  if (state.stream) state.stream.getTracks().forEach(t => t.stop());
  state.stream = null;
}

function capture() {
  const v = $('webcam-video');
  if (!v.videoWidth) return;
  const c = document.createElement('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  const ctx = c.getContext('2d');
  ctx.translate(c.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(v, 0, 0, c.width, c.height);
  stopWebcam();
  showPreview(c.toDataURL('image/jpeg', 0.9));
}

export function initInput() {
  $('tab-upload').addEventListener('click', () => setMode('upload'));
  $('tab-webcam').addEventListener('click', () => setMode('webcam'));
  $('file-input').addEventListener('change', e => { handleFile(e.target.files[0]); e.target.value = ''; });

  const dz = $('drop-zone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('border-indigo-400', 'bg-indigo-500/10'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('border-indigo-400', 'bg-indigo-500/10'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('border-indigo-400', 'bg-indigo-500/10');
    handleFile(e.dataTransfer.files[0]);
  });

  $('btn-capture').addEventListener('click', capture);
  $('btn-reset').addEventListener('click', showInputPanel);
  setMode('upload');
}
