const { app, BrowserWindow, ipcMain, dialog, clipboard, shell, globalShortcut, Notification, nativeTheme, Tray, Menu, nativeImage, safeStorage, screen } = require('electron');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// the data folder stays the same for "npm start" and for the installed app
app.setPath('userData', path.join(app.getPath('appData'), 'lol-manager'));

const APP_VERSION = require('./package.json').version;
const DEFAULTS = {
  apiKey: '', vault: null, autoRefreshMin: 60, lockMinutes: 15, welcomeDone: false,
  theme: 'dark', showRecent: true, showPinned: true, showChanges: true,
  streamer: false, clipSeconds: 30, hotkey: 'CommandOrControl+Alt+C', splitEnd: '',
  lastSeenVersion: '', mode: '', inviteCode: '', closeToTray: true, startWithWindows: false, trayHintShown: false, helloKey: '', sort: 'rank', miniDocked: true, miniAuto: false, miniBounds: null,
};
// the Alts server forwards Riot requests for friends with an invite code, so they need no API key
const SERVER_URL = 'https://mfwmgnzawabxokgrzosa.supabase.co/functions/v1/riot';
let db = { settings: { ...DEFAULTS }, accounts: [], groups: [], activeId: null };
let key = null; // vault key, kept in memory only
let win = null;
const dataFile = () => path.join(app.getPath('userData'), 'data.json');
const bakFile = () => dataFile() + '.bak';
const backupDir = () => path.join(app.getPath('userData'), 'backups');

// older Czech tags -> English
const TAGMAP = { 'Leveluju': 'Leveling', 'Připraven na ranked': 'Ranked ready', 'Nehraný': 'Unplayed', 'Na prodej': null, 'For sale': null, 'Trest': 'Penalty', 'Zabanovaný': 'Banned' };
function migrate() {
  const hadKey = db.settings && db.settings.apiKey && db.settings.welcomeDone === undefined;
  db.settings = { ...DEFAULTS, ...(db.settings || {}) };
  if (hadKey) db.settings.welcomeDone = true; // existing users never see the welcome guide
  if (!db.settings.miniAutoSet) { db.settings.miniAuto = true; db.settings.miniAutoSet = true; }
  // on by default: starts quietly next to the clock when Windows starts
  if (!db.settings.startSet) { db.settings.startWithWindows = true; db.settings.startSet = true; }
  if (!db.settings.mode) db.settings.mode = db.settings.apiKey ? 'own' : 'server';
  db.accounts = db.accounts || [];
  db.groups = db.groups || [];
  db.accounts.forEach(a => {
    // "For sale" is removed: selling accounts is against Riot's rules
    if (a.tags) a.tags = [...new Set(a.tags.map(t => (t in TAGMAP ? TAGMAP[t] : t)).filter(Boolean))];
    a.groups = a.groups || [];
    if (a.pinned === undefined) a.pinned = false;
  });
}
const load = () => {
  for (const f of [dataFile(), bakFile()]) {
    try { db = JSON.parse(fs.readFileSync(f, 'utf8')); migrate(); return; } catch {}
  }
  migrate();
};
// safe write: temp file first, previous version kept as .bak
const save = () => {
  const tmp = dataFile() + '.tmp';
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  try { fs.copyFileSync(dataFile(), bakFile()); } catch {}
  fs.renameSync(tmp, dataFile());
};
// automatic daily copy of the data file, the last 7 are kept
function autoBackup() {
  try {
    fs.mkdirSync(backupDir(), { recursive: true });
    const f = path.join(backupDir(), 'data-' + new Date().toISOString().slice(0, 10) + '.json');
    if (!fs.existsSync(f) && fs.existsSync(dataFile())) fs.copyFileSync(dataFile(), f);
    const files = fs.readdirSync(backupDir()).filter(n => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
    files.slice(0, -7).forEach(n => fs.unlinkSync(path.join(backupDir(), n)));
  } catch {}
}

// ---------- encryption (scrypt + AES-256-GCM) ----------
const derive = (pw, salt) => crypto.scryptSync(pw, Buffer.from(salt, 'base64'), 32);
const enc = (obj, k) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
};
const dec = (s, k) => {
  const b = Buffer.from(s, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', k, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
};
const locked = () => !!db.settings.vault && !key;
const getPriv = a => (a.privEnc ? dec(a.privEnc, key) : a.priv || {});
const setPriv = (a, p) => {
  if (db.settings.vault) { a.privEnc = enc(p, key); delete a.priv; }
  else { a.priv = p; delete a.privEnc; }
};
// backup files are always encrypted with their own password
function encBackup(obj, pw) {
  const salt = crypto.randomBytes(16).toString('base64');
  return JSON.stringify({ app: 'lol-keychain', v: 2, salt, data: enc(obj, derive(pw, salt)) });
}
function decBackup(text, pw) {
  const j = JSON.parse(text);
  if (j.app !== 'lol-keychain') throw new Error('not a backup');
  return dec(j.data, derive(pw, j.salt));
}

// ---------- Riot API ----------
// app code -> [platform, regional cluster for account-v1]
const REGIONS = {
  euw: ['euw1', 'europe'], eune: ['eun1', 'europe'], tr: ['tr1', 'europe'], ru: ['ru', 'europe'], me: ['me1', 'europe'],
  na: ['na1', 'americas'], br: ['br1', 'americas'], lan: ['la1', 'americas'], las: ['la2', 'americas'],
  kr: ['kr', 'asia'], jp: ['jp1', 'asia'], oce: ['oc1', 'asia'], ph: ['ph2', 'asia'], sg: ['sg2', 'asia'],
  th: ['th2', 'asia'], tw: ['tw2', 'asia'], vn: ['vn2', 'asia'],
};
// sorts a failure into: offline, service (Riot down), key, notfound, rate, other
function riotError(status, msg) {
  const e = new Error(msg);
  e.status = status;
  e.kind = status === 0 ? 'offline' : status >= 500 ? 'service' : (status === 401 || status === 403) ? 'key' : status === 404 ? 'notfound' : status === 429 ? 'rate' : 'other';
  return e;
}
const sleep = ms => new Promise(res => setTimeout(res, ms));
// one request through the Alts server
async function viaServer(url) {
  const code = db.settings.inviteCode || '';
  if (!code) throw riotError(401, 'No invite code saved. Add one in Settings, Riot data.');
  let r;
  try { r = await fetch(SERVER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, url }) }); }
  catch { throw riotError(0, 'No internet connection'); }
  if (r.status === 401) { const e = riotError(401, 'The invite code is not valid anymore'); e.kind = 'invite'; throw e; }
  if (r.status === 503) throw riotError(503, 'The Alts server has a problem right now');
  return r;
}
async function riot(url, tries = 0) {
  let r;
  if (db.settings.mode === 'server') r = await viaServer(url);
  else {
    const k = db.settings.apiKey || '';
    if (!k) throw riotError(401, 'No Riot API key saved. Add one in Settings, Riot data.');
    try { r = await fetch(url, { headers: { 'X-Riot-Token': k } }); }
    catch { throw riotError(0, 'No internet connection'); }
  }
  // the shared limit is full: wait a bit and try again
  if (r.status === 429 && tries < 3) {
    const wait = Math.min(30, Number(r.headers.get('Retry-After')) || 5);
    await sleep(wait * 1000 + 300);
    return riot(url, tries + 1);
  }
  if (!r.ok) {
    const msg = { 401: 'Riot rejected the API key', 403: 'The API key is invalid or expired', 404: 'Riot ID not found', 429: 'Too many requests, trying again later' }[r.status] || (r.status >= 500 ? 'Riot data is not loading right now' : 'Riot API error ' + r.status);
    throw riotError(r.status, msg);
  }
  return r.json();
}
// ---------- match history: last 5 games and games per day ----------
const MATCH_CLUSTER = r => (['euw', 'eune', 'tr', 'ru', 'me'].includes(r) ? 'europe' : ['na', 'br', 'lan', 'las'].includes(r) ? 'americas' : ['kr', 'jp'].includes(r) ? 'asia' : 'sea');
const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
async function fetchMatches(a) {
  const puuid = a.cache && a.cache.puuid;
  if (!puuid) return false;
  const base = `https://${MATCH_CLUSTER(a.region)}.api.riotgames.com/lol/match/v5/matches/`;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [last, today] = await Promise.all([
    riot(base + 'by-puuid/' + puuid + '/ids?count=5'),
    riot(base + 'by-puuid/' + puuid + '/ids?startTime=' + Math.floor(start / 1000) + '&count=100'),
  ]);
  const known = Object.fromEntries((a.games || []).map(g => [g.id, g]));
  const ver = await ddragonVersion().catch(() => null);
  const games = [];
  for (const id of last) {
    if (known[id]) { games.push(known[id]); continue; }
    const m = await riot(base + id);
    const p = m && m.info && (m.info.participants || []).find(x => x.puuid === puuid);
    if (!p) continue;
    games.push({
      id, win: !!p.win, champ: p.championName, k: p.kills, d: p.deaths, as: p.assists,
      icon: ver ? `https://ddragon.leagueoflegends.com/cdn/${ver}/img/champion/${p.championName}.png` : '',
      end: m.info.gameEndTimestamp, queue: m.info.queueId, remake: m.info.gameDuration < 300 || !!p.gameEndedInEarlySurrender,
    });
  }
  a.games = games;
  a.gamesByDay = { ...(a.gamesByDay || {}), [dayKey()]: today.length };
  const keep = Object.keys(a.gamesByDay).sort().slice(-60);
  a.gamesByDay = Object.fromEntries(keep.map(k => [k, a.gamesByDay[k]]));
  a.matchesAt = Date.now();
  return true;
}
// runs quietly after a refresh, one account at a time, so ranks always come first
let matchesRunning = false;
async function matchesJob(force) {
  if (matchesRunning || locked()) return;
  matchesRunning = true;
  try {
    const list = db.accounts.filter(a => a.cache && a.cache.puuid && (force === a.id || !a.matchesAt || Date.now() - a.matchesAt > 20 * 60e3))
      .sort((x, y) => (y.lastUsed || 0) - (x.lastUsed || 0));
    for (const a of list) {
      if (locked()) break;
      try { if (await fetchMatches(a)) { save(); send('account', pub(a)); } }
      catch (e) { if (['offline', 'service', 'key', 'invite'].includes(e.kind)) break; }
    }
  } finally { matchesRunning = false; }
}

