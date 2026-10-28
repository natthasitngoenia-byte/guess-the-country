// Small DOM helpers.

export const $ = id => document.getElementById(id);

export function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

let toastTimer;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 4000);
}

export function setModelStatus(kind, text) {
  const s = $('model-status');
  const styles = {
    loading: ['bg-indigo-500/10 border-indigo-500/20 text-indigo-300', 'loader-2', 'animate-spin'],
    ready: ['bg-emerald-500/10 border-emerald-500/25 text-emerald-300', 'check-circle-2', ''],
    error: ['bg-rose-500/10 border-rose-500/25 text-rose-300', 'alert-triangle', ''],
  }[kind];
  s.className = `inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium mb-2 ${styles[0]}`;
  s.replaceChildren();
  const icon = el('i', `w-3.5 h-3.5 ${styles[2]}`);
  icon.dataset.lucide = styles[1];
  s.append(icon, el('span', '', text));
  lucide.createIcons();
}
