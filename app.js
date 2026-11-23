/* Alts renderer, B1 Midnight design. Everything is drawn from the state object S. */
'use strict';
const ipc = window.api;
const $ = (s, r = document) => r.querySelector(s);

// ---------- icons ----------
const P = {
  key: '<circle cx="16.5" cy="7.5" r="4"/><path d="M13.6 10.4 5 19M6.5 17.5l2 2M9 15l2 2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17.5 14.5A5 5 0 0 1 22 20"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  file: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  line: '<path d="M3 20h18M4 15l5-5 4 3 7-7"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.6 2.6 3-.6.6 3 2.6 1.6-1.4 2.9 1.4 2.9-2.6 1.6-.6 3-3-.6-1.6 2.6-1.6-2.6-3 .6-.6-3-2.6-1.6L5.6 12 4.2 9.1l2.6-1.6.6-3 3 .6z"/>',
  mini: '<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="13" y="7" width="5" height="10" rx="1"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5 12a10.5 10.5 0 0 1 14 0"/><path d="M8.5 15.5a5 5 0 0 1 7 0"/><path d="M3 3l18 18"/>',
};
const ic = (n, s = 16) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- League data ----------
const REG = { euw: 'EUW', eune: 'EUNE', tr: 'TR', ru: 'RU', me: 'ME', na: 'NA', br: 'BR', lan: 'LAN', las: 'LAS', kr: 'KR', jp: 'JP', oce: 'OCE', ph: 'PH', sg: 'SG', th: 'TH', tw: 'TW', vn: 'VN' };
const CATS = { main: 'Main', smurf: 'Smurf', otp: 'OTP', legacy: 'Legacy', other: 'Other' };
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const DIVS = ['IV', 'III', 'II', 'I'];
const APEX = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];
const GCOLORS = ['blue', 'teal', 'gold', 'violet', 'coral', 'grey'];
const QUEUES = { 420: 'Ranked Solo', 440: 'Ranked Flex', 400: 'Normal Draft', 430: 'Normal Blind', 490: 'Quickplay', 450: 'ARAM', 1700: 'Arena', 1900: 'URF', 900: 'ARURF', 480: 'Swiftplay' };
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const gamesToday = (a) => (a.gamesByDay && a.gamesByDay[todayKey()]) || 0;
// five small squares: newest game first
const lastFive = (a) => {
  const g = a.games || [];
  if (!g.length) return '';
  const w = g.filter((x) => x.win && !x.remake).length, l = g.filter((x) => !x.win && !x.remake).length;
  return `<span class="l5" role="img" aria-label="Last ${g.length} games: ${w} won, ${l} lost">${g.map((x) => `<i class="${x.remake ? 'r' : x.win ? 'w' : 'l'}" title="${x.remake ? 'Remake' : x.win ? 'Win' : 'Loss'}, ${esc(x.champ)}"></i>`).join('')}</span>`;
};
const cap = (s) => s ? s[0] + s.slice(1).toLowerCase() : '';
const tc = (tier) => `var(--t-${tier ? tier.toLowerCase() : 'none'})`;
const rankText = (r) => r ? cap(r.tier) + (APEX.includes(r.tier) ? '' : ' ' + r.rank) : 'Unranked';
// one number for a rank so two ranks can be compared and subtracted
const ladder = (r) => {
  if (!r || !r.tier) return null;
  const t = TIERS.indexOf(r.tier);
  if (t >= 7) return 7 * 400 + (r.lp || 0);
  return t * 400 + Math.max(0, DIVS.indexOf(r.rank)) * 100 + (r.lp || 0);
};
const ladderName = (v) => {
  if (v == null) return '';
  if (v >= 2800) return 'Master+';
  const t = Math.floor(v / 400), d = Math.floor((v % 400) / 100);
  return cap(TIERS[t]) + ' ' + DIVS[d];
};
const ago = (ts) => {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : d + ' days ago';
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d) => Math.ceil((new Date(d + 'T23:59:59') - Date.now()) / 86400000);
const hotkeyText = (h) => String(h || '').replace('CommandOrControl', 'Ctrl').replace(/\+/g, '+');

// ---------- state ----------
const S = {
  status: {}, accounts: [], groups: [], view: 'accounts',
  cat: 'all', region: 'all', q: '', sort: 'rank',
  base: null, changesHidden: false,
  detail: null, dtab: 'overview', reveal: false,
  modal: null, sw: null,
  refreshing: false, progress: null, pending: new Set(), banner: null,
  scat: 'general', welcomeStep: 1, groupSel: null, statsScope: 'all',
  lastActivity: Date.now(), capture: false,
};

// card being dragged (see the drag section near the end)
let drag = null, suppressClick = false;

// ---------- small helpers ----------
const acc = (id) => S.accounts.find((a) => a.id === id);
const streamer = () => !!S.status.streamer;
const idx = (a) => S.accounts.indexOf(a);
const nameOf = (a) => streamer() ? 'Account ' + (idx(a) + 1) : (a.cache && a.cache.name) || a.riotId.split('#')[0];
const tagOf = (a) => streamer() ? '••••' : (a.cache && a.cache.tag) || a.riotId.split('#')[1] || '';
const initials = (a) => streamer() ? '?' : nameOf(a).replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
const avatar = (a, size) => `<div class="av" style="width:${size}px;height:${size}px;font-size:${Math.round(size / 3.2)}px" role="img" aria-label="Profile icon">${a.cache && a.cache.icon && !streamer() ? `<img src="${esc(a.cache.icon)}" alt="" onerror="this.remove()">` : esc(initials(a))}</div>`;
const groupColor = (c) => `var(--g-${c || 'blue'})`;
const solo = (a) => (a.cache && a.cache.solo) || null;

function toast(html, opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  const ms = opts.ms || 3500;
  el.innerHTML = `<div class="row"><span>${html}</span>${opts.action ? `<button class="btn sm primary" type="button">${esc(opts.action)}</button>` : ''}</div>${opts.action ? '<div class="timer"><span></span></div>' : ''}`;
  $('#toasts').appendChild(el);
  const bar = el.querySelector('.timer span');
  if (bar) { bar.style.width = '100%'; bar.style.transition = `width ${ms}ms linear`; requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = '0%'; })); }
  const done = () => { el.remove(); };
  const t = setTimeout(() => { done(); if (opts.onExpire) opts.onExpire(); }, ms);
  if (opts.action) el.querySelector('button').onclick = () => { clearTimeout(t); done(); opts.onAction(); };
}

function applyTheme() {
  const t = S.status.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : (S.status.theme || 'dark');
  document.documentElement.dataset.theme = t;
}
const themeNow = () => document.documentElement.dataset.theme;

// ---------- rank changes since the app was last opened ----------
function snapshot() {
  const m = {};
  S.accounts.forEach((a) => { m[a.id] = solo(a) ? { ...solo(a) } : null; });
  return m;
}
function changeOf(a) {
  if (!S.base || !(a.id in S.base)) return null;
  const before = S.base[a.id], now = solo(a);
  if (!now) return null;
  if (!before) return { text: 'Placed in ' + rankText(now), up: true };
  const b = ladder(before), n = ladder(now);
  if (before.tier !== now.tier || before.rank !== now.rank) return { text: (n > b ? 'Promoted to ' : 'Demoted to ') + rankText(now), up: n > b, short: n > b ? 'Promoted' : 'Demoted' };
  if (n === b) return null;
  return { text: (n > b ? '+' : '−') + Math.abs(n - b) + ' LP', up: n > b };
}

// ---------- goals ----------
function goalState(a) {
  const g = a.goal;
  if (!g) return null;
  const target = ladder({ tier: g.tier, rank: g.div || 'IV', lp: 0 });
  const cur = ladder(solo(a)) ?? g.start ?? 0;
  const start = Math.min(g.start ?? cur, target - 1);
  const pct = Math.max(0, Math.min(100, Math.round((cur - start) / (target - start) * 100)));
  const label = cap(g.tier) + (APEX.includes(g.tier) ? '' : ' ' + (g.div || 'IV'));
  const left = daysUntil(g.deadline);
  let kind;
  if (cur >= target) kind = 'reached';
  else if (left < 0) kind = 'missed';
  else {
    const total = Math.max(1, (new Date(g.deadline) - g.created) / 86400000);
    const expected = Math.min(1, (Date.now() - g.created) / 86400000 / total);
    kind = pct / 100 >= expected - 0.1 ? 'track' : 'behind';
  }
  return { label, pct, left, kind, need: Math.max(0, target - cur), start, target, cur };
}
const GOAL_TXT = { track: ['On track', 'good'], behind: ['Behind pace', 'warn'], reached: ['Reached', 'good'], missed: ['Missed', 'bad'] };

// ---------- filtering and sorting ----------
function visible() {
  const q = S.q.trim().toLowerCase();
  let list = S.accounts.filter((a) => (S.cat === 'all' || a.category === S.cat) && (S.region === 'all' || a.region === S.region));
  if (q) list = list.filter((a) => [a.riotId, a.cache && a.cache.name, ...(a.tags || []), CATS[a.category], a.priv && a.priv.notes].join(' ').toLowerCase().includes(q));
  const by = {
    rank: (x, y) => (ladder(solo(y)) ?? -1) - (ladder(solo(x)) ?? -1),
    level: (x, y) => ((y.cache && y.cache.level) || 0) - ((x.cache && x.cache.level) || 0),
    name: (x, y) => nameOf(x).localeCompare(nameOf(y)),
    recent: (x, y) => (y.lastUsed || 0) - (x.lastUsed || 0),
    custom: () => 0,
  }[S.sort];
  return [...list].sort(by);
}