const fmt = e => (e ? { tier: e.tier, rank: e.rank, lp: e.leaguePoints, w: e.wins, l: e.losses } : null);
let ddVer = null, ddAt = 0;
async function ddragonVersion() {
  if (!ddVer || Date.now() - ddAt > 6 * 3600e3) {
    try {
      ddVer = (await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json())[0];
      ddAt = Date.now();
    } catch { if (!ddVer) throw riotError(0, 'No internet connection'); }
  }
  return ddVer;
}

// removes invisible characters that get copied along with a Riot ID, and turns non-breaking spaces into normal ones
const cleanId = t => String(t || '').replace(/[​-‏‪-‮⁠﻿]/g, '').replace(/ /g, ' ').trim();
const splitId = (riotId) => {
  const clean = cleanId(riotId);
  const i = clean.lastIndexOf('#');
  if (i < 1 || i === clean.length - 1) throw riotError(-1, 'A Riot ID looks like Name#TAG');
  return [clean.slice(0, i).trim(), clean.slice(i + 1).trim()];
};

async function accountByRiotId(riotId, cluster) {
  const [nm, tg] = splitId(riotId);
  const clusters = [cluster, ...['europe', 'americas', 'asia'].filter(c => c !== cluster)];
  for (const c of clusters) {
    try { return await riot(`https://${c}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(nm)}/${encodeURIComponent(tg)}`); }
    catch (e) { if (e.status !== 404 || c === clusters[clusters.length - 1]) throw e; }
  }
}
async function profile(puuid, region) {
  const h = `https://${REGIONS[region][0]}.api.riotgames.com/lol/`;
  const [sum, ent] = await Promise.all([
    riot(h + 'summoner/v4/summoners/by-puuid/' + puuid),
    riot(h + 'league/v4/entries/by-puuid/' + puuid),
  ]);
  const ver = await ddragonVersion();
  return {
    level: sum.summonerLevel,
    icon: `https://ddragon.leagueoflegends.com/cdn/${ver}/img/profileicon/${sum.profileIconId}.png`,
    solo: fmt(ent.find(e => e.queueType === 'RANKED_SOLO_5x5')),
    flex: fmt(ent.find(e => e.queueType === 'RANKED_FLEX_SR')),
  };
}
// when a Riot ID exists but not on the chosen server, find the server it plays on
async function findServer(puuid, region) {
  const cluster = REGIONS[region][1];
  for (const r of Object.keys(REGIONS).filter(x => REGIONS[x][1] === cluster && x !== region)) {
    try { await riot(`https://${REGIONS[r][0]}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`); return r; }
    catch (e) { if (e.status !== 404) return null; }
  }
  return null;
}

