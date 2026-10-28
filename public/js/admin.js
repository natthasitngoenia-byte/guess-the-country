import { $ } from './dom.js';

const VIEWS = ['view-setup', 'view-blocked', 'view-login', 'view-dash'];
function show(view) {
  VIEWS.forEach(v => $(v).classList.toggle('hidden', v !== view));
  $('btn-logout').classList.toggle('hidden', view !== 'view-dash');
}
function msg(target, text, ok) {
  target.textContent = text;
  target.className = target.className.replace(/text-(rose|emerald)-300/g, '') + (ok ? ' text-emerald-300' : ' text-rose-300');
}
async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path.startsWith('/api/admin/') && !path.endsWith('/login') && !path.endsWith('/password')) {
    show('view-login');
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function renderConfig(c) {
  const s = $('key-status');
  s.textContent = c.hasKey ? `ตั้งค่าแล้ว ${c.keyMasked}` : 'ยังไม่มี Key';
  s.className = 'shrink-0 text-xs px-2.5 py-1 rounded-full border ' + (c.hasKey
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
    : 'bg-amber-500/10 border-amber-500/30 text-amber-300');
  $('ai-enabled').checked = c.aiEnabled;
  $('ai-enabled').disabled = !c.hasKey;
  $('model-input').value = c.model;
  $('limit-input').value = c.dailyLimit;
  $('usage-today').textContent = c.usageToday;
}

async function boot() {
  const st = await api('/api/admin/state');
  if (st.loggedIn) {
    show('view-dash');
    $('section-password').classList.toggle('hidden', st.passwordFromEnv);
    renderConfig(await api('/api/admin/config'));
  } else if (st.setUp) show('view-login');
  else show(st.canSetUp ? 'view-setup' : 'view-blocked');
  lucide.createIcons();
}

$('view-setup').addEventListener('submit', async e => {
  e.preventDefault();
  const m = e.target.querySelector('.form-msg');
  if ($('setup-pw').value !== $('setup-pw2').value) return msg(m, 'รหัสผ่านไม่ตรงกัน');
  try { await api('/api/admin/setup', { password: $('setup-pw').value }); boot(); }
  catch (err) { msg(m, err.message); }
});
$('view-login').addEventListener('submit', async e => {
  e.preventDefault();
  const m = e.target.querySelector('.form-msg');
  try { await api('/api/admin/login', { password: $('login-pw').value }); $('login-pw').value = ''; boot(); }
  catch (err) { msg(m, err.message); }
});
$('btn-logout').addEventListener('click', async () => { await api('/api/admin/logout', {}); boot(); });


$('form-key').addEventListener('submit', async e => {
  e.preventDefault();
  const key = $('key-input').value.trim();
  if (!key) return msg($('key-msg'), 'กรุณาวาง API Key');
  try {
    renderConfig(await api('/api/admin/config', { geminiKey: key }));
    $('key-input').value = '';
    msg($('key-msg'), 'บันทึก Key แล้ว กด "ทดสอบการเชื่อมต่อ" เพื่อตรวจสอบ', true);
  } catch (err) { msg($('key-msg'), err.message); }
});
$('btn-clear-key').addEventListener('click', async () => {
  if (!confirm('ลบ API Key ออกจากเซิร์ฟเวอร์? คำบรรยายจาก AI จะถูกปิดด้วย')) return;
  try { renderConfig(await api('/api/admin/config', { clearKey: true })); msg($('key-msg'), 'ลบ Key แล้ว', true); }
  catch (err) { msg($('key-msg'), err.message); }
});
$('btn-test').addEventListener('click', async () => {
  msg($('key-msg'), 'กำลังทดสอบ...', true);
  try {
    const r = await api('/api/admin/test', {});
    if (!r.ok) return msg($('key-msg'), `เชื่อมต่อไม่ได้: ${r.error}`);
    const fallback = r.model !== $('model-input').value.trim() ? ` (ตัวหลักไม่ว่าง เลยใช้โมเดลสำรอง ${r.model})` : '';
    msg($('key-msg'), `เชื่อมต่อได้ • ${r.model} ตอบว่า: ${r.reply}${fallback}`, true);
  } catch (err) { msg($('key-msg'), err.message); }
});

$('ai-enabled').addEventListener('change', async e => {
  try { renderConfig(await api('/api/admin/config', { aiEnabled: e.target.checked })); msg($('settings-msg'), e.target.checked ? 'เปิดใช้แล้ว' : 'ปิดใช้แล้ว', true); }
  catch (err) { msg($('settings-msg'), err.message); }
});
$('form-settings').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    renderConfig(await api('/api/admin/config', { model: $('model-input').value.trim(), dailyLimit: Number($('limit-input').value) }));
    msg($('settings-msg'), 'บันทึกแล้ว', true);
  } catch (err) { msg($('settings-msg'), err.message); }
});
$('form-password').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await api('/api/admin/password', { current: $('pw-current').value, next: $('pw-next').value });
    e.target.reset();
    msg($('password-msg'), 'เปลี่ยนรหัสผ่านแล้ว', true);
  } catch (err) { msg($('password-msg'), err.message); }
});

boot().catch(err => { document.querySelector('main').textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ' + err.message; });
