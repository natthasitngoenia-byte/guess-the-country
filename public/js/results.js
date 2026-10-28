// Results dashboard: top match, chart, bars, AI highlights, and the PNG card download.
import { country, CHART_COLORS, EMOTIONS } from './config.js';
import { $, el, toast } from './dom.js';

let chart = null;

function detailCard(label, value) {
  const d = el('div', 'p-3 rounded-xl bg-slate-900 border border-slate-800');
  d.append(el('p', 'text-[10px] text-slate-400', label), el('p', 'text-sm font-semibold text-slate-100 mt-0.5', value));
  return d;
}

function highlightCard(h) {
  const d = el('div', 'p-3 rounded-xl bg-slate-900 border border-slate-800');
  d.append(el('p', 'text-xs font-semibold text-slate-100', h.title), el('p', 'text-[11px] text-slate-400 mt-0.5 leading-relaxed', h.detail));
  return d;
}

function renderBars(entries) {
  const bars = $('breakdown-bars');
  bars.replaceChildren();
  entries.forEach((e, i) => {
    const row = el('div', 'space-y-1');
    const label = el('div', 'flex justify-between text-xs font-medium');
    const left = el('span', 'flex items-center space-x-1.5 text-slate-200');
    left.append(el('span', 'flag', e.flag), el('span', '', e.name));
    label.append(left, el('span', 'font-bold text-indigo-300', e.pct + '%'));
    const track = el('div', 'w-full h-2.5 bg-slate-800 rounded-full overflow-hidden');
    const fill = el('div', 'h-full rounded-full transition-all duration-1000');
    fill.style.width = '0%';
    fill.style.background = CHART_COLORS[i % CHART_COLORS.length];
    track.append(fill);
    row.append(label, track);
    bars.append(row);
    setTimeout(() => { fill.style.width = e.pct + '%'; }, 80 * i + 50);
  });
}

function renderChart(entries) {
  if (chart) chart.destroy();
  chart = new Chart($('country-chart'), {
    type: 'doughnut',
    data: {
      labels: entries.map(e => e.name),
      datasets: [{ data: entries.map(e => e.pct), backgroundColor: CHART_COLORS.slice(0, entries.length), borderWidth: 2, borderColor: '#0f172a' }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '66%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { family: 'Kanit', size: 11 }, boxWidth: 12, padding: 10 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } },
      },
    },
  });
}

// face: local detection result (age, emotion, score); ai: server /api/analyze response;
// photo: the cropped face (data URL) that was analysed, shown on the result card.
export function renderResults(face, ai, photo) {
  $('section-input').classList.add('hidden');
  $('section-results').classList.remove('hidden');
  $('result-timestamp').textContent = 'วิเคราะห์เมื่อ ' + new Date().toLocaleString('th-TH');
  $('result-photo').src = photo;

  const entries = ai.breakdown.map(r => ({ ...country(r.code), pct: r.pct }));
  const top = entries[0];
  $('top-flag').textContent = top.flag;
  $('top-country').textContent = top.name;
  $('top-percentage').textContent = top.pct + '%';
  $('ai-nickname').textContent = ai.nickname ? `"${ai.nickname}"` : '';
  $('ai-nickname').classList.toggle('hidden', !ai.nickname);
  $('ai-description').textContent = ai.description || '';

  renderBars(entries);
  renderChart(entries);

  $('ai-highlights').replaceChildren(...(ai.highlights || []).map(highlightCard));
  const emotion = (face.emotion || [])[0];
  $('details-grid').replaceChildren(
    detailCard('ความชัดของใบหน้า', Math.round((face.faceScore || face.score || 0) * 100) + '%'),
    detailCard('อายุโดยประมาณ', face.age ? `~${Math.round(face.age)} ปี` : '-'),
    detailCard('อารมณ์บนใบหน้า', emotion ? (EMOTIONS[emotion.emotion] || emotion.emotion) : '-'),
  );

  lucide.createIcons();
  $('section-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function downloadCard() {
  const btn = $('btn-download-card');
  btn.disabled = true;
  try {
    const canvas = await html2canvas($('exportable-card'), { scale: 2, backgroundColor: '#0f172a' });
    const a = document.createElement('a');
    a.download = `guess-the-country-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (e) {
    console.error(e);
    toast('สร้างรูปไม่สำเร็จ');
  } finally {
    btn.disabled = false;
  }
}

export function initResults({ onRetry }) {
  $('btn-download-card').addEventListener('click', downloadCard);
  $('btn-retry').addEventListener('click', () => {
    $('section-results').classList.add('hidden');
    $('section-input').classList.remove('hidden');
    onRetry();
  });
}