async function fetchInfo(a) {
  if (!REGIONS[a.region]) throw riotError(-1, 'Unknown server');
  let acc = null;
  // the Riot ID (and renames) are checked at most once a day; ranks every time
  const dayOld = !a.cache || !a.cache.idChecked || Date.now() - a.cache.idChecked > 24 * 3600e3;
  if (a.cache && a.cache.puuid && !dayOld) acc = { puuid: a.cache.puuid, gameName: a.cache.name, tagLine: a.cache.tag, kept: true };
  if (!acc && a.cache && a.cache.puuid) {
    const url = `https://${REGIONS[a.region][1]}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${a.cache.puuid}`;
    try { acc = await riot(url); } // also follows name changes
    catch (e) {
      // PUUIDs are encrypted per API key, so one saved under another key is rejected: look it up again by Riot ID
      if (e.status !== 400) throw e;
      delete a.cache.puuid;
    }
  }
  if (!acc) acc = await accountByRiotId(a.riotId, REGIONS[a.region][1]);
  let p;
  try { p = await profile(acc.puuid, a.region); }
  catch (e) {
    // a saved PUUID from another key: look the account up again once
    if (e.status === 400 && acc.kept) { delete a.cache.puuid; delete a.cache.idChecked; return fetchInfo(a); }
    if (e.status === 404) {
      const other = await findServer(acc.puuid, a.region);
      const err = riotError(404, other ? 'This account plays on ' + other.toUpperCase() + ', not ' + a.region.toUpperCase() : 'This Riot ID has no League profile on ' + a.region.toUpperCase());
      err.suggestRegion = other;
      throw err;
    }
    throw e;
  }
  return { puuid: acc.puuid, name: acc.gameName, tag: acc.tagLine, ...p, updated: Date.now(), idChecked: acc.kept ? a.cache.idChecked : Date.now() };
}

// ---------- shared helpers ----------
const pub = (a) => {
  let priv = {};
  if (!locked()) { try { priv = getPriv(a); } catch {} }
  return {
    id: a.id, riotId: a.riotId, region: a.region, cache: a.cache || null,
    category: a.category || 'smurf', tags: a.tags || [], groups: a.groups || [],
    pinned: !!a.pinned, goal: a.goal || null, penalty: a.penalty || null, lastUsed: a.lastUsed || 0,
    history: a.history || [], games: a.games || [], gamesByDay: a.gamesByDay || {}, matchesAt: a.matchesAt || 0, useCount: a.useCount || 0, priv,
  };
};
// events go to the main window and the mini window
const send = (ch, data) => { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(ch, data); };
const SETTABLE = ['sort', 'miniAuto', 'closeToTray', 'startWithWindows', 'autoRefreshMin', 'lockMinutes', 'theme', 'showRecent', 'showPinned', 'showChanges', 'streamer', 'clipSeconds', 'splitEnd', 'hotkey'];
const statusObj = () => {
  const s = db.settings;
  const out = { vault: !!s.vault, unlocked: !locked(), primaryId: s.primaryId || null, miniDocked: !!s.miniDocked, riotFound: !!riotRect, hello: !!s.helloKey, platform: process.platform, hasKey: s.mode === 'server' ? !!s.inviteCode : !!s.apiKey, mode: s.mode, hasOwnKey: !!s.apiKey, inviteHint: s.inviteCode ? s.inviteCode.slice(0, 3) + '••••' + s.inviteCode.slice(-2) : '', keyHint: s.apiKey ? s.apiKey.slice(0, 6) + '••••' + s.apiKey.slice(-4) : '', welcomeDone: !!s.welcomeDone, version: APP_VERSION, activeId: db.activeId };
  for (const k of SETTABLE) out[k] = s[k];
  out.showWhatsNew = !!s.welcomeDone && s.lastSeenVersion !== APP_VERSION;
  return out;
};

// ---------- window <-> app ----------
ipcMain.handle('status', () => statusObj());
ipcMain.handle('setSettings', (_, patch) => {
  for (const k of SETTABLE) if (patch && k in patch) db.settings[k] = patch[k];
  if ('hotkey' in (patch || {})) registerHotkey();
  if ('startWithWindows' in (patch || {})) applyLoginItem();
  if ('miniAuto' in (patch || {})) updateWatcher();
  if ('theme' in (patch || {})) { nativeTheme.themeSource = db.settings.theme === 'system' ? 'system' : db.settings.theme; updateOverlay(); }
  save();
  return statusObj();
});
ipcMain.handle('seenVersion', () => { db.settings.lastSeenVersion = APP_VERSION; save(); });

const cleanKey = k => String(k || '').replace(/[\s"']/g, '');
// saved PUUIDs belong to the key that looked them up, so switching keys forgets them
const forgetPuuids = () => db.accounts.forEach(a => { if (a.cache) delete a.cache.puuid; });
function applyKey(nk) {
  if (nk !== db.settings.apiKey || db.settings.mode !== 'own') forgetPuuids();
  db.settings.apiKey = nk;
  db.settings.mode = 'own';
  save();
}
// checks an invite code with the server and switches to it
ipcMain.handle('checkInvite', async (_, c) => {
  const code = String(c || '').trim().toUpperCase();
  if (!code) return { error: 'Paste your invite code first.' };
  try {
    const r = await fetch(SERVER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, check: true }) });
    if (r.status === 401) return { error: 'This invite code does not work. Check it with the person who gave it to you.' };
    if (!r.ok) return { error: 'The Alts server is not answering (' + r.status + '). Try again in a moment.' };
    if (db.settings.mode !== 'server') forgetPuuids();
    db.settings.inviteCode = code; db.settings.mode = 'server'; save();
    return { ok: true, status: statusObj() };
  } catch { return { error: 'Could not reach the server. Check your internet connection.' }; }
});
// switches back to a saved own key or a saved invite code
ipcMain.handle('setMode', (_, m) => {
  if ((m === 'own' && !db.settings.apiKey) || (m === 'server' && !db.settings.inviteCode) || m === db.settings.mode) return statusObj();
  forgetPuuids(); db.settings.mode = m; save();
  return statusObj();
});
// checks a key with a light request and saves it only if Riot accepts it
ipcMain.handle('checkKey', async (_, k) => {
  const nk = cleanKey(k);
  if (!nk) return { error: 'Paste your key first.' };
  try {
    const r = await fetch('https://euw1.api.riotgames.com/lol/status/v4/platform-data', { headers: { 'X-Riot-Token': nk } });
    if (r.ok || r.status === 429) { applyKey(nk); return { ok: true, status: statusObj() }; }
    if (r.status === 401 || r.status === 403) return { error: 'Riot did not accept this key. Copy the whole key, starting with RGAPI-. Development keys expire after 24 hours.' };
    return { error: 'Riot returned an error (' + r.status + '). Try again in a moment.' };
  } catch { return { error: 'Could not reach Riot. Check your internet connection.' }; }
});
ipcMain.handle('setWelcomeDone', () => { db.settings.welcomeDone = true; db.settings.lastSeenVersion = APP_VERSION; save(); });
ipcMain.handle('openPortal', () => shell.openExternal('https://developer.riotgames.com'));

