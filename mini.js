/* Alts mini window: quick copy of logins, optionally attached next to the Riot Client */
'use strict';
const ipc = window.api;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const P = {
  key: '<circle cx="16.5" cy="7.5" r="4"/><path d="M13.6 10.4 5 19M6.5 17.5l2 2M9 15l2 2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  pin: '<path d="M9 4h6l-1 6 4 4H6l4-4z"/><path d="M12 14v6"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
};
const ic = (n, s = 15) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const APEX = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];
const cap = (s) => (s ? s[0] + s.slice(1).toLowerCase() : '');
const rankText = (r) => (r ? cap(r.tier) + (APEX.includes(r.tier) ? '' : ' ' + r.rank) : 'Unranked');
const tc = (t) => `var(--t-${t ? t.toLowerCase() : 'none'})`;

const S = { status: {}, accounts: [], q: '', riot: false, order: null };
const solo = (a) => (a.cache && a.cache.solo) || null;
const name = (a) => (S.status.streamer ? 'Account ' + (S.accounts.indexOf(a) + 1) : (a.cache && a.cache.name) || a.riotId.split('#')[0]);
const av = (a, n) => `<div class="av" style="width:${n}px;height:${n}px;font-size:${Math.round(n / 3)}px">${a.cache && a.cache.icon && !S.status.streamer ? `<img src="${esc(a.cache.icon)}" alt="" onerror="this.remove()">` : esc(name(a)[0] || '?')}</div>`;

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="row"><span>${text}</span></div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function render() {
  const t = S.status.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : (S.status.theme || 'dark');
  document.documentElement.dataset.theme = t;
  document.body.classList.toggle('docked', !!(S.status.miniDocked && S.riot));
  const head = `<div class="mhd"><div class="mark">${ic('key', 13)}</div><b>Alts Keychain</b>
    <button class="icon-btn sm" type="button" data-act="dock" aria-pressed="${!!S.status.miniDocked}" title="${S.status.miniDocked ? 'Detach from Riot Client' : 'Attach next to Riot Client'}" aria-label="${S.status.miniDocked ? 'Detach from Riot Client' : 'Attach next to Riot Client'}" style="${S.status.miniDocked ? 'color:var(--accent);border-color:var(--accent)' : ''}">${ic('pin')}</button>
    <button class="icon-btn sm" type="button" data-act="main" title="Open Alts" aria-label="Open Alts">${ic('open')}</button>
    <button class="icon-btn sm" type="button" data-act="close" title="Close" aria-label="Close mini window">${ic('x')}</button></div>`;
  const note = (S.status.platform === 'win32' || S.status.platform === 'darwin') && S.status.miniDocked ? `<p class="note"><span class="dot ${S.riot ? 'on' : ''}"></span>${S.riot ? 'Attached to the Riot Client' : 'Waiting for the Riot Client window…'}</p>` : '';
  if (S.status.vault && !S.status.unlocked) {
    $('#mini').innerHTML = head + `<div class="locked"><div class="mark" style="width:44px;height:44px;border-radius:12px">${ic('key', 22)}</div><b>Vault locked</b><span class="muted" style="font-size:13px">Unlock it in the main window.</span><button class="btn primary" type="button" data-act="main">Open Alts</button></div>`;
    return;
  }
  // the main account stays on top; without one, the active account is shown there
  const main = S.accounts.find((a) => a.id === S.status.primaryId);
  const top = main || S.accounts.find((a) => a.id === S.status.activeId);
  const q = S.q.trim().toLowerCase();
  // the order is set once when the mini window opens (most used first) and then stays put while you click
  if (!S.order && S.accounts.length) S.order = [...S.accounts].sort((x, y) => ((y.useCount || 0) - (x.useCount || 0)) || ((y.lastUsed || 0) - (x.lastUsed || 0))).map((a) => a.id);
  const pos = (a) => { const i = S.order ? S.order.indexOf(a.id) : -1; return i < 0 ? 1e6 : i; };
  const rest = S.accounts.filter((a) => a !== top && (!q || [name(a), S.status.streamer ? '' : a.riotId, ...(a.tags || [])].join(' ').toLowerCase().includes(q)))
    .sort((x, y) => pos(x) - pos(y));
  const badges = top ? (main ? '<span class="pill" style="font-size:11px;background:var(--accent);color:var(--on-accent)">Main</span>' : '') + (top.id === S.status.activeId ? '<span class="pill" style="font-size:11px;background:var(--active)">Active</span>' : '') : '';
  const act = top && !q ? `<div class="active"><div class="row1">${av(top, 36)}<div style="min-width:0;flex:1"><div class="name" style="font-weight:700">${esc(name(top))}</div><div style="font-size:12px;font-weight:600;color:${tc(solo(top) && solo(top).tier)}">${rankText(solo(top))}</div></div><span style="display:flex;gap:4px">${badges}</span></div>
    <div class="btns"><button class="btn" type="button" data-act="copy" data-id="${top.id}" data-f="username">Copy login</button><button class="btn primary" type="button" data-act="copy" data-id="${top.id}" data-f="password">Copy password</button></div>
    ${main ? '' : '<div class="muted" style="font-size:11px">Tip: set your main account in its details, Organize, and it stays here.</div>'}</div>` : '';
  $('#mini').innerHTML = head + note + `<label class="search msearch">${ic('search')}<input id="q" type="search" placeholder="Find an account" aria-label="Find an account" value="${esc(S.q)}"></label>` + act
    + `<div class="lbl">${q ? rest.length + ' found' : 'Other accounts'}</div><div class="list" role="list">${rest.map((a) => `<div class="it" role="listitem" tabindex="0" data-act="pick" data-id="${a.id}" title="Make active">${av(a, 30)}<div class="who"><div class="nm">${a.pinned ? '★ ' : ''}${esc(name(a))}${a.id === S.status.activeId ? ' <span class="pill" style="font-size:10px;padding:1px 6px;background:var(--active)">Active</span>' : ''}</div><div class="rk" style="color:${tc(solo(a) && solo(a).tier)}">${rankText(solo(a))}</div></div>
      <div class="acts"><button class="btn xs" type="button" data-act="copy" data-id="${a.id}" data-f="username">Login</button><button class="btn xs primary" type="button" data-act="copy" data-id="${a.id}" data-f="password">Password</button></div></div>`).join('') || '<p class="muted" style="padding:8px">No accounts</p>'}</div>`
    + `<div class="mft">Shortcut ${esc(String(S.status.hotkey || '').replace('CommandOrControl', 'Ctrl'))}: login, then password</div>`;
}

