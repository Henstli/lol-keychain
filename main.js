const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// the data folder stays the same for "npm start" and for the installed app
app.setPath('userData', path.join(app.getPath('appData'), 'lol-manager'));

const DEFAULTS = { apiKey: '', vault: null, autoRefreshMin: 60, lockMinutes: 15, welcomeDone: false };
let db = { settings: { ...DEFAULTS }, accounts: [] };
let key = null; // vault key, kept in memory only
let win = null;
const dataFile = () => path.join(app.getPath('userData'), 'data.json');
const bakFile = () => dataFile() + '.bak';
const backupDir = () => path.join(app.getPath('userData'), 'backups');

// older Czech tags -> English
const TAGMAP = { 'Leveluju': 'Leveling', 'Připraven na ranked': 'Ranked ready', 'Nehraný': 'Unplayed', 'Na prodej': 'For sale', 'Trest': 'Penalty', 'Zabanovaný': 'Banned' };
function migrate() {
  const hadKey = db.settings && db.settings.apiKey && db.settings.welcomeDone === undefined;
  db.settings = { ...DEFAULTS, ...(db.settings || {}) };
  if (hadKey) db.settings.welcomeDone = true; // existing users never see the welcome guide
  db.accounts = db.accounts || [];
  db.accounts.forEach(a => { if (a.tags) a.tags = [...new Set(a.tags.map(t => TAGMAP[t] || t))]; });
}
const load = () => {
  for (const f of [dataFile(), bakFile()]) {
    try { db = JSON.parse(fs.readFileSync(f, 'utf8')); migrate(); return; } catch {}
  }
};
// safe write: temp file first, previous version kept as .bak
const save = () => {
  const tmp = dataFile() + '.tmp';
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
const getPriv = a => (a.privEnc ? dec(a.privEnc, key) : a.priv || {});
const setPriv = (a, p) => {
  if (db.settings.vault) { a.privEnc = enc(p, key); delete a.priv; }
  else { a.priv = p; delete a.privEnc; }
};
// backup files are always encrypted with their own password
function encBackup(obj, pw) {
  const salt = crypto.randomBytes(16).toString('base64');
  return JSON.stringify({ app: 'lol-keychain', v: 1, salt, data: enc(obj, derive(pw, salt)) });
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
async function riot(url) {
  const k = db.settings.apiKey || '';
  if (!k) throw new Error('No API key saved');
  const r = await fetch(url, { headers: { 'X-Riot-Token': k } });
  if (!r.ok) {
    let detail = '';
    try { detail = (await r.json()).status.message; } catch {}
    const msg = { 401: 'Riot rejected the API key', 403: 'API key is invalid or expired', 404: 'account not found', 429: 'too many requests, try again in a moment' }[r.status] || 'Riot API error';
    const err = new Error(msg + ' (' + r.status + (detail ? ': ' + detail : '') + ')');
    err.status = r.status;
    throw err;
  }
  return r.json();
}
const fmt = e => (e ? { tier: e.tier, rank: e.rank, lp: e.leaguePoints, w: e.wins, l: e.losses } : null);
let ddVer = null, ddAt = 0;
async function ddragonVersion() {
  if (!ddVer || Date.now() - ddAt > 6 * 3600e3) {
    ddVer = (await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json())[0];
    ddAt = Date.now();
  }
  return ddVer;
}

// removes invisible characters that get copied along with a Riot ID, and turns non-breaking spaces into normal ones
const cleanId = t => String(t || '').replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '').replace(/\u00A0/g, ' ').trim();

async function fetchInfo(a) {
  const reg = REGIONS[a.region];
  if (!reg) throw new Error('unknown server');
  const EU = `https://${reg[1]}.api.riotgames.com/riot/account/v1/accounts/`;
  let acc = null;
  if (a.cache && a.cache.puuid) {
    try { acc = await riot(EU + 'by-puuid/' + a.cache.puuid); } // also follows name changes
    catch (e) {
      // PUUIDs are encrypted per API key, so one saved under another key is rejected: look it up again by Riot ID
      if (e.status !== 400) throw e;
      delete a.cache.puuid;
    }
  }
  if (!acc) {
    const clean = cleanId(a.riotId);
    const i = clean.lastIndexOf('#');
    if (i < 1) throw new Error('Riot ID must look like Name#TAG');
    const nm = encodeURIComponent(clean.slice(0, i).trim()), tg = encodeURIComponent(clean.slice(i + 1).trim());
    const clusters = [reg[1], ...['europe', 'americas', 'asia'].filter(c => c !== reg[1])];
    for (const c of clusters) {
      try { acc = await riot(`https://${c}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${nm}/${tg}`); break; }
      catch (e) { if (e.status !== 404 || c === clusters[clusters.length - 1]) throw e; }
    }
  }
  const h = `https://${reg[0]}.api.riotgames.com/lol/`;
  const [sum, ent] = await Promise.all([
    riot(h + 'summoner/v4/summoners/by-puuid/' + acc.puuid),
    riot(h + 'league/v4/entries/by-puuid/' + acc.puuid),
  ]);
  const ver = await ddragonVersion();
  return {
    puuid: acc.puuid, name: acc.gameName, tag: acc.tagLine, level: sum.summonerLevel,
    icon: `https://ddragon.leagueoflegends.com/cdn/${ver}/img/profileicon/${sum.profileIconId}.png`,
    solo: fmt(ent.find(e => e.queueType === 'RANKED_SOLO_5x5')),
    flex: fmt(ent.find(e => e.queueType === 'RANKED_FLEX_SR')),
    updated: Date.now(),
  };
}

// ---------- window <-> app ----------
ipcMain.handle('status', () => ({
  vault: !!db.settings.vault, unlocked: !db.settings.vault || !!key, apiKey: db.settings.apiKey,
  autoRefreshMin: db.settings.autoRefreshMin, lockMinutes: db.settings.lockMinutes, welcomeDone: !!db.settings.welcomeDone,
}));
const cleanKey = k => String(k || '').replace(/[\s"']/g, '');
function applyKey(nk) {
  if (nk !== db.settings.apiKey) db.accounts.forEach(a => { if (a.cache) delete a.cache.puuid; }); // saved PUUIDs belong to the old key
  db.settings.apiKey = nk;
  save();
}
ipcMain.handle('setApiKey', (_, k) => applyKey(cleanKey(k)));
// checks a key with a light request and saves it only if Riot accepts it
ipcMain.handle('checkKey', async (_, k) => {
  const nk = cleanKey(k);
  if (!nk) return { error: 'Paste your key first.' };
  try {
    const r = await fetch('https://euw1.api.riotgames.com/lol/status/v4/platform-data', { headers: { 'X-Riot-Token': nk } });
    if (r.ok || r.status === 429) { applyKey(nk); return { ok: true }; }
    if (r.status === 401 || r.status === 403) return { error: 'Riot did not accept this key. Make sure you copied the whole key, starting with RGAPI-. Development keys expire after 24 hours, so create a new one if yours is older.' };
    return { error: 'Riot returned an error (' + r.status + '). Try again in a moment.' };
  } catch { return { error: 'Could not reach Riot. Check your internet connection.' }; }
});
ipcMain.handle('setWelcomeDone', () => { db.settings.welcomeDone = true; save(); });
ipcMain.handle('openPortal', () => shell.openExternal('https://developer.riotgames.com'));
ipcMain.handle('setSettings', (_, s) => {
  for (const n of ['autoRefreshMin', 'lockMinutes']) if (Number.isFinite(s[n]) && s[n] >= 0) db.settings[n] = s[n];
  save();
});

ipcMain.handle('unlock', (_, pw) => {
  try { const k = derive(pw, db.settings.vault.salt); dec(db.settings.vault.check, k); key = k; return true; }
  catch { return false; }
});
ipcMain.handle('lock', () => { if (db.settings.vault) key = null; return !!db.settings.vault; });
ipcMain.handle('vaultEnable', (_, pw) => {
  const privs = db.accounts.map(getPriv);
  const salt = crypto.randomBytes(16).toString('base64');
  key = derive(pw, salt);
  db.settings.vault = { salt, check: enc({ ok: 1 }, key) };
  db.accounts.forEach((a, i) => setPriv(a, privs[i]));
  save();
});
ipcMain.handle('vaultDisable', () => {
  const privs = db.accounts.map(getPriv);
  db.settings.vault = null; key = null;
  db.accounts.forEach((a, i) => setPriv(a, privs[i]));
  save();
});

ipcMain.handle('list', () => {
  if (db.settings.vault && !key) return [];
  return db.accounts.map(a => ({
    id: a.id, riotId: a.riotId, region: a.region, cache: a.cache,
    category: a.category || 'smurf', tags: a.tags || [], priv: getPriv(a),
  }));
});
ipcMain.handle('upsert', (_, d) => {
  let a = db.accounts.find(x => x.id === d.id);
  if (!a) { a = { id: crypto.randomUUID() }; db.accounts.push(a); }
  if (a.riotId !== cleanId(d.riotId) || a.region !== d.region) { if (a.cache) delete a.cache.puuid; } // different Riot ID = look it up again
  a.riotId = cleanId(d.riotId); a.region = d.region;
  a.category = d.category || 'smurf'; a.tags = d.tags || [];
  setPriv(a, d.priv);
  save();
  return a.id;
});
ipcMain.handle('reorder', (_, ids) => {
  const pos = id => { const i = ids.indexOf(id); return i < 0 ? 1e9 : i; };
  db.accounts.sort((x, y) => pos(x.id) - pos(y.id));
  save();
});
ipcMain.handle('delete', (_, id) => { db.accounts = db.accounts.filter(a => a.id !== id); save(); });
ipcMain.handle('refresh', async (_, id, maxAgeMs) => {
  const stale = x => !maxAgeMs || !x.cache || !x.cache.updated || Date.now() - x.cache.updated > maxAgeMs;
  const errors = [];
  for (const a of db.accounts.filter(x => (!id || x.id === id) && stale(x))) {
    try { const info = await fetchInfo(a); a.cache = info; a.riotId = info.name + '#' + info.tag; }
    catch (e) { a.cache = { ...(a.cache || {}), error: e.message }; errors.push(a.riotId + ': ' + e.message); }
    save();
    await new Promise(r => setTimeout(r, 300));
  }
  return errors;
});

// clipboard that clears itself
let clipTimer = null;
ipcMain.handle('copy', (_, text, clearMs) => {
  clipboard.writeText(String(text));
  clearTimeout(clipTimer);
  if (clearMs) clipTimer = setTimeout(() => { if (clipboard.readText() === String(text)) clipboard.clear(); }, clearMs);
});

// encrypted backup export / import
ipcMain.handle('backupExport', async (_, pw) => {
  if (!pw || pw.length < 8) return { error: 'Backup password must be at least 8 characters.' };
  const r = await dialog.showSaveDialog(win, {
    defaultPath: `LoL-Keychain-backup-${new Date().toISOString().slice(0, 10)}.lkb`,
    filters: [{ name: 'LoL Keychain backup', extensions: ['lkb'] }],
  });
  if (r.canceled) return { canceled: true };
  const snap = { accounts: db.accounts.map(a => ({ id: a.id, riotId: a.riotId, region: a.region, cache: a.cache, category: a.category, tags: a.tags, priv: getPriv(a) })) };
  fs.writeFileSync(r.filePath, encBackup(snap, pw));
  return { ok: true };
});
ipcMain.handle('backupImport', async (_, pw) => {
  if (!pw) return { error: 'Enter the backup password first.' };
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'LoL Keychain backup', extensions: ['lkb'] }] });
  if (r.canceled) return { canceled: true };
  let snap;
  try { snap = decBackup(fs.readFileSync(r.filePaths[0], 'utf8'), pw); }
  catch { return { error: 'Could not open the backup. Wrong password, or not a LoL Keychain backup.' }; }
  try { fs.mkdirSync(backupDir(), { recursive: true }); fs.copyFileSync(dataFile(), path.join(backupDir(), 'before-import-' + Date.now() + '.json')); } catch {}
  db.accounts = (snap.accounts || []).map(x => {
    const a = { id: x.id || crypto.randomUUID(), riotId: x.riotId, region: x.region, cache: x.cache, category: x.category, tags: x.tags };
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
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    load();
    autoBackup();
    win = new BrowserWindow({
      width: 1200, height: 800, backgroundColor: '#0b1117', autoHideMenuBar: true, title: 'LoL Keychain',
      icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
    });
    win.loadFile('index.html');
  });
  app.on('window-all-closed', () => app.quit());
}