// vault
ipcMain.handle('unlock', (_, pw) => {
  try { const k = derive(pw, db.settings.vault.salt); dec(db.settings.vault.check, k); key = k; send('active', db.activeId); return true; }
  catch { return false; }
});
function lockVault() { if (db.settings.vault) key = null; send('locked', true); return !!db.settings.vault; }
ipcMain.handle('lock', () => lockVault());
ipcMain.handle('vaultEnable', (_, pw) => {
  if (!pw || pw.length < 8) return { error: 'Use at least 8 characters.' };
  const privs = db.accounts.map(getPriv);
  const salt = crypto.randomBytes(16).toString('base64');
  key = derive(pw, salt);
  db.settings.vault = { salt, check: enc({ ok: 1 }, key) };
  db.accounts.forEach((a, i) => setPriv(a, privs[i]));
  save();
  return { ok: true };
});
ipcMain.handle('vaultDisable', () => {
  if (locked()) return { error: 'Unlock first.' };
  const privs = db.accounts.map(getPriv);
  db.settings.vault = null; key = null; db.settings.helloKey = '';
  db.accounts.forEach((a, i) => setPriv(a, privs[i]));
  save();
  return { ok: true };
});
ipcMain.handle('changeMaster', (_, oldPw, newPw) => {
  if (!db.settings.vault) return { error: 'The vault is off.' };
  try { dec(db.settings.vault.check, derive(oldPw, db.settings.vault.salt)); } catch { return { error: 'The current master password is wrong.' }; }
  if (!newPw || newPw.length < 8) return { error: 'Use at least 8 characters.' };
  const privs = db.accounts.map(getPriv);
  const salt = crypto.randomBytes(16).toString('base64');
  key = derive(newPw, salt);
  db.settings.vault = { salt, check: enc({ ok: 1 }, key) };
  db.accounts.forEach((a, i) => setPriv(a, privs[i]));
  if (db.settings.helloKey) storeHelloKey();
  save();
  return { ok: true };
});