// redraws only when something really changed, so a click is never swallowed by a redraw
let lastKey = '';
async function load() {
  S.status = await ipc.invoke('status'); S.riot = !!S.status.riotFound; S.accounts = await ipc.invoke('list');
  const key = JSON.stringify([S.status, S.accounts.map((a) => [a.id, a.cache && a.cache.solo, a.cache && a.cache.icon, a.lastUsed, a.pinned])]);
  if (key !== lastKey) { lastKey = key; render(); }
}
// copy right when the button is pressed: the first click works even when the window was not active
async function copyFrom(el) {
  const r = await ipc.invoke('copyField', el.dataset.id, el.dataset.f);
  toast(r && r.error ? esc(r.error) : (el.dataset.f === 'password' ? 'Password copied' : 'Login copied'));
  await load();
}
document.addEventListener('pointerdown', (e) => {
  const el = e.button === 0 && e.target.closest('[data-act="copy"]');
  if (!el) return;
  e.preventDefault(); e.stopPropagation();
  copyFrom(el);
}, true);

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, id } = el.dataset;
  if (act === 'copy') { e.stopPropagation(); return; } // handled on press
  if (act === 'pick') { await ipc.invoke('setActive', id); S.status.activeId = id; S.q = ''; render(); }
  if (act === 'dock') { S.status = await ipc.invoke('miniDock', !S.status.miniDocked); render(); }
  if (act === 'main') ipc.invoke('openMain');
  if (act === 'close') ipc.invoke('miniClose');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.it')) e.target.click();
  if (e.key === 'Escape') { if (S.q) { S.q = ''; render(); } else ipc.invoke('miniClose'); }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  S.q = e.target.value; render();
  const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length);
});
ipc.on('active', (id) => { S.status.activeId = id; load(); });
ipc.on('copied', () => load());
ipc.on('locked', () => load());
ipc.on('account', (a) => { S.accounts = S.accounts.map((x) => (x.id === a.id ? a : x)); render(); });
ipc.on('progress', (p) => { if (p.finished) load(); });
ipc.on('riot', (r) => { if (S.riot !== r.found) { S.riot = r.found; render(); } });
window.addEventListener('focus', () => setTimeout(load, 400));
load();
