/* Alts: app-styled dropdowns and date picker.
   Every <select> and <input type="date"> on the page is replaced by a button that opens
   a small animated menu or calendar. The original element stays (hidden) and keeps the value,
   so the rest of the app reads and listens to it as before. */
'use strict';
(() => {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const CHEV = '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const CAL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
  const ARROW = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d === 'l' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'}"/></svg>`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const nice = (s) => { const d = parse(s); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear() : ''; };

  let open = null; // { el, btn, pop, kind }

  // ---------- turning native controls into app controls ----------
  function enhance() {
    document.querySelectorAll('select:not([data-enh])').forEach(makeSelect);
    document.querySelectorAll('input[type="date"]:not([data-enh])').forEach(makeDate);
    sync();
  }
  function hideNative(el) {
    el.dataset.enh = '1';
    el.tabIndex = -1;
    el.setAttribute('aria-hidden', 'true');
    el.classList.add('native-hidden');
  }
  function makeSelect(sel) {
    hideNative(sel);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dd ' + [...sel.classList].filter((c) => c !== 'native-hidden').join(' ');
    b.style.cssText = sel.style.cssText;
    b.setAttribute('aria-haspopup', 'listbox');
    b.setAttribute('aria-expanded', 'false');
    const label = sel.getAttribute('aria-label') || (sel.closest('label') && sel.closest('label').firstChild && sel.closest('label').firstChild.textContent.trim()) || '';
    if (label) b.setAttribute('aria-label', label);
    b._native = sel; sel._btn = b;
    sel.after(b);
  }
  function makeDate(inp) {
    hideNative(inp);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dd date ' + [...inp.classList].filter((c) => c !== 'native-hidden').join(' ');
    b.style.cssText = inp.style.cssText;
    b.setAttribute('aria-haspopup', 'dialog');
    if (inp.getAttribute('aria-label')) b.setAttribute('aria-label', inp.getAttribute('aria-label'));
    b._native = inp; inp._btn = b;
    inp.after(b);
  }
  // keeps every button showing its control's current value and state
  function sync() {
    document.querySelectorAll('button.dd').forEach((b) => {
      const n = b._native;
      if (!n || !n.isConnected) return;
      b.disabled = n.disabled;
      if (n.tagName === 'SELECT') {
        const o = n.options[n.selectedIndex];
        const html = `<span class="v">${esc(o ? o.text : '')}</span>${CHEV}`;
        if (b._html !== html) { b._html = html; b.innerHTML = html; }
      } else {
        const html = `${CAL}<span class="v ${n.value ? '' : 'ph'}">${n.value ? esc(nice(n.value)) : 'Pick a date'}</span>`;
        if (b._html !== html) { b._html = html; b.innerHTML = html; }
      }
    });
  }
  function commit(n, value) {
    if (n.value === value) return;
    n.value = value;
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
  }

  // ---------- popover ----------
  function place(pop, btn) {
    const r = btn.getBoundingClientRect();
    const w = Math.max(r.width, pop.offsetWidth);
    let left = Math.min(r.left, innerWidth - w - 8);
    let top = r.bottom + 6;
    const up = top + pop.offsetHeight > innerHeight - 8 && r.top - pop.offsetHeight - 6 > 8;
    if (up) top = r.top - pop.offsetHeight - 6;
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = top + 'px';
    pop.style.minWidth = r.width + 'px';
    pop.style.transformOrigin = up ? 'bottom left' : 'top left';
  }
  function show(btn, pop, kind) {
    close(true);
    document.body.appendChild(pop);
    place(pop, btn);
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('open');
    open = { btn, pop, kind, el: btn._native };
    requestAnimationFrame(() => pop.classList.add('in'));
  }
  function close(now) {
    if (!open) return;
    const { btn, pop } = open;
    open = null;
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('open');
    if (now) { pop.remove(); return; }
    pop.classList.remove('in');
    pop.classList.add('out');
    setTimeout(() => pop.remove(), 140);
    btn.focus({ preventScroll: true });
  }

  // ---------- dropdown menu ----------
  function openMenu(btn) {
    const sel = btn._native;
    const pop = document.createElement('div');
    pop.className = 'pop menu';
    pop.setAttribute('role', 'listbox');
    pop.innerHTML = [...sel.options].map((o, i) => `<div class="opt ${o.selected ? 'sel' : ''} ${o.disabled ? 'dis' : ''}" role="option" aria-selected="${o.selected}" data-i="${i}"><span>${esc(o.text)}</span>${o.selected ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>' : ''}</div>`).join('');
    show(btn, pop, 'menu');
    open.hi = Math.max(0, sel.selectedIndex);
    hilite();
    const cur = pop.querySelector('.opt.sel');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  function hilite() {
    if (!open || open.kind !== 'menu') return;
    open.pop.querySelectorAll('.opt').forEach((o, i) => o.classList.toggle('hi', i === open.hi));
    const h = open.pop.querySelector('.opt.hi'); if (h) h.scrollIntoView({ block: 'nearest' });
  }
  function pick(i) {
    const sel = open.el, o = sel.options[i];
    if (!o || o.disabled) return;
    close();
    commit(sel, o.value);
  }

  // ---------- calendar ----------
  function openCal(btn) {
    const inp = btn._native;
    const cur = parse(inp.value) || parse(inp.min) || new Date();
    const pop = document.createElement('div');
    pop.className = 'pop cal';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Choose a date');
    show(btn, pop, 'cal');
    open.month = new Date(cur.getFullYear(), cur.getMonth(), 1);
    open.focus = cur;
    drawCal();
    place(pop, btn);
  }
  function drawCal() {
    const { pop, el, month } = open;
    const min = parse(el.min), max = parse(el.max), val = el.value, today = iso(new Date());
    const first = (month.getDay() + 6) % 7; // Monday first
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - first);
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const k = iso(d);
      const off = (min && d < min) || (max && d > max);
      const cls = ['day', d.getMonth() !== month.getMonth() ? 'other' : '', k === today ? 'today' : '', k === val ? 'sel' : '', off ? 'dis' : '', open.focus && k === iso(open.focus) ? 'hi' : ''].join(' ');
      cells += `<button type="button" class="${cls}" data-d="${k}" ${off ? 'disabled' : ''} aria-label="${esc(nice(k))}" aria-pressed="${k === val}">${d.getDate()}</button>`;
    }
    pop.innerHTML = `<div class="cal-h"><button type="button" class="nav" data-m="-1" aria-label="Previous month">${ARROW('l')}</button><b>${MONTHS[month.getMonth()]} ${month.getFullYear()}</b><button type="button" class="nav" data-m="1" aria-label="Next month">${ARROW('r')}</button></div>
      <div class="cal-w">${DAYS.map((d) => `<span>${d}</span>`).join('')}</div><div class="cal-g">${cells}</div>
      <div class="cal-f"><button type="button" class="lnk" data-clear>Clear</button><button type="button" class="lnk" data-today>Today</button></div>`;
  }
  function moveMonth(n) {
    open.month = new Date(open.month.getFullYear(), open.month.getMonth() + n, 1);
    const g = open.pop.querySelector('.cal-g');
    drawCal();
    const ng = open.pop.querySelector('.cal-g');
    ng.classList.add(n > 0 ? 'from-r' : 'from-l');
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button.dd');
    if (b) {
      e.stopPropagation();
      if (open && open.btn === b) { close(); return; }
      if (b._native.tagName === 'SELECT') openMenu(b); else openCal(b);
      return;
    }
    if (!open) return;
    if (!open.pop.contains(e.target)) { close(); return; }
    e.stopPropagation();
    if (open.kind === 'menu') { const o = e.target.closest('.opt'); if (o) pick(+o.dataset.i); return; }
    const nav = e.target.closest('[data-m]'); if (nav) { moveMonth(+nav.dataset.m); return; }
    const day = e.target.closest('[data-d]'); if (day && !day.disabled) { const inp = open.el; close(); commit(inp, day.dataset.d); return; }
    if (e.target.closest('[data-clear]')) { const inp = open.el; close(); commit(inp, ''); return; }
    if (e.target.closest('[data-today]')) {
      const t = iso(new Date()), inp = open.el, min = parse(inp.min);
      if (min && new Date() < min) { open.month = new Date(min.getFullYear(), min.getMonth(), 1); drawCal(); return; }
      close(); commit(inp, t);
    }
  }, true);
  document.addEventListener('keydown', (e) => {
    const b = e.target.closest && e.target.closest('button.dd');
    if (!open && b && ['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); b.click(); return; }
    if (!open) return;
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); close(); return; }
    if (open.kind === 'menu') {
      const n = open.el.options.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); open.hi = Math.min(n - 1, open.hi + 1); hilite(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); open.hi = Math.max(0, open.hi - 1); hilite(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(open.hi); }
      else if (e.key.length === 1) { // jump to the first option starting with the typed letter
        const i = [...open.el.options].findIndex((o, j) => j > open.hi && o.text.toLowerCase().startsWith(e.key.toLowerCase()));
        const k = i >= 0 ? i : [...open.el.options].findIndex((o) => o.text.toLowerCase().startsWith(e.key.toLowerCase()));
        if (k >= 0) { open.hi = k; hilite(); }
      }
      return;
    }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      const f = open.focus || new Date();
      open.focus = new Date(f.getFullYear(), f.getMonth(), f.getDate() + step);
      if (open.focus.getMonth() !== open.month.getMonth() || open.focus.getFullYear() !== open.month.getFullYear()) open.month = new Date(open.focus.getFullYear(), open.focus.getMonth(), 1);
      drawCal();
    } else if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); moveMonth(e.key === 'PageUp' ? -1 : 1); }
    else if (e.key === 'Enter') { e.preventDefault(); const k = iso(open.focus); const d = open.pop.querySelector(`[data-d="${k}"]`); if (d && !d.disabled) { const inp = open.el; close(); commit(inp, k); } }
  }, true);
  window.addEventListener('resize', () => close(true));
  window.addEventListener('scroll', (e) => { if (open && !open.pop.contains(e.target)) close(true); }, true);

  // new controls appear whenever the app redraws; turn them into app controls right away
  let queued = false;
  new MutationObserver(() => {
    if (open && !open.btn.isConnected) close(true);
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; enhance(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  // values set by the app itself (for example when a dialog opens) show up too
  document.addEventListener('change', () => queueMicrotask(sync));
  enhance();
})();