// ---------- Windows Hello ----------
// Windows asks for a fingerprint, face or PIN; the vault key is kept protected by Windows (DPAPI) for this Windows user only
const PS = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const HELLO_PS = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$null = [Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
if ($args[0] -eq 'check') { Await ([Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability]) }
else { Await ([Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync('Unlock Alts')) ([Windows.Security.Credentials.UI.UserConsentVerificationResult]) }
`;
function runHello(mode) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve('NotSupported');
    const script = '& {' + HELLO_PS + '} ' + mode;
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    execFile(PS, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { windowsHide: true, timeout: 120000 }, (err, out) => {
      resolve(err ? 'Error' : String(out).trim().split(/\r?\n/).pop());
    });
  });
}
let helloAvail = null;
async function helloAvailable() {
  if (helloAvail === null) helloAvail = (await runHello('check')) === 'Available' && safeStorage.isEncryptionAvailable();
  return helloAvail;
}
function storeHelloKey() { db.settings.helloKey = safeStorage.encryptString(key.toString('base64')).toString('base64'); }
ipcMain.handle('helloStatus', async () => ({ available: await helloAvailable(), enabled: !!db.settings.helloKey }));
ipcMain.handle('helloEnable', async () => {
  if (locked() || !db.settings.vault) return { error: 'Turn on the vault and unlock it first.' };
  if (!(await helloAvailable())) return { error: 'Windows Hello is not set up on this computer. Set up a PIN, fingerprint or face in Windows Settings, Accounts, Sign-in options.' };
  if (win) win.focus();
  const r = await runHello('verify');
  if (r !== 'Verified') return { error: r === 'Canceled' ? 'Canceled.' : 'Windows Hello did not confirm it (' + r + ').' };
  storeHelloKey(); save();
  return { ok: true };
});
ipcMain.handle('helloDisable', () => { db.settings.helloKey = ''; save(); return { ok: true }; });
ipcMain.handle('helloUnlock', async () => {
  if (!db.settings.helloKey || !db.settings.vault) return { error: 'Windows Hello is off.' };
  if (win) win.focus();
  const r = await runHello('verify');
  if (r !== 'Verified') return { error: r === 'Canceled' ? '' : 'Windows Hello did not confirm it. Use your master password.' };
  try {
    const k = Buffer.from(safeStorage.decryptString(Buffer.from(db.settings.helloKey, 'base64')), 'base64');
    dec(db.settings.vault.check, k);
    key = k;
    send('active', db.activeId);
    return { ok: true };
  } catch { db.settings.helloKey = ''; save(); return { error: 'Windows Hello needs to be set up again. Unlock with your master password.' }; }
});

// accounts
ipcMain.handle('list', () => (locked() ? [] : db.accounts.map(pub)));
ipcMain.handle('groups', () => db.groups);
ipcMain.handle('upsert', (_, d) => {
  if (locked()) return null;
  let a = db.accounts.find(x => x.id === d.id);
  if (!a) { a = { id: crypto.randomUUID(), groups: [], pinned: false, created: Date.now() }; db.accounts.push(a); }
  const rid = cleanId(d.riotId);
  if (a.riotId !== rid || a.region !== d.region) { if (a.cache) { delete a.cache.puuid; delete a.cache.error; } } // different Riot ID = look it up again
  a.riotId = rid; a.region = d.region;
  if ('category' in d) a.category = d.category || 'smurf';
  if ('tags' in d) a.tags = d.tags || [];
  if ('groups' in d) a.groups = d.groups || [];
  if ('pinned' in d) a.pinned = !!d.pinned;
  if ('preview' in d && d.preview) a.cache = { ...d.preview, updated: Date.now() };
  if ('priv' in d) setPriv(a, d.priv || {});
  save();
  return a.id;
});
// small changes from the detail panel
ipcMain.handle('patch', (_, id, p) => {
  const a = db.accounts.find(x => x.id === id);
  if (!a || locked()) return null;
  for (const k of ['pinned', 'groups', 'goal', 'penalty', 'category', 'tags']) if (k in p) a[k] = p[k];
  if ('priv' in p) setPriv(a, { ...getPriv(a), ...p.priv });
  if ('riotId' in p || 'region' in p) {
    a.riotId = cleanId(p.riotId ?? a.riotId); a.region = p.region ?? a.region;
    if (a.cache) { delete a.cache.puuid; delete a.cache.error; }
  }
  save();
  return pub(a);
});
ipcMain.handle('reorder', (_, ids) => {
  const pos = id => { const i = ids.indexOf(id); return i < 0 ? 1e9 : i; };
  db.accounts.sort((x, y) => pos(x.id) - pos(y.id));
  save();
});
// delete returns the stored record so the window can undo for a few seconds
ipcMain.handle('delete', (_, id) => {
  const i = db.accounts.findIndex(a => a.id === id);
  if (i < 0) return null;
  const [raw] = db.accounts.splice(i, 1);
  if (db.activeId === id) db.activeId = null;
  save();
  return { raw, index: i };
});
ipcMain.handle('restore', (_, removed) => {
  if (!removed || !removed.raw || db.accounts.some(a => a.id === removed.raw.id)) return false;
  db.accounts.splice(Math.min(removed.index, db.accounts.length), 0, removed.raw);
  save();
  return true;
});

// groups
ipcMain.handle('groupSave', (_, g) => {
  let x = db.groups.find(y => y.id === g.id);
  if (!x) { x = { id: crypto.randomUUID() }; db.groups.push(x); }
  x.name = String(g.name || 'Group').slice(0, 40); x.color = g.color || 'blue';
  save();
  return x;
});
ipcMain.handle('groupDelete', (_, id) => {
  db.groups = db.groups.filter(g => g.id !== id);
  db.accounts.forEach(a => { a.groups = (a.groups || []).filter(g => g !== id); });
  save();
});

// preview while adding an account: nothing is saved
ipcMain.handle('lookup', async (_, riotId, region) => {
  try {
    const acc = await accountByRiotId(riotId, REGIONS[region][1]);
    try {
      const p = await profile(acc.puuid, region);
      return { ok: true, preview: { puuid: acc.puuid, name: acc.gameName, tag: acc.tagLine, ...p } };
    } catch (e) {
      if (e.status !== 404) throw e;
      const other = await findServer(acc.puuid, region);
      return { error: other ? 'Found, but it plays on ' + other.toUpperCase() : 'This Riot ID has no League profile on ' + region.toUpperCase(), kind: 'notfound', suggestRegion: other };
    }
  } catch (e) { return { error: e.message, kind: e.kind || 'other' }; }
});

let refreshing = false;
ipcMain.handle('refresh', async (_, id, maxAgeMs) => {
  if (refreshing || locked()) return { errors: [], kind: null, skipped: true };
  refreshing = true;
  const stale = x => !maxAgeMs || !x.cache || !x.cache.updated || Date.now() - x.cache.updated > maxAgeMs;
  const list = db.accounts.filter(x => (!id || x.id === id) && stale(x));
  const errors = [];
  let kind = null;
  let done = 0, stop = false, next = 0;
  // several accounts load at the same time; the server and the 429 retry keep it within Riot's limits
  async function worker() {
    while (!stop && next < list.length) {
      const a = list[next++];
      send('progress', { done, total: list.length, id: a.id });
      try {
        const info = await fetchInfo(a);
        a.cache = info;
        a.riotId = info.name + '#' + info.tag;
        // one solo-queue point per day for the rank chart, the last 90 days are kept
        if (info.solo) {
          const day = new Date().toISOString().slice(0, 10);
          a.history = (a.history || []).filter(h => h.d !== day);
          a.history.push({ d: day, tier: info.solo.tier, rank: info.solo.rank, lp: info.solo.lp });
          a.history = a.history.slice(-90);
        }
      } catch (e) {
        // connection or Riot problems stop the run and keep the old data
        if (e.kind === 'offline' || e.kind === 'service' || e.kind === 'key' || e.kind === 'invite') { if (!kind) { kind = e.kind; errors.push({ id: a.id, message: e.message, kind: e.kind }); } stop = true; break; }
        a.cache = { ...(a.cache || {}), error: e.message, errorKind: e.kind || 'other', suggestRegion: e.suggestRegion || null };
        errors.push({ id: a.id, message: e.message, kind: e.kind || 'other' });
      }
      done++;
      send('progress', { done, total: list.length, id: a.id, account: pub(a) });
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(4, list.length) }, worker));
    save();
    if (!kind) setTimeout(() => matchesJob(id), 500);
  } finally {
    refreshing = false;
    send('progress', { done: list.length, total: list.length, finished: true });
  }
  return { errors, kind };
});

// copying: marks the account as used and active, clipboard clears itself
let clipTimer = null;
function copyText(text) {
  clipboard.writeText(String(text));
  clearTimeout(clipTimer);
  const ms = (db.settings.clipSeconds || 30) * 1000;
  clipTimer = setTimeout(() => { if (clipboard.readText() === String(text)) clipboard.clear(); }, ms);
}
function markUsed(a) { a.lastUsed = Date.now(); a.useCount = (a.useCount || 0) + 1; db.activeId = a.id; save(); send('active', a.id); }
ipcMain.handle('copyField', (_, id, field) => {
  const a = db.accounts.find(x => x.id === id);
  if (!a || locked()) return { error: 'Unlock the vault first.' };
  const v = getPriv(a)[field];
  if (!v) return { error: field === 'password' ? 'No password saved for this account.' : 'No login saved for this account.' };
  copyText(v);
  markUsed(a);
  hotkeyStep = field === 'username' ? 1 : 0; hotkeyAt = Date.now();
  return { ok: true };
});
// "changes since you last opened the app": solo ranks as they were when the app was last closed
const soloNow = () => Object.fromEntries(db.accounts.map(a => [a.id, a.cache && a.cache.solo ? { ...a.cache.solo } : null]));
ipcMain.handle('baseline', () => db.seenRanks || null);
ipcMain.handle('markSeen', () => { db.seenRanks = soloNow(); save(); });
// the one main account, always shown at the top of the mini window
ipcMain.handle('setPrimary', (_, id) => { db.settings.primaryId = id || null; save(); send('active', db.activeId); return statusObj(); });
ipcMain.handle('setActive', (_, id) => { const a = db.accounts.find(x => x.id === id); if (a) { db.activeId = id; save(); } });

// global hotkey: first press copies the login of the active account, the next press within 30 s the password
let hotkeyStep = 0, hotkeyAt = 0, hotkeyBound = '';
function notify(title, body) { try { if (Notification.isSupported()) new Notification({ title, body, silent: true }).show(); } catch {} }
function onHotkey() {
  if (locked()) { notify('Alts is locked', 'Unlock the vault to copy logins.'); return; }
  const a = db.accounts.find(x => x.id === db.activeId) || [...db.accounts].sort((x, y) => (y.lastUsed || 0) - (x.lastUsed || 0))[0];
  if (!a) return;
  if (Date.now() - hotkeyAt > 30000) hotkeyStep = 0;
  const field = hotkeyStep === 0 ? 'username' : 'password';
  const v = getPriv(a)[field];
  const shown = db.settings.streamer ? 'active account' : (a.cache && a.cache.name ? a.cache.name : a.riotId);
  if (!v) { notify('Nothing to copy', 'No ' + (field === 'username' ? 'login' : 'password') + ' saved for ' + shown + '.'); return; }
  copyText(v);
  markUsed(a);
  hotkeyAt = Date.now();
  hotkeyStep = hotkeyStep === 0 ? 1 : 0;
  notify(field === 'username' ? 'Login copied' : 'Password copied', shown + (field === 'username' ? '. Press again for the password.' : '. Clipboard clears in ' + db.settings.clipSeconds + ' s.'));
  send('copied', { id: a.id, field });
}
function registerHotkey() {
  try { if (hotkeyBound) globalShortcut.unregister(hotkeyBound); } catch {}
  hotkeyBound = '';
  try { if (db.settings.hotkey && globalShortcut.register(db.settings.hotkey, onHotkey)) hotkeyBound = db.settings.hotkey; } catch {}
}

// colors of the window buttons (minimize, maximize, close), matching the theme
function overlayColors() {
  const dark = db.settings.theme === 'system' ? nativeTheme.shouldUseDarkColors : db.settings.theme !== 'light';
  return dark ? { color: '#0F1115', symbolColor: '#ECEFF4', height: 35 } : { color: '#F4F6F9', symbolColor: '#0E1726', height: 35 };
}
function updateOverlay() { try { if (win && !win.isDestroyed() && process.platform === 'win32') win.setTitleBarOverlay(overlayColors()); } catch {} }
nativeTheme.on('updated', updateOverlay);

// ---------- tray icon next to the clock ----------
let tray = null, quitting = false;
function showMain() { if (!win) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
const trayName = (a, i) => db.settings.streamer ? 'Account ' + (i + 1) : (a.cache && a.cache.name) || a.riotId.split('#')[0];
function copyFrom(a, field) {
  if (locked()) { showMain(); return; }
  const v = getPriv(a)[field];
  if (!v) { notify('Nothing to copy', 'No ' + (field === 'username' ? 'login' : 'password') + ' saved for this account.'); return; }
  copyText(v); markUsed(a);
  hotkeyStep = field === 'username' ? 1 : 0; hotkeyAt = Date.now();
  send('copied', { id: a.id, field });
}
function trayMenu() {
  const items = [{ label: 'Open Alts', click: showMain }, { type: 'separator' }];
  if (locked()) items.push({ label: 'Vault is locked', enabled: false }, { label: 'Unlock…', click: showMain });
  else {
    const main = db.accounts.find(x => x.id === db.settings.primaryId);
    if (main && main.id !== db.activeId) {
      items.push({ label: 'Main: ' + trayName(main, db.accounts.indexOf(main)), enabled: false },
        { label: 'Copy login', click: () => copyFrom(main, 'username') },
        { label: 'Copy password', click: () => copyFrom(main, 'password') }, { type: 'separator' });
    }
    const active = db.accounts.find(x => x.id === db.activeId);
    if (active) {
      const i = db.accounts.indexOf(active);
      items.push({ label: (active.id === db.settings.primaryId ? 'Main and active: ' : 'Active: ') + trayName(active, i), enabled: false },
        { label: 'Copy login', click: () => copyFrom(active, 'username') },
        { label: 'Copy password', click: () => copyFrom(active, 'password') });
    }
    const recent = [...db.accounts].filter(a => a.lastUsed && a.id !== db.activeId).sort((x, y) => y.lastUsed - x.lastUsed).slice(0, 5);
    const pinned = db.accounts.filter(a => a.pinned && a.id !== db.activeId && !recent.includes(a));
    const sub = a => ({ label: trayName(a, db.accounts.indexOf(a)), submenu: [{ label: 'Copy login', click: () => copyFrom(a, 'username') }, { label: 'Copy password', click: () => copyFrom(a, 'password') }] });
    if (recent.length) items.push({ type: 'separator' }, { label: 'Recently used', enabled: false }, ...recent.map(sub));
    if (pinned.length) items.push({ type: 'separator' }, { label: 'Pinned', enabled: false }, ...pinned.map(sub));
    items.push({ type: 'separator' }, { label: 'Mini window', click: () => openMini() });
    if (db.settings.vault) items.push({ label: 'Lock vault', click: () => lockVault() });
  }
  items.push({ type: 'separator' }, { label: 'Quit Alts', click: () => { quitting = true; app.quit(); } });
  return Menu.buildFromTemplate(items);
}
function createTray() {
  // tray.png has a sharper tray@2x.png twin for high resolution screens
  const img = nativeImage.createFromPath(path.join(__dirname, 'tray.png'));
  tray = new Tray(img);
  tray.setToolTip('Alts');
  tray.on('click', showMain);
  tray.on('right-click', () => tray.popUpContextMenu(trayMenu()));
}
function applyLoginItem() {
  if (!app.isPackaged) return; // only the installed app registers itself, not the test version
  try { app.setLoginItemSettings({ openAtLogin: !!db.settings.startWithWindows, args: ['--hidden'] }); } catch {}
}

// ---------- mini window, optionally attached next to the Riot Client ----------
// Only the position of the Riot Client window is read (like any window manager does). Nothing is injected or automated.
let mini = null, watcher = null, riotRect = null, riotSeen = false;
const MINI_W = 300;
function openMini(dock) {
  if (typeof dock === 'boolean') { db.settings.miniDocked = dock; save(); }
  if (dock !== true) riotSeen = !!riotRect; // opened by hand: stay visible until the Riot Client closes
  if (mini && !mini.isDestroyed()) { mini.show(); mini.focus(); updateWatcher(); placeMini(); return; }
  const b = db.settings.miniBounds || {};
  mini = new BrowserWindow({
    width: MINI_W, height: b.height || 560, x: b.x, y: b.y, minWidth: 260, minHeight: 320,
    frame: false, resizable: true, roundedCorners: false, hasShadow: false, skipTaskbar: false, alwaysOnTop: true, show: false, title: 'Alts mini',
    backgroundColor: db.settings.theme === 'light' ? '#F4F6F9' : '#0F1115',
    icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  });
  mini.loadFile('mini.html');
  mini.once('ready-to-show', () => { mini.showInactive(); placeMini(); });
  const remember = () => { if (mini && !db.settings.miniDocked && !mini.isDestroyed()) { db.settings.miniBounds = mini.getBounds(); save(); } };
  mini.on('moved', remember); mini.on('resized', remember);
  mini.on('closed', () => { mini = null; miniOwned = '0'; updateWatcher(); });
  updateWatcher();
}
// on top of everything only when it floats on its own; attached it sits at the Riot Client's level
function miniLayer() {
  if (!mini || mini.isDestroyed()) return;
  const attached = db.settings.miniDocked && !!riotRect;
  if (mini.isAlwaysOnTop() !== !attached) mini.setAlwaysOnTop(!attached);
  if (watcher && process.platform === 'win32') {
    const hwnd = attached ? mini.getNativeWindowHandle().readBigUInt64LE(0).toString() : '0';
    if (hwnd !== miniOwned) { miniOwned = hwnd; try { watcher.stdin.write('own ' + hwnd + '\n'); } catch {} }
  }
}
let miniOwned = '0';
function placeMini() {
  if (!mini || mini.isDestroyed()) return;
  miniLayer();
  if (!db.settings.miniDocked) return;
  if (!riotRect) { if (mini.isVisible() && riotMin) mini.hide(); return; }
  // Windows reports real pixels; Electron works in scaled pixels
  const r = process.platform === 'win32' ? screen.screenToDipRect(null, riotRect) : riotRect;
  const area = screen.getDisplayMatching(r).workArea;
  // 2 px of overlap hides the rounding gap at display scaling like 125 %
  let x = r.x + r.width - 2;
  if (x + MINI_W > area.x + area.width) x = Math.max(area.x, r.x - MINI_W + 2);
  const nb = { x: Math.round(x), y: Math.round(r.y), width: MINI_W, height: Math.round(Math.max(320, r.height)) };
  const cb = mini.getBounds();
  // moving only is cheaper than resizing, which keeps it smooth while dragging
  if (cb.width === nb.width && cb.height === nb.height) { if (cb.x !== nb.x || cb.y !== nb.y) mini.setPosition(nb.x, nb.y); }
  else mini.setBounds(nb);
  if (!mini.isVisible()) mini.showInactive();
}
const WATCH_PS = `
Add-Type -Language CSharp @'
using System; using System.Threading; using System.Diagnostics; using System.Runtime.InteropServices;
public static class LkWatch {
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string c, string t);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int size);
  [DllImport("winmm.dll")] static extern uint timeBeginPeriod(uint ms);
  [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")] static extern IntPtr SetOwner(IntPtr h, int i, IntPtr v);
  [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] static extern IntPtr GetOwner(IntPtr h, int i);
  // the mini window, sent by the app: while attached it belongs to the Riot Client window,
  // so Windows keeps it right above the Riot Client, not above every other app
  static long mini = 0; static long freed = 0;
  static void ReadCommands() {
    string line;
    while ((line = Console.In.ReadLine()) != null) {
      var p = line.Split(' ');
      if (p.Length == 2 && p[0] == "own") { long v; if (long.TryParse(p[1], out v)) { long old = Interlocked.Exchange(ref mini, v); if (v == 0 && old != 0) Interlocked.Exchange(ref freed, old); } }
    }
    Environment.Exit(0);
  }
  public struct RECT { public int L, T, R, B; }
  static IntPtr Find() {
    IntPtr h = FindWindow(null, "Riot Client");
    if (h != IntPtr.Zero) return h;
    foreach (var n in new[] { "Riot Client", "RiotClientUx" })
      foreach (var p in Process.GetProcessesByName(n)) if (p.MainWindowHandle != IntPtr.Zero) return p.MainWindowHandle;
    return IntPtr.Zero;
  }
  public static void Run() {
    timeBeginPeriod(1); // lets the short pauses below really be short
    var t = new Thread(ReadCommands); t.IsBackground = true; t.Start();
    IntPtr h = IntPtr.Zero; string last = null; long n = 0;
    while (true) {
      if (!IsWindow(h) && (n % 4) == 0) h = Find();
      n++;
      string cur = "none";
      if (h != IntPtr.Zero && IsWindowVisible(h) && IsIconic(h)) cur = "min";
      else if (h != IntPtr.Zero && IsWindowVisible(h)) {
        RECT r;
        // the visible edge of the window, without the invisible shadow border Windows adds around it
        if (DwmGetWindowAttribute(h, 9, out r, Marshal.SizeOf(typeof(RECT))) != 0) GetWindowRect(h, out r);
        cur = r.L + " " + r.T + " " + r.R + " " + r.B;
      }
      long m = Interlocked.Read(ref mini), f = Interlocked.Exchange(ref freed, 0);
      if (f != 0 && IsWindow(new IntPtr(f))) SetOwner(new IntPtr(f), -8, IntPtr.Zero);
      if (m != 0 && h != IntPtr.Zero && IsWindow(new IntPtr(m)) && GetOwner(new IntPtr(m), -8) != h) SetOwner(new IntPtr(m), -8, h);
      if (cur != last) { Console.Out.WriteLine(cur); Console.Out.Flush(); last = cur; }
      // checks often while the Riot Client is visible, so the first move is caught right away
      Thread.Sleep(cur == "none" ? 250 : 8);
    }
  }
}
'@
[LkWatch]::Run()
`;
function updateWatcher() {
  const need = process.platform === 'win32' && ((mini && !mini.isDestroyed() && db.settings.miniDocked) || db.settings.miniAuto);
  if (need && !watcher) {
    const encoded = Buffer.from(WATCH_PS, 'utf16le').toString('base64');
    watcher = spawn(PS, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { windowsHide: true });
    let buf = '';
    watcher.stdout.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/); buf = lines.pop();
      const last = lines.filter(Boolean).pop();
      if (last) onRiotRect(last);
    });
    watcher.on('exit', () => { watcher = null; miniOwned = '0'; });
    if (mini && !mini.isDestroyed()) setTimeout(miniLayer, 1500);
  } else if (!need && watcher) { watcher.kill(); watcher = null; riotRect = null; }
}
let riotMin = false;
function onRiotRect(line) {
  let next = null;
  const wasThere = !!riotRect || riotMin;
  riotMin = line === 'min';
  if (line !== 'none' && line !== 'min') { const [l, t, r, b] = line.split(' ').map(Number); if (r - l > 200 && b - t > 200) next = { x: l, y: t, width: r - l, height: b - t }; }
  const appeared = next && !riotRect;
  const changed = JSON.stringify(next) !== JSON.stringify(riotRect);
  riotRect = next;
  if (next) riotSeen = true;
  // opens by itself when the Riot Client appears, if turned on in Settings
  if (appeared && db.settings.miniAuto && (!mini || mini.isDestroyed())) { openMini(true); return; }
  // the Riot Client closed (for example after starting a game): the attached mini window closes too
  if (line === 'none' && wasThere && mini && !mini.isDestroyed() && db.settings.miniDocked) { mini.close(); return; }
  if ((changed || riotMin) && mini && !mini.isDestroyed() && db.settings.miniDocked) placeMini();
  if (mini && !mini.isDestroyed()) send('riot', { found: !!riotRect });
}
ipcMain.handle('miniOpen', () => { openMini(); });
ipcMain.handle('miniDock', (_, on) => { db.settings.miniDocked = !!on; save(); updateWatcher(); if (!on && mini) { const b = db.settings.miniBounds; if (b) mini.setBounds(b); mini.show(); } placeMini(); return statusObj(); });
ipcMain.handle('miniClose', () => { if (mini && !mini.isDestroyed()) mini.close(); });
ipcMain.handle('openMain', () => showMain());

// ---------- automatic updates from GitHub Releases ----------
let updater = null, updateReady = null;
function setupUpdates() {
  if (!app.isPackaged) return; // only the installed app updates itself
  try { updater = require('electron-updater').autoUpdater; } catch { return; }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('update-downloaded', (info) => { updateReady = info.version; send('update', { version: info.version }); notify('Alts ' + info.version + ' is ready', 'Restart the app to update. It also updates the next time you quit.'); });
  updater.on('error', () => {});
  const check = () => updater.checkForUpdates().catch(() => {});
  setTimeout(check, 10000);
  setInterval(check, 6 * 3600e3);
}
ipcMain.handle('updateStatus', () => ({ ready: updateReady }));
ipcMain.handle('installUpdate', () => { if (updater && updateReady) { quitting = true; updater.quitAndInstall(false, true); } });

// encrypted backup export / import
ipcMain.handle('backupExport', async (_, pw) => {
  if (locked()) return { error: 'Unlock the vault first.' };
  if (!pw || pw.length < 8) return { error: 'The backup password needs at least 8 characters.' };
  const r = await dialog.showSaveDialog(win, {
    defaultPath: `Alts-backup-${new Date().toISOString().slice(0, 10)}.lkb`,
    filters: [{ name: 'Alts backup', extensions: ['lkb'] }],
  });
  if (r.canceled) return { canceled: true };
  const snap = { groups: db.groups, accounts: db.accounts.map(a => ({ ...pub(a), priv: getPriv(a) })) };
  fs.writeFileSync(r.filePath, encBackup(snap, pw));
  return { ok: true };
});
ipcMain.handle('backupImport', async (_, pw) => {
  if (locked()) return { error: 'Unlock the vault first.' };
  if (!pw) return { error: 'Enter the backup password first.' };
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Alts backup', extensions: ['lkb'] }] });
  if (r.canceled) return { canceled: true };
  let snap;
  try { snap = decBackup(fs.readFileSync(r.filePaths[0], 'utf8'), pw); }
  catch { return { error: 'Could not open the backup. Wrong password, or not a Alts backup.' }; }
  try { fs.mkdirSync(backupDir(), { recursive: true }); fs.copyFileSync(dataFile(), path.join(backupDir(), 'before-import-' + Date.now() + '.json')); } catch {}
  db.groups = snap.groups || db.groups;
  db.accounts = (snap.accounts || []).map(x => {
    const a = { id: x.id || crypto.randomUUID(), riotId: x.riotId, region: x.region, cache: x.cache, category: x.category, tags: x.tags || [], groups: x.groups || [], pinned: !!x.pinned, goal: x.goal || null, penalty: x.penalty || null, lastUsed: x.lastUsed || 0 };
    setPriv(a, x.priv || {});
    return a;
  });
  save();
  return { ok: true, count: db.accounts.length };
});
ipcMain.handle('openBackups', () => { fs.mkdirSync(backupDir(), { recursive: true }); return shell.openPath(backupDir()); });

// ---------- start ----------
app.setAppUserModelId('com.lolkeychain.app');
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showMain());
  app.whenReady().then(() => {
    load();
    autoBackup();
    nativeTheme.themeSource = db.settings.theme === 'system' ? 'system' : db.settings.theme;
    win = new BrowserWindow({
      // the app draws its own title bar; Windows keeps its normal buttons, in the app's colors
      titleBarStyle: 'hidden', titleBarOverlay: overlayColors(),
      width: 1320, height: 860, minWidth: 900, minHeight: 600,
      backgroundColor: db.settings.theme === 'light' ? '#F4F6F9' : '#0F1115', autoHideMenuBar: true, title: 'Alts',
      icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
      show: !process.argv.includes('--hidden'),
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
    });
    win.loadFile('index.html');
    // closing the window keeps the app running next to the clock, unless turned off in Settings
    win.on('close', (e) => {
      if (quitting || !db.settings.closeToTray) return;
      e.preventDefault();
      win.hide();
      if (!db.settings.trayHintShown) { db.settings.trayHintShown = true; save(); notify('Alts is still running', 'Find it next to the clock. Right-click the icon to copy logins or quit.'); }
    });
    createTray();
    applyLoginItem();
    registerHotkey();
    updateWatcher();
    setupUpdates();
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('before-quit', () => { if (!locked() && db.accounts.length) { db.seenRanks = soloNow(); try { save(); } catch {} } });
  app.on('will-quit', () => { globalShortcut.unregisterAll(); if (watcher) watcher.kill(); });
  app.on('window-all-closed', () => app.quit());
}