// ================= rendering =================
function render() {
  if (drag && drag.started) { S.renderLater = true; return; }
  applyTheme();
  document.body.classList.toggle('has-side', !!(S.status.welcomeDone && !(S.status.vault && !S.status.unlocked)));
  const root = $('#root');
  if (S.status.vault && !S.status.unlocked) {
    root.innerHTML = lockScreen(); $('#lockpw') && $('#lockpw').focus();
    // asks for Windows Hello once each time the vault locks, when the window is in front
    if (S.status.hello && !S.helloTried && document.hasFocus()) { S.helloTried = true; setTimeout(helloUnlock, 300); }
    return;
  }
  S.helloTried = false;
  if (!S.status.welcomeDone) { root.innerHTML = welcome(); return; }
  const page = { accounts: accountsPage, groups: groupsPage, goals: goalsPage, stats: statsPage, settings: settingsPage }[S.view]();
  root.innerHTML = `<div id="app">${sidebar()}<main>${page}</main></div>${S.detail ? drawer() : ''}${S.modal ? modal() : ''}${S.sw ? switcher() : ''}`;
  if (S.sw) { const i = $('#swq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

function sidebar() {
  const goals = S.accounts.filter((a) => a.goal).length;
  const item = (v, icon, label, count) => `<button class="navitem" type="button" data-act="view" data-v="${v}" ${S.view === v ? 'aria-current="page"' : ''}>${ic(icon)}<span class="lbl">${label}</span>${count !== '' ? `<span class="count">${count}</span>` : ''}</button>`;
  return `<nav class="side" aria-label="Main">
    <div class="brand"><div class="mark">${ic('key', 15)}</div><span>Alts Keychain</span></div>
    ${item('accounts', 'grid', 'Accounts', S.accounts.length)}
    ${item('groups', 'folder', 'Groups', S.groups.length || '')}
    ${item('goals', 'target', 'Goals', goals || '')}
    ${item('stats', 'line', 'Stats', '')}
    ${item('settings', 'cog', 'Settings', '')}
    ${S.status.vault ? `<div class="vaultbox"><div><b>Vault unlocked</b>${S.status.lockMinutes ? 'Locks after ' + S.status.lockMinutes + ' min idle' : 'Never locks by itself'}</div><button class="btn sm" type="button" data-act="lockNow">${ic('lock', 14)}Lock now</button></div>` : `<div class="vaultbox"><div><b>Vault is off</b>Logins are stored as plain text</div><button class="btn sm" type="button" data-act="view" data-v="settings" data-scat="security">Turn on</button></div>`}
    <div class="version">Version ${esc(S.status.version)}</div>
  </nav>`;
}

function topbar(title, extra = '', right = '') {
  return `<header class="top"><h1>${title}</h1>${extra}<span style="margin-left:auto"></span>
    <button class="icon-btn" type="button" data-act="theme" aria-label="${themeNow() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}" title="${themeNow() === 'dark' ? 'Light mode' : 'Dark mode'}">${ic(themeNow() === 'dark' ? 'sun' : 'moon')}</button>${right}
  </header>`;
}

// ---------- accounts page ----------
function accountsPage() {
  const list = visible();
  const recent = S.status.showRecent ? [...S.accounts].filter((a) => a.lastUsed).sort((x, y) => y.lastUsed - x.lastUsed).slice(0, 4) : [];
  const pinned = S.status.showPinned ? S.accounts.filter((a) => a.pinned) : [];
  const changes = S.status.showChanges && !S.changesHidden ? S.accounts.map((a) => ({ a, c: changeOf(a) })).filter((x) => x.c) : [];
  const regions = [...new Set(S.accounts.map((a) => a.region))];
  const head = `<header class="top"><h1>Accounts</h1>
    <label class="search" style="margin-left:auto">${ic('search', 15)}<input id="q" type="search" placeholder="Filter accounts, tags, notes" aria-label="Filter accounts" value="${esc(S.q)}"><span class="kbd" title="Quick switcher">Ctrl K</span></label>
    <button class="icon-btn" type="button" data-act="miniOpen" aria-label="Open mini window" title="Mini window">${ic('mini')}</button>
    <button class="icon-btn ${S.refreshing ? 'spin' : ''}" type="button" data-act="refreshAll" aria-label="Refresh all accounts" title="Refresh all">${ic('refresh')}</button>
    <button class="icon-btn" type="button" data-act="theme" aria-label="${themeNow() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}">${ic(themeNow() === 'dark' ? 'sun' : 'moon')}</button>
    <button class="btn primary" type="button" data-act="add">${ic('plus', 15)}Add account</button></header>`;
  return `<div class="page">
    ${streamer() ? `<div class="banner info">${ic('eye')}<span class="txt"><b>Streamer mode is on.</b> <span class="muted">Riot IDs, logins, emails and notes are hidden.</span></span><button class="btn sm" type="button" data-act="streamerOff">Turn off</button></div>` : ''}
    ${S.update ? `<div class="banner info" role="status">${ic('refresh')}<span class="txt"><b>Version ${esc(S.update)} is ready.</b> <span class="muted">Restart to update. Your accounts stay as they are.</span></span><button class="btn sm primary" type="button" data-act="installUpdate">Restart now</button></div>` : ''}
    ${bannerHtml()}
    ${head}
    ${changes.length ? `<section class="card-box changes" aria-label="Changes since you last opened the app"><h2>Since you last opened the app</h2>${changes.map(({ a, c }) => `<span class="pill ${c.up ? 'good' : 'bad'}">${esc(nameOf(a))} ${esc(c.text)}</span>`).join('')}<button class="icon-btn sm" style="margin-left:auto;border:0;background:transparent" type="button" data-act="hideChanges" aria-label="Dismiss">${ic('x', 14)}</button></section>` : ''}
    ${pinned.length ? `<section aria-labelledby="pin-h"><h2 class="sec" id="pin-h">Pinned</h2><div class="pinned-grid">${pinned.map((a) => `
      <div class="card-box pin-card" data-act="open" data-id="${a.id}" tabindex="0" role="button" aria-label="Open ${esc(nameOf(a))}">
        ${avatar(a, 42)}
        <div class="who"><div class="name"><span class="star">${ic('star', 12).replace('fill="none"', '')}</span> ${esc(nameOf(a))}</div><div style="font-size:12px;font-weight:600;color:${tc(solo(a) && solo(a).tier)}">${rankText(solo(a))} <span class="muted" style="font-weight:400;white-space:nowrap">${solo(a) ? solo(a).lp + ' LP' : ''}</span></div></div>
        <button class="btn sm" type="button" data-act="copy" data-id="${a.id}" data-f="username">Login</button>
        <button class="btn sm primary" type="button" data-act="copy" data-id="${a.id}" data-f="password">Password</button>
      </div>`).join('')}</div></section>` : ''}
    ${recent.length ? `<section aria-labelledby="rec-h"><h2 class="sec" id="rec-h">Recently used</h2><div class="recent-row">${recent.map((a) => `
      <div class="recent ${S.status.activeId === a.id ? 'active' : ''}" data-act="open" data-id="${a.id}" tabindex="0" role="button" aria-label="Open ${esc(nameOf(a))}">
        ${avatar(a, 30)}<div style="flex:1;min-width:0"><div class="name" style="font-weight:600">${esc(nameOf(a))}</div><div style="font-size:12px;font-weight:600;color:${tc(solo(a) && solo(a).tier)}">${rankText(solo(a))}</div></div>
        <button class="icon-btn sm" type="button" data-act="copy" data-id="${a.id}" data-f="username" aria-label="Copy login of ${esc(nameOf(a))}" title="Copy login">${ic('user', 14)}</button>
        <button class="icon-btn sm" type="button" data-act="copy" data-id="${a.id}" data-f="password" aria-label="Copy password of ${esc(nameOf(a))}" title="Copy password">${ic('lock', 14)}</button>
      </div>`).join('')}</div></section>` : ''}
    <section aria-labelledby="all-h">
      <div class="filters"><h2 id="all-h">All accounts</h2>
        ${['all', ...Object.keys(CATS)].map((c) => `<button class="chip" type="button" data-act="cat" data-v="${c}" aria-pressed="${S.cat === c}">${c === 'all' ? 'All' : CATS[c]} <span class="n">${c === 'all' ? S.accounts.length : S.accounts.filter((a) => a.category === c).length}</span></button>`).join('')}
        <div class="right">
          ${regions.length > 1 ? `<select class="small" id="fRegion" aria-label="Server"><option value="all">All servers</option>${regions.map((r) => `<option value="${r}" ${S.region === r ? 'selected' : ''}>${REG[r] || r}</option>`).join('')}</select>` : ''}
          <select class="small" id="fSort" aria-label="Sort"><option value="rank" ${S.sort === 'rank' ? 'selected' : ''}>Sort: Solo rank</option><option value="level" ${S.sort === 'level' ? 'selected' : ''}>Sort: Level</option><option value="name" ${S.sort === 'name' ? 'selected' : ''}>Sort: Name</option><option value="recent" ${S.sort === 'recent' ? 'selected' : ''}>Sort: Recently used</option><option value="custom" ${S.sort === 'custom' ? 'selected' : ''}>Sort: My order</option></select>
        </div>
      </div>
      <div class="grid" id="grid">${gridHtml(list)}</div>
    </section>
    ${statusBar()}
  </div>`;
}

function gridHtml(list) {
  if (!S.accounts.length) return `<div class="empty">No accounts yet. <button class="btn sm primary" type="button" data-act="add" style="margin-left:8px">${ic('plus', 14)}Add account</button></div>`;
  if (!list.length) return '<div class="empty">No accounts match the filter.</div>';
  return list.map(cardHtml).join('');
}

function cardHtml(a) {
  const r = solo(a), err = a.cache && a.cache.error;
  const loadingNew = S.pending.has(a.id) && !(a.cache && a.cache.updated);
  if (loadingNew) return `<div class="acc" aria-label="Loading account"><div class="top"><div class="skel" style="width:40px;height:40px;border-radius:50%"></div><div style="flex:1;display:flex;flex-direction:column;gap:7px"><div class="skel" style="height:12px;width:70%"></div><div class="skel" style="height:10px;width:45%"></div></div></div><div class="skel" style="height:22px;width:50%"></div><div class="skel" style="margin-top:auto;height:14px;width:60%"></div></div>`;
  const ch = changeOf(a);
  const g = goalState(a);
  const pen = a.penalty && a.penalty.until && daysUntil(a.penalty.until) >= 0 ? daysUntil(a.penalty.until) : null;
  let bottom;
  if (err) bottom = `<div class="meta"><span class="bad" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.cache.error)}</span><button class="btn xs danger" type="button" data-act="fix" data-id="${a.id}">Fix</button></div>`;
  else if (pen !== null) bottom = `<div class="penalty">${ic('clock', 14)}${pen === 0 ? 'Ranked restriction ends today' : 'Ranked restriction ends in ' + pen + (pen === 1 ? ' day' : ' days')}</div>`;
  else if (g && (g.kind === 'track' || g.kind === 'behind')) bottom = `<div><div class="meta"><span style="color:var(--text)">Goal: ${esc(g.label)}</span><span class="${GOAL_TXT[g.kind][1]}" style="font-weight:600">${GOAL_TXT[g.kind][0]}</span></div><div class="bar" style="margin-top:6px"><span style="width:${g.pct}%"></span></div></div>`;
  else {
    const games = r ? r.w + r.l : 0;
    bottom = `<div class="meta"><span>${r ? Math.round(r.w / Math.max(1, games) * 100) + '% win rate, ' + games + ' games' : (a.cache && a.cache.level >= 30 ? 'Ready for ranked' : a.cache && a.cache.level ? 'Level ' + a.cache.level + ', not ranked yet' : 'No data yet')}</span>${S.pending.has(a.id) ? '<span>Updating…</span>' : (a.games || []).length ? `<span style="display:flex;align-items:center;gap:8px">${gamesToday(a) ? `<span>${gamesToday(a)} today</span>` : ''}${lastFive(a)}</span>` : `<span>${a.lastUsed ? 'Used ' + ago(a.lastUsed) : ''}</span>`}</div>`;
  }
  const dragging = canDrag() ? 'data-drag="1"' : '';
  return `<div class="acc ${err ? 'err' : ''}" data-act="open" data-id="${a.id}" tabindex="0" role="button" aria-label="Open ${esc(nameOf(a))}" ${dragging} style="${S.pending.has(a.id) ? 'opacity:.7' : ''}">
    <div class="top">${avatar(a, 40)}<div class="who"><div class="name" style="font-size:15px">${esc(nameOf(a))}<span class="tag"> #${esc(tagOf(a))}</span></div><div class="sub">${REG[a.region] || a.region}${a.cache && a.cache.level ? ', level ' + a.cache.level : ''}, ${CATS[a.category] || 'Smurf'}</div></div>${S.status.primaryId === a.id ? '<span class="pill" style="font-size:11px;background:var(--accent);color:var(--on-accent)">Main</span>' : ''}${a.pinned ? `<span class="star" title="Pinned">${ic('star', 14)}</span>` : ''}</div>
    <div class="rankrow"><span class="pill rank-pill" style="--tc:${tc(r && r.tier)}">${rankText(r)}</span><span class="lp">${r ? r.lp + ' LP' : ''}</span>${ch ? `<span class="delta pill ${ch.up ? 'good' : 'bad'}">${esc(ch.short || ch.text)}</span>` : ''}</div>
    <div class="bottom">${bottom}</div>
    <div class="actions"><button class="btn" type="button" data-act="copy" data-id="${a.id}" data-f="username">Copy login</button><button class="btn primary" type="button" data-act="copy" data-id="${a.id}" data-f="password">Copy password</button></div>
  </div>`;
}

function bannerHtml() {
  if (!S.banner) return '';
  const B = {
    offline: ["You're offline.", 'Showing the last saved data. It refreshes by itself when you are back online.'],
    service: ["Riot data isn't loading right now.", 'Your logins still work. Try again in a few minutes.'],
    key: S.status.mode === 'server' ? ['No invite code saved.', 'Add the invite code you got in Settings, Riot data.'] : ['The Riot API key does not work.', 'Development keys expire every 24 hours. Add a new key in Settings.'],
    invite: ['Your invite code does not work anymore.', 'Ask the person who gave it to you for a new one, or use your own API key.'],
    rate: ['Too many requests to Riot.', 'Wait a minute and try again.'],
  }[S.banner];
  return `<div class="banner" role="status">${ic('wifi')}<span class="txt"><b>${B[0]}</b> <span class="muted">${B[1]}</span></span>${S.banner === 'key' || S.banner === 'invite' ? '<button class="btn sm" type="button" data-act="view" data-v="settings" data-scat="api">Open settings</button>' : '<button class="btn sm" type="button" data-act="refreshAll">Try again</button>'}<button class="icon-btn sm" type="button" data-act="closeBanner" aria-label="Dismiss">${ic('x', 14)}</button></div>`;
}

function statusBar() {
  const probs = S.accounts.filter((a) => a.cache && a.cache.error);
  const last = Math.max(0, ...S.accounts.map((a) => (a.cache && a.cache.updated) || 0));
  const left = S.refreshing && S.progress
    ? `<span role="status" style="display:flex;align-items:center;gap:10px;color:var(--text)">Refreshing ${Math.min(S.progress.done + 1, S.progress.total)} of ${S.progress.total} accounts<span class="progress"><span style="width:${Math.round(S.progress.done / Math.max(1, S.progress.total) * 100)}%"></span></span></span>`
    : `<span style="display:flex;align-items:center;gap:6px"><span class="dot" style="border-radius:50%;width:6px;height:6px;background:var(--good)"></span>${last ? 'Updated ' + ago(last) : 'Not refreshed yet'}</span>${S.status.autoRefreshMin ? `<span>Refreshes every ${S.status.autoRefreshMin >= 60 ? S.status.autoRefreshMin / 60 + ' h' : S.status.autoRefreshMin + ' min'}</span>` : ''}`;
  return `<footer class="status">${left}${probs.length && !S.refreshing ? `<span class="problem">${probs.length === 1 ? '1 problem' : probs.length + ' problems'}: ${esc(nameOf(probs[0]))}, ${esc(probs[0].cache.error)}<button class="btn xs danger" type="button" data-act="fix" data-id="${probs[0].id}">Fix</button></span>` : ''}</footer>`;
}

// ---------- detail drawer ----------
function drawer() {
  const a = acc(S.detail);
  if (!a) return '';
  const r = solo(a), f = a.cache && a.cache.flex;
  const tabs = ['overview', 'login', 'notes'].map((t) => `<button type="button" role="tab" data-act="dtab" data-v="${t}" aria-selected="${S.dtab === t}">${{ overview: 'Overview', login: 'Login', notes: 'Notes' }[t]}</button>`).join('');
  const tile = (label, q) => `<div class="tile"><div class="lbl">${label}</div><div style="margin-top:8px;display:flex;align-items:center;gap:8px"><span class="pill rank-pill" style="--tc:${tc(q && q.tier)};font-size:14px">${rankText(q)}</span><span class="muted" style="font-size:13px">${q ? q.lp + ' LP' : ''}</span></div>${q ? `<div class="bar" style="margin-top:12px;height:4px"><span style="width:${APEX.includes(q.tier) ? 100 : q.lp}%;background:${tc(q.tier)}"></span></div><div class="muted" style="margin-top:8px;font-size:12px">${q.w} W, ${q.l} L, ${Math.round(q.w / Math.max(1, q.w + q.l) * 100)}% win rate</div>` : '<div class="muted" style="margin-top:10px;font-size:12px">No ranked games this split</div>'}</div>`;
  let body = '';
  if (S.dtab === 'overview') {
    const g = goalState(a);
    const groups = (a.groups || []).map((id) => S.groups.find((x) => x.id === id)).filter(Boolean);
    const free = S.groups.filter((x) => !(a.groups || []).includes(x.id));
    const gl = a.games || [];
    const games = gl.length ? `<section aria-labelledby="g5-h"><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 class="sec" id="g5-h">Last ${gl.length} games</h2><span class="muted" style="font-size:12px">${gamesToday(a) ? gamesToday(a) + (gamesToday(a) === 1 ? ' game' : ' games') + ' today' : 'No games today'}</span></div><div class="card-box games">${gl.map((x) => `<div class="game"><img src="${esc(x.icon)}" alt="" width="32" height="32" onerror="this.style.visibility='hidden'"><span class="pill ${x.remake ? '' : x.win ? 'good' : 'bad'}" style="font-size:12px;min-width:52px;justify-content:center;${x.remake ? 'background:var(--active)' : ''}">${x.remake ? 'Remake' : x.win ? 'Win' : 'Loss'}</span><div style="flex:1;min-width:0"><b style="font-weight:600">${esc(x.champ)}</b> <span class="muted">${x.k} / ${x.d} / ${x.as}</span><div class="muted" style="font-size:12px">${esc(QUEUES[x.queue] || 'Other mode')}</div></div><span class="muted" style="font-size:12px">${ago(x.end)}</span></div>`).join('')}</div></section>` : '';
    body = `<section class="tiles2">${tile('Solo / Duo', r)}${tile('Flex', f)}</section>${games}
      ${rankChart(a)}
      <section aria-labelledby="org-h"><h2 class="sec" id="org-h">Organize</h2><div class="card-box rows">
        <div><div class="grow"><b style="font-weight:600">Main account</b><div class="hint">Your one main account. It always stays at the top of the mini window.</div></div><button class="switch" type="button" role="switch" aria-checked="${S.status.primaryId === a.id}" aria-label="Main account" data-act="primary" data-id="${a.id}"></button></div>
        <div><div class="grow"><b style="font-weight:600">Pinned</b><div class="hint">Top of Accounts and in the quick switcher</div></div><button class="switch" type="button" role="switch" aria-checked="${!!a.pinned}" aria-label="Pinned" data-act="pin" data-id="${a.id}"></button></div>
        <div><div class="grow" style="flex-basis:100%"><b style="font-weight:600">Category</b></div>${Object.keys(CATS).map((c) => `<button class="chip pick" type="button" data-act="setCat" data-id="${a.id}" data-v="${c}" aria-pressed="${a.category === c}">${CATS[c]}</button>`).join('')}</div>
        <div><div class="grow" style="flex-basis:100%"><b style="font-weight:600">Groups</b></div>${groups.map((x) => `<span class="gchip"><span class="dot" style="background:${groupColor(x.color)}"></span>${esc(x.name)}<button type="button" data-act="ungroup" data-id="${a.id}" data-g="${x.id}" aria-label="Remove from ${esc(x.name)}">×</button></span>`).join('')}
          ${free.length ? `<select class="small" id="addGroup" data-id="${a.id}" aria-label="Add to group"><option value="">+ Add to group</option>${free.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}<option value="__new">New group…</option></select>` : `<button class="addchip" type="button" data-act="newGroup" data-id="${a.id}">+ New group</button>`}</div>
        <div style="flex-direction:column;align-items:stretch"><div style="display:flex;align-items:center;gap:10px"><div class="grow"><b style="font-weight:600">Goal</b><div class="hint">${g ? esc(g.label) + ', Solo / Duo, by ' + esc(a.goal.deadline) : 'No goal yet'}</div></div>${g ? `<span class="pill ${GOAL_TXT[g.kind][1]}">${GOAL_TXT[g.kind][0]}</span>` : ''}<button class="btn sm" type="button" data-act="goal" data-id="${a.id}">${g ? 'Edit' : 'Set a goal'}</button></div>
          ${g ? `<div class="bar"><span style="width:${g.pct}%"></span></div><div class="hint">${g.kind === 'reached' ? 'Goal reached' : g.kind === 'missed' ? 'The deadline passed' : g.pct + '% of the way, ' + g.left + (g.left === 1 ? ' day' : ' days') + ' left'}</div>` : ''}</div>
        <div><div class="grow"><b style="font-weight:600">Ranked restriction</b><div class="hint">End date from the Riot message. The card counts down.</div></div><input class="input" style="width:170px;height:34px" type="date" id="penDate" data-id="${a.id}" value="${esc(a.penalty && a.penalty.until || '')}" aria-label="Ranked restriction end date">${a.penalty && a.penalty.until ? `<button class="btn sm ghost" type="button" data-act="clearPen" data-id="${a.id}">Clear</button>` : ''}</div>
      </div></section>
      <section aria-labelledby="tag-h"><h2 class="sec" id="tag-h">Tags</h2><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${(a.tags || []).map((t) => `<span class="gchip">${esc(t)}<button type="button" data-act="untag" data-id="${a.id}" data-t="${esc(t)}" aria-label="Remove tag ${esc(t)}">×</button></span>`).join('')}<input class="input" style="width:150px;height:30px;font-size:12px" id="newTag" data-id="${a.id}" placeholder="+ Add tag, press Enter" aria-label="Add tag"></div></section>`;
  } else if (S.dtab === 'login') {
    const p = a.priv || {};
    const hide = streamer() && !S.reveal;
    const row = (label, f, type) => `<label for="d-${f}">${label}</label>${f === 'password' ? `<div class="pwwrap"><input class="input" id="d-${f}" data-pf="${f}" data-id="${a.id}" type="${S.reveal ? 'text' : 'password'}" value="${esc(p[f] || '')}"><button type="button" data-act="reveal" aria-label="${S.reveal ? 'Hide' : 'Show'} password">${ic('eye', 15)}</button></div>` : `<input class="input" id="d-${f}" data-pf="${f}" data-id="${a.id}" type="${hide ? 'password' : type}" value="${esc(p[f] || '')}">`}<button class="btn sm ${f === 'password' ? 'primary' : ''}" type="button" data-act="copy" data-id="${a.id}" data-f="${f}">Copy</button>`;
    body = `<section><h2 class="sec">Riot ID</h2><div class="idrow"><input class="input" id="d-riot" value="${esc(hide ? '••••••' : a.riotId)}" aria-label="Riot ID" ${hide ? 'disabled' : ''}><select class="input" id="d-region" aria-label="Server">${Object.keys(REG).map((k) => `<option value="${k}" ${a.region === k ? 'selected' : ''}>${REG[k]}</option>`).join('')}</select></div><div style="margin-top:8px"><button class="btn sm" type="button" data-act="saveRiot" data-id="${a.id}">Save and check</button></div></section>
      <section><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 class="sec">Login</h2><span class="muted" style="font-size:12px">${S.status.vault ? ic('lock', 12) + ' Encrypted in vault' : 'Stored as plain text'}</span></div><div class="cred">${row('Username', 'username', 'text')}${row('Password', 'password')}${row('Email', 'email', 'text')}</div>
      <p class="muted" style="font-size:12px;margin:10px 0 0">Copied values are cleared from the clipboard after ${S.status.clipSeconds} seconds.${hide ? ' Streamer mode hides these fields.' : ''}</p></section>`;
  } else {
    body = `<section><h2 class="sec">Notes</h2>${streamer() && !S.reveal ? '<p class="muted">Notes are hidden in streamer mode.</p>' : `<textarea class="input" id="d-notes" data-pf="notes" data-id="${a.id}" style="min-height:220px" placeholder="Champion pool, who you duo with, anything">${esc((a.priv || {}).notes || '')}</textarea>`}</section>`;
  }
  return `<div class="scrim" data-act="closeDrawer"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="Account details">
    <div class="head">${avatar(a, 64)}<div style="flex:1;min-width:0"><h2>${esc(nameOf(a))}<span class="muted" style="font-weight:400"> #${esc(tagOf(a))}</span></h2><div class="muted" style="margin-top:4px;font-size:13px">${REG[a.region]}${a.cache && a.cache.level ? ', level ' + a.cache.level : ''}, ${CATS[a.category]}${a.lastUsed ? ', used ' + ago(a.lastUsed) : ''}</div></div>
      <button class="icon-btn sm" type="button" data-act="pin" data-id="${a.id}" aria-label="${a.pinned ? 'Unpin' : 'Pin'}" title="${a.pinned ? 'Unpin' : 'Pin'}" style="color:${a.pinned ? 'var(--accent)' : 'var(--muted)'}">${a.pinned ? ic('star', 15).replace('fill="none"', 'fill="currentColor"') : ic('star', 15)}</button>
      <button class="icon-btn sm ${S.refreshing ? 'spin' : ''}" type="button" data-act="refreshOne" data-id="${a.id}" aria-label="Refresh this account">${ic('refresh', 15)}</button>
      <button class="icon-btn sm" type="button" data-act="closeDrawer" aria-label="Close">${ic('x', 15)}</button></div>
    <div class="tabs" role="tablist" aria-label="Sections">${tabs}</div>
    <div class="body">${body}</div>
    <div class="foot"><button class="btn danger" type="button" data-act="askDelete" data-id="${a.id}">Delete account</button><span class="muted" style="margin-left:auto;font-size:12px">Saved automatically</span><button class="btn" type="button" data-act="closeDrawer">Done</button></div>
  </aside>`;
}

function rankChart(a) {
  const h = (a.history || []).map((x) => ({ d: x.d, v: ladder(x) })).filter((x) => x.v != null);
  if (h.length < 2) return '';
  const vs = h.map((x) => x.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 100) { lo -= 50; hi += 50; }
  const W = 480, H = 100, L = 78;
  const pts = h.map((x, i) => `${(L + (W - L) * i / (h.length - 1)).toFixed(1)},${(8 + (H - 16) * (1 - (x.v - lo) / (hi - lo))).toFixed(1)}`).join(' ');
  const color = tc(solo(a) && solo(a).tier);
  const peak = Math.max(...vs);
  return `<section aria-labelledby="hist-h"><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 class="sec" id="hist-h">Solo rank, last ${h.length} days</h2><span class="good" style="font-size:12px">Peak ${esc(ladderName(peak))}</span></div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Solo rank from ${esc(ladderName(vs[0]))} to ${esc(ladderName(vs[vs.length - 1]))}">
      <line x1="${L}" y1="8" x2="${W}" y2="8" stroke="var(--border)"/><line x1="${L}" y1="${H - 8}" x2="${W}" y2="${H - 8}" stroke="var(--border)"/>
      <text x="0" y="12" fill="var(--muted)" font-size="11">${esc(ladderName(hi))}</text><text x="0" y="${H - 4}" fill="var(--muted)" font-size="11">${esc(ladderName(lo))}</text>
      <polyline fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/></svg></section>`;
}

// ---------- modals ----------
function modal() {
  const m = S.modal;
  const scrim = `<div class="scrim top" data-act="${m.type === 'whatsnew' ? 'closeWhatsNew' : 'closeModal'}"></div>`;
  if (m.type === 'add') return scrim + addModal(m);
  if (m.type === 'confirmDelete') {
    const a = acc(m.id);
    return scrim + `<div class="modal small" role="alertdialog" aria-modal="true" aria-labelledby="del-h" aria-describedby="del-d"><div class="mbody"><h2 id="del-h" style="margin:0;font-size:19px">Delete ${esc(nameOf(a))}?</h2><p id="del-d" class="muted" style="margin:0;line-height:1.5">The login, password, email, notes, goal and group memberships of this account are removed from Alts. Your Riot account itself is not touched. Right after deleting you can undo for 10 seconds.</p></div><div class="mfoot"><button class="btn" type="button" data-act="closeModal" style="margin-left:auto">Cancel</button><button class="btn danger-fill" type="button" data-act="doDelete" data-id="${a.id}">Delete account</button></div></div>`;
  }
  if (m.type === 'confirmGroupDelete') {
    return scrim + `<div class="modal small" role="alertdialog" aria-modal="true" aria-labelledby="gdel-h"><div class="mbody"><h2 id="gdel-h" style="margin:0;font-size:19px">Delete ${esc(m.name)}?</h2><p class="muted" style="margin:0;line-height:1.5">Only the group is deleted. Its accounts stay in Alts Keychain.</p></div><div class="mfoot"><button class="btn" type="button" data-act="closeModal" style="margin-left:auto">Cancel</button><button class="btn danger-fill" type="button" data-act="groupDelete" data-v="${m.id}">Delete group</button></div></div>`;
  }
  if (m.type === 'fix') {
    const a = acc(m.id);
    const sug = a.cache && a.cache.suggestRegion;
    return scrim + `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="fix-h"><div class="mhead"><span class="pill bad" style="padding:8px">${ic('alert', 18)}</span><h2 id="fix-h">${esc(a.riotId)} has a problem</h2></div><div class="mbody">
      <p class="muted" style="margin:0;line-height:1.55">${esc(a.cache.error)}. ${a.cache.errorKind === 'notfound' ? 'Usually it is a typo or the wrong server. Renamed accounts are followed automatically once they were found the first time.' : ''}</p>
      ${sug ? `<button class="choice" type="button" data-act="useRegion" data-id="${a.id}" data-v="${sug}"><span class="ic">${ic('check')}</span><span style="flex:1"><b style="display:block;font-weight:600">Use ${REG[sug]}</b><span class="muted" style="font-size:13px">This Riot ID plays on ${REG[sug]}</span></span></button>` : ''}
      <div class="idrow"><label class="field">Riot ID<input class="input" id="fixId" value="${esc(a.riotId)}"></label><label class="field">Server<select class="input" id="fixReg">${Object.keys(REG).map((k) => `<option value="${k}" ${a.region === k ? 'selected' : ''}>${REG[k]}</option>`).join('')}</select></label></div>
    </div><div class="mfoot"><button class="btn" type="button" data-act="closeModal" style="margin-left:auto">Later</button><button class="btn primary" type="button" data-act="fixSave" data-id="${a.id}">Check again</button></div></div>`;
  }
  if (m.type === 'goal') {
    const a = acc(m.id);
    const tiers = TIERS.slice(1);
    return scrim + `<div class="modal small" role="dialog" aria-modal="true" aria-labelledby="goal-h"><div class="mhead"><h2 id="goal-h">Goal for ${esc(nameOf(a))}</h2></div><div class="mbody">
      <p class="muted" style="margin:0">Now: ${rankText(solo(a))}${solo(a) ? ' ' + solo(a).lp + ' LP' : ''}. Goals use Solo / Duo.</p>
      <div class="two"><label class="field">Target tier<select class="input" id="gTier">${tiers.map((t) => `<option value="${t}" ${m.tier === t ? 'selected' : ''}>${cap(t)}</option>`).join('')}</select></label>
      <label class="field">Division<select class="input" id="gDiv">${DIVS.map((d) => `<option value="${d}" ${m.div === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label></div>
      <label class="field">Deadline<input class="input" type="date" id="gDate" value="${esc(m.deadline)}" min="${todayStr()}"></label>
      <p class="error-text" id="gErr"></p>
    </div><div class="mfoot">${a.goal ? `<button class="btn danger" type="button" data-act="goalRemove" data-id="${a.id}">Remove goal</button>` : ''}<button class="btn" type="button" data-act="closeModal" style="margin-left:auto">Cancel</button><button class="btn primary" type="button" data-act="goalSave" data-id="${a.id}">Save goal</button></div></div>`;
  }
  if (m.type === 'group') {
    return scrim + `<div class="modal small" role="dialog" aria-modal="true" aria-labelledby="grp-h"><div class="mhead"><h2 id="grp-h">${m.id ? 'Edit group' : 'New group'}</h2></div><div class="mbody">
      <label class="field">Name<input class="input" id="gName" value="${esc(m.name || '')}" maxlength="40" placeholder="EUW grind"></label>
      <div class="field">Color<div style="display:flex;gap:8px">${GCOLORS.map((c) => `<button type="button" data-act="gColor" data-v="${c}" aria-label="${c}" aria-pressed="${m.color === c}" style="width:28px;height:28px;border-radius:8px;padding:0;border:2px solid ${m.color === c ? 'var(--text)' : 'transparent'};background:${groupColor(c)}"></button>`).join('')}</div></div>
    </div><div class="mfoot">${m.id ? `<button class="btn danger" type="button" data-act="groupDelete" data-v="${m.id}">Delete group</button>` : ''}<button class="btn" type="button" data-act="closeModal" style="margin-left:auto">Cancel</button><button class="btn primary" type="button" data-act="groupSave">${m.id ? 'Save' : 'Create group'}</button></div></div>`;
  }
  if (m.type === 'password') {
    const t = { enable: ['Turn on the vault', 'Choose a master password. It encrypts logins, passwords and notes. If you forget it, they cannot be recovered.'], change: ['Change master password', 'Enter the current password and a new one.'], export: ['Export encrypted backup', 'The backup file is encrypted with this password. You need it to import the backup.'], import: ['Import backup', 'Importing replaces all accounts with the ones in the backup. A copy of your current data is saved first.'] }[m.mode];
    return scrim + `<div class="modal small" role="dialog" aria-modal="true" aria-labelledby="pw-h"><div class="mhead"><h2 id="pw-h">${t[0]}</h2></div><div class="mbody"><p class="muted" style="margin:0;line-height:1.5">${t[1]}</p>
      ${m.mode === 'change' ? '<label class="field">Current password<input class="input" type="password" id="pwOld"></label>' : ''}
      <label class="field">${m.mode === 'import' ? 'Backup password' : m.mode === 'change' ? 'New password' : 'Password'}<input class="input" type="password" id="pwNew" placeholder="At least 8 characters"></label>
      <p class="error-text" id="pwErr"></p></div>
      <div class="mfoot"><button class="btn" type="button" data-act="closeModal" style="margin-left:auto">Cancel</button><button class="btn primary" type="button" data-act="pwSubmit">${{ enable: 'Turn on', change: 'Change', export: 'Choose file and export', import: 'Choose file and import' }[m.mode]}</button></div></div>`;
  }
  if (m.type === 'whatsnew') {
    const list = (label, cls, items) => `<div><span class="pill ${cls}">${label}</span><ul style="margin:8px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:6px;line-height:1.45">${items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`;
    return scrim + `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="wn-h"><div class="mhead"><h2 id="wn-h">What’s new in ${esc(S.status.version)}</h2></div><div class="mbody">
      ${list('New', 'good', ['New name and look: Alts Keychain', 'Last 5 games on every card and in the details, games per day on the Stats page', 'Mini window that opens next to the Riot Client and closes with it', 'Main account that always stays at the top of the mini window', 'Icon next to the clock: copy logins from there, the app keeps running when you close the window', 'Unlock with Windows Hello (fingerprint, face or PIN)', 'Updates install by themselves', 'Invite codes: no Riot API key needed'])}
      ${list('Improved', 'warn', ['Drag account cards to arrange them, your order is remembered', 'Groups: drag accounts into groups, one account can be in several', 'Cleaner goal cards', 'New dropdowns and calendar', 'Refreshing is much faster and cards update one by one', 'Starts with Windows quietly next to the clock'])}
    </div><div class="mfoot"><button class="btn primary" type="button" data-act="closeWhatsNew" style="margin-left:auto">Got it</button></div></div>`;
  }
  return '';
}

function addModal(m) {
  const one = m.tab === 'one';
  const lk = m.lookup;
  let prev = '';
  if (lk && lk.state === 'loading') prev = `<div class="card-box preview"><div class="skel" style="width:44px;height:44px;border-radius:50%"></div><div style="flex:1;display:flex;flex-direction:column;gap:7px"><div class="skel" style="height:12px;width:50%"></div><div class="skel" style="height:10px;width:35%"></div></div><span class="muted" style="font-size:12px">Checking with Riot…</span></div>`;
  else if (lk && lk.state === 'ok') { const p = lk.preview; prev = `<div class="card-box preview" role="status"><div class="av" style="width:44px;height:44px"><img src="${esc(p.icon)}" alt="" onerror="this.remove()"></div><div style="flex:1;min-width:0"><div class="name">${esc(p.name)}<span class="tag"> #${esc(p.tag)}</span></div><div class="muted" style="font-size:12px">Level ${p.level}, <span style="color:${tc(p.solo && p.solo.tier)};font-weight:600">${rankText(p.solo)}${p.solo ? ' ' + p.solo.lp + ' LP' : ''}</span></div></div><span class="pill good" style="font-size:12px">${ic('check', 12)} Found on Riot</span></div>`; }
  else if (lk && lk.state === 'err') prev = `<div class="card-box preview" role="status"><span class="pill ${lk.kind === 'notfound' ? 'warn' : 'bad'}" style="padding:8px">${ic('alert', 16)}</span><div style="flex:1"><div style="font-weight:600">${esc(lk.error)}</div><div class="muted" style="font-size:12px">${lk.suggestRegion ? '' : 'You can still save it and fix it later.'}</div></div>${lk.suggestRegion ? `<button class="btn sm" type="button" data-act="addUseRegion" data-v="${lk.suggestRegion}">Use ${REG[lk.suggestRegion]}</button>` : ''}</div>`;
  const body = one ? `
    <div class="idrow"><label class="field">Riot ID<input class="input" id="aId" value="${esc(m.riotId)}" placeholder="Name#TAG" autocomplete="off"></label>
      <label class="field">Server<select class="input" id="aReg">${Object.keys(REG).map((k) => `<option value="${k}" ${m.region === k ? 'selected' : ''}>${REG[k]}</option>`).join('')}</select></label></div>
    <div id="aPrev">${prev}</div>
    <div class="two"><label class="field">Username<input class="input" id="aUser" value="${esc(m.user)}" autocomplete="off"></label><label class="field">Password<input class="input" id="aPass" type="password" value="${esc(m.pass)}" autocomplete="off"></label>
      <label class="field" style="grid-column:1/-1">Email (optional)<input class="input" id="aMail" value="${esc(m.email)}" autocomplete="off"></label></div>
    <div class="field">Category<div style="display:flex;flex-wrap:wrap;gap:6px">${Object.keys(CATS).map((c) => `<button class="chip pick" type="button" data-act="aCat" data-v="${c}" aria-pressed="${m.cat === c}">${CATS[c]}</button>`).join('')}</div></div>
    ${S.groups.length ? `<div class="field">Groups<div style="display:flex;flex-wrap:wrap;gap:6px">${S.groups.map((g) => `<button class="chip pick" type="button" data-act="aGroup" data-v="${g.id}" aria-pressed="${m.groups.includes(g.id)}"><span class="dot" style="background:${groupColor(g.color)}"></span>${esc(g.name)}</button>`).join('')}</div></div>` : ''}
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" id="aPin" ${m.pin ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)"><span><b style="font-weight:600">Pin this account</b> <span class="muted">so it stays at the top</span></span></label>
    <p class="error-text" id="aErr"></p>` : `
    <p class="muted" style="margin:0;line-height:1.5">Paste your notes. Alts finds Riot IDs, usernames, passwords and emails, then checks each account with Riot.</p>
    <textarea class="input mono" id="impText" style="height:150px" placeholder="Account: Name#EUW&#10;Username: ...&#10;Password: ...">${esc(m.importText)}</textarea>
    <div style="display:flex;gap:8px;align-items:center"><label class="field" style="flex-direction:row;align-items:center;gap:8px">Server when the tag doesn't say<select class="small" id="impReg">${Object.keys(REG).map((k) => `<option value="${k}" ${m.importRegion === k ? 'selected' : ''}>${REG[k]}</option>`).join('')}</select></label><button class="btn sm" type="button" data-act="impParse" style="margin-left:auto">Find accounts</button></div>
    ${m.found.length ? `<div style="font-weight:600">Found ${m.found.length} ${m.found.length === 1 ? 'account' : 'accounts'}</div><div class="card-box found">${m.found.map((f, i) => `
      <div><input type="checkbox" data-act="impToggle" data-i="${i}" ${f.on ? 'checked' : ''} aria-label="Import ${esc(f.riotId)}" style="width:18px;height:18px;accent-color:var(--accent)">
      <div style="flex:1;min-width:0"><div style="font-weight:600">${esc(f.riotId)} <span class="muted" style="font-weight:400">${REG[f.region]}</span></div><div class="muted" style="font-size:12px">${[f.username ? 'username' : '', f.password ? 'password' : '', f.email ? 'email' : ''].filter(Boolean).join(', ') || 'no login details'} found${f.preview ? ', ' + rankText(f.preview.solo) : ''}</div></div>
      <span class="pill ${f.state === 'ok' ? 'good' : f.state === 'checking' ? '' : 'warn'}" style="font-size:12px">${f.state === 'ok' ? 'Found on Riot' : f.state === 'checking' ? 'Checking…' : f.state === 'dupe' ? 'Already added' : esc(f.error || 'Check this')}</span></div>`).join('')}</div>
    <p class="muted" style="margin:0;font-size:12px">Tip: delete the old text file once the import is done, so your passwords are only in the vault.</p>` : ''}`;
  const n = m.found.filter((f) => f.on).length;
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="add-h">
    <div class="mhead"><h2 id="add-h">Add accounts</h2><button class="icon-btn sm" type="button" data-act="closeModal" aria-label="Close" style="margin-left:auto">${ic('x', 14)}</button></div>
    <div style="padding:16px 22px 0"><div class="seg" role="tablist" style="display:flex"><button type="button" role="tab" style="flex:1" data-act="aTab" data-v="one" aria-pressed="${one}" aria-selected="${one}">One account</button><button type="button" role="tab" style="flex:1" data-act="aTab" data-v="import" aria-pressed="${!one}" aria-selected="${!one}">Import from text</button></div></div>
    <div class="mbody">${body}</div>
    <div class="mfoot"><span class="note">${one ? 'Checked with Riot as you type' : n + ' of ' + m.found.length + ' selected'}</span><button class="btn" type="button" data-act="closeModal">Cancel</button>${one ? '<button class="btn primary" type="button" data-act="addSave">Add account</button>' : `<button class="btn primary" type="button" data-act="impSave" ${n ? '' : 'disabled'}>Import ${n} ${n === 1 ? 'account' : 'accounts'}</button>`}</div>
  </div>`;
}

// ---------- quick switcher ----------
function swItems() {
  const q = S.sw.q.trim().toLowerCase();
  const accs = S.accounts.filter((a) => !q || [nameOf(a), streamer() ? '' : a.riotId, ...(a.tags || []), CATS[a.category]].join(' ').toLowerCase().includes(q))
    .sort((x, y) => (y.lastUsed || 0) - (x.lastUsed || 0)).slice(0, 8).map((a) => ({ type: 'acc', a }));
  const actions = [
    { type: 'act', label: 'Add account', keys: '', run: () => openAdd() },
    { type: 'act', label: 'Refresh all accounts', keys: '', run: () => refresh(null, 0) },
    { type: 'act', label: 'Open mini window', keys: '', run: () => ipc.invoke('miniOpen') },
    { type: 'act', label: streamer() ? 'Turn off streamer mode' : 'Turn on streamer mode', keys: '', run: () => setSetting({ streamer: !streamer() }) },
    ...(S.status.vault ? [{ type: 'act', label: 'Lock vault', keys: '', run: () => lockNow() }] : []),
    { type: 'act', label: 'Open settings', keys: '', run: () => { S.view = 'settings'; render(); } },
  ].filter((x) => !q || x.label.toLowerCase().includes(q));
  return [...accs, ...actions];
}
function switcher() {
  const items = swItems();
  if (S.sw.sel >= items.length) S.sw.sel = Math.max(0, items.length - 1);
  let i = -1, accHdr = false, actHdr = false;
  const rows = items.map((it) => {
    i++;
    const sel = i === S.sw.sel;
    let hdr = '';
    if (it.type === 'acc' && !accHdr) { accHdr = true; hdr = '<div class="grp">Accounts</div>'; }
    if (it.type === 'act' && !actHdr) { actHdr = true; hdr = '<div class="grp">Actions</div>'; }
    if (it.type === 'acc') {
      const a = it.a;
      return hdr + `<div class="item ${sel ? 'sel' : ''}" data-act="swPick" data-i="${i}" role="option" aria-selected="${sel}">${avatar(a, 34)}<div style="flex:1;min-width:0"><div class="name">${esc(nameOf(a))}<span class="tag"> #${esc(tagOf(a))}</span></div><div class="muted" style="font-size:12px">${REG[a.region]}, ${CATS[a.category]}</div></div><span class="pill rank-pill" style="--tc:${tc(solo(a) && solo(a).tier)};font-size:12px">${rankText(solo(a))}</span></div>
        ${sel ? `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px 58px"><button class="btn xs primary" type="button" data-act="copy" data-id="${a.id}" data-f="password">Copy password <span style="opacity:.75">Enter</span></button><button class="btn xs" type="button" data-act="copy" data-id="${a.id}" data-f="username">Copy login <span class="muted">Shift Enter</span></button><button class="btn xs" type="button" data-act="open" data-id="${a.id}">Open details <span class="muted">Ctrl Enter</span></button></div>` : ''}`;
    }
    return hdr + `<div class="item ${sel ? 'sel' : ''}" data-act="swPick" data-i="${i}" role="option" aria-selected="${sel}"><span style="flex:1">${esc(it.label)}</span></div>`;
  }).join('');
  return `<div class="scrim top" data-act="closeSw"></div><div class="switcher" role="dialog" aria-modal="true" aria-label="Quick switcher">
    <div class="q">${ic('search', 18)}<input id="swq" value="${esc(S.sw.q)}" aria-label="Search accounts and actions" autocomplete="off"><span class="kbd">Esc</span></div>
    <div class="list" role="listbox">${rows || '<div class="muted" style="padding:16px">Nothing found</div>'}</div>
    <div class="foot"><span>↑ ↓ to move</span><span>Enter to copy password</span><span>Esc to close</span><span style="margin-left:auto">The chosen account becomes active</span></div></div>`;
}

// ---------- groups page ----------
function groupsPage() {
  // all accounts on the left, every group as an equal card in rows of three; drag to sort
  const q = (S.gq || '').trim().toLowerCase();
  const lib = S.accounts.filter((a) => !q || nameOf(a).toLowerCase().includes(q));
  const squares = (a) => (a.groups || []).map((id) => S.groups.find((g) => g.id === id)).filter(Boolean).map((g) => `<i style="background:${groupColor(g.color)}" title="${esc(g.name)}"></i>`).join('');
  const row = (a, gid) => `<div class="gitem" data-gdrag="${a.id}" ${gid ? `data-from="${gid}"` : ''}>${avatar(a, 26)}<div class="gname"><div class="name">${esc(nameOf(a))}</div>${!gid && (a.groups || []).length ? `<div class="sq">${squares(a)}</div>` : ''}</div><span class="grank" style="color:${tc(solo(a) && solo(a).tier)}">${rankText(solo(a))}</span>${gid ? `<button class="gx" type="button" data-act="ungroup" data-id="${a.id}" data-g="${gid}" aria-label="Remove ${esc(nameOf(a))} from this group" title="Remove from group">${ic('x', 12)}</button>` : ''}</div>`;
  const card = (g) => {
    const members = S.accounts.filter((a) => (a.groups || []).includes(g.id));
    const menu = S.gMenu === g.id ? `<div class="gmenu" role="menu"><button type="button" role="menuitem" data-act="editGroup" data-v="${g.id}">Edit group</button><button type="button" role="menuitem" class="bad" data-act="askGroupDelete" data-v="${g.id}">Delete group</button></div>` : '';
    return `<section class="gcard" data-g="${g.id}" aria-label="${esc(g.name)}">
      <div class="gch"><span class="dot" style="background:${groupColor(g.color)}"></span><b class="name">${esc(g.name)}</b><span class="muted" style="font-size:12px">${members.length}</span>
        <div style="position:relative;margin-left:auto"><button class="icon-btn sm gmore" type="button" data-act="gMenu" data-v="${g.id}" aria-label="Group options" aria-expanded="${S.gMenu === g.id}">⋯</button>${menu}</div></div>
      <div class="glist">${members.map((a) => row(a, g.id)).join('')}${members.length < 4 ? '<div class="gempty">Drag accounts here</div>' : ''}</div>
      <div class="gfoot">${members.length > 4 ? `Scroll for ${members.length - 4} more` : ''}</div></section>`;
  };
  const grid = S.groups.length ? `<div class="ggrid">${S.groups.map(card).join('')}</div>`
    : `<div class="gnone"><b>No groups yet</b><span class="muted">Groups keep accounts together, for example the ones you play with a friend. One account can be in several groups.</span><button class="btn primary" type="button" data-act="newGroup">${ic('plus', 15)}New group</button></div>`;
  return `<div class="page">${topbar('Groups', '', S.groups.length ? `<button class="btn primary" type="button" data-act="newGroup">${ic('plus', 15)}New group</button>` : '')}
    <div class="gboard">
      <aside class="glib" aria-label="All accounts"><div class="glib-in"><b style="font-size:14px">All accounts</b>
        <label class="search" style="width:auto">${ic('search', 15)}<input id="gq" type="search" placeholder="Find an account" aria-label="Find an account" value="${esc(S.gq || '')}"></label>
        <div class="glib-list" id="glib">${lib.map((a) => row(a, null)).join('') || '<p class="muted" style="margin:6px 2px;font-size:13px">No account found.</p>'}</div>
        <p class="muted" style="margin:0;font-size:12px;line-height:1.45">Drag an account into a group. It can be in several groups; the squares show which.</p></div></aside>
      <div class="gmain">${grid}</div>
    </div></div>`;
}

function statTiles(list) {
  const ranked = list.filter(solo);
  const best = [...ranked].sort((x, y) => ladder(solo(y)) - ladder(solo(x)))[0];
  const w = ranked.reduce((s, a) => s + solo(a).w, 0), l = ranked.reduce((s, a) => s + solo(a).l, 0);
  const regions = {};
  list.forEach((a) => { regions[REG[a.region]] = (regions[REG[a.region]] || 0) + 1; });
  const split = S.status.splitEnd ? daysUntil(S.status.splitEnd) : null;
  const tile = (lbl, v, sub, color) => `<div class="tile"><div class="lbl">${lbl}</div><div class="v" style="color:${color || 'var(--text)'}">${v}</div><div class="muted" style="font-size:12px;margin-top:2px">${sub}</div></div>`;
  return `<div class="tiles">
    ${tile('Accounts', list.length, Object.entries(regions).map(([k, v]) => v + ' on ' + k).join(', ') || '–')}
    ${tile('Highest solo rank', best ? rankText(solo(best)) : '–', best ? esc(nameOf(best)) + ', ' + solo(best).lp + ' LP' : 'No ranked accounts', best ? tc(solo(best).tier) : '')}
    ${tile('Solo win rate this split', w + l ? Math.round(w / (w + l) * 100) + '%' : '–', w + l ? w + ' W, ' + l + ' L' : 'No ranked games')}
    ${tile('Split ends in', split !== null && split >= 0 ? split + (split === 1 ? ' day' : ' days') : '–', S.status.splitEnd ? esc(S.status.splitEnd) + ', set in Settings' : 'Set the date in Settings')}
  </div>`;
}

// ---------- goals page ----------
function goalsPage() {
  const withGoal = S.accounts.filter((a) => a.goal);
  const C = 2 * Math.PI * 26;
  // card A: from rank to target rank, one calm blue bar, actions in a ⋯ menu
  const card = (a) => {
    const g = goalState(a);
    const dot = { track: 'var(--good)', behind: 'var(--warn)', reached: 'var(--t-gold)', missed: 'var(--bad)' }[g.kind];
    const status = g.kind === 'reached' ? 'Reached ' + g.label : g.kind === 'missed' ? 'Missed the deadline' : GOAL_TXT[g.kind][0];
    const cur = solo(a);
    const foot = g.kind === 'reached' ? '<span>Goal reached</span><span></span>'
      : g.kind === 'missed' ? `<span>Ended at ${esc(rankText(cur))}</span><span>${esc(a.goal.deadline)}</span>`
      : `<span>${g.need.toLocaleString('en')} LP to go</span><span>${g.left} ${g.left === 1 ? 'day' : 'days'} left</span>`;
    const menu = S.goalMenu === a.id ? `<div class="gmenu" role="menu">
        ${g.kind === 'reached' ? `<button type="button" role="menuitem" data-act="goal" data-id="${a.id}">Set next goal</button>` : `<button type="button" role="menuitem" data-act="goal" data-id="${a.id}">${g.kind === 'missed' ? 'Try again' : 'Edit goal'}</button>`}
        <button type="button" role="menuitem" class="bad" data-act="goalRemove" data-id="${a.id}">Remove goal</button></div>` : '';
    return `<article class="goal-a">
      <div class="gh">${avatar(a, 36)}<div style="flex:1;min-width:0"><div class="name" style="font-weight:700;font-size:15px">${esc(nameOf(a))}</div><div class="muted" style="font-size:13px"><span class="gdot" style="background:${dot}"></span>${esc(status)}</div></div>
        <div style="position:relative"><button class="icon-btn sm gmore" type="button" data-act="goalMenu" data-id="${a.id}" aria-label="Goal options" aria-expanded="${S.goalMenu === a.id}">⋯</button>${menu}</div></div>
      <div class="gft"><span style="color:${tc(cur && cur.tier)}">${esc(rankText(cur))}</span><span class="muted">→</span><span style="color:${tc(a.goal.tier)}">${esc(g.label)}</span></div>
      <div class="gbar" role="progressbar" aria-valuenow="${g.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${g.pct} percent of the way"><i style="width:${g.kind === 'reached' ? 100 : Math.max(2, g.pct)}%"></i></div>
      <div class="gfoot muted">${foot}</div></article>`;
  };
  const noGoal = S.accounts.filter((a) => !a.goal);
  return `<div class="page">${topbar('Goals')}
    <div class="cols"><div class="left"><div class="card-box" style="padding:18px;display:flex;flex-direction:column;gap:12px"><h2 style="margin:0;font-size:15px">New goal</h2>
      ${noGoal.length ? `<p class="muted" style="margin:0;font-size:13px">Pick an account, then choose the target rank and deadline.</p>
      ${noGoal.length > 6 ? `<label class="search" style="width:auto">${ic('search', 15)}<input id="ngQ" type="search" placeholder="Find an account" aria-label="Find an account" value="${esc(S.ngQ || '')}"></label>` : ''}
      <div class="pick-list" id="ngList" role="list">${goalPickRows(noGoal)}</div>` : '<p class="muted" style="margin:0">Every account already has a goal.</p>'}
      <p class="muted" style="margin:0;font-size:12px">Progress updates with every refresh. Cards on the Accounts page show it too.</p></div></div>
    <div class="right">${withGoal.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">${withGoal.map(card).join('')}</div>` : '<div class="empty">No goals yet. Pick an account on the left.</div>'}</div></div></div>`;
}

// accounts without a goal, as a list to pick from
function goalPickRows(list) {
  const q = (S.ngQ || '').trim().toLowerCase();
  const rows = list.filter((a) => !q || nameOf(a).toLowerCase().includes(q));
  if (!rows.length) return '<p class="muted" style="margin:6px 4px;font-size:13px">No account found.</p>';
  return rows.map((a) => `<button class="pick-row" type="button" role="listitem" data-act="goal" data-id="${a.id}">${avatar(a, 28)}<span style="flex:1;min-width:0;text-align:left"><span class="name" style="display:block;font-weight:600">${esc(nameOf(a))}</span><span style="font-size:12px;font-weight:600;color:${tc(solo(a) && solo(a).tier)}">${rankText(solo(a))}</span></span><span class="go">${ic('plus', 14)}</span></button>`).join('');
}

// ---------- stats page ----------
function statsPage() {
  const scopes = [['all', 'All accounts'], ...(S.cat !== 'all' ? [['filter', 'Filter: ' + CATS[S.cat]]] : []), ...S.groups.map((g) => ['g:' + g.id, 'Group: ' + g.name])];
  if (!scopes.find((s) => s[0] === S.statsScope)) S.statsScope = 'all';
  const list = S.statsScope === 'all' ? S.accounts : S.statsScope === 'filter' ? S.accounts.filter((a) => a.category === S.cat) : S.accounts.filter((a) => (a.groups || []).includes(S.statsScope.slice(2)));
  const counts = {};
  list.forEach((a) => { const t = solo(a) ? solo(a).tier : 'UNRANKED'; counts[t] = (counts[t] || 0) + 1; });
  const tiers = [...TIERS].reverse().filter((t) => counts[t]).concat(counts.UNRANKED ? ['UNRANKED'] : []);
  const maxC = Math.max(1, ...Object.values(counts));
  const lp = list.map((a) => { const c = changeOf(a); if (!c || !S.base[a.id] || !solo(a)) return null; return { a, v: ladder(solo(a)) - ladder(S.base[a.id]) }; }).filter((x) => x && x.v);
  const maxLp = Math.max(1, ...lp.map((x) => Math.abs(x.v)));
  const top = list.filter(solo).sort((x, y) => (solo(y).w + solo(y).l) - (solo(x).w + solo(x).l)).slice(0, 6);
  return `<div class="page">${topbar('Stats', `<div class="seg" role="group" aria-label="Show stats for" style="margin-left:8px">${scopes.map(([v, l]) => `<button type="button" data-act="scope" data-v="${v}" aria-pressed="${S.statsScope === v}">${esc(l)}</button>`).join('')}</div>`)}
    ${statTiles(list)}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:12px">
      <section class="card-box" style="padding:18px;display:flex;flex-direction:column;gap:10px" aria-labelledby="rs-h"><h2 id="rs-h" style="margin:0 0 4px;font-size:15px">Solo rank spread</h2>
        ${tiers.length ? tiers.map((t) => `<div class="hbar"><span style="font-size:13px;font-weight:600;color:${tc(t === 'UNRANKED' ? null : t)}">${t === 'UNRANKED' ? 'Unranked' : cap(t)}</span><div class="bar" style="height:10px;border-radius:5px"><span style="width:${Math.round(counts[t] / maxC * 100)}%;background:${tc(t === 'UNRANKED' ? null : t)}"></span></div><span class="muted" style="text-align:right;font-size:13px">${counts[t]}</span></div>`).join('') : '<p class="muted" style="margin:0">No accounts.</p>'}</section>
      <section class="card-box" style="padding:18px;display:flex;flex-direction:column;gap:12px" aria-labelledby="lp-h"><h2 id="lp-h" style="margin:0;font-size:15px">LP change since you last opened the app</h2>
        ${lp.length ? lp.map(({ a, v }) => `<div class="lpbar"><span style="font-size:13px" class="name">${esc(nameOf(a))}</span><div class="neg"><span style="width:${v < 0 ? Math.round(-v / maxLp * 100) : 0}%"></span></div><div class="pos"><span style="width:${v > 0 ? Math.round(v / maxLp * 100) : 0}%"></span></div><span style="text-align:right;font-size:13px;font-weight:600" class="${v > 0 ? 'good' : 'bad'}">${v > 0 ? '+' : '−'}${Math.abs(v)}</span></div>`).join('') : '<p class="muted" style="margin:0">No changes yet. They show up after a refresh when ranks move.</p>'}</section>
    </div>
    <section class="card-box" style="padding:18px" aria-labelledby="mp-h"><h2 id="mp-h" style="margin:0 0 8px;font-size:15px">Most played this split</h2>
      ${top.length ? `<table class="plain"><thead><tr><th scope="col">Account</th><th scope="col">Rank</th><th scope="col" class="r">Games</th><th scope="col" class="r">Win rate</th></tr></thead><tbody>${top.map((a) => { const r = solo(a), g = r.w + r.l; return `<tr><td style="font-weight:600">${esc(nameOf(a))}</td><td><span style="color:${tc(r.tier)};font-weight:600">${rankText(r)}</span> <span class="muted">${r.lp} LP</span></td><td class="r">${g}</td><td class="r">${Math.round(r.w / Math.max(1, g) * 100)}%</td></tr>`; }).join('')}</tbody></table>` : '<p class="muted" style="margin:0">No ranked accounts.</p>'}
</section>
    ${perDay(list)}
  </div>`;
}

// games per day over the last 14 days, summed over the accounts in scope
function perDay(list) {
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  const vals = days.map((k) => list.reduce((s, a) => s + ((a.gamesByDay || {})[k] || 0), 0));
  const known = list.some((a) => a.gamesByDay && Object.keys(a.gamesByDay).length);
  const max = Math.max(1, ...vals), total = vals.reduce((x, y) => x + y, 0);
  return `<section class="card-box" style="padding:18px" aria-labelledby="pd-h"><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 id="pd-h" style="margin:0;font-size:15px">Games per day, last 14 days</h2><span class="muted" style="font-size:12px">${total} games</span></div>
    ${known ? `<div class="days" role="img" aria-label="Games per day, ${total} in total">${vals.map((v, i) => `<div title="${days[i]}: ${v} ${v === 1 ? 'game' : 'games'}"><span class="n">${v || ''}</span><span class="b" style="height:${Math.round(v / max * 100)}%"></span><span class="d">${new Date(days[i]).getDate()}.</span></div>`).join('')}</div>
    <p class="muted" style="margin:8px 0 0;font-size:12px">Counting starts the first time the app loads match history, so older days fill in as you keep using it.</p>` : '<p class="muted" style="margin:8px 0 0">Match history loads after the next refresh.</p>'}</section>`;
}

// ---------- settings page ----------
function settingsPage() {
  const s = S.status;
  const sw = (k, label, hint) => `<div class="srow"><div class="lab"><b>${label}</b><span>${hint}</span></div><button class="switch" type="button" role="switch" aria-checked="${!!s[k]}" aria-label="${label}" data-act="toggleSet" data-k="${k}"></button></div>`;
  const seg = (k, label, hint, opts) => `<div class="srow"><div class="lab"><b>${label}</b><span>${hint}</span></div><div class="seg" role="group" aria-label="${label}">${opts.map(([v, l]) => `<button type="button" data-act="segSet" data-k="${k}" data-v="${v}" aria-pressed="${String(s[k]) === String(v)}">${l}</button>`).join('')}</div></div>`;
  const seg2 = (label, hint, opts, cur) => `<div class="srow"><div class="lab"><b>${label}</b><span>${hint}</span></div><div class="seg" role="group" aria-label="${label}">${opts.map(([v, l, ok]) => `<button type="button" data-act="setMode" data-v="${v}" aria-pressed="${cur === v}" ${ok || cur === v ? '' : 'disabled title="Save it below first"'}>${l}</button>`).join('')}</div></div>`;
  const row = (label, hint, right) => `<div class="srow"><div class="lab"><b>${label}</b><span>${hint}</span></div>${right}</div>`;
  const CATS2 = [['general', 'General'], ['view', 'Accounts view'], ['security', 'Security'], ['privacy', 'Privacy'], ['keys', 'Shortcuts'], ['data', 'Data and refresh'], ['api', 'Riot data'], ['backup', 'Backups'], ['about', 'About']];
  const sec = {
    general: ['General', 'How the app looks and runs.', seg('theme', 'Theme', 'Dark is the default.', [['dark', 'Dark'], ['light', 'Light'], ['system', 'Match Windows']])
      + seg('closeToTray', 'Closing the window', 'In the background the copy shortcut and the icon next to the clock keep working.', [[true, 'Keeps it running'], [false, 'Quits the app']])
      + sw('startWithWindows', 'Start with Windows', 'On by default. Starts quietly next to the clock when you sign in to Windows, without opening a window. Works in the installed app.')
      + row('Mini window', 'A small always-on-top list for copying logins. It can sit right next to the Riot Client login window.', '<button class="btn sm" type="button" data-act="miniOpen">Open</button>')
      + (s.platform === 'win32' ? sw('miniAuto', 'Open the mini window with the Riot Client', 'Opens next to the Riot Client login window and closes when it closes, for example after you start a game. Only the window position is read.') : '')],
    view: ['Accounts view', 'What you see on the Accounts page.', sw('showRecent', 'Recently used at the top', 'Accounts you copied from last appear first.') + sw('showPinned', 'Pinned accounts', 'Shows the pinned row above all accounts.') + sw('showChanges', 'Changes since last open', 'LP gained or lost, promotions and demotions.')],
    security: ['Security', 'Protect your logins and passwords.', (s.vault
      ? seg('lockMinutes', 'Lock after inactivity', 'You need the master password to unlock.', [[5, '5 min'], [15, '15 min'], [30, '30 min'], [60, '1 hour'], [0, 'Never']]) + row('Master password', 'Encrypts logins, passwords and notes.', '<button class="btn sm" type="button" data-act="pw" data-v="change">Change</button>') + row('Encryption', 'Turning it off stores logins as plain text on this computer.', '<button class="btn sm danger" type="button" data-act="vaultOff">Turn off</button>')
      : row('Encryption is off', 'Logins and passwords are stored as plain text. Turn it on to encrypt them with a master password.', '<button class="btn sm primary" type="button" data-act="pw" data-v="enable">Turn on</button>'))
      + (s.platform === 'win32' ? `<div class="srow"><div class="lab"><b>Windows Hello</b><span>${!s.vault ? 'Turn on the vault first.' : S.helloAvail === false ? 'Not set up on this computer. Add a PIN, fingerprint or face in Windows Settings, Accounts, Sign-in options.' : 'Unlock with your fingerprint, face or Windows PIN. The master password keeps working too.'}</span></div><button class="switch" type="button" role="switch" aria-checked="${!!s.hello}" aria-label="Windows Hello" data-act="hello" ${!s.vault || S.helloAvail === false ? 'disabled' : ''}></button><p class="error-text" id="helloErr" style="flex-basis:100%;margin:0"></p></div>` : '')],
    privacy: ['Privacy', 'Useful when you stream or share your screen.', sw('streamer', 'Streamer mode', 'Hides Riot IDs, logins, emails and notes.') + seg('clipSeconds', 'Clear clipboard after', 'Copied logins and passwords are removed.', [[15, '15 s'], [30, '30 s'], [60, '60 s']])],
    keys: ['Shortcuts', 'The copy shortcut works even when the app is in the background.', row('Copy login, then password', 'First press copies the login of the active account, the next press within 30 s the password. The active account is the one you last clicked or copied from.', `<span class="kbd" style="font-size:13px;padding:4px 10px">${esc(S.capture ? 'Press keys…' : hotkeyText(s.hotkey))}</span><button class="btn sm" type="button" data-act="captureKey">${S.capture ? 'Cancel' : 'Change'}</button>`) + row('Quick switcher', 'Search accounts and actions inside the app.', '<span class="kbd" style="font-size:13px;padding:4px 10px">Ctrl+K</span>')],
    data: ['Data and refresh', 'How often ranks and levels load.', seg('autoRefreshMin', 'Refresh while open', 'Data always refreshes at startup.', [[0, 'Startup only'], [30, '30 min'], [60, '1 hour'], [180, '3 hours']]) + row('Split end date', 'Used for the countdown on the Stats page.', `<input class="input" type="date" id="splitEnd" value="${esc(s.splitEnd || '')}" style="width:170px;height:34px" aria-label="Split end date">`)],
    api: ['Riot data', 'Where levels and ranks come from.', seg2('Connection', s.mode === 'server' ? 'Through the Alts server with an invite code. No API key needed.' : 'Directly from Riot with your own API key.', [['server', 'Invite code', !!s.inviteHint], ['own', 'Own API key', !!s.hasOwnKey]], s.mode)
      + `<div class="srow"><div class="lab"><b>Invite code</b><span>${s.inviteHint ? 'Saved: ' + esc(s.inviteHint) : 'The code you got from a friend, for example LK-AB12-CD34.'}</span></div><div style="display:flex;gap:6px;flex:1 1 320px"><input class="input mono" id="inviteCode" placeholder="LK-XXXX-XXXX" style="height:34px;text-transform:uppercase" autocomplete="off"><button class="btn sm ${s.mode === 'server' ? 'primary' : ''}" type="button" data-act="saveInvite">Save and check</button></div><p class="error-text" id="invErr" style="flex-basis:100%;margin:0"></p></div>`
      + `<div class="srow"><div class="lab"><b>Own Riot API key</b><span>${s.hasOwnKey ? 'Saved: ' + esc(s.keyHint) + '. ' : ''}From developer.riotgames.com. Development keys expire every 24 hours. <button class="btn xs ghost" type="button" data-act="openPortal" style="padding:0 4px;color:var(--accent)">Open portal</button></span></div><div style="display:flex;gap:6px;flex:1 1 320px"><input class="input" id="apiKey" placeholder="RGAPI-…" style="height:34px" autocomplete="off"><button class="btn sm ${s.mode === 'own' ? 'primary' : ''}" type="button" data-act="saveKey">Save and check</button></div><p class="error-text" id="keyErr" style="flex-basis:100%;margin:0"></p></div>`],
    backup: ['Backups', 'Keep your accounts safe.', row('Encrypted backup file', 'Restore it on any computer with its password.', '<div style="display:flex;gap:6px"><button class="btn sm primary" type="button" data-act="pw" data-v="export">Export</button><button class="btn sm" type="button" data-act="pw" data-v="import">Import</button></div>') + row('Daily automatic backup', 'A copy of your data is kept every day, the last 7 days. Encrypted when the vault is on.', '<button class="btn sm" type="button" data-act="openBackups">Open folder</button>')],
    about: ['About', 'Alts Keychain ' + esc(s.version), row('Show what’s new', 'The list of changes in this version.', '<button class="btn sm" type="button" data-act="whatsNew">Open</button>') + `<div class="srow"><p class="muted" style="margin:0;line-height:1.55;font-size:13px">Alts isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</p></div>`],
  }[S.scat];
  return `<div class="page">${topbar('Settings')}
    <div class="settings"><div class="cats" role="tablist" aria-orientation="vertical" aria-label="Settings sections">${CATS2.map(([k, l]) => `<button type="button" role="tab" data-act="scat" data-v="${k}" aria-selected="${S.scat === k}">${l}</button>`).join('')}</div>
    <section class="panel2" aria-labelledby="sec-h"><h2 id="sec-h">${sec[0]}</h2><p class="desc">${sec[1]}</p><div class="card-box">${sec[2]}</div><p class="muted" style="font-size:12px;margin:12px 0 0">Changes are saved right away.</p></section></div></div>`;
}

// ---------- lock and welcome ----------
function lockScreen() {
  return `<div class="center"><section class="panel" style="width:min(400px,100%)" aria-labelledby="lock-h"><div class="pad" style="align-items:center;text-align:center">
    <div class="mark" style="width:52px;height:52px;border-radius:14px">${ic('key', 26)}</div>
    <div><h1 id="lock-h" style="font-size:22px">Vault locked</h1><p class="muted" style="margin:6px 0 0">${S.status.hello ? 'Use Windows Hello or your master password.' : 'Enter your master password to unlock.'}</p></div>
    ${S.status.hello ? `<button class="btn primary" type="button" data-act="helloUnlock" style="width:100%">${ic('user', 16)}Unlock with Windows Hello</button><div class="muted" style="font-size:12px">or</div>` : ''}
    <form id="lockForm" style="width:100%;display:flex;flex-direction:column;gap:8px;text-align:left"><label class="field">Master password<input class="input" type="password" id="lockpw" autocomplete="current-password"></label><p class="error-text" id="lockErr"></p><button class="btn ${S.status.hello ? '' : 'primary'}" type="submit">Unlock with password</button></form>
  </div></section></div>`;
}

function welcome() {
  const st = S.welcomeStep;
  const steps = `<div class="steps" role="img" aria-label="Step ${st} of 4">${[1, 2, 3, 4].map((n) => `<span class="${n <= st ? 'on' : ''}"></span>`).join('')}</div>`;
  let body = '';
  if (st === 1) body = `<div class="mark" style="width:52px;height:52px;border-radius:14px">${ic('key', 26)}</div><h1>Welcome to Alts Keychain</h1><p class="muted" style="margin:0;line-height:1.55">Keep all your League accounts in one place, see their ranks at a glance and log in faster. Everything you save stays on this computer.</p>`;
  if (st === 2 && !S.wOwn) body = `<h1 style="font-size:24px">Invite code</h1><p class="muted" style="margin:0;line-height:1.55">Paste the invite code you got from a friend. Ranks and levels then load through the Alts server, so you don't need your own Riot API key.</p><label class="field">Invite code<input class="input mono" id="wInvite" placeholder="LK-XXXX-XXXX" style="text-transform:uppercase" autocomplete="off"></label><p class="error-text" id="wErr"></p><button class="btn ghost" type="button" data-act="wOwn" style="align-self:flex-start;padding:0;color:var(--accent)">I have my own Riot API key instead</button>`;
  if (st === 2 && S.wOwn) body = `<h1 style="font-size:24px">Riot API key</h1><p class="muted" style="margin:0;line-height:1.55">Sign in at the developer portal, copy the key at the top of the page and paste it here.</p><button class="btn" type="button" data-act="openPortal" style="align-self:flex-start">Open developer portal</button><label class="field">Your API key<input class="input" id="wKey" placeholder="RGAPI-…" autocomplete="off"></label><p class="error-text" id="wErr"></p><p class="muted" style="margin:0;font-size:12px">Development keys expire every 24 hours. You can paste a new one in Settings any time.</p><button class="btn ghost" type="button" data-act="wOwn" style="align-self:flex-start;padding:0;color:var(--accent)">I have an invite code instead</button>`;
  if (st === 3) body = `<h1 style="font-size:24px">Protect your vault</h1><p class="muted" style="margin:0;line-height:1.55">Choose a master password to encrypt your logins and passwords. If you forget it, they can't be recovered, so write it down somewhere safe.</p><label class="field">Master password<input class="input" type="password" id="wPw" placeholder="At least 8 characters"></label><label class="field">Repeat it<input class="input" type="password" id="wPw2"></label><p class="error-text" id="wErr"></p>`;
  if (st === 4) body = `<h1 style="font-size:24px">Add your accounts</h1><p class="muted" style="margin:0;line-height:1.55">Ranks and levels load by themselves.</p>
    <button class="choice" type="button" data-act="wDone" data-v="one"><span class="ic">${ic('plus', 18)}</span><span><b style="display:block;font-weight:600">Add one account</b><span class="muted" style="font-size:13px">Type a Riot ID and its login</span></span></button>
    <button class="choice" type="button" data-act="wDone" data-v="import"><span class="ic">${ic('file', 18)}</span><span><b style="display:block;font-weight:600">Import from a text file</b><span class="muted" style="font-size:13px">Paste your notes, the app finds the accounts</span></span></button>
    <button class="btn ghost" type="button" data-act="wDone" data-v="" style="align-self:flex-start;padding:0;color:var(--accent)">Skip, I'll add them later</button>`;
  const next = { 1: 'Get started', 2: 'Save and check', 3: 'Turn on encryption' }[st];
  return `<div class="center"><section class="panel" aria-label="First launch">${steps}<div class="pad">${body}</div>
    <div style="display:flex;align-items:center;gap:10px;padding:0 28px 24px">${st > 1 ? '<button class="btn" type="button" data-act="wBack">Back</button>' : ''}${st === 2 && S.status.hasKey ? '<button class="btn ghost" type="button" data-act="wNext" data-skip="1">Keep current setup</button>' : ''}${st === 3 ? '<button class="btn ghost" type="button" data-act="wNext" data-skip="1">Skip for now</button>' : ''}
    <button class="icon-btn" type="button" data-act="theme" style="margin-left:auto" aria-label="Switch theme">${ic(themeNow() === 'dark' ? 'sun' : 'moon')}</button>${next ? `<button class="btn primary" type="button" data-act="wNext">${next}</button>` : ''}</div></section></div>`;
}

// ================= actions =================
async function reloadStatus() { S.status = await ipc.invoke('status'); if (S.status.sort && !S.sortLoaded) { S.sort = S.status.sort; S.sortLoaded = true; } }
async function reloadData() { S.accounts = await ipc.invoke('list'); S.groups = await ipc.invoke('groups'); }
async function setSetting0(st) { S.status = st; render(); }
async function setSetting(patch) { S.status = await ipc.invoke('setSettings', patch); render(); }

async function refresh(id, maxAge) {
  if (S.refreshing) return;
  if (!S.status.hasKey) { if (!id) S.banner = 'key'; render(); return; }
  S.refreshing = true;
  S.pending = new Set(S.accounts.filter((a) => (!id || a.id === id) && (!maxAge || !a.cache || !a.cache.updated || Date.now() - a.cache.updated > maxAge)).map((a) => a.id));
  S.progress = { done: 0, total: S.pending.size };
  render();
  let res;
  try { res = await ipc.invoke('refresh', id, maxAge); } catch { res = { errors: [], kind: 'offline' }; }
  S.refreshing = false; S.pending = new Set(); S.progress = null;
  S.banner = res && res.kind ? res.kind : (S.banner === 'key' || S.banner === 'invite' || S.banner === 'offline' || S.banner === 'service' ? null : S.banner);
  if (res && !res.kind && res.errors && res.errors.some((e) => e.kind === 'rate')) S.banner = 'rate';
  await reloadData();
  render();
}

async function copy(id, field) {
  const a = acc(id);
  const r = await ipc.invoke('copyField', id, field);
  if (r && r.error) { toast(esc(r.error)); return; }
  toast(`${field === 'password' ? 'Password' : field === 'email' ? 'Email' : 'Login'} copied${streamer() ? '' : ' for <b>' + esc(nameOf(a)) + '</b>'}. Clears in ${S.status.clipSeconds} s.`);
  a.lastUsed = Date.now(); S.status.activeId = id;
  if (!S.detail && !S.modal) renderKeep();
}
// re-render while keeping the page scroll position
function renderKeep() { const y = window.scrollY; render(); window.scrollTo(0, y); }

async function patch(id, p) {
  const upd = await ipc.invoke('patch', id, p);
  if (upd) S.accounts = S.accounts.map((a) => (a.id === id ? upd : a));
  return upd;
}

function openAdd(tab = 'one') {
  S.sw = null;
  S.modal = { type: 'add', tab, riotId: '', region: S.region !== 'all' ? S.region : (S.accounts[0] && S.accounts[0].region) || 'euw', lookup: null, cat: 'smurf', groups: [], pin: false, user: '', pass: '', email: '', importText: '', found: [], importRegion: (S.accounts[0] && S.accounts[0].region) || 'euw' };
  render();
  const f = $('#aId') || $('#impText'); if (f) f.focus();
}

let lookupTimer = null, lookupSeq = 0;
function scheduleLookup() {
  const m = S.modal;
  clearTimeout(lookupTimer);
  if (!/.+#.+/.test(m.riotId.trim())) { m.lookup = null; updatePreview(); return; }
  if (!S.status.hasKey) { m.lookup = { state: 'err', error: S.status.mode === 'server' ? 'Add your invite code in Settings, Riot data, to check accounts' : 'Add a Riot API key in Settings to check accounts', kind: 'key' }; updatePreview(); return; }
  m.lookup = { state: 'loading' }; updatePreview();
  const seq = ++lookupSeq;
  lookupTimer = setTimeout(async () => {
    const r = await ipc.invoke('lookup', m.riotId, m.region);
    if (seq !== lookupSeq || S.modal !== m) return;
    m.lookup = r.ok ? { state: 'ok', preview: r.preview } : { state: 'err', error: r.error, kind: r.kind, suggestRegion: r.suggestRegion };
    updatePreview();
  }, 600);
}
function updatePreview() { const el = $('#aPrev'); if (!el) return; const tmp = document.createElement('div'); tmp.innerHTML = addModal(S.modal); el.innerHTML = tmp.querySelector('#aPrev').innerHTML; }

// import: understands "Account: Name#TAG", "Username:", "Password:", "Email:" blocks and bare Name#TAG lines
function parseImport(text, defRegion) {
  const out = [];
  let cur = null;
  const push = () => { if (cur && cur.riotId) out.push(cur); cur = null; };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([^:=]{1,30})\s*[:=]\s*(.+)$/);
    const k = m ? m[1].toLowerCase() : '', v = m ? m[2].trim() : line;
    if ((m && /(account|riot ?id|nick|summoner|ign|name)/.test(k) && v.includes('#')) || (!m && /^[^#\s][^#]{1,30}#[\p{L}\p{N}]{2,6}$/u.test(line))) {
      push();
      const tag = v.split('#').pop().toLowerCase();
      cur = { riotId: v, region: REG[tag] ? tag : defRegion, username: '', password: '', email: '' };
    } else if (cur && m) {
      if (/(user|login)/.test(k)) cur.username = v;
      else if (/(pass|heslo|pw)/.test(k)) cur.password = v;
      else if (/(mail)/.test(k)) cur.email = v;
    }
  }
  push();
  return out;
}

async function helloUnlock() {
  const r = await ipc.invoke('helloUnlock');
  if (r.error) { if ($('#lockErr')) $('#lockErr').textContent = r.error; return; }
  await afterUnlock();
}
async function afterUnlock() {
  await reloadStatus(); await reloadData(); if (!S.base) S.base = (await ipc.invoke('baseline')) || snapshot(); S.lastActivity = Date.now(); render(); startTimers();
}
function lockNow() { ipc.invoke('lock').then(async () => { await reloadStatus(); S.detail = null; S.modal = null; S.sw = null; S.accounts = []; render(); }); }

// ---------- click handling ----------
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) { if (S.goalMenu || S.gMenu) { S.goalMenu = null; S.gMenu = null; renderKeep(); } return; }
  const act = el.dataset.act, id = el.dataset.id, v = el.dataset.v;
  if (S.goalMenu && act !== 'goalMenu') S.goalMenu = null;
  if (S.gMenu && act !== 'gMenu') S.gMenu = null;
  // buttons inside a card should not also open the card
  if (act !== 'open' && el.closest('[data-act="open"]') && el !== el.closest('[data-act="open"]')) e.stopPropagation();
  switch (act) {
    case 'view': S.view = v; if (el.dataset.scat) S.scat = el.dataset.scat; S.detail = null; render(); window.scrollTo(0, 0); break;
    case 'theme': await setSetting({ theme: themeNow() === 'dark' ? 'light' : 'dark' }); break;
    case 'open': if (e.target.closest('button') && e.target.closest('button') !== el) return; S.sw = null; S.detail = id; S.dtab = 'overview'; S.reveal = false; ipc.invoke('setActive', id); S.status.activeId = id; render(); break;
    case 'closeDrawer': S.detail = null; render(); break;
    case 'dtab': S.dtab = v; render(); break;
    case 'reveal': S.reveal = !S.reveal; render(); break;
    case 'copy': S.sw = null; await copy(id, el.dataset.f); if (S.detail || S.modal) render(); break;
    case 'cat': S.cat = v; render(); break;
    case 'refreshAll': refresh(null, 0); break;
    case 'refreshOne': refresh(id, 0); break;
    case 'add': openAdd(); break;
    case 'hideChanges': S.changesHidden = true; ipc.invoke('markSeen'); render(); break;
    case 'streamerOff': setSetting({ streamer: false }); break;
    case 'closeBanner': S.banner = null; render(); break;
    case 'lockNow': lockNow(); break;
    case 'primary': S.status = await ipc.invoke('setPrimary', S.status.primaryId === id ? null : id); render(); toast(S.status.primaryId ? 'Main account set' : 'Main account removed'); break;
    case 'pin': { const a = acc(id); await patch(id, { pinned: !a.pinned }); render(); break; }
    case 'setCat': await patch(id, { category: v }); render(); break;
    case 'ungroup': { const a = acc(id); await patch(id, { groups: a.groups.filter((g) => g !== el.dataset.g) }); render(); break; }
    case 'untag': { const a = acc(id); await patch(id, { tags: a.tags.filter((t) => t !== el.dataset.t) }); render(); break; }
    case 'clearPen': await patch(id, { penalty: null }); render(); break;
    case 'goal': { const a = acc(id); const g = a.goal; const cur = solo(a); const nextT = cur ? (APEX.includes(cur.tier) ? cur.tier : cur.rank === 'I' ? TIERS[Math.min(9, TIERS.indexOf(cur.tier) + 1)] : cur.tier) : 'GOLD'; const nextD = cur && !APEX.includes(cur.tier) && cur.rank !== 'I' ? DIVS[DIVS.indexOf(cur.rank) + 1] : 'IV'; const d = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10); S.modal = { type: 'goal', id, tier: g && g.kind !== 'reached' ? g.tier : nextT, div: g ? g.div : nextD, deadline: g && daysUntil(g.deadline) >= 0 ? g.deadline : d }; render(); break; }
    case 'goalSave': {
      const a = acc(id); const tier = $('#gTier').value, div = APEX.includes(tier) ? '' : $('#gDiv').value, deadline = $('#gDate').value;
      const target = ladder({ tier, rank: div || 'IV', lp: 0 }), cur = ladder(solo(a)) ?? 0;
      if (!deadline) { $('#gErr').textContent = 'Pick a deadline.'; return; }
      if (target <= cur) { $('#gErr').textContent = 'Pick a rank above the current one.'; return; }
      await patch(id, { goal: { tier, div, deadline, start: cur, created: Date.now() } }); S.modal = null; render(); break;
    }
    case 'goalMenu': S.goalMenu = S.goalMenu === id ? null : id; renderKeep(); break;
    case 'goalRemove': await patch(id, { goal: null }); S.modal = null; render(); break;
    case 'newGoal': { const sel = $('#ngAcc'); if (sel) el.dataset.id = sel.value; const fake = document.createElement('button'); fake.dataset.act = 'goal'; fake.dataset.id = sel.value; document.body.appendChild(fake); fake.click(); fake.remove(); break; }
    case 'askDelete': S.modal = { type: 'confirmDelete', id }; render(); break;
    case 'doDelete': {
      const a = acc(id); const name = nameOf(a);
      const removed = await ipc.invoke('delete', id);
      S.modal = null; S.detail = null; await reloadData(); render();
      toast(`<b>${esc(name)}</b> was deleted`, { action: 'Undo', ms: 10000, onAction: async () => { await ipc.invoke('restore', removed); await reloadData(); render(); toast('Restored'); } });
      break;
    }
    case 'fix': S.modal = { type: 'fix', id }; render(); break;
    case 'useRegion': await patch(id, { region: v }); S.modal = null; render(); refresh(id, 0); break;
    case 'fixSave': await patch(id, { riotId: $('#fixId').value, region: $('#fixReg').value }); S.modal = null; render(); refresh(id, 0); break;
    case 'saveRiot': await patch(id, { riotId: $('#d-riot').value, region: $('#d-region').value }); refresh(id, 0); break;
    case 'closeModal': S.modal = null; render(); break;
    case 'aTab': S.modal.tab = v; render(); break;
    case 'aCat': S.modal.cat = v; render(); break;
    case 'aGroup': { const g = S.modal.groups; S.modal.groups = g.includes(v) ? g.filter((x) => x !== v) : [...g, v]; render(); break; }
    case 'addUseRegion': S.modal.region = v; render(); scheduleLookup(); break;
    case 'addSave': {
      const m = S.modal;
      if (!/.+#.+/.test(m.riotId.trim())) { $('#aErr').textContent = 'A Riot ID looks like Name#TAG.'; return; }
      if (S.accounts.some((a) => a.riotId.toLowerCase() === m.riotId.trim().toLowerCase() && a.region === m.region)) { $('#aErr').textContent = 'This account is already added.'; return; }
      const newId = await ipc.invoke('upsert', { riotId: m.riotId, region: m.region, category: m.cat, groups: m.groups, pinned: m.pin, tags: [], preview: m.lookup && m.lookup.state === 'ok' ? m.lookup.preview : null, priv: { username: m.user, password: m.pass, email: m.email, notes: '' } });
      S.modal = null; await reloadData(); render();
      toast(`Added <b>${esc(m.riotId)}</b>`);
      if (!(m.lookup && m.lookup.state === 'ok')) refresh(newId, 0);
      break;
    }
    case 'impParse': {
      const m = S.modal; m.importText = $('#impText').value; m.importRegion = $('#impReg').value;
      m.found = parseImport(m.importText, m.importRegion).map((f) => ({ ...f, on: true, state: S.accounts.some((a) => a.riotId.toLowerCase() === f.riotId.toLowerCase() && a.region === f.region) ? 'dupe' : 'checking' }));
      m.found.forEach((f) => { if (f.state === 'dupe') f.on = false; });
      if (!m.found.length) { toast('No Riot IDs found. Each account needs a line like Name#TAG.'); }
      render();
      for (const f of m.found.filter((x) => x.state === 'checking')) {
        if (!S.status.hasKey) { f.state = 'unchecked'; f.error = 'Not checked, no API key'; continue; }
        const r = await ipc.invoke('lookup', f.riotId, f.region);
        if (r.ok) { f.state = 'ok'; f.preview = r.preview; }
        else { f.state = 'err'; f.error = r.suggestRegion ? 'Plays on ' + REG[r.suggestRegion] : r.error; if (r.suggestRegion) { f.region = r.suggestRegion; } f.on = !!r.suggestRegion && false; }
        if (S.modal === m) render();
      }
      break;
    }
    case 'impToggle': { const f = S.modal.found[+el.dataset.i]; f.on = el.checked; const sv = S.modal; render(); S.modal = sv; break; }
    case 'impSave': {
      const m = S.modal; let n = 0;
      for (const f of m.found.filter((x) => x.on)) { await ipc.invoke('upsert', { riotId: f.riotId, region: f.region, category: 'smurf', groups: [], pinned: false, tags: [], preview: f.preview || null, priv: { username: f.username, password: f.password, email: f.email, notes: '' } }); n++; }
      S.modal = null; await reloadData(); render(); toast(`Imported ${n} ${n === 1 ? 'account' : 'accounts'}`);
      break;
    }
    case 'newGroup': S.modal = { type: 'group', name: '', color: GCOLORS[S.groups.length % GCOLORS.length], forAcc: id || null }; render(); $('#gName').focus(); break;
    case 'editGroup': { const g = S.groups.find((x) => x.id === v); S.modal = { type: 'group', id: g.id, name: g.name, color: g.color }; render(); break; }
    case 'gColor': S.modal.name = $('#gName').value; S.modal.color = v; render(); break;
    case 'groupSave': {
      const m = S.modal; const name = $('#gName').value.trim();
      if (!name) { $('#gName').focus(); return; }
      const g = await ipc.invoke('groupSave', { id: m.id, name, color: m.color });
      if (m.forAcc) { const a = acc(m.forAcc); await patch(m.forAcc, { groups: [...(a.groups || []), g.id] }); }
      S.modal = null; await reloadData(); S.groupSel = g.id; render(); break;
    }
    case 'groupDelete': await ipc.invoke('groupDelete', v); S.modal = null; await reloadData(); render(); break;
    case 'gsel': S.groupSel = v; render(); break;
    case 'gMenu': S.gMenu = S.gMenu === v ? null : v; renderKeep(); break;
    case 'askGroupDelete': { const g = S.groups.find((x) => x.id === v); S.modal = { type: 'confirmGroupDelete', id: v, name: g ? g.name : '' }; render(); break; }
    case 'scope': S.statsScope = v; render(); break;
    case 'scat': S.scat = v; S.capture = false; render(); if (v === 'security' && S.helloAvail === undefined && S.status.platform === 'win32') { S.helloAvail = null; ipc.invoke('helloStatus').then((h) => { S.helloAvail = h.available; if (S.view === 'settings' && S.scat === 'security') render(); }); } break;
    case 'toggleSet': setSetting({ [el.dataset.k]: !S.status[el.dataset.k] }); break;
    case 'segSet': { const k = el.dataset.k; const num = ['lockMinutes', 'clipSeconds', 'autoRefreshMin'].includes(k); await setSetting({ [k]: num ? Number(v) : v === 'true' ? true : v === 'false' ? false : v }); setupTimers(); break; }
    case 'captureKey': S.capture = !S.capture; render(); break;
    case 'openPortal': ipc.invoke('openPortal'); break;
    case 'openBackups': ipc.invoke('openBackups'); break;
    case 'saveKey': {
      el.disabled = true; el.textContent = 'Checking…';
      const r = await ipc.invoke('checkKey', $('#apiKey').value);
      if (r.error) { el.disabled = false; el.textContent = 'Save and check'; $('#keyErr').textContent = r.error; return; }
      S.status = r.status; S.banner = null; render(); toast('API key saved'); refresh(null, 0); break;
    }
    case 'hello': {
      const on = !S.status.hello; el.disabled = true;
      const r = await ipc.invoke(on ? 'helloEnable' : 'helloDisable');
      await reloadStatus(); render();
      if (r.error && $('#helloErr')) $('#helloErr').textContent = r.error; else if (!r.error) toast(on ? 'Windows Hello is on' : 'Windows Hello is off');
      break;
    }
    case 'helloUnlock': await helloUnlock(); break;
    case 'miniOpen': ipc.invoke('miniOpen'); break;
    case 'installUpdate': ipc.invoke('installUpdate'); break;
    case 'wOwn': S.wOwn = !S.wOwn; render(); break;
    case 'setMode': await setSetting0(await ipc.invoke('setMode', v)); refresh(null, 0); break;
    case 'saveInvite': {
      el.disabled = true; el.textContent = 'Checking…';
      const r = await ipc.invoke('checkInvite', $('#inviteCode').value);
      if (r.error) { el.disabled = false; el.textContent = 'Save and check'; $('#invErr').textContent = r.error; return; }
      S.status = r.status; S.banner = null; render(); toast('Invite code saved'); refresh(null, 0); break;
    }
    case 'pw': S.modal = { type: 'password', mode: v }; render(); $('#pwOld, #pwNew') && ($('#pwOld') || $('#pwNew')).focus(); break;
    case 'pwSubmit': {
      const m = S.modal, pw = $('#pwNew').value, err = $('#pwErr');
      let r;
      if (m.mode === 'enable') r = await ipc.invoke('vaultEnable', pw);
      if (m.mode === 'change') r = await ipc.invoke('changeMaster', $('#pwOld').value, pw);
      if (m.mode === 'export') r = await ipc.invoke('backupExport', pw);
      if (m.mode === 'import') r = await ipc.invoke('backupImport', pw);
      if (r && r.error) { err.textContent = r.error; return; }
      if (r && r.canceled) return;
      S.modal = null; await reloadStatus(); await reloadData(); render(); setupTimers();
      toast({ enable: 'Encryption is on', change: 'Master password changed', export: 'Backup saved', import: 'Imported ' + (r && r.count) + ' accounts' }[m.mode]);
      break;
    }
    case 'vaultOff': if (confirm('Turn off encryption? Logins and passwords will be stored as plain text on this computer.')) { await ipc.invoke('vaultDisable'); await reloadStatus(); render(); } break;
    case 'whatsNew': S.modal = { type: 'whatsnew' }; render(); break;
    case 'closeWhatsNew': S.modal = null; ipc.invoke('seenVersion'); render(); break;
    case 'closeSw': S.sw = null; render(); break;
    case 'swPick': runSw(+el.dataset.i, e); break;
    case 'wNext': welcomeNext(!!el.dataset.skip); break;
    case 'wBack': S.welcomeStep = Math.max(1, S.welcomeStep - 1); render(); break;
    case 'wDone': await ipc.invoke('setWelcomeDone'); await reloadStatus(); await reloadData(); S.base = (await ipc.invoke('baseline')) || snapshot(); if (v) openAdd(v); else render(); startTimers(); break;
  }
});

async function welcomeNext(skip) {
  const st = S.welcomeStep;
  if (st === 2 && !skip) {
    const r = S.wOwn ? await ipc.invoke('checkKey', $('#wKey').value) : await ipc.invoke('checkInvite', $('#wInvite').value);
    if (r.error) { $('#wErr').textContent = r.error; return; }
    S.status = r.status;
  }
  if (st === 3 && !skip) {
    const a = $('#wPw').value, b = $('#wPw2').value;
    if (a.length < 8) { $('#wErr').textContent = 'Use at least 8 characters.'; return; }
    if (a !== b) { $('#wErr').textContent = 'The two passwords are different.'; return; }
    await ipc.invoke('vaultEnable', a); await reloadStatus();
  }
  S.welcomeStep = st === 2 && false ? 3 : st + 1;
  if (S.welcomeStep === 3 && S.status.vault) S.welcomeStep = 4;
  render();
}

function runSw(i, e) {
  const it = swItems()[i];
  if (!it) return;
  if (it.type === 'act') { S.sw = null; it.run(); render(); return; }
  if (e && e.type === 'click') { S.sw.sel = i; render(); return; }
}

// ---------- inputs ----------
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'gq') { S.gq = t.value; const y = window.scrollY; render(); window.scrollTo(0, y); const i = $('#gq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); return; }
  if (t.id === 'ngQ') { S.ngQ = t.value; $('#ngList').innerHTML = goalPickRows(S.accounts.filter((a) => !a.goal)); return; }
  if (t.id === 'q') { S.q = t.value; $('#grid').innerHTML = gridHtml(visible()); return; }
  if (t.id === 'swq') { S.sw.q = t.value; S.sw.sel = 0; const list = $('.switcher .list'); const tmp = document.createElement('div'); tmp.innerHTML = switcher(); list.innerHTML = tmp.querySelector('.list').innerHTML; return; }
  if (S.modal && S.modal.type === 'add') {
    const m = S.modal;
    if (t.id === 'aId') { m.riotId = t.value; scheduleLookup(); }
    if (t.id === 'aUser') m.user = t.value;
    if (t.id === 'aPass') m.pass = t.value;
    if (t.id === 'aMail') m.email = t.value;
    if (t.id === 'aPin') m.pin = t.checked;
    if (t.id === 'impText') m.importText = t.value;
  }
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'fRegion') { S.region = t.value; render(); }
  if (t.id === 'fSort') { S.sort = t.value; ipc.invoke('setSettings', { sort: t.value }); render(); }
  if (t.id === 'aReg') { S.modal.region = t.value; scheduleLookup(); }
  if (t.id === 'aPin') S.modal.pin = t.checked;
  if (t.id === 'impReg') S.modal.importRegion = t.value;
  if (t.id === 'gTier') { const d = $('#gDiv'); d.disabled = APEX.includes(t.value); }
  if (t.id === 'penDate') { await patch(t.dataset.id, { penalty: t.value ? { until: t.value } : null }); render(); }
  if (t.id === 'splitEnd') setSetting({ splitEnd: t.value });
  if (t.id === 'addGroup') {
    if (t.value === '__new') { S.modal = { type: 'group', name: '', color: GCOLORS[S.groups.length % GCOLORS.length], forAcc: t.dataset.id }; render(); return; }
    if (t.value) { const a = acc(t.dataset.id); await patch(a.id, { groups: [...(a.groups || []), t.value] }); render(); }
  }
  if (t.id === 'gAddAcc' && t.value) { const a = acc(t.value); await patch(a.id, { groups: [...(a.groups || []), S.groupSel] }); render(); }
  if (t.dataset.pf) { await patch(t.dataset.id, { priv: { [t.dataset.pf]: t.value } }); toast('Saved'); }
});
document.addEventListener('keydown', async (e) => {
  S.lastActivity = Date.now();
  const t = e.target;
  if (S.capture) {
    e.preventDefault();
    if (e.key === 'Escape') { S.capture = false; render(); return; }
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    const mods = [e.ctrlKey ? 'CommandOrControl' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : ''].filter(Boolean);
    if (!mods.length) return;
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    S.capture = false; await setSetting({ hotkey: [...mods, k].join('+') }); return;
  }
  if (t.id === 'newTag' && e.key === 'Enter' && t.value.trim()) { const a = acc(t.dataset.id); await patch(a.id, { tags: [...new Set([...(a.tags || []), t.value.trim()])] }); render(); $('#newTag') && $('#newTag').focus(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.status.unlocked && S.status.welcomeDone) { e.preventDefault(); S.sw = S.sw ? null : { q: '', sel: 0 }; render(); return; }
  if (S.sw) {
    const items = swItems();
    if (e.key === 'ArrowDown') { e.preventDefault(); S.sw.sel = Math.min(items.length - 1, S.sw.sel + 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); S.sw.sel = Math.max(0, S.sw.sel - 1); render(); }
    else if (e.key === 'Escape') { S.sw = null; render(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[S.sw.sel]; if (!it) return;
      if (it.type === 'act') { runSw(S.sw.sel); return; }
      const id = it.a.id; S.sw = null;
      if (e.ctrlKey) { S.detail = id; S.dtab = 'overview'; render(); return; }
      render(); await copy(id, e.shiftKey ? 'username' : 'password');
    }
    return;
  }
  if (e.key === 'Escape') { if (S.modal) { if (S.modal.type === 'whatsnew') ipc.invoke('seenVersion'); S.modal = null; render(); } else if (S.detail) { S.detail = null; render(); } return; }
  if (e.key === 'Enter' && t.matches('[role="button"][data-act="open"]')) { t.click(); }
});
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'lockForm') return;
  e.preventDefault();
  const ok = await ipc.invoke('unlock', $('#lockpw').value);
  if (!ok) { $('#lockErr').textContent = 'Wrong password.'; $('#lockpw').select(); return; }
  await afterUnlock();
});
['mousemove', 'mousedown', 'wheel'].forEach((ev) => document.addEventListener(ev, () => { S.lastActivity = Date.now(); }, { passive: true }));

// drag cards to arrange them, like moving apps on a phone home screen.
// Works whenever no filter or search is active. The order is remembered as "My order".
const canDrag = () => S.cat === 'all' && S.region === 'all' && !S.q.trim();
const EASE = 'cubic-bezier(.2,.8,.2,1)';
// slides every card from where it was to where it is now
function flip(cards, before) {
  cards.forEach((el) => {
    const a = before.get(el); if (!a) return;
    const b = el.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) return;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => { el.style.transition = `transform 260ms ${EASE}`; el.style.transform = ''; });
  });
}
document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || !canDrag() || S.view !== 'accounts') return;
  const card = e.target.closest('#grid .acc[data-drag]');
  if (!card || e.target.closest('button, input, select, a')) return;
  drag = { card, id: card.dataset.id, x0: e.clientX, y0: e.clientY, started: false, pid: e.pointerId };
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.started) {
    if (Math.hypot(dx, dy) < 6) return;
    // lift: a floating copy follows the pointer, the real card stays as an empty slot
    const r = drag.card.getBoundingClientRect();
    const ghost = drag.card.cloneNode(true);
    ghost.classList.add('ghost');
    Object.assign(ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0, zIndex: 60, pointerEvents: 'none', transition: `transform 180ms ${EASE}, box-shadow 180ms ${EASE}` });
    document.body.appendChild(ghost);
    drag.card.classList.add('slot');
    drag.ghost = ghost; drag.ox = drag.x0 - r.left; drag.oy = drag.y0 - r.top; drag.started = true;
    document.body.classList.add('dragging-cards');
    requestAnimationFrame(() => { ghost.classList.add('lifted'); });
  }
  drag.lx = e.clientX; drag.ly = e.clientY;
  drag.ghost.style.left = (e.clientX - drag.ox) + 'px';
  drag.ghost.style.top = (e.clientY - drag.oy) + 'px';
  // scroll the page when the pointer gets close to the top or bottom edge
  const edge = 70;
  if (e.clientY < edge) window.scrollBy(0, -12); else if (e.clientY > innerHeight - edge) window.scrollBy(0, 12);
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const over = under && under.closest('#grid .acc');
  if (!over || over === drag.card) return;
  const grid = $('#grid');
  if (!grid || !grid.contains(drag.card)) return;
  const cards = [...grid.querySelectorAll('.acc')];
  const r = over.getBoundingClientRect();
  const after = e.clientX > r.left + r.width / 2;
  const ref = after ? over.nextElementSibling : over;
  if (ref === drag.card || ref === drag.card.nextElementSibling) return;
  const before = new Map(cards.map((el) => [el, el.getBoundingClientRect()]));
  grid.insertBefore(drag.card, ref);
  flip(cards.filter((el) => el !== drag.card), before);
});
async function endDrag() {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.started) return;
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  document.body.classList.remove('dragging-cards');
  // glide into the empty slot, then put the real card back
  const r = d.card.getBoundingClientRect();
  d.ghost.classList.remove('lifted');
  d.ghost.style.transition = `left 240ms ${EASE}, top 240ms ${EASE}, transform 240ms ${EASE}, box-shadow 240ms ${EASE}`;
  d.ghost.style.left = r.left + 'px'; d.ghost.style.top = r.top + 'px';
  await new Promise((res) => setTimeout(res, 250));
  d.ghost.remove(); d.card.classList.remove('slot');
  const ids = [...new Set([...document.querySelectorAll('#grid .acc')].map((x) => x.dataset.id))].filter((id) => acc(id));
  const order = [...ids, ...S.accounts.filter((a) => !ids.includes(a.id)).map((a) => a.id)];
  const redraw = () => { if (S.renderLater) { S.renderLater = false; render(); } };
  if (order.length !== S.accounts.length) { redraw(); return; }
  if (order.join() === S.accounts.map((a) => a.id).join() && S.sort === 'custom') { redraw(); return; }
  S.accounts = order.map((id) => acc(id)).filter(Boolean);
  if (S.sort !== 'custom') { S.sort = 'custom'; ipc.invoke('setSettings', { sort: 'custom' }); const sel = $('#fSort'); if (sel) sel.value = 'custom'; }
  await ipc.invoke('reorder', order);
  redraw();
}
document.addEventListener('pointerup', endDrag);

// ---------- Groups page: drag accounts into groups ----------
// from "All accounts": adds the account (it can be in several groups);
// from one group to another: moves it; from a group back to the list: takes it out
let gdrag = null;
document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || S.view !== 'groups') return;
  const r = e.target.closest('[data-gdrag]');
  if (!r || e.target.closest('button, input, a')) return;
  gdrag = { row: r, id: r.dataset.gdrag, from: r.dataset.from || null, x0: e.clientX, y0: e.clientY, started: false };
});
function gTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && (el.closest('.gcard') || el.closest('.glib'));
}
document.addEventListener('pointermove', (e) => {
  if (!gdrag) return;
  if (!gdrag.started) {
    if (Math.hypot(e.clientX - gdrag.x0, e.clientY - gdrag.y0) < 6) return;
    const r = gdrag.row.getBoundingClientRect();
    const ghost = gdrag.row.cloneNode(true);
    ghost.classList.add('gghost');
    Object.assign(ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', zIndex: 60, pointerEvents: 'none' });
    document.body.appendChild(ghost);
    requestAnimationFrame(() => ghost.classList.add('lifted'));
    if (gdrag.from) gdrag.row.classList.add('slot');
    gdrag.ghost = ghost; gdrag.ox = gdrag.x0 - r.left; gdrag.oy = gdrag.y0 - r.top; gdrag.started = true;
    document.body.classList.add('dragging-cards');
  }
  gdrag.ghost.style.left = (e.clientX - gdrag.ox) + 'px';
  gdrag.ghost.style.top = (e.clientY - gdrag.oy) + 'px';
  if (e.clientY < 70) window.scrollBy(0, -12); else if (e.clientY > innerHeight - 70) window.scrollBy(0, 12);
  const t = gTarget(e.clientX, e.clientY);
  document.querySelectorAll('.gcard.drop, .glib.drop').forEach((x) => { if (x !== t) x.classList.remove('drop'); });
  if (!t) return;
  const ok = t.classList.contains('gcard') ? t.dataset.g !== gdrag.from : !!gdrag.from;
  t.classList.toggle('drop', ok);
});
async function endGDrag(e) {
  if (!gdrag) return;
  const d = gdrag; gdrag = null;
  if (!d.started) return;
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  document.body.classList.remove('dragging-cards');
  const t = e && e.clientX != null ? gTarget(e.clientX, e.clientY) : null;
  document.querySelectorAll('.drop').forEach((x) => x.classList.remove('drop'));
  const a = acc(d.id);
  let groups = [...((a && a.groups) || [])];
  let msg = '';
  if (t && t.classList.contains('gcard') && t.dataset.g !== d.from) {
    const g = S.groups.find((x) => x.id === t.dataset.g);
    if (groups.includes(t.dataset.g) && !d.from) msg = `${esc(nameOf(a))} is already in ${esc(g.name)}`;
    else { if (d.from) groups = groups.filter((x) => x !== d.from); if (!groups.includes(t.dataset.g)) groups.push(t.dataset.g); msg = `${d.from ? 'Moved' : 'Added'} to ${esc(g.name)}`; }
  } else if (t && t.classList.contains('glib') && d.from) {
    groups = groups.filter((x) => x !== d.from); msg = 'Removed from the group';
  }
  // the lifted row fades away, then the page shows the new state
  d.ghost.classList.remove('lifted'); d.ghost.classList.add('drop-out');
  setTimeout(() => d.ghost.remove(), 180);
  d.row.classList.remove('slot');
  if (a && groups.join() !== (a.groups || []).join()) { await patch(a.id, { groups }); }
  render();
  if (msg) toast(msg);
}
document.addEventListener('pointerup', endGDrag);
document.addEventListener('pointercancel', () => endGDrag(null));
document.addEventListener('pointercancel', endDrag);
// a drag should not also open the account
document.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

// events from the main process
ipc.on('progress', (p) => {
  if (!S.refreshing) return;
  S.progress = p;
  // each card updates as soon as its account is done
  if (p.account) {
    S.accounts = S.accounts.map((a) => (a.id === p.account.id ? p.account : a));
    S.pending.delete(p.account.id);
    const card = document.querySelector(`#grid .acc[data-id="${p.account.id}"]`);
    if (card && S.view === 'accounts' && !S.sw && !(drag && drag.started)) { const tmp = document.createElement('div'); tmp.innerHTML = cardHtml(p.account); card.replaceWith(tmp.firstElementChild); }
  }
  const bar = $('footer.status');
  if (bar && S.view === 'accounts') { const tmp = document.createElement('div'); tmp.innerHTML = statusBar(); bar.replaceWith(tmp.firstElementChild); }
});
ipc.on('copied', async () => { await reloadData(); if (!S.detail && !S.modal && !S.sw && S.status.unlocked) renderKeep(); });
ipc.on('active', (id) => { S.status.activeId = id; });
ipc.on('update', (u) => { S.update = u.version; if (S.view === 'accounts' && !S.modal) renderKeep(); });
ipc.invoke('updateStatus').then((u) => { if (u && u.ready) S.update = u.ready; });
// match history arrives in the background, one account at a time
ipc.on('account', (a) => {
  if (!S.accounts.some((x) => x.id === a.id)) return;
  S.accounts = S.accounts.map((x) => (x.id === a.id ? a : x));
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (S.detail === a.id && S.dtab === 'overview' && !typing && !S.modal) { renderKeep(); return; }
  const card = document.querySelector(`#grid .acc[data-id="${a.id}"]`);
  if (card && S.view === 'accounts' && !S.sw && !(drag && drag.started)) { const tmp = document.createElement('div'); tmp.innerHTML = cardHtml(a); card.replaceWith(tmp.firstElementChild); }
});
// locked from the tray icon
ipc.on('locked', async () => { await reloadStatus(); if (S.status.vault && !S.status.unlocked) { S.detail = null; S.modal = null; S.sw = null; S.accounts = []; render(); } });

// ---------- timers: auto refresh and auto lock ----------
let refreshTimer = null, lockTimer = null;
function setupTimers() {
  clearInterval(refreshTimer); clearInterval(lockTimer);
  if (S.status.autoRefreshMin > 0) refreshTimer = setInterval(() => { if (S.status.unlocked) refresh(null, S.status.autoRefreshMin * 30000); }, S.status.autoRefreshMin * 60000);
  lockTimer = setInterval(() => {
    if (S.status.vault && S.status.unlocked && S.status.lockMinutes > 0 && Date.now() - S.lastActivity > S.status.lockMinutes * 60000) lockNow();
  }, 10000);
}
function startTimers() {
  setupTimers();
  if (S.status.showWhatsNew && !S.modal) S.modal = { type: 'whatsnew' };
  render();
  refresh(null, 15 * 60000);
}

matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (S.status.theme === 'system') render(); });

// ---------- start ----------
(async () => {
  await reloadStatus();
  if (S.status.unlocked && S.status.welcomeDone) { await reloadData(); S.base = (await ipc.invoke('baseline')) || snapshot(); render(); startTimers(); }
  else render();
})();
