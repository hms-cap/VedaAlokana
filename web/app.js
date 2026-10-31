// Vedālokana — a static, client-side browser for the Vedas: Saṃhitās,
// Brāhmaṇas, Āraṇyakas and Upaniṣads.
// Data lives in ./data (built by scripts/build-data.mjs); routing is hash-based.

import { toKnda } from './lipi.js';
import { dirghaLine } from './dirgha.js';

const FACETS = {
  rishi: { label: 'Ṛṣi', deva: 'ऋषि', plural: 'seers', one: 'seer' },
  devata: { label: 'Devatā', deva: 'देवता', plural: 'deities', one: 'deity' },
  chandas: { label: 'Chandas', deva: 'छन्दस्', plural: 'metres', one: 'metre' },
};
const FKEYS = Object.keys(FACETS);
const COL = { d1: 0, d2: 1, v: 2, rishi: 3, devata: 4, chandas: 5 };
const LAYERS = {
  samhita: { label: 'Saṃhitā', deva: 'संहिता', plural: 'Saṃhitās' },
  brahmana: { label: 'Brāhmaṇa', deva: 'ब्राह्मण', plural: 'Brāhmaṇas' },
  aranyaka: { label: 'Āraṇyaka', deva: 'आरण्यक', plural: 'Āraṇyakas' },
  upanishad: { label: 'Upaniṣad', deva: 'उपनिषद्', plural: 'Upaniṣads' },
};
const LEVEL_DEVA = {
  Maṇḍala: 'मण्डल', Kāṇḍa: 'काण्ड', Adhyāya: 'अध्याय', Ārcika: 'आर्चिक', Pañcikā: 'पञ्चिका', Āraṇyaka: 'आरण्यक',
  Prapāṭhaka: 'प्रपाठक', Bhāga: 'भाग', Vallī: 'वल्ली', Khaṇḍa: 'खण्ड', Praśna: 'प्रश्न', Brāhmaṇa: 'ब्राह्मण', Book: 'पुस्तक',
};

// Labels in the reading script: the Sanskrit names of the levels (singular, plural), used when menus
// follow the script (Settings → Menus, or the En button in the top bar switches back to English).
const LEVEL_SA = {
  Maṇḍala: ['मण्डलम्', 'मण्डलानि'], Sūkta: ['सूक्तम्', 'सूक्तानि'], Ṛk: ['ऋक्', 'ऋचः'], Adhyāya: ['अध्यायः', 'अध्यायाः'],
  Mantra: ['मन्त्रः', 'मन्त्राः'], Ārcika: ['आर्चिकम्', 'आर्चिके'], Book: ['अध्यायः', 'अध्यायाः'], Verse: ['मन्त्रः', 'मन्त्राः'],
  Verses: ['मन्त्राः', 'मन्त्राः'], Kāṇḍa: ['काण्डम्', 'काण्डानि'], Pañcikā: ['पञ्चिका', 'पञ्चिकाः'], Khaṇḍa: ['खण्डः', 'खण्डाः'],
  Āraṇyaka: ['आरण्यकम्', 'आरण्यकानि'], Brāhmaṇa: ['ब्राह्मणम्', 'ब्राह्मणानि'], Kaṇḍikā: ['कण्डिका', 'कण्डिकाः'],
  Prapāṭhaka: ['प्रपाठकः', 'प्रपाठकाः'], Pañcāśat: ['पञ्चाशत्', 'पञ्चाशतः'], Section: ['भागः', 'भागाः'], Vallī: ['वल्ली', 'वल्ल्यः'],
  Anuvāka: ['अनुवाकः', 'अनुवाकाः'], Bhāga: ['भागः', 'भागाः'], Praśna: ['प्रश्नः', 'प्रश्नाः'],
};
const GROUP_SA = { Pūrvārcika: 'पूर्वार्चिकम्', Uttarārcika: 'उत्तरार्चिकम्', Pūrvabhāga: 'पूर्वभागः', Uttarabhāga: 'उत्तरभागः' };
// Traditional short references (ऋ. १०.९०) for the English ones (RV 10.90).
const REF_SA = {
  rv: 'ऋ.', yv: 'वा.सं.', sv: 'सा.', svs: 'सा.', av: 'अ.', ts: 'तै.सं.', tb: 'तै.ब्रा.', ta: 'तै.आ.', sb: 'श.ब्रा.', ab: 'ऐ.ब्रा.',
  kb: 'कौ.ब्रा.', aa: 'ऐ.आ.', sa: 'शां.आ.', aiu: 'ऐ.उ.', isu: 'ई.उ.', bu: 'बृ.उ.', tu: 'तै.उ.', kathu: 'क.उ.', svu: 'श्वे.उ.',
  pb: 'प.ब्रा.', jub: 'जै.उ.ब्रा.', chu: 'छा.उ.', keu: 'के.उ.', gb: 'गो.ब्रा.', mu: 'मु.उ.', mau: 'मा.उ.', pru: 'प्र.उ.',
};
const FACET_SA = { rishi: 'ऋषिः', devata: 'देवता', chandas: 'छन्दः' };
const VEDA_SA = { rv: 'ऋग्वेदः', syv: 'शुक्लयजुर्वेदः', kyv: 'कृष्णयजुर्वेदः', sv: 'सामवेदः', av: 'अथर्ववेदः' };
const VEDA_SA_SHORT = { rv: 'ऋक्', syv: 'शुक्लयजुः', kyv: 'कृष्णयजुः', sv: 'साम', av: 'अथर्व' };
const LAYER_SA = { samhita: 'संहिता', brahmana: 'ब्राह्मणम्', aranyaka: 'आरण्यकम्', upanishad: 'उपनिषत्' };
const MENU_SA = { home: 'गृहम्', library: 'ग्रन्थालयः', suktas: 'सूक्तानि', search: 'अन्वेषणम्', settings: 'विन्यासः', about: 'परिचयः' };

const $ = (s, el = document) => el.querySelector(s);
const main = $('#main');
const rail = $('#rail');
const cache = { catalog: null, index: {}, text: {}, bhashya: {} };

// Routing: the URL hash by default; an in-memory route when embedded where
// path-like hashes can't be used (set window.VEDA_MEMORY_ROUTER before loading).
const MEMORY = !!window.VEDA_MEMORY_ROUTER;
let memHash = '';
const getHash = () => (MEMORY ? memHash : location.hash);
function go(h) {
  if (MEMORY) { memHash = h; route(); } else location.hash = h;
}

// ---------- preferences ----------
const PREF_KEY = 'vedalokana.prefs';
const prefs = (() => {
  // Default view is made for chanting: the text in script only, no romanisation or translation.
  // `v` is bumped when defaults change, so an earlier saved reading view moves to the new one once.
  const d = { v: 2, script: 'deva', mode: 'samhita', tr: false, tags: true, bhashya: false, lipi: 'deva', svara: 'bold', suktaBy: 'veda', theme: 'system', menu: 'script', patha: 'std', dfont: 'noto' };
  try {
    const saved = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    if ((saved.v || 1) < 2) { delete saved.script; delete saved.tr; delete saved.mode; }
    return { ...d, ...saved, v: 2 };
  } catch { return d; }
})();
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ } }

// ---------- Kannada script (conversion lives in lipi.js) ----------
function convertTree(root) {
  if (prefs.lipi !== 'knda' || !root.querySelectorAll) return;
  const els = [...root.querySelectorAll('[lang="sa"], .suggest a span, .search-results a span')];
  if (root.matches?.('[lang="sa"]')) els.push(root);
  for (const el of els) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (/[\u0900-\u097F]/.test(n.nodeValue)) n.nodeValue = toKnda(n.nodeValue);
    if (el.getAttribute('lang') === 'sa') el.setAttribute('lang', 'sa-Knda');
  }
}
new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach((n) => n.nodeType === 1 && convertTree(n)); })
  .observe(document.body, { childList: true, subtree: true });
const lipiName = () => (prefs.lipi === 'knda' ? 'ಕನ್ನಡ' : 'देवनागरी');
// Switch script from anywhere, keeping the reader's place on the page.
let keepScrollY = null;
let lastRead = null;    // the open section and how far down it the reader is, for Continue on Home
let storyResume = null; // reopen chant view at this verse after a re-render (script switch, next section)
let readerNav = null;   // previous/next section of the open reader, for gestures and arrow keys
let swipeIn = 0;        // direction the next page slides in from after a swipe
const REDUCED_MOTION = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let keepAnchor = null;
function setLipi(l) {
  if (prefs.lipi === l) return;
  document.querySelectorAll('#brand span, #tabbar [data-tab] span').forEach((e) => { e.textContent = ''; });
  // remember which verse is at the top of the screen, not just the pixel offset,
  // because the two scripts wrap lines differently; measure before the font changes
  const head = $('.topbar').getBoundingClientRect().bottom + ($('#pathbar').hidden ? 0 : $('#pathbar').offsetHeight);
  const verses = [...document.querySelectorAll('.verse[id]')];
  const anchor = verses.find((el) => el.getBoundingClientRect().top >= head - 4)
    || verses.find((el) => el.getBoundingClientRect().bottom > head + 8);
  keepScrollY = window.scrollY;
  keepAnchor = anchor ? { id: anchor.id, top: anchor.getBoundingClientRect().top } : null;
  prefs.lipi = l; savePrefs(); applyLipiClass(); applyMenu();
  route();
}
function paintLipiToggle() {
  document.querySelectorAll('#lipiToggle [data-lipi]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lipi === prefs.lipi)));
}
// ---------- Ṛgveda svara style: single svarita (as printed) or dīrgha svarita (South Indian books) ----------
const PATHA = { std: ['Śṛṅgeri style', 'शृङ्गेरी पाठः'], dirgha: ['Kāñcī · Mādhva style', 'काञ्ची · माध्व पाठः'] };
const svaraLines = (textId, lines) => (prefs.patha === 'dirgha' && textId === 'rv' ? lines.map(dirghaLine) : lines);

// ---------- menus in the reading script, or English ----------
const SA = () => prefs.menu !== 'en';
const dg = (x) => String(x).replace(/[0-9]/g, (d) => '०१२३४५६७८९'[d]);
const inLipi = (x) => (prefs.lipi === 'knda' ? toKnda(x) : x);
const T = (en, sa) => (SA() && sa ? `<span lang="sa">${esc(sa)}</span>` : esc(en));            // HTML
const Tp = (en, sa) => (SA() && sa ? inLipi(sa) : en);                                            // plain text
const F = (n) => (SA() ? `<span lang="sa">${dg(Number(n).toLocaleString('en-IN'))}</span>` : fmt(n)); // counts
const N = (x) => (SA() ? `<span lang="sa">${esc(dg(x))}</span>` : esc(String(x)));                  // references
const lvl = (name, plural = false) => LEVEL_SA[name]?.[plural ? 1 : 0];
const unitSa = (t) => (t.id === 'rv' ? 'ऋचः' : lvl(t.levels[2], true) || 'मन्त्राः');
const unitHTML = (t) => T(unitName(t), unitSa(t));
const groupSa = (meta, d1) => (meta.groupNames?.[d1] ? GROUP_SA[meta.groupNames[d1]] || null : (lvl(meta.levels[0]) ? `${lvl(meta.levels[0])} ${dg(d1)}` : null));
const contSa = (meta, cref) => (cref ? `${lvl(meta.levels[1] || meta.levels[2]) || ''} ${dg(cref)}`.trim() : null);
const refSa = (meta, ref) => `${REF_SA[meta.id] || meta.deva} ${dg(ref)}`.trim();
const refHTML = (meta, ref) => (SA() ? `<span lang="sa">${esc(refSa(meta, ref))}</span>` : esc(`${meta.ref} ${ref}`.trim()));
const refText = (meta, ref) => (SA() ? inLipi(refSa(meta, ref)) : `${meta.ref} ${ref}`.trim());
function setMenu(m) {
  if (prefs.menu === m) return;
  prefs.menu = m; savePrefs(); applyMenu(); route();
}
function applyMenu() {
  document.querySelectorAll('#tabbar [data-tab]').forEach((a) => {
    const k = a.dataset.tab; const span = a.querySelector('span');
    const en = { home: 'Home', library: 'Library', suktas: 'Sūktas', search: 'Search', settings: 'Settings' }[k];
    span.innerHTML = T(en, MENU_SA[k]);
  });
  $('#brand span').innerHTML = T('Vedālokana', 'वेदालोकनम्');
  const b = $('#menuBtn');
  if (b) { b.setAttribute('aria-pressed', String(!SA())); b.title = SA() ? 'Show menus in English' : 'Show menus in the reading script'; }
}
document.getElementById('menuBtn')?.addEventListener('click', () => setMenu(SA() ? 'en' : 'script'));

function applyLipiClass() {
  document.body.classList.toggle('kn', prefs.lipi === 'knda');
  document.body.classList.toggle('svara-std', prefs.svara === 'std');
  document.body.classList.toggle('f-shobhika', prefs.dfont === 'shobhika');
}
applyLipiClass();

// ---------- theme: 'system' follows the device; 'light' / 'dark' override it ----------
const THEMES = { system: 'Match device', light: 'Light', dark: 'Dark' };
const darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() {
  const root = document.documentElement;
  if (prefs.theme === 'light' || prefs.theme === 'dark') root.setAttribute('data-theme', prefs.theme);
  else root.removeAttribute('data-theme');
  const dark = prefs.theme === 'dark' || (prefs.theme !== 'light' && darkMQ?.matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101215' : '#F5F6F4');
  const b = document.getElementById('themeBtn');
  if (b) { b.dataset.t = prefs.theme; b.setAttribute('aria-label', `Theme: ${THEMES[prefs.theme].toLowerCase()}. Tap to change`); b.title = `Theme: ${THEMES[prefs.theme]}`; }
  document.querySelectorAll('[data-k="theme"]').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.v === prefs.theme)));
}
function setTheme(t) { prefs.theme = t; savePrefs(); applyTheme(); }
document.getElementById('themeBtn')?.addEventListener('click', () => {
  const order = ['system', 'light', 'dark'];
  setTheme(order[(order.indexOf(prefs.theme) + 1) % 3]);
});
darkMQ?.addEventListener?.('change', applyTheme);
applyTheme();

// ---------- version, installing and offline ----------
const APP = self.VEDALOKANA || { version: '0.0.0', released: '' };
const CHANGES = [
  ['1.4.0', '2026-10-31', [
    'Every anudātta now sits at one depth under the line, instead of stepping up and down with each letter.',
    'Shobhika (IIT Bombay) as a second Devanagari font, with or without heavier svara marks: Settings → Devanagari font.']],
  ['1.3.0', '2026-10-31', [
    'Ṛgveda svara style: Śṛṅgeri (one stroke for every svarita) or Kāñcī · Mādhva (dīrgha svarita ᳚ on heavy syllables, kampa vowels spelled out), in the reader and in Settings.']],
  ['1.2.1', '2026-10-31', ['Check for updates now asks the server for the published version, downloads it and offers a restart; installed copies also notice new versions sooner.']],
  ['1.2.0', '2026-10-31', [
    'One-tap icons at the top of each sūkta to show or hide ṛṣi · devatā · chandas, the translation and the Sāyaṇa bhāṣya.',
    'Reader buttons take the colour of their Veda.']],
  ['1.1.0', '2026-10-31', [
    'Menus and labels follow the reading script: tabs, Veda and level names, ṛṣi · devatā · chandas, references and numbers in Sanskrit, in Devanagari or Kannada.',
    'An En button beside the script switch, and a setting, bring back English menus at any time.']],
  ['1.0.0', '2026-10-31', [
    'Install Vedālokana as an app; it opens and works without a connection.',
    'Download each Veda, and the Sāyaṇa bhāṣya, for offline reading from Settings.',
    'All fonts are now part of the app, so offline looks the same as online.',
    'About page with the version, what’s new and an update check.']],
  ['0.9.0', '2026-10-31', [
    'New Home: local pañcāṅga, today’s mantra, continue chanting, Veda tiles with their own icons and an āśrama-at-dawn background.',
    'Each Veda’s page opens on a wheel of its maṇḍalas, kāṇḍas or adhyāyas, with its most addressed devatās.',
    'Chant view: one mantra at a time, full screen, with swipe and tap to move on.',
    'Light, dark or match-device theme, and higher-contrast buttons.']],
  ['0.8.0', '2026-10-31', [
    'Sāyaṇa’s bhāṣya for the whole Ṛgveda, beside each ṛk.',
    'Swipe between sūktas and sections; the tab bar stays within reach in the reader.',
    'Ṛṣi, devatā and chandas at the top and only where they change, with a switch to hide them.',
    'Chant-friendly reading by default: the script alone, no translation.',
    'Anudātta marks clear subscript consonants; stray “?” marks from the sources removed.']],
  ['0.5.0', '2026-10-30', [
    'Brāhmaṇas, Āraṇyakas, Upaniṣads and the Kṛṣṇa Yajurveda.',
    'Kannada script with svara marks, switched in one tap; bolder svara marks.',
    'Famous sūktas, and app-style navigation across the levels of each Veda.']],
  ['0.1.0', '2026-10-30', ['First release: the four Saṃhitās with svara marks, browsable by ṛṣi, devatā and chandas.']],
];
const DATA_CACHE = 'vedalokana-data';
const swOK = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
const fmtMB = (b) => `${b >= 1e7 ? Math.round(b / 1e6) : (b / 1e6).toFixed(1)} MB`;
const fmtDay = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

function toast(html, ms = 5000) {
  const t = document.createElement('div');
  t.className = 'swipe-tip app-toast'; t.innerHTML = html; t.setAttribute('role', 'status');
  document.body.append(t);
  if (ms) { setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 500); }
  return t;
}

if (swOK) {
  const hadController = !!navigator.serviceWorker.controller;
  // updateViaCache 'none': look past the HTTP cache for sw.js and for version.js, which it imports,
  // so a new version is seen as soon as it is published.
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* not available in this view */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || document.getElementById('updOut')?.textContent.includes('ready')) return;  // first install, or About already offers it
    const t = toast('A new version of Vedālokana is ready. <button type="button">Reload</button>', 0);
    t.querySelector('button').addEventListener('click', () => location.reload());
  });
}

// Compare a.b.c versions numerically.
const newer = (a, b) => {
  const x = a.split('.').map(Number); const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};
// Ask the server which version is published (past every cache), then fetch and switch to it.
async function checkForUpdate(btn, out) {
  const say = (t) => { out.textContent = t; };
  btn.disabled = true; say('Checking…');
  const finish = () => { btn.disabled = false; };
  if (!navigator.onLine) { say('You are offline. Check again when connected.'); return finish(); }
  let latest = null;
  try {
    const r = await fetch(`version.js?fresh=${Date.now()}`, { cache: 'no-store' });
    latest = (await r.text()).match(/version:\s*'([^']+)'/)?.[1] || null;
  } catch { /* handled below */ }
  if (!latest) { say('Couldn’t reach the server. Try again in a moment.'); return finish(); }
  if (!newer(latest, APP.version)) { say(`You have the latest version, ${APP.version}.`); return finish(); }
  const restart = () => {
    say(`Version ${latest} is ready.`);
    btn.textContent = `Restart to use ${latest}`; btn.disabled = false;
    btn.onclick = () => location.reload();
  };
  const reg = swOK ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
  if (!reg) return restart();
  say(`Downloading version ${latest}…`);
  try { await reg.update(); } catch { /* fall through: a reload still fetches it */ }
  const w = reg.installing || reg.waiting;
  if (!w) return restart();
  if (w.state === 'activated') return restart();
  w.addEventListener('statechange', () => {
    if (w.state === 'activated') restart();
    if (w.state === 'redundant') { say('The update didn’t install. Try again in a moment.'); finish(); }
  });
}

async function offlineIndex() {
  return (cache.offline ||= await json('data/offline.json'));
}
async function storedSet() {
  if (!('caches' in window)) return null;
  const c = await caches.open(DATA_CACHE);
  return new Set((await c.keys()).map((r) => r.url));
}
const abs = (f) => new URL(f, document.baseURI).href;

async function renderOffline(el) {
  if (!el) return;
  if (!('caches' in window)) { el.innerHTML = '<p>Offline storage isn’t available in this browser view. Open the app from its own address to install it.</p>'; return; }
  let idx;
  try { idx = await offlineIndex(); } catch { el.innerHTML = '<p>Connect once to see what can be downloaded.</p>'; return; }
  const have = await storedSet();
  const est = await navigator.storage?.estimate?.().catch(() => null);
  const row = (p) => {
    const n = p.files.filter((f) => have.has(abs(f))).length;
    const done = n === p.files.length;
    const state = done ? 'Downloaded' : n ? `${Math.round((n / p.files.length) * 100)}% stored` : 'Not downloaded';
    return `<div class="off-row${p.of ? ' sub' : ''}" data-pack="${esc(p.id)}" style="--vc: var(--v-${esc(p.of || p.id)})">
      <span class="off-dot" aria-hidden="true"></span>
      <span class="off-t"><b>${esc(p.name)}</b><small>${fmtMB(p.bytes)} · <span class="off-s">${state}</span></small>
        <span class="off-bar" hidden><i></i></span></span>
      ${done ? `<button type="button" class="off-btn ghost" data-act="rm">Remove</button>` : `<button type="button" class="off-btn" data-act="get">${n ? 'Finish' : 'Download'}</button>`}
    </div>`;
  };
  const total = idx.packs.reduce((a, p) => a + p.bytes, 0);
  const allDone = idx.packs.every((p) => p.files.every((f) => have.has(abs(f))));
  el.innerHTML = `${idx.packs.map(row).join('')}
    <div class="off-foot"><span>${est?.usage ? `Using ${fmtMB(est.usage)} on this device` : ''}</span>
    ${allDone ? '' : `<button type="button" class="off-btn ghost" data-act="all">Download everything · ${fmtMB(total)}</button>`}</div>
    ${navigator.onLine ? '' : '<p class="off-note">You are offline: downloads will start when you reconnect.</p>'}`;
  const run = async (pack, rowEl) => {
    const bar = rowEl.querySelector('.off-bar'); const fill = bar.querySelector('i'); const st = rowEl.querySelector('.off-s');
    rowEl.querySelector('.off-btn').disabled = true;
    bar.hidden = false;
    navigator.storage?.persist?.().catch(() => {});
    const c = await caches.open(DATA_CACHE);
    const todo = pack.files.filter((f) => !have.has(abs(f)));
    let done = pack.files.length - todo.length; let failed = 0;
    const tick = () => { fill.style.width = `${(done / pack.files.length) * 100}%`; st.textContent = `Downloading… ${Math.round((done / pack.files.length) * 100)}%`; };
    tick();
    const worker = async () => {
      while (todo.length) {
        const f = todo.shift();
        try { const r = await fetch(f); if (!r.ok) throw new Error(r.status); await c.put(abs(f), r); have.add(abs(f)); } catch { failed++; }
        done++; tick();
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    return failed;
  };
  el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
    const act = b.dataset.act;
    if (act === 'all') {
      b.disabled = true;
      let failed = 0;
      for (const p of idx.packs) {
        const r = el.querySelector(`[data-pack="${CSS.escape(p.id)}"]`);
        if (p.files.some((f) => !have.has(abs(f)))) failed += await run(p, r);
      }
      if (failed) toast(`${failed} files could not be downloaded. Try again when the connection is steadier.`);
      return renderOffline(el);
    }
    const rowEl = b.closest('.off-row'); const p = idx.packs.find((x) => x.id === rowEl.dataset.pack);
    if (act === 'get') {
      const failed = await run(p, rowEl);
      if (failed) toast(`${failed} files could not be downloaded. Try again when the connection is steadier.`);
    } else {
      const c = await caches.open(DATA_CACHE);
      await Promise.all(p.files.map((f) => c.delete(abs(f))));
    }
    renderOffline(el);
  }));
}

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('en-US');
const cap = (s) => String(s).replace(/(^|[\s-])(\S)/g, (m, a, b) => a + b.toUpperCase());

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
  return r.json();
}
async function catalog() { return (cache.catalog ||= await json('data/catalog.json')); }
async function vedaMeta(id) { return (await catalog()).texts.find((v) => v.id === id); }
async function vedaGroup(id) { return (await catalog()).vedas.find((v) => v.id === id); }
async function index(id) {
  if (!cache.index[id]) {
    const x = await json(`data/${id}/index.json`);
    x.keyIndex = {};
    for (const f of FKEYS) x.keyIndex[f] = new Map(x.facets[f].map((e, i) => [e[0], i]));
    cache.index[id] = x;
  }
  return cache.index[id];
}
async function text(id, d1) {
  const k = `${id}/${d1}`;
  return (cache.text[k] ||= await json(`data/${id}/t${d1}.json`));
}

// Sāyaṇa's bhāṣya comes in files of 20 sūktas (scripts/sayana.mjs), fetched on demand.
async function bhashya(id, d1, d2) {
  const k = `${id}/s${d1}-${Math.floor((d2 - 1) / 20)}`;
  try { return ((cache.bhashya[k] ||= await json(`data/${k}.json`)) || {})[d2] || {}; } catch { return {}; }
}
// “word marks a word of the mantra being explained (pratīka); shown in bold.
const bhashyaHTML = (t) => esc(t).replace(/[“"]([^\s।॥,;:()'‘’“”"]+)”?/g, '<b>$1</b>');

function refOf(meta, d1, d2, v, label) {
  if (meta.refFmt === 'label' && label) return label;
  const parts = meta.refFmt === 'v' ? [v] : meta.refFmt === 'd2.v' ? [d2, v] : [d1, d2, v];
  return parts.filter((p) => p !== undefined && p !== null).join('.');
}
function containerRef(meta, d1, d2, title) {
  if (meta.refFmt === 'label') return title || `${d1}.${d2}`;
  if (meta.refFmt === 'v') return '';
  return meta.refFmt === 'd2.v' ? `${d2}` : `${d1}.${d2}`;
}
function containerTitle(x, d1, d2) { return x.groups.find((e) => e[0] === d1)?.[1].find((c) => c[0] === d2)?.[2] || null; }
function groupName(meta, d1) {
  if (meta.groupNames?.[d1]) return meta.groupNames[d1];
  return `${meta.levels[0]} ${d1}`;
}
function facetName(e) { // e = [key, iast, deva, n, containers]
  return { iast: cap(e[1]), deva: e[2] };
}
function nameHTML(e, cls = '') {
  const { iast, deva } = facetName(e);
  return `${deva ? `<span class="dv ${cls}" lang="sa">${esc(deva)}</span> ` : ''}<span class="ia">${esc(iast)}</span>`;
}
function findHref(id, filters) {
  const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
  return `#/v/${id}/find?${q}`;
}
function setTitle(t) { document.title = t ? `${t} — Vedālokana` : 'Vedālokana — browse Veda mantras'; }

function badgesHTML(meta) {
  const tagged = meta.layer === 'samhita';
  const has = [
    ['Svara marks', meta.has.svara],
    ['IAST', meta.has.roman],
    ['Padapāṭha', meta.has.pada],
    [meta.has.translation ? `English · ${meta.has.translation}` : 'English', !!meta.has.translation],
    ...(meta.has.bhashya ? [[`${meta.has.bhashya} bhāṣya`, true]] : []),
    ...(tagged ? [
      ['Ṛṣi', meta.facets.includes('rishi')],
      ['Devatā', meta.facets.includes('devata')],
      ['Chandas', meta.facets.includes('chandas')],
    ] : []),
  ].filter(([l, ok]) => ok || tagged || !/Padap|English/.test(l));
  return `<div class="badges">${has.map(([l, ok]) => `<span class="badge${ok ? '' : ' no'}">${esc(l)}</span>`).join('')}</div>`;
}

// ---------- rail ----------
async function renderRail(rt) {
  const cat = await catalog();
  const id = rt.veda;
  const meta = id && cat.texts.find((v) => v.id === id);
  const vid = meta ? meta.veda : rt.group;
  const cur = (href) => (getHash() === href || getHash().startsWith(`${href}?`) ? ' aria-current="page"' : '');
  let h = `<div class="lipi" role="group" aria-label="Script for Sanskrit text"><span>Script</span>
    <button data-lipi="deva" aria-pressed="${prefs.lipi === 'deva'}">देवनागरी</button><button data-lipi="knda" aria-pressed="${prefs.lipi === 'knda'}">ಕನ್ನಡ</button></div>`;
  h += `<a href="#/suktas"${rt.parts[0] === 'suktas' ? ' aria-current="page"' : ''}><span>Famous sūktas</span><span class="dv" lang="sa">सूक्तानि</span></a>`;
  h += `<h2>Vedas</h2>`;
  for (const v of cat.vedas) {
    h += `<a href="#/veda/${v.id}"${v.id === vid && !id ? ' aria-current="page"' : ''}><span>${esc(v.name)}</span><span class="dv" lang="sa">${esc(v.deva)}</span></a>`;
    if (v.id === vid) {
      for (const l of cat.layers) for (const t of v.layers[l]) {
        const tm = cat.texts.find((x) => x.id === t);
        h += `<a class="sub" href="#/v/${t}"${t === id && !rt.sub ? ' aria-current="page"' : ''}><span>${esc(tm.name)}</span><span class="n">${esc(LAYERS[l].label)}</span></a>`;
      }
    }
  }
  if (meta) {
    h += `<h2>Browse ${esc(meta.name)}</h2>`;
    h += `<a href="#/v/${id}/g"${cur(`#/v/${id}/g`)}><span>Structure</span><span class="n">${fmt(meta.containers)}</span></a>`;
    for (const f of FKEYS) {
      if (meta.facets.includes(f)) h += `<a href="#/v/${id}/f/${f}"${cur(`#/v/${id}/f/${f}`)}><span>${FACETS[f].label}</span><span class="n">${fmt(meta.facetCounts[f])}</span></a>`;
    }
  }
  h += `<h2>Project</h2><a href="#/about"${cur('#/about')}><span>Sources and licences</span></a>`;
  rail.innerHTML = h;
  rail.querySelectorAll('[data-lipi]').forEach((b) => b.addEventListener('click', () => {
    if (prefs.lipi === b.dataset.lipi) return;
    setLipi(b.dataset.lipi);
  }));
}

// ---------- views ----------
// ---------- home ----------
const VEDA_ICON = {
  rv: '<path d="M24 6c6 7 10 11 10 18a10 10 0 0 1-20 0c0-4 2-7 4-9 0 4 2 6 4 6-2-6 0-11 2-15z"/><path d="M24 22c3 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2-5 4-8z"/><path d="M10 40h28M14 44h20"/>',
  syv: '<circle cx="24" cy="16" r="8"/><path d="M24 3v3M9 16h3M36 16h3M14 6l2 2M34 6l-2 2"/><path d="M8 30h32l-4 6H12z"/><path d="M12 36v6h24v-6"/><path d="M20 30c-1-3 1-5 4-7 3 2 5 4 4 7"/>',
  kyv: '<path d="M14 5a7 7 0 1 0 6 11 6 6 0 1 1-6-11z"/><path d="M33 20a5 5 0 1 1 7 4l-4 2c1 6-4 13-14 13-8 0-13-5-14-10l-3-4 6 1c3-5 9-7 15-6z"/><path d="M41 18l3 1-3 1"/><path d="M18 30c3 2 7 2 10 0M20 34c2 1 5 1 7 0" stroke-width="1.5"/><path d="M20 39l-1 5M27 39l1 5"/><circle cx="37.5" cy="19.5" r=".6" fill="currentColor"/>',
  sv: '<path d="M6 30c5-10 9-10 13 0s8 10 12 0 8-10 11 0"/><circle cx="8" cy="14" r="2"/><circle cx="15" cy="10" r="2"/><circle cx="22" cy="8" r="2"/><circle cx="29" cy="10" r="2"/><circle cx="36" cy="14" r="2"/><path d="M10 40h28"/>',
  av: '<circle cx="24" cy="24" r="19" stroke-dasharray="3 4"/><path d="M24 38V18"/><path d="M24 26c-6 0-10-4-10-10 6 0 10 4 10 10zM24 22c5 0 9-3 9-9-5 0-9 3-9 9z"/><path d="M18 38h12"/>',
};
const vedaIcon = (id, cls) => VEDA_ICON[id] ? `<svg class="${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${VEDA_ICON[id]}</svg>` : '';
// Line drawing of an āśrama at dawn — banyan, parṇaśālā, a ṛṣi seated by the homa fire — shown faintly behind Home.
const ASHRAMA_SVG = `<div class="home-scene" aria-hidden="true"><svg class="scene" viewBox="0 0 800 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <g class="sun-g"> <path d="M520 196a60 60 0 0 1 120 0"/> <path d="M580 120v-18M535 136l-11-13M625 136l11-13M507 166l-15-7M653 166l15-7M496 196h-16M664 196h16" stroke-width="1.6"/> </g> <path d="M430 92q7-6 13 0q6-6 13 0M470 70q5-5 10 0q5-5 10 0M398 118q5-4 9 0q5-4 9 0" stroke-width="1.5"/> <path d="M0 214c70-34 120-46 190-24s110 4 170-20 120-26 190 6 130 30 250 0" /> <path d="M0 236c90-16 160-6 250 2s160-10 260-6 170 14 290 2" stroke-width="1.5" opacity=".7"/> <g> <path d="M96 252c4-30 6-54 2-80M112 252c-2-32 0-56 8-82"/> <path d="M98 176c-14-10-30-12-44-4M118 172c12-12 30-16 46-8M104 172c0-14 2-24 8-34"/> <path d="M40 166c-22-6-28-30-10-42-8-20 10-38 30-32 6-22 34-28 50-14 16-16 44-10 50 10 22-2 34 20 24 36 16 12 8 38-14 40-6 14-26 20-40 12-14 10-36 10-50 0-16 8-36 2-40-10z"/> <path d="M58 168v40M76 172v54M140 170v44M158 166v30" stroke-width="1.2" opacity=".8"/> </g> <g> <path d="M232 252v-62h104v62"/> <path d="M216 194l68-58 68 58"/> <path d="M234 178l-6 8M252 162l-8 12M270 148l-8 14M298 148l8 14M316 162l8 12M334 178l6 8" stroke-width="1.4"/> <path d="M270 252v-38a14 14 0 0 1 28 0v38"/> <path d="M216 194h136" stroke-width="1.4"/> </g> <g> <circle cx="430" cy="196" r="9"/> <path d="M425 188c0-8 10-10 12-3"/> <path d="M430 186c4-8 10-9 12-4" stroke-width="1.4"/> <path d="M420 212c-4 10-6 20-6 30M440 212c4 10 6 20 6 30"/> <path d="M420 212c6-6 14-6 20 0"/> <path d="M402 250c10-10 46-10 56 0c-18 6-38 6-56 0z"/> <path d="M418 226c6 6 18 6 24 0" stroke-width="1.4"/> </g> <g> <path d="M478 252h44l-6-12h-32z"/> <path d="M500 238c-10-8-6-18 0-26 2 8 8 8 6 16 4-2 6-6 5-10 6 8 4 18-11 20z"/> </g> <g><path d="M372 252h22l4-22h-30z"/><path d="M383 230v-14M383 222l-7-6M383 218l7-6M383 226l6-4" stroke-width="1.4"/></g> <path d="M0 270c80-6 140 8 230 4s170-12 260-6 190 10 310 0" stroke-width="1.4" opacity=".7"/> <path d="M120 286c70-4 130 4 200 2M480 288c80-4 150 2 240-2" stroke-width="1.2" opacity=".5"/> </svg></div>`;
const VEDA_GLYPH = { rv: 'ऋ', syv: 'य', kyv: 'य', sv: 'सा', av: 'अ' };
const HOME_SUKTAS = ['Puruṣa Sūkta', 'Śrī Rudram', 'Nāsadīya Sūkta', 'Medhā Sūkta', 'Durgā Sūkta', 'Hiraṇyagarbha Sūkta', 'Śānti Mantra'];
const SUN_SVG = `<svg class="hero-sun" width="260" height="260" viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="46"/><circle cx="130" cy="130" r="70" class="r1"/><circle cx="130" cy="130" r="94" class="r2"/><circle cx="130" cy="130" r="118" class="r3"/></svg>`;
const ARROW = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

async function viewHome() {
  setTitle('');
  const cat = await catalog();
  // Today's mantra comes from the Ṛgveda; offline, before the Ṛgveda is stored, show the Gāyatrī.
  let m = { lines: ['तत्स॑वि॒तुर्वरे॑ण्यं॒ भर्गो॑ दे॒वस्य॑ धीमहि ।', 'धियो॒ यो नः॑ प्रचो॒दया॑त् ॥'], ref: '3.62.10', tags: 'Savitṛ · Viśvāmitra Gāthina · Gāyatrī', tagsSa: 'सविता · विश्वामित्रो गाथिनः · गायत्री', href: '#/v/rv/c/3/62?v=10' };
  try {
    const rv = await index('rv');
    const meta = cat.texts.find((v) => v.id === 'rv');
    const day = Math.floor(Date.now() / 86400000);
    const row = rv.rows[(day * 7919) % rv.rows.length];
    const t = await text('rv', row[0]);
    const verse = t[row[1]].find((x) => x[0] === row[2]);
    const dev = row[COL.devata] >= 0 ? rv.facets.devata[row[COL.devata]] : null;
    const ris = row[COL.rishi] >= 0 ? rv.facets.rishi[row[COL.rishi]] : null;
    const cha = row[COL.chandas] >= 0 ? rv.facets.chandas[row[COL.chandas]] : null;
    m = { lines: verse[1], ref: refOf(meta, row[0], row[1], row[2]), tags: [dev, ris, cha].filter(Boolean).map((e) => cap(e[1])).join(' · '), tagsSa: [dev, ris, cha].filter(Boolean).map((e) => e[2] || e[1]).join(' · '), href: `#/v/rv/c/${row[0]}/${row[1]}?v=${row[2]}` };
  } catch { /* keep the Gāyatrī */ }
  const byId = Object.fromEntries(cat.texts.map((x) => [x.id, x]));
  let last = null;
  try { last = JSON.parse(localStorage.getItem('vedalokana.last') || 'null'); } catch { /* storage unavailable */ }
  let suk = [];
  try { suk = (cache.suktas ||= await json('data/suktas.json')); } catch { /* optional */ }
  const chips = HOME_SUKTAS.map((n) => suk.find((s) => s.name.startsWith(n))).filter(Boolean).slice(0, 6);
  const pct = last?.of ? Math.min(1, last.v / last.of) : 0;
  main.innerHTML = `${ASHRAMA_SVG}<div class="home">
    <section class="pc" id="pc" aria-label="Today’s pañcāṅga"></section>
    <section class="hero" aria-labelledby="todayH">
      ${SUN_SVG}
      <h1 id="todayH" class="hero-k">${T('Today’s mantra', 'अद्यतनमन्त्रः')}</h1>
      <div class="hero-m" lang="sa">${svaraLines('rv', m.lines).map((l) => `<div>${esc(l)}</div>`).join('')}</div>
      <div class="hero-f">
        <span class="hero-r"><b>${SA() ? `<span lang="sa">ऋग्वेदः ${esc(dg(m.ref))}</span>` : `Ṛgveda ${esc(m.ref)}`}</b><span>${T(m.tags, m.tagsSa)}</span></span>
        <a class="hero-go" href="${m.href}" aria-label="Open Ṛgveda ${esc(m.ref)} in the reader">${ARROW}</a>
      </div>
    </section>
    ${last ? `<a class="cont" href="${esc(last.href)}">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" class="ring-bg"/><circle cx="24" cy="24" r="20" class="ring" stroke-dasharray="${(pct * 125.7).toFixed(1)} 126" transform="rotate(-90 24 24)"/></svg>
      <span class="cont-t"><small>${T('Continue chanting', 'पाठम् अनुवर्तय')}</small><b>${SA() && last.whereSa ? `<span lang="sa">${esc(last.whereSa)}</span>` : esc(last.where)}</b><small>${SA() && last.textSa ? `<span lang="sa">${esc(last.textSa)}</span>` : esc(last.text)}${last.of ? ` · ${SA() ? `<span lang="sa">${dg(last.v)} / ${dg(last.of)}</span>` : `${last.v} of ${last.of}`}` : ''}</small></span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></a>` : ''}
    <div class="sec-h"><h2>${T('The Vedas', 'वेदाः')}</h2><a href="#/library">${T('Library', MENU_SA.library)}</a></div>
    <div class="vtiles">${cat.vedas.map((v) => {
    const s = v.layers.samhita.map((i) => byId[i]).find((x) => x.has.svara || x.has.roman) || byId[v.layers.samhita[0]];
    return `<a class="vtile" href="#/veda/${v.id}" style="--vc: var(--v-${v.id})">
        ${VEDA_ICON[v.id] ? vedaIcon(v.id, 'vt-i') + vedaIcon(v.id, 'vt-w') : `<span class="vt-g" lang="sa">${esc(VEDA_GLYPH[v.id] || v.deva[0])}</span>`}
        <span class="vt-n"><b>${T(v.name, VEDA_SA[v.id])}</b><small>${s ? `${F(s.verses)} ${unitHTML(s)}` : ''}</small></span></a>`;
  }).join('')}</div>
    ${chips.length ? `<div class="sec-h"><h2>${T('Sūktas', 'सूक्तानि')}</h2><a href="#/suktas">${SA() ? `<span lang="sa">सर्वाणि ${dg(suk.length)}</span>` : `All ${suk.length}`}</a></div>
    <div class="schips">${chips.map((s) => `<a class="schip" href="${esc(s.href)}${s.v ? `?v=${s.v}` : ''}"><span lang="sa">${esc(s.deva)}</span><small>${SA() ? `<span lang="sa">${esc(refSa({ id: s.text, deva: '' }, s.ref.replace(/^\S+\s/, '')))}</span>` : esc(s.ref)}</small></a>`).join('')}</div>` : ''}
    <p class="lede home-foot">Every text comes from an openly published digital edition. <a href="#/about">About Vedālokana ${esc(APP.version)}: sources and what’s new.</a></p>
  </div>`;
  renderPanchanga();
}

// ---------- local pañcāṅga ----------
const PLACE_KEY = 'vedalokana.place';
function place() {
  try { const p = JSON.parse(localStorage.getItem(PLACE_KEY) || 'null'); if (p) return p; } catch { /* storage unavailable */ }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (/Kolkata|Calcutta/.test(tz)) return { lat: 12.9716, lon: 77.5946, name: 'Bengaluru', guess: true };
  return { lat: 20, lon: -new Date().getTimezoneOffset() / 4, name: 'Your time zone', guess: true };
}
const hm = (t, base) => {
  const next = new Date(t).getDate() !== new Date(base).getDate();
  if (SA()) {
    const s = dg(new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    return `<span lang="sa">${next ? 'श्वः ' : ''}${s}</span>`;
  }
  const s = new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return esc(next ? `${s} tomorrow` : s);
};
const till = (t, base) => (SA() ? `${hm(t, base)} <span lang="sa">पर्यन्तम्</span>` : `till ${hm(t, base)}`);
async function renderPanchanga() {
  const el = document.getElementById('pc'); if (!el) return;
  const pl = place();
  let p;
  try { p = (await import('./panchanga.js')).panchanga(new Date(), pl.lat, pl.lon); } catch { el.remove(); return; }
  const now = Date.now();
  el.innerHTML = `<div class="pc-top">
      <span class="pc-date">${SA()
    ? `<span lang="sa">${esc(dg(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' }).replace(/\//g, '-')))}</span>`
    : esc(new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }))}</span>
      <button class="pc-loc" type="button" aria-label="Pañcāṅga place: ${esc(pl.name)}. Use my location">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>
        <span>${esc(pl.name)}</span></button>
    </div>
    <div class="pc-main"><span lang="sa">${esc(p.masa)} ${esc(p.paksha)} ${esc(p.tithi)}</span></div>
    <div class="pc-sub" lang="sa">${esc(p.samvatsara)} संवत्सर · ${esc(p.rtu)} ऋतु · ${esc(p.ayana)} · ${esc(p.vara)}</div>
    <dl class="pc-grid">
      <div><dt>${T('Tithi', 'तिथिः')}</dt><dd><span lang="sa">${esc(p.tithi)}</span><small>${till(p.tithiEnd, now)}</small></dd></div>
      <div><dt>${T('Nakṣatra', 'नक्षत्रम्')}</dt><dd><span lang="sa">${esc(p.nakshatra)}</span><small>${till(p.nakshatraEnd, now)}</small></dd></div>
      <div><dt>${T('Yoga', 'योगः')}</dt><dd><span lang="sa">${esc(p.yoga)}</span><small>${till(p.yogaEnd, now)}</small></dd></div>
      <div><dt>${T('Karaṇa', 'करणम्')}</dt><dd><span lang="sa">${esc(p.karana)}</span><small>${T('at sunrise', 'सूर्योदये')}</small></dd></div>
      <div class="pc-sun"><dt>${T('Sun', 'सूर्यः')}</dt><dd><span>↑ ${hm(p.sunrise, now)}</span><small>↓ ${p.sunset ? hm(p.sunset, now) : '–'}</small></dd></div>
    </dl>
    ${pl.guess ? `<p class="pc-note">${T('Times for the place shown. Tap it to use your location.', 'दर्शितस्थानस्य कालाः। स्वस्थानाय स्पृशतु।')}</p>` : ''}`;
  el.querySelector('.pc-loc').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      try { localStorage.setItem(PLACE_KEY, JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Your location' })); } catch { /* storage unavailable */ }
      renderPanchanga();
    }, () => { el.querySelector('.pc-note')?.replaceChildren('Location not available; showing the default place.'); }, { maximumAge: 864e5, timeout: 10000 });
  });
}

async function viewVedaGroup(vid, layerArg) {
  const cat = await catalog();
  const v = cat.vedas.find((x) => x.id === vid);
  if (!v) return notFound();
  const layer = layerArg && LAYERS[layerArg] ? layerArg : cat.layers.find((l) => v.layers[l].length);
  setTitle(`${v.name}, ${LAYERS[layer].plural}`);
  const byId = Object.fromEntries(cat.texts.map((x) => [x.id, x]));
  const card = (t) => `<a class="text-card" href="#/v/${t.id}">
      <span class="tc-top"><span class="dv" lang="sa">${esc(t.deva)}</span>
        <svg class="go" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></span>
      ${SA() ? '' : `<span class="nm">${esc(t.name)}</span>`}
      ${t.shakha ? `<span class="sk">${esc(t.shakha)} śākhā</span>` : ''}
      <span class="ct">${SA() ? `${F(t.verses)} ${unitHTML(t)}${t.containers > 1 && lvl(t.levels[1]) ? ` · ${F(t.containers)} ${T('', lvl(t.levels[1], true))}` : ''}` : `${fmt(t.verses)} ${esc(unitName(t))}${t.containers > 1 ? ` in ${fmt(t.containers)} ${esc((t.levels[1] || 'section').toLowerCase())}s` : ''}`}</span>
      ${badgesHTML(t)}
    </a>`;
  const blurb = {
    samhita: 'The collected mantras.',
    brahmana: 'Prose on the meaning and performance of the ritual.',
    aranyaka: 'The “forest” texts, on the inner meaning of the rites.',
    upanishad: 'The philosophical close of each Veda.',
  }[layer];
  const sam = layer === 'samhita' ? (v.layers.samhita.map((i) => byId[i]).find((x) => x.has.svara || x.has.roman) || byId[v.layers.samhita[0]]) : null;
  main.innerHTML = `<div class="wide veda-page" style="--vc: var(--v-${v.id})">
    <nav class="veda-switch" aria-label="Veda">${cat.vedas.map((x) => `<a href="#/veda/${x.id}${layer !== 'samhita' ? `/${layer}` : ''}"${x.id === v.id ? ' aria-current="page"' : ''} style="--vc: var(--v-${x.id})">${T(x.name.replace(/veda$/, ''), VEDA_SA_SHORT[x.id])}</a>`).join('')}</nav>
    <h1>${SA() ? `<span lang="sa">${esc(VEDA_SA[v.id] || v.deva)}</span>` : `${esc(v.name)}<span class="h1-deva" lang="sa">${esc(v.deva)}</span>`}</h1>
    <nav class="layer-tabs" aria-label="Layers">${cat.layers.map((l) => `<a href="#/veda/${v.id}/${l}"${l === layer ? ' aria-current="page"' : ''}>
      <span class="lt-l">${T(LAYERS[l].label, LAYER_SA[l])}</span><span class="lt-n">${v.layers[l].length ? N(v.layers[l].length) : '–'}</span></a>`).join('')}</nav>
    ${sam ? '<section class="wheel-wrap" id="wheel" aria-label="Divisions of the Saṃhitā"></section>' : ''}
    <p class="lede">${esc(blurb)}</p>
    ${v.layers[layer].length
    ? `<div class="text-cards">${v.layers[layer].map((i) => card(byId[i])).join('')}</div>`
    : `<p class="note">${esc(v.absent?.[layer] || 'No openly licensed digital edition has been found yet.')}</p>`}
  </div>`;
  if (sam) renderWheel(sam);
}

// ---------- the Saṃhitā as a wheel of its divisions ----------
const DEVA_DIGITS = (n) => String(n).replace(/[0-9]/g, (d) => '०१२३४५६७८९'[d]);
async function renderWheel(meta) {
  const el = document.getElementById('wheel'); if (!el) return;
  const x = await index(meta.id);
  const id = meta.id;
  const multi = x.groups.length > 1;
  const segs = multi
    ? x.groups.map(([d1, cs]) => ({ k: d1, name: groupName(meta, d1), sa: groupSa(meta, d1), n: cs.reduce((a, c) => a + c[1], 0), sub: cs.length, subName: meta.levels[1], href: `#/v/${id}/g/${d1}` }))
    : x.groups[0][1].map(([d2, n, title]) => ({ k: d2, name: `${meta.levels[1] || 'Section'} ${d2}`, sa: lvl(meta.levels[1]) ? `${lvl(meta.levels[1])} ${dg(d2)}` : null, title, n, href: `#/v/${id}/c/${x.groups[0][0]}/${d2}` }));
  const total = segs.reduce((a, s) => a + s.n, 0);
  const cx = 170; const r0 = 92; const r1 = 150; const gap = segs.length > 24 ? 0.6 : 1.2;
  const pt = (r, d) => [cx + r * Math.cos(d * Math.PI / 180), cx + r * Math.sin(d * Math.PI / 180)].map((v) => v.toFixed(1));
  let a = -90;
  const paths = segs.map((s, i) => {
    const sw = s.n / total * 360; const st = a + gap / 2; const en = a + sw - gap / 2; const big = sw > 180 ? 1 : 0;
    const [x1, y1] = pt(r1, st); const [x2, y2] = pt(r1, en); const [x3, y3] = pt(r0, en); const [x4, y4] = pt(r0, st);
    const [lx, ly] = pt((r0 + r1) / 2, a + sw / 2);
    a += sw;
    return `<path class="seg${i % 2 ? ' alt' : ''}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(s.name)}: ${fmt(s.n)} ${esc(unitName(meta))}"
      d="M${x1} ${y1}A${r1} ${r1} 0 ${big} 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 ${big} 0 ${x4} ${y4}Z"/>${segs.length <= 24 && sw > 9 ? `<text x="${lx}" y="${ly}" lang="sa" aria-hidden="true">${DEVA_DIGITS(s.k)}</text>` : ''}`;
  }).join('');
  const dev = (x.facets.devata || []).slice(0, 4);
  const max = dev[0]?.[3] || 1;
  el.innerHTML = `<div class="wheel">
      <svg viewBox="0 0 340 340" role="group" aria-label="${esc(meta.name)}: ${segs.length} ${esc(multi ? `${meta.levels[0]}s` : `${meta.levels[1]}s`)}, sized by ${esc(unitName(meta))}">${paths}</svg>
      <div class="wheel-c"><span class="wc-n" lang="sa">${esc(meta.deva)}</span><span class="wc-s">${F(total)} ${unitHTML(meta)}</span></div>
    </div>
    <div class="wheel-side">
      <div class="seg-card" aria-live="polite"></div>
      ${dev.length ? `<h2 class="wheel-h">${T('Most addressed devatās', 'प्रमुखदेवताः')}</h2>
      <div class="dbars">${dev.map((d) => `<a class="dbar" href="${findHref(id, { devata: d[0] })}"><span class="db-n" lang="sa">${esc(d[2] || d[1])}</span><span class="db-b"><span style="width:${(d[3] / max * 100).toFixed(1)}%"></span></span><span class="db-c">${F(d[3])}</span></a>`).join('')}</div>` : ''}
    </div>`;
  const card = el.querySelector('.seg-card');
  const pick = (i) => {
    const s = segs[i];
    el.querySelectorAll('.seg').forEach((p) => p.classList.toggle('on', Number(p.dataset.i) === i));
    card.innerHTML = `<span class="sc-dot" aria-hidden="true"></span>
      <span class="sc-t"><b>${T(s.name, s.sa)}${s.title && !/^\d+$/.test(s.title) ? ` · <span lang="sa">${esc(s.title)}</span>` : ''}</b>
      <small>${s.sub ? (SA() && lvl(s.subName) ? `${F(s.sub)} ${T('', lvl(s.subName, true))} · ` : `${fmt(s.sub)} ${esc((s.subName || 'section').toLowerCase())}s · `) : ''}${F(s.n)} ${unitHTML(meta)}</small></span>
      <a class="sc-go" href="${s.href}">${T('Open', 'पठ')}</a>`;
  };
  el.querySelectorAll('.seg').forEach((p) => {
    p.addEventListener('click', () => pick(Number(p.dataset.i)));
    p.addEventListener('dblclick', () => go(segs[Number(p.dataset.i)].href));
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(Number(p.dataset.i)); } });
  });
  pick(0);
}

function unitName(t) {
  if (t.id === 'rv') return 'ṛks';
  const u = (t.levels[2] || 'section').toLowerCase();
  return u.endsWith('s') ? u : `${u}s`;
}

async function viewVeda(id) {
  const meta = await vedaMeta(id);
  if (!meta) return notFound();
  setTitle(meta.name);
  const cat = await catalog();
  const vg = cat.vedas.find((v) => v.id === meta.veda);
  const x = await index(id);
  const lvl = meta.levels.find((l) => LEVEL_DEVA[l]);
  const single = x.groups.length === 1 && x.groups[0][1].length === 1;
  const tiles = [
    `<a class="tile" href="${single ? `#/v/${id}/c/${x.groups[0][0]}/${x.groups[0][1][0][0]}` : `#/v/${id}/g`}"><span class="dv" lang="sa">${LEVEL_DEVA[lvl] || esc(meta.deva)}</span><span><span class="t">${single ? 'Read the text' : 'Structure'}</span><br><span class="s">${esc(meta.levels.filter(Boolean).join(' › '))}</span></span></a>`,
    ...FKEYS.filter((f) => meta.layer === 'samhita').map((f) => (meta.facets.includes(f)
      ? `<a class="tile" href="#/v/${id}/f/${f}"><span class="dv" lang="sa">${FACETS[f].deva}</span><span><span class="t">${FACETS[f].label}</span><br><span class="s">${fmt(meta.facetCounts[f])} ${FACETS[f].plural}</span></span></a>`
      : `<span class="tile" aria-disabled="true"><span class="dv" lang="sa">${FACETS[f].deva}</span><span><span class="t">${FACETS[f].label}</span><br><span class="s">Not in the open source yet</span></span></span>`)),
  ].join('');
  const tagNote = {
    verse: 'Ṛṣi, devatā and chandas are tagged for every ṛk, from the Sarvānukramaṇī.',
    sukta: 'Tags come from each sūkta’s Anukramaṇī header, so every mantra in a sūkta carries its main ṛṣi, devatā and chandas. Kāṇḍa 20 has no headers in the source.',
    hymn: 'This is Griffith’s English translation; devatā comes from his hymn headings.',
  }[meta.tagLevel] || (meta.layer === 'samhita' ? 'The open text has no ṛṣi, devatā or chandas index yet, so it is browsed by structure.' : '');
  const lede = [meta.shakha ? `${meta.shakha} śākhā.` : '', tagNote, meta.note || ''].filter(Boolean).join(' ');
  const unit = unitName(meta);
  main.innerHTML = `<div class="wide">
    <div class="crumbs"><a href="#/veda/${vg.id}">${esc(vg.name)}</a><span aria-hidden="true">/</span><span>${LAYERS[meta.layer].label}</span></div>
    <h1>${esc(meta.name)}<span class="h1-deva" lang="sa">${esc(meta.deva)}</span></h1>
    ${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
    <div class="stats">
      ${x.groups.length > 1 ? `<span><b>${x.groups.length}</b> ${esc(meta.levels[0].toLowerCase())}s</span>` : ''}
      ${!single ? `<span><b>${fmt(meta.containers)}</b> ${esc((meta.levels[1] || 'section').toLowerCase())}s</span>` : ''}
      <span><b>${fmt(meta.verses)}</b> ${esc(unit)}</span>
    </div>
    <div style="margin-top:14px">${badgesHTML(meta)}</div>
    <h2 class="section-title">Browse by</h2>
    <div class="tiles">${tiles}</div>
    ${single ? '' : `<h2 class="section-title">${x.groups.length > 1 ? `${esc(meta.levels[0])}s` : `${esc(meta.levels[1])}s`}</h2>
    ${x.groups.length > 1
    ? `<div class="groups">${x.groups.map(([d1, cs]) => `<a class="group" href="#/v/${id}/g/${d1}"><b>${esc(groupName(meta, d1))}</b><small>${cs.length} ${esc(meta.levels[1].toLowerCase())}s, ${fmt(cs.reduce((a, c) => a + c[1], 0))} ${esc(unit)}</small></a>`).join('')}</div>`
    : containerGrid(meta, x.groups[0][0], x.groups[0][1])}`}
  </div>`;
}

function containerGrid(meta, d1, cs) {
  return `<div class="containers${meta.refFmt === 'label' ? ' wide-cells' : ''}">${cs.map(([d2, n, title]) => `<a href="#/v/${meta.id}/c/${d1}/${d2}" title="${n} ${esc(unitName(meta))}">${esc(containerRef(meta, d1, d2, title) || d2)}</a>`).join('')}</div>`;
}

function primaryTag(x, rows, f) {
  const c = new Map();
  for (const r of rows) if (r[COL[f]] >= 0) c.set(r[COL[f]], (c.get(r[COL[f]]) || 0) + 1);
  const best = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? x.facets[f][best[0]] : null;
}

async function viewGroups(id, d1) {
  const meta = await vedaMeta(id);
  if (!meta) return notFound();
  const x = await index(id);
  if (d1 === undefined) {
    if (x.groups.length === 1) d1 = x.groups[0][0];
    else {
      setTitle(`${meta.name} structure`);
      main.innerHTML = `<div class="wide"><div class="crumbs"><a href="#/v/${id}">${esc(meta.name)}</a></div>
        <h1>Structure</h1><p class="lede">${esc(meta.levels.filter(Boolean).join(' › '))}</p>
        <div class="groups" style="margin-top:24px">${x.groups.map(([g, cs]) => `<a class="group" href="#/v/${id}/g/${g}"><b>${esc(groupName(meta, g))}</b><small>${cs.length} ${esc(meta.levels[1].toLowerCase())}s</small></a>`).join('')}</div></div>`;
      return;
    }
  }
  const g = x.groups.find((e) => e[0] === d1);
  if (!g) return notFound();
  setTitle(`${meta.name} ${groupName(meta, d1)}`);
  const byC = new Map();
  for (const r of x.rows) if (r[0] === d1) { if (!byC.has(r[1])) byC.set(r[1], []); byC.get(r[1]).push(r); }
  const items = g[1].map(([d2, n, title]) => {
    const rs = byC.get(d2) || [];
    const dv = primaryTag(x, rs, 'devata');
    const rs2 = primaryTag(x, rs, 'rishi');
    const label = [dv && cap(dv[1]), rs2 && cap(rs2[1])].filter(Boolean).join(', ') || (meta.refFmt === 'label' ? '' : title) || '';
    return `<a href="#/v/${id}/c/${d1}/${d2}"><b>${esc(containerRef(meta, d1, d2, title))}</b><span>${esc(label)}</span><span style="margin-left:auto;color:var(--muted);font-size:14px;font-family:var(--ui)">${n}</span></a>`;
  }).join('');
  const idx = x.groups.findIndex((e) => e[0] === d1);
  const prev = x.groups[idx - 1]; const next = x.groups[idx + 1];
  const plain = !meta.facets.length && !g[1].some((c) => c[2] && meta.refFmt !== 'label');
  main.innerHTML = `<div class="col">
    <div class="crumbs"><a href="#/v/${id}">${esc(meta.name)}</a>${x.groups.length > 1 ? `<span aria-hidden="true">/</span><a href="#/v/${id}/g">Structure</a>` : ''}</div>
    <h1>${esc(x.groups.length > 1 ? groupName(meta, d1) : `${meta.levels[1]}s`)}</h1>
    <p class="lede">${g[1].length} ${esc(meta.levels[1].toLowerCase())}s${plain ? '' : `, with their main ${meta.facets.includes('devata') ? 'devatā and ṛṣi' : 'heading'} and number of ${esc(unitName(meta))}`}.</p>
    ${plain ? `<div style="margin-top:18px">${containerGrid(meta, d1, g[1])}</div>` : `<div class="titled" style="margin-top:18px">${items}</div>`}
    <div class="pager">${prev ? `<a href="#/v/${id}/g/${prev[0]}">‹ ${esc(groupName(meta, prev[0]))}</a>` : '<span></span>'}${next ? `<a href="#/v/${id}/g/${next[0]}">${esc(groupName(meta, next[0]))} ›</a>` : ''}</div>
  </div>`;
}

async function viewFacet(id, f) {
  const meta = await vedaMeta(id);
  if (!meta || !FACETS[f]) return notFound();
  const x = await index(id);
  setTitle(`${FACETS[f].label} in the ${meta.name}`);
  const list = x.facets[f];
  const max = list[0]?.[3] || 1;
  const unit = meta.levels[2].toLowerCase();
  let sort = 'n'; let q = ''; let shown = 80;
  main.innerHTML = `<div class="col">
    <div class="crumbs"><a href="#/v/${id}">${esc(meta.name)}</a></div>
    <h1>${FACETS[f].label}<span class="h1-deva" lang="sa">${FACETS[f].deva}</span></h1>
    <p class="lede">${fmt(list.length)} ${FACETS[f].plural}, ranked by the number of ${esc(unit)}s.</p>
    <div class="toolbar">
      <label class="sr" for="ff">Filter ${FACETS[f].plural}</label>
      <input id="ff" class="filter-input" placeholder="Filter by name, in IAST or Devanagari">
      <button class="chip" data-sort="n" aria-pressed="true">Most ${esc(unit)}s</button>
      <button class="chip" data-sort="az" aria-pressed="false">A–Z</button>
    </div>
    <ul class="facet-list" id="fl"></ul>
    <div id="flMore"></div>
  </div>`;
  const draw = () => {
    const ql = q.toLowerCase();
    let items = list.filter((e) => !ql || e[1].toLowerCase().includes(ql) || e[0].includes(ql) || e[2].includes(q));
    if (sort === 'az') items = [...items].sort((a, b) => a[0].localeCompare(b[0]));
    $('#fl').innerHTML = items.slice(0, shown).map((e) => `<li><a href="${findHref(id, { [f]: e[0] })}">
      <span class="nm">${nameHTML(e)}</span>
      <span class="n">${fmt(e[3])}<small>${e[4]} ${esc(meta.levels[1].toLowerCase())}${e[4] === 1 ? '' : 's'}</small></span>
      <span class="bar" aria-hidden="true"><i style="width:${Math.max(1, (e[3] / max) * 100).toFixed(1)}%"></i></span></a></li>`).join('')
      || `<li class="empty">No ${FACETS[f].one} matches “${esc(q)}”. Try fewer letters or the Devanagari spelling.</li>`;
    $('#flMore').innerHTML = items.length > shown ? `<button class="more" id="moreBtn">Show ${Math.min(80, items.length - shown)} more of ${fmt(items.length - shown)}</button>` : '';
    $('#moreBtn')?.addEventListener('click', () => { shown += 80; draw(); });
  };
  $('#ff').addEventListener('input', (e) => { q = e.target.value.trim(); shown = 80; draw(); });
  main.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
    sort = b.dataset.sort;
    main.querySelectorAll('[data-sort]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    draw();
  }));
  draw();
}

async function viewFind(id, params) {
  const meta = await vedaMeta(id);
  if (!meta) return notFound();
  const x = await index(id);
  const filters = {};
  for (const f of FKEYS) {
    const k = params.get(f);
    if (k && x.keyIndex[f].has(k)) filters[f] = x.keyIndex[f].get(k);
  }
  const g = params.get('g') ? Number(params.get('g')) : null;
  const rows = x.rows.filter((r) => (g === null || r[0] === g) && Object.entries(filters).every(([f, i]) => r[COL[f]] === i));
  const label = Object.entries(filters).map(([f, i]) => cap(x.facets[f][i][1])).join(' + ');
  setTitle(`${label || 'Find'} in the ${meta.name}`);
  const unit = meta.levels[2].toLowerCase();
  const cur = Object.fromEntries([...params.entries()]);
  const without = (k) => { const c = { ...cur }; delete c[k]; return findHref(id, c); };

  const pills = [
    ...Object.entries(filters).map(([f, i]) => {
      const e = x.facets[f][i];
      return `<span class="pill">${FACETS[f].label}: ${e[2] ? `<span class="dv" lang="sa">${esc(e[2])}</span>` : ''} ${esc(cap(e[1]))}<button data-href="${without(f)}" aria-label="Remove ${esc(FACETS[f].label)} filter"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>`;
    }),
    g !== null ? `<span class="pill">${esc(groupName(meta, g))}<button data-href="${without('g')}" aria-label="Remove ${esc(meta.levels[0])} filter"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>` : '',
  ].join('');

  // narrowing selects: values present in the current result set
  const selects = FKEYS.filter((f) => meta.facets.includes(f) && filters[f] === undefined).map((f) => {
    const c = new Map();
    for (const r of rows) if (r[COL[f]] >= 0) c.set(r[COL[f]], (c.get(r[COL[f]]) || 0) + 1);
    const opts = [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 400)
      .map(([i, n]) => `<option value="${esc(x.facets[f][i][0])}">${esc(cap(x.facets[f][i][1]))}${x.facets[f][i][2] ? ` · ${esc(x.facets[f][i][2])}` : ''} (${fmt(n)})</option>`).join('');
    return `<label>Add ${FACETS[f].label.toLowerCase()}<select data-f="${f}"><option value="">Any ${FACETS[f].one}</option>${opts}</select></label>`;
  });
  if (g === null && x.groups.length > 1) {
    const c = new Map();
    for (const r of rows) c.set(r[0], (c.get(r[0]) || 0) + 1);
    const opts = [...c.entries()].sort((a, b) => a[0] - b[0]).map(([d1, n]) => `<option value="${d1}">${esc(groupName(meta, d1))} (${fmt(n)})</option>`).join('');
    selects.push(`<label>Limit to ${meta.levels[0].toLowerCase()}<select data-f="g"><option value="">All ${meta.levels[0].toLowerCase()}s</option>${opts}</select></label>`);
  }

  // group results by container
  const groups = [];
  const seen = new Map();
  for (const r of rows) {
    const k = `${r[0]}.${r[1]}`;
    if (!seen.has(k)) { seen.set(k, groups.length); groups.push({ d1: r[0], d2: r[1], rows: [] }); }
    groups[seen.get(k)].rows.push(r);
  }
  let shown = 50;
  main.innerHTML = `<div class="col">
    <div class="crumbs"><a href="#/v/${id}">${esc(meta.name)}</a></div>
    <h1>${label ? esc(label) : `All ${esc(unit)}s`}</h1>
    <div class="active-filters">${pills}</div>
    <div class="narrow">${selects.join('')}</div>
    <p class="count-line" aria-live="polite"><b>${fmt(rows.length)}</b> ${esc(unit)}${rows.length === 1 ? '' : 's'} in <b>${fmt(groups.length)}</b> ${esc(meta.levels[1].toLowerCase())}${groups.length === 1 ? '' : 's'}</p>
    <div id="res"></div><div id="resMore"></div>
    ${meta.tagLevel === 'sukta' ? '<p class="note">Atharvaveda tags are given per sūkta, so a filter matches every mantra of a sūkta whose main ṛṣi, devatā or chandas fits.</p>' : ''}
  </div>`;
  const draw = () => {
    $('#res').innerHTML = groups.slice(0, shown).map((gr) => {
      const others = FKEYS.filter((f) => filters[f] === undefined).map((f) => primaryTag(x, gr.rows, f)).filter(Boolean);
      const vs = gr.rows.map((r) => r[2]);
      const total = x.groups.find((e) => e[0] === gr.d1)[1].find((c) => c[0] === gr.d2)?.[1] || vs.length;
      return `<a class="result" href="#/v/${id}/c/${gr.d1}/${gr.d2}?v=${vs[0]}">
        <span class="ref">${esc(meta.ref)} ${esc(containerRef(meta, gr.d1, gr.d2))}</span>
        <span class="meta">${others.map((e) => `<span>${esc(cap(e[1]))}</span>`).join('')}</span>
        <span class="vv">${vs.length === total ? `All ${total} ${esc(unit)}s` : `${esc(unit)}${vs.length === 1 ? '' : 's'} ${esc(compactRanges(vs))} of ${total}`}</span></a>`;
    }).join('') || `<p class="empty">Nothing matches all of these filters. Remove one to widen the search.</p>`;
    $('#resMore').innerHTML = groups.length > shown ? `<button class="more" id="rm">Show more ${esc(meta.levels[1].toLowerCase())}s (${fmt(groups.length - shown)} left)</button>` : '';
    $('#rm')?.addEventListener('click', () => { shown += 50; draw(); });
  };
  draw();
  main.querySelectorAll('.pill button').forEach((b) => b.addEventListener('click', () => { go(b.dataset.href); }));
  main.querySelectorAll('select[data-f]').forEach((s) => s.addEventListener('change', () => {
    if (!s.value) return;
    go(findHref(id, { ...cur, [s.dataset.f]: s.value }));
  }));
}

function compactRanges(ns) {
  const out = []; let a = ns[0]; let b = ns[0];
  for (let i = 1; i <= ns.length; i++) {
    if (ns[i] === b + 1) { b = ns[i]; continue; }
    out.push(a === b ? `${a}` : `${a}–${b}`); a = b = ns[i];
  }
  return out.join(', ');
}

async function viewContainer(id, d1, d2, params) {
  const meta = await vedaMeta(id);
  if (!meta) return notFound();
  const x = await index(id);
  const g = x.groups.find((e) => e[0] === d1);
  const c = g?.[1].find((e) => e[0] === d2);
  if (!c) return notFound();
  const t = await text(id, d1);
  const verses = t[d2] || [];
  const rows = x.rows.filter((r) => r[0] === d1 && r[1] === d2);
  const rowOf = new Map(rows.map((r) => [r[2], r]));
  const cref = containerRef(meta, d1, d2, c[2]);
  setTitle(cref ? `${meta.ref} ${cref}` : meta.name);
  const hasDeva = verses.some((v) => v[1].length);
  const hasRoman = verses.some((v) => v[2].length);
  const hasPada = verses.some((v) => v[3].length);
  const hasTr = verses.some((v) => v[4]);
  const hasBh = !!meta.has?.bhashya;
  const hl = Number(params.get('v')) || null;

  // neighbours across groups
  const flat = x.groups.flatMap(([a, cs]) => cs.map(([b, , tt]) => [a, b, tt]));
  const pos = flat.findIndex(([a, b]) => a === d1 && b === d2);
  const prev = flat[pos - 1]; const next = flat[pos + 1];

  const summary = FKEYS.map((f) => [f, primaryTag(x, rows, f)]).filter(([, e]) => e);
  const seg = (name, opts) => `<div class="seg" role="group" aria-label="${esc(name)}">${opts.map(([k, v, l, dis]) => `<button data-p="${k}" data-v="${v}" aria-pressed="${String(prefs[k] === v)}"${dis ? ' disabled' : ''}>${l}</button>`).join('')}</div>`;
  const controls = [
    hasDeva ? seg('Script', [['lipi', 'deva', 'देवनागरी'], ['lipi', 'knda', 'ಕನ್ನಡ']]).replace('class="seg"', 'class="seg lipi-seg"') : '',
    hasDeva && hasRoman ? seg('Show', [['script', 'both', T('Both', 'उभयम्')], ['script', 'deva', T('Script', 'लिपिः')], ['script', 'roman', 'IAST']]) : '',
    hasPada ? seg('Text', [['mode', 'samhita', T('Saṃhitā', 'संहितापाठः')], ['mode', 'pada', T('Padapāṭha', 'पदपाठः')]]) : '',
    id === 'rv' && hasDeva ? seg('Svara style', Object.entries(PATHA).map(([k, [en, sa]]) => ['patha', k, `<span class="pt-m" lang="sa" aria-hidden="true">${k === 'dirgha' ? 'ई᳚' : 'ई॑'}</span>${T(en.replace(' style', ''), sa)}`])).replace('class="seg"', 'class="seg patha-seg"') : '',
    // translation, bhāṣya and ṛṣi · devatā · chandas: the one-tap toggles above (.quick)
  ].join('');

  // Small one-tap toggles at the top of the reader, mirroring the switches below
  const QI = {
    tags: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.2V4.8a1.3 1.3 0 0 1 1.3-1.3h7.4l8.3 8.3a1.3 1.3 0 0 1 0 1.8l-7.4 7.4a1.3 1.3 0 0 1-1.8 0z"/><circle cx="8.2" cy="8.2" r="1.6"/></svg>',
    tr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h9M7.5 3v2M10 5c-.8 3.6-3 6.4-6 8M6 8.5c1.2 2 2.9 3.6 5 4.6"/><path d="M12.5 21l4-10 4 10M14 17.5h5"/></svg>',
    bhashya: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 5.5c3-1.3 6-1.3 9 .8 3-2.1 6-2.1 9-.8v13c-3-1.3-6-1.3-9 .8-3-2.1-6-2.1-9-.8z"/><path d="M12 6.3v13" stroke-linecap="round"/></svg>',
  };
  const qb = (k, en, sa) => `<button type="button" class="qbtn" data-q="${k}" aria-pressed="${String(!!prefs[k])}" title="${esc(Tp(en, sa))}" aria-label="${esc(Tp(en, sa))}">${QI[k]}<span>${T(en.split(' ')[0], sa)}</span></button>`;
  const quick = [
    summary.length ? qb('tags', 'Ṛṣi · devatā · chandas', 'ऋषिः · देवता · छन्दः') : '',
    hasTr && (hasDeva || hasRoman) ? qb('tr', 'Translation', 'अनुवादः') : '',
    hasBh ? qb('bhashya', `${meta.has.bhashya} bhāṣya`, 'भाष्यम्') : '',
  ].join('');

  main.innerHTML = `<article class="col" style="--vc: var(--v-${meta.veda})">
    <div class="crumbs"><a href="#/v/${id}">${esc(meta.name)}</a>${x.groups.length > 1 ? `<span aria-hidden="true">/</span><a href="#/v/${id}/g/${d1}">${esc(groupName(meta, d1))}</a>` : ''}</div>
    <div class="reader-head"><div>
      <h1>${cref ? (SA() && contSa(meta, cref) ? `<span lang="sa">${esc(contSa(meta, cref))}</span>` : `${esc(meta.levels[1] || meta.levels[2])} ${esc(cref)}`) : T(meta.name, meta.deva)}</h1>
      ${c[2] && meta.refFmt !== 'label' ? `<div class="ctitle" lang="sa">${esc(c[2])}</div>` : ''}
    </div>${hasDeva ? `<button class="chant-btn" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.8l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>${T('Chant view', 'पारायणम्')}</button>` : ''}</div>
    ${quick ? `<div class="quick" role="group" aria-label="${esc(Tp('Show or hide', 'दर्शय / गोपय'))}">${quick}</div>` : ''}
    ${summary.length ? `<div class="tags" id="sumTags"${prefs.tags ? '' : ' hidden'}>${summary.map(([f, e]) => `<a class="tag" href="${findHref(id, { [f]: e[0] })}"><em>${T(FACETS[f].label, FACET_SA[f])}</em>${e[2] ? `<span class="dv" lang="sa">${esc(e[2])}</span>` : ''}${SA() && e[2] ? '' : `<span>${esc(cap(e[1]))}</span>`}</a>`).join('')}</div>` : ''}
    ${controls ? `<div class="controls">${controls}</div>` : ''}
    <div id="verses"></div>
    <nav class="pager" aria-label="Neighbouring ${esc(meta.levels[1].toLowerCase())}s">
      ${prev ? `<a href="#/v/${id}/c/${prev[0]}/${prev[1]}">‹ ${refHTML(meta, containerRef(meta, prev[0], prev[1], prev[2]))}</a>` : '<span></span>'}
      ${next ? `<a href="#/v/${id}/c/${next[0]}/${next[1]}">${refHTML(meta, containerRef(meta, next[0], next[1], next[2]))} ›</a>` : ''}
    </nav>
  </article>`;

  const draw = () => {
    const showDeva = hasDeva && prefs.script !== 'roman';
    const showRoman = hasRoman && (prefs.script !== 'deva' || !hasDeva);
    const pada = hasPada && prefs.mode === 'pada';
    // The header shows each facet's main value; a verse repeats a tag only when it differs from
    // the one before it, so a long sūkta is not interrupted by the same chips under every verse.
    const shown = Object.fromEntries(summary.map(([f, e]) => [f, e[0]]));
    $('#sumTags')?.toggleAttribute('hidden', !prefs.tags);
    $('#verses').innerHTML = verses.map(([v, deva, roman, pd, tr, label]) => {
      const r = rowOf.get(v);
      const tags = r ? FKEYS.filter((f) => {
        if (!prefs.tags || r[COL[f]] < 0 || meta.tagLevel !== 'verse') return false;
        const key = x.facets[f][r[COL[f]]][0];
        if (shown[f] === key) return false;
        shown[f] = key; return true;
      }).map((f) => {
        const e = x.facets[f][r[COL[f]]];
        return `<a class="tag" href="${findHref(id, { [f]: e[0] })}"><em>${T(FACETS[f].label, FACET_SA[f])}</em>${SA() && e[2] ? `<span lang="sa">${esc(e[2])}</span>` : `<span>${esc(cap(e[1]))}</span>`}</a>`;
      }).join('') : '';
      const ref = refOf(meta, d1, d2, v, label);
      let body = '';
      if (pada) {
        body += `<div class="pada" lang="sa-Latn">${pd.map((w) => `<span>${esc(w)}</span>`).join('<span aria-hidden="true">|</span>')}</div>`;
      } else {
        if (showDeva) body += `<div class="deva" lang="sa">${svaraLines(id, deva).map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
        if (showRoman) body += `<div class="roman" lang="sa-Latn">${roman.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
      }
      if (tr && (prefs.tr || (!hasDeva && !hasRoman))) body += `<p class="tr" lang="en">${esc(tr)}</p>`;
      const bh = !(hasBh && prefs.bhashya) ? '' : `<details class="bh" data-bh="${v}"><summary>${SA() ? '<span lang="sa">सायणभाष्यम्</span>' : `${esc(meta.has.bhashya)} bhāṣya <span class="dv" lang="sa">सायणभाष्यम्</span>`}</summary><div class="bh-text" lang="sa"><p class="bh-wait">Loading…</p></div></details>`;
      return `<section class="verse${v === hl ? ' hl' : ''}" id="v${v}" aria-label="${esc(meta.ref)} ${esc(ref)}">
        <div class="vnum"><a href="#/v/${id}/c/${d1}/${d2}?v=${v}">${N(ref)}</a></div>
        <div>${label && meta.refFmt !== 'label' ? `<div class="vlabel">${esc(label)}</div>` : ''}${body}${tags ? `<div class="tags">${tags}</div>` : ''}${bh}</div>
        <button class="icon-btn copy" data-copy="${v}" aria-label="Copy ${esc(meta.ref)} ${esc(ref)}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg></button>
      </section>`;
    }).join('');
    if (hasBh && prefs.bhashya) {
      bhashya(id, d1, d2).then((b) => main.querySelectorAll('[data-bh]').forEach((el) => {
        const t = b[el.dataset.bh];
        const box = el.querySelector('.bh-text');
        box.innerHTML = t
          ? t.split(/(?<=॥)\s+/).map((p) => `<p lang="sa">${bhashyaHTML(p)}</p>`).join('')
          : `<p class="bh-none">${id === 'rv' && d1 === 1 && d2 === 65 && b[el.dataset.bh - 1]
            ? 'Explained together with the previous ṛk (this sūkta is in two-line pairs).'
            : 'Not available for this ṛk in the Wikisource text.'}</p>`;
      }));
    }
    main.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
      const v = Number(b.dataset.copy);
      const vs = verses.find((e) => e[0] === v);
      const txt = [...svaraLines(id, vs[1]).map((l) => (prefs.lipi === 'knda' ? toKnda(l) : l)), ...vs[2], vs[4], `— ${meta.ref} ${refOf(meta, d1, d2, v, vs[5])}`].filter(Boolean).join('\n');
      try { await navigator.clipboard.writeText(txt); b.setAttribute('aria-label', 'Copied'); b.style.color = 'var(--indigo)'; } catch { /* clipboard blocked */ }
    }));
  };
  draw();
  const syncToggles = () => {
    main.querySelectorAll('.qbtn').forEach((q) => q.setAttribute('aria-pressed', String(!!prefs[q.dataset.q])));
    main.querySelectorAll('.seg button[data-p]').forEach((o) => {
      const v = o.dataset.v === 'true' ? true : o.dataset.v === 'false' ? false : o.dataset.v;
      o.setAttribute('aria-pressed', String(prefs[o.dataset.p] === v));
    });
  };
  main.querySelectorAll('.qbtn').forEach((q) => q.addEventListener('click', () => {
    // keep the verse at the top of the screen in place while text appears or disappears above it
    const head = $('.topbar').getBoundingClientRect().bottom + ($('#pathbar').hidden ? 0 : $('#pathbar').offsetHeight);
    const anchor = [...main.querySelectorAll('.verse[id]')].find((el) => el.getBoundingClientRect().bottom > head + 8);
    const top = anchor?.getBoundingClientRect().top;
    prefs[q.dataset.q] = !prefs[q.dataset.q];
    savePrefs(); syncToggles(); draw();
    if (anchor && window.scrollY > 0) { const a2 = document.getElementById(anchor.id); if (a2) window.scrollBy(0, a2.getBoundingClientRect().top - top); }
  }));
  main.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.p; const raw = b.dataset.v;
    if (k === 'lipi') { setLipi(raw); return; }
    if (k === 'theme') { setTheme(raw); return; }
    if (k === 'menu') { setMenu(raw); return; }
    prefs[k] = raw === 'true' ? true : raw === 'false' ? false : raw;
    savePrefs();
    b.parentElement.querySelectorAll('button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    syncToggles(); draw();
  }));
  lastRead = { href: `#/v/${id}/c/${d1}/${d2}`, text: meta.name, textSa: meta.deva, where: cref ? `${meta.ref} ${cref}` : meta.name, whereSa: cref ? refSa(meta, cref) : meta.deva, v: 1, of: verses.length };
  try { localStorage.setItem('vedalokana.last', JSON.stringify(lastRead)); } catch { /* storage unavailable */ }
  // phone reader bar: previous · section picker · next
  const rb = $('#readerbar');
  rb.hidden = false;
  rb.innerHTML = `${prev ? `<a class="rb-step" href="#/v/${id}/c/${prev[0]}/${prev[1]}" aria-label="Previous ${esc((meta.levels[1] || 'section').toLowerCase())}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></a>` : '<span class="rb-step" aria-hidden="true"></span>'}
    <button class="rb-pick" aria-haspopup="dialog"><span>${cref ? refHTML(meta, cref) : T(meta.name, meta.deva)}</span>${CHEV}</button>
    ${next ? `<a class="rb-step" href="#/v/${id}/c/${next[0]}/${next[1]}" aria-label="Next ${esc((meta.levels[1] || 'section').toLowerCase())}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></a>` : '<span class="rb-step" aria-hidden="true"></span>'}`;
  rb.querySelector('.rb-pick').addEventListener('click', async () => {
    const c2 = currentPath[currentPath.length - 1];
    if (c2) openSheet({ title: c2.title, items: await c2.items(), layout: c2.layout || 'grid' });
  });
  const sec = (meta.levels[1] || 'section').toLowerCase();
  readerNav = {
    prev: prev && { href: `#/v/${id}/c/${prev[0]}/${prev[1]}`, label: refText(meta, containerRef(meta, prev[0], prev[1], prev[2])) },
    next: next && { href: `#/v/${id}/c/${next[0]}/${next[1]}`, label: refText(meta, containerRef(meta, next[0], next[1], next[2])) },
    sec,
  };
  const story = { verses: verses.filter((x) => x[1].length), meta, d1, d2, cref, next: readerNav.next };
  main.querySelector('.chant-btn')?.addEventListener('click', () => openStory(story, 0));
  if (storyResume !== null) { const i = storyResume; storyResume = null; openStory(story, i); }
  if (swipeIn) {
    const dir = swipeIn; swipeIn = 0;
    if (!REDUCED_MOTION()) main.querySelector('article')?.animate(
      [{ transform: `translateX(${dir * 48}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  showSwipeTip();
  // the first verse is already in view; only jump for later ones
  if (keepScrollY === null && hl && hl !== verses[0]?.[0]) requestAnimationFrame(() => document.getElementById(`v${hl}`)?.scrollIntoView({ block: 'start' }));
}

const SOURCES = {
  vedaweb: 'VedaWeb, University of Cologne (CC BY-NC-SA 4.0)',
  anukramani: 'Digitised Sarvānukramaṇī, WSC 2023 (Apache-2.0)',
  dharmic: 'DharmicData (ODbL), text from the Vedic Heritage Portal',
  raw: 'sanskrit/raw_etexts on GitHub, collected from public e-text sites',
  gretil: 'GRETIL, Göttingen (reference and research use)',
  wikisource: 'Sāyaṇa bhāṣya: Sanskrit Wikisource volunteers (CC BY-SA 4.0), via Project Vyasa',
};
async function viewAbout() {
  setTitle('About');
  const cat = await catalog();
  const byId = Object.fromEntries(cat.texts.map((x) => [x.id, x]));
  const rows = cat.vedas.flatMap((v) => cat.layers.flatMap((l) => v.layers[l].map((i) => byId[i])
    .map((t) => `<tr><td>${esc(v.name)}</td><td>${LAYERS[l].label}</td><td><a href="#/v/${t.id}">${esc(t.name)}</a></td><td>${t.sources.map((k) => esc(SOURCES[k] || k)).join('; ')}</td></tr>`))).join('');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  main.innerHTML = `<div class="prose about">
    <section class="app-card">
      <img src="icons/icon.svg" alt="" width="72" height="72">
      <div class="app-id"><h1>Vedālokana</h1>
        <p class="app-v">Version <b>${esc(APP.version)}</b>${APP.released ? ` · ${esc(fmtDay(APP.released))}` : ''}</p>
        <p class="app-v">Texts built ${esc(fmtDay(cat.built))}</p></div>
      <div class="app-state" id="appState"><span class="dot"></span><span>Checking offline readiness…</span></div>
      <div class="app-acts"><button type="button" class="off-btn ghost" id="chkUpd">Check for updates</button><a class="off-btn ghost" href="#/settings?s=offline">Offline downloads</a></div>
      <p class="upd-out" id="updOut" role="status" aria-live="polite"></p>
    </section>
    <p class="lede">Vedālokana is a non-commercial browser for the Vedas, built from openly published digital texts. Text and tags are shown as the sources give them; corrections belong upstream.</p>
    <h2>What’s new</h2>
    <ol class="changes">${CHANGES.map(([v, d, items], i) => `<li${i ? '' : ' class="cur"'}><div class="ch-h"><b>${esc(v)}</b><span>${esc(fmtDay(d))}</span>${i ? '' : '<em>This version</em>'}</div>
      <ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('')}</ol>
    <h2>Texts and where they come from</h2>
    <div class="table-wrap"><table class="src-table"><thead><tr><th>Veda</th><th>Layer</th><th>Text</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table></div>
    <h2>Known gaps</h2>
    <ul>
      <li>Ṛṣi, devatā and chandas are indexed only for the Ṛgveda (per ṛk) and the Atharvaveda (per sūkta).</li>
      <li>Texts from GRETIL are in transliteration; the Devanagari shown for them is converted and carries no svara marks.</li>
      <li>Some sources skip sections: Śatapatha kāṇḍa 12, Śāṅkhāyana Āraṇyaka adhyāyas 3–6, Taittirīya Āraṇyaka prapāṭhakas 5–6.</li>
      <li>Not found in an open edition yet: Maitrāyaṇī and Kāṭhaka texts beyond the Saṃhitā, Taittirīya numbering by anuvāka, the Kauṣītaki Upaniṣad.</li>
      <li>Audio recitation is not included: the Vedic Heritage Portal’s recordings need permission to reuse.</li>
    </ul>
    <h2>Fonts</h2>
    <p>Noto Serif Devanagari, Noto Serif Kannada and Shobhika (IIT Bombay), rebuilt with every anudātta at one depth and, optionally, heavier svara marks; IBM Plex Sans and Gentium Book Plus. All are under the SIL Open Font License; the licence texts are in the <code>fonts</code> folder.</p>
    <h2>Building it</h2>
    <p>The data is built by <code>scripts/build-data.mjs</code> and the fonts by <code>scripts/make-fonts.py</code>; the source repositories and steps are in the project README. ${standalone ? '' : 'To install, use your browser’s “Install app” or “Add to Home Screen”.'}</p>
  </div>`;
  const upd = document.getElementById('chkUpd');
  upd.onclick = () => checkForUpdate(upd, document.getElementById('updOut'));
  const st = document.getElementById('appState');
  const set = (ok, text) => { st.classList.toggle('ok', ok); st.lastElementChild.textContent = text; };
  if (!swOK) set(false, 'Offline use needs the app’s own https address.');
  else {
    const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
    if (navigator.serviceWorker.controller) set(true, `${standalone ? 'Installed · ' : ''}Ready to work offline`);
    else if (reg) set(false, 'Getting ready for offline use…');
    else set(false, 'Offline use isn’t available in this view.');
  }
}

function notFound() {
  setTitle('Not found');
  main.innerHTML = `<div class="col"><h1>That page doesn’t exist</h1><p class="lede">The link may point to a section or name that isn’t in this text. <a href="#/">Go to the start page</a>.</p></div>`;
}

// ---------- search ----------
const REF_PREFIX = { rv: 'rv', ṛv: 'rv', av: 'av', avś: 'av', vs: 'yv', yv: 'yv', ts: 'ts', tb: 'tb', ab: 'ab', kb: 'kb', pb: 'pb', gb: 'gb', chu: 'chu', bu: 'bu' };
let activeVeda = 'rv';
async function suggestions(q) {
  const out = [];
  const m = q.trim().toLowerCase().match(/^(?:([a-zṛś]{2,3})\s*)?(\d+)(?:[.\s:/](\d+))?(?:[.\s:/](\d+))?$/);
  const cat = await catalog();
  if (m) {
    const id = REF_PREFIX[m[1]] || activeVeda;
    const meta = cat.texts.find((v) => v.id === id);
    const x = await index(id);
    const nums = [m[2], m[3], m[4]].filter(Boolean).map(Number);
    let d1; let d2; let v;
    if (meta.refFmt === 'v') { d1 = x.groups[0][0]; d2 = x.groups[0][1][0][0]; [v] = nums; }
    else if (meta.refFmt === 'd2.v') { d1 = x.groups[0][0]; [d2, v] = nums; } else [d1, d2, v] = nums;
    const g = x.groups.find((e) => e[0] === d1);
    if (g && d2 === undefined) out.push({ href: x.groups.length > 1 ? `#/v/${id}/g/${d1}` : `#/v/${id}/c/${d1}/${d1}`, label: `${meta.name}, ${groupName(meta, d1)}`, hint: 'Open' });
    else if (meta.refFmt !== 'label' && g && g[1].some((c) => c[0] === d2)) out.push({ href: `#/v/${id}/c/${d1}/${d2}${v ? `?v=${v}` : ''}`, label: `${meta.ref} ${refOf(meta, d1, d2, v)}`, hint: meta.name });
  }
  const ql = q.trim().toLowerCase();
  if (ql.length >= 2 && !m) {
    for (const t of cat.texts) {
      if (t.name.toLowerCase().includes(ql) || t.deva.includes(q.trim())) out.push({ href: `#/v/${t.id}`, label: `${t.name} · ${t.deva}`, hint: LAYERS[t.layer].label });
      if (out.length >= 4) break;
    }
  }
  if (ql.length >= 2) {
    const x = await index(activeVeda);
    const hits = [];
    for (const f of FKEYS) {
      for (const e of x.facets[f]) {
        const ia = e[1].toLowerCase();
        const starts = ia.startsWith(ql) || e[0].startsWith(ql) || (e[2] && e[2].startsWith(q.trim()));
        if (starts || ia.includes(ql) || e[0].includes(ql) || (e[2] && e[2].includes(q.trim()))) hits.push([Math.log(e[3] + 1) + (starts ? 2 : 0), e[3], f, e]);
      }
    }
    hits.sort((a, b) => b[0] - a[0]);
    for (const [, , f, e] of hits.slice(0, 9 - out.length)) {
      out.push({ href: findHref(activeVeda, { [f]: e[0] }), label: `${cap(e[1])}${e[2] ? ` · ${e[2]}` : ''}`, hint: `${FACETS[f].label}, ${fmt(e[3])}` });
    }
  }
  return out;
}
function setupSearch() {
  const input = $('#q'); const box = $('#suggest'); let items = []; let sel = -1; let token = 0;
  const close = () => { box.hidden = true; sel = -1; };
  const paint = () => {
    box.innerHTML = items.map((it, i) => `<a role="option" href="${it.href}" aria-selected="${i === sel}"><span>${esc(it.label)}</span><small>${esc(it.hint)}</small></a>`).join('')
      || '<div style="padding:10px;color:var(--muted)">Type a reference like 1.164.46, or part of a name.</div>';
    box.hidden = false;
  };
  input.addEventListener('input', async () => {
    const my = ++token; const q = input.value;
    if (!q.trim()) return close();
    const r = await suggestions(q);
    if (my !== token) return;
    items = r; sel = r.length ? 0 : -1; paint();
  });
  input.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); paint(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); }
    if (e.key === 'Escape') close();
  });
  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (items[sel]) { go(items[sel].href); input.value = ''; close(); input.blur(); }
  });
  box.addEventListener('click', () => { input.value = ''; close(); });
  document.addEventListener('click', (e) => { if (!$('#searchForm').contains(e.target)) close(); });
}

// ---------- sheets (level switchers) ----------
const sheetRoot = $('#sheetRoot');
let lastFocus = null;
function closeSheet() {
  if (!sheetRoot.firstChild) return;
  sheetRoot.innerHTML = '';
  document.body.classList.remove('sheet-open');
  lastFocus?.focus?.();
}
function openSheet({ title, items, layout = 'list', note }) {
  lastFocus = document.activeElement;
  const body = items.length
    ? `<div class="sheet-${layout}">${items.map((it) => `<a href="${it.href}"${it.current ? ' aria-current="true"' : ''}${it.disabled ? ' aria-disabled="true"' : ''}>
        <span class="si-main">${SA() && it.deva ? `<span lang="sa">${esc(it.deva)}</span>` : `${it.deva ? `<span class="dv" lang="sa">${esc(it.deva)}</span>` : ''}<span>${esc(it.label)}</span>`}</span>
        ${it.sub ? `<span class="si-sub">${esc(it.sub)}</span>` : ''}</a>`).join('')}</div>`
    : '<p class="empty">Nothing here yet.</p>';
  sheetRoot.innerHTML = `<div class="sheet-backdrop" data-close></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetT">
      <div class="sheet-grip" aria-hidden="true"></div>
      <div class="sheet-head"><h2 id="sheetT">${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      ${note ? `<p class="sheet-note">${esc(note)}</p>` : ''}
      <div class="sheet-body">${body}</div>
    </div>`;
  document.body.classList.add('sheet-open');
  sheetRoot.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheet));
  sheetRoot.querySelectorAll('.sheet-body a').forEach((a) => a.addEventListener('click', () => setTimeout(closeSheet, 0)));
  const cur = sheetRoot.querySelector('[aria-current="true"]') || sheetRoot.querySelector('.sheet-body a');
  cur?.scrollIntoView({ block: 'center' });
  (cur || sheetRoot.querySelector('[data-close]')).focus({ preventScroll: true });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// ---------- where am I: the level path ----------
async function buildPath(r) {
  const cat = await catalog();
  const [a, id, sub, p1, p2] = r.parts;
  const path = [];
  let vid; let layer; let meta;
  if (a === 'veda') { vid = id; layer = sub; }
  if (a === 'v') { meta = cat.texts.find((t) => t.id === id); if (meta) { vid = meta.veda; layer = meta.layer; } }
  const v = cat.vedas.find((x) => x.id === vid);
  if (!v) return path;
  if (!layer || !v.layers[layer]) layer = cat.layers.find((l) => v.layers[l].length);
  const byId = Object.fromEntries(cat.texts.map((t) => [t.id, t]));
  path.push({
    label: v.name, deva: VEDA_SA[v.id] || v.deva, href: `#/veda/${v.id}`, title: 'Choose a Veda',
    items: async () => cat.vedas.map((x) => ({ label: x.name, deva: VEDA_SA[x.id] || x.deva, href: `#/veda/${x.id}`, current: x.id === v.id,
      sub: cat.layers.reduce((n, l) => n + x.layers[l].length, 0) + ' texts' })),
  });
  path.push({
    label: LAYERS[layer].label, deva: LAYER_SA[layer], href: `#/veda/${v.id}/${layer}`, title: `${v.name}: choose a layer`,
    items: async () => cat.layers.map((l) => ({ label: LAYERS[l].plural, deva: LAYERS[l].deva, href: `#/veda/${v.id}/${l}`, current: l === layer,
      sub: v.layers[l].length ? v.layers[l].map((t) => byId[t].name).join(', ') : (v.absent?.[l] ? 'None' : 'Not available yet') })),
  });
  if (!meta) return path;
  const x = await index(meta.id);
  path.push({
    label: meta.name, deva: meta.deva, href: `#/v/${meta.id}`, title: `Texts of the ${v.name}`,
    items: async () => cat.layers.flatMap((l) => v.layers[l].map((t) => ({ label: byId[t].name, deva: byId[t].deva, href: `#/v/${t}`, current: t === meta.id, sub: LAYERS[l].label }))),
  });
  const groupItems = async (cur) => x.groups.map(([g, cs]) => ({ label: groupName(meta, g), deva: groupSa(meta, g), href: `#/v/${meta.id}/g/${g}`, current: g === cur, sub: `${cs.length} ${(meta.levels[1] || 'section').toLowerCase()}s` }));
  const containerItems = (g, cur) => async () => (x.groups.find((e) => e[0] === g)?.[1] || []).map(([d2, n, tt]) => ({
    label: containerRef(meta, g, d2, tt) || String(d2), deva: SA() && meta.refFmt !== 'label' ? dg(containerRef(meta, g, d2, tt) || String(d2)) : null, href: `#/v/${meta.id}/c/${g}/${d2}`, current: d2 === cur,
  }));
  if (sub === 'f' || sub === 'find') {
    const f = sub === 'f' ? p1 : FKEYS.find((k) => r.params.get(k));
    const facetItems = async () => meta.facets.map((k) => ({ label: FACETS[k].label, deva: FACETS[k].deva, href: `#/v/${meta.id}/f/${k}`, current: k === f, sub: `${fmt(meta.facetCounts[k])} ${FACETS[k].plural}` }));
    if (f) path.push({ label: FACETS[f].label, deva: FACETS[f].deva, href: `#/v/${meta.id}/f/${f}`, title: 'Browse by', items: facetItems });
    if (sub === 'find') path.push({ label: 'Results', href: getHash(), title: 'Browse by', items: facetItems });
    return path;
  }
  if (sub === 'g' || sub === 'c') {
    const g = p1 !== undefined ? Number(p1) : (x.groups.length === 1 ? x.groups[0][0] : undefined);
    if (x.groups.length > 1 && g !== undefined) {
      path.push({ label: groupName(meta, g), deva: groupSa(meta, g), href: `#/v/${meta.id}/g/${g}`, title: `${meta.levels[0]}s`, items: () => groupItems(g), layout: 'list' });
    }
    if (sub === 'c') {
      const d2 = Number(p2);
      const tt = containerTitle(x, g, d2);
      const cref = containerRef(meta, g, d2, tt);
      path.push({
        label: cref ? `${meta.levels[1] || meta.levels[2]} ${cref}` : meta.name, deva: cref ? contSa(meta, cref) : meta.deva, href: `#/v/${meta.id}/c/${g}/${d2}`,
        title: `${x.groups.length > 1 ? groupName(meta, g) + ': ' : ''}choose a ${(meta.levels[1] || 'section').toLowerCase()}`,
        items: containerItems(g, d2), layout: 'grid',
      });
    }
  }
  return path;
}

const CHEV = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
let currentPath = [];
function renderChrome(r, path) {
  currentPath = path;
  applyMenu();
  const bar = $('#pathbar');
  bar.hidden = !path.length;
  bar.innerHTML = `<ol>${path.map((c, i) => `<li><button class="crumb${i === path.length - 1 ? ' last' : ''}" data-i="${i}" aria-haspopup="dialog">
    ${SA() && c.deva ? `<span class="cl" lang="sa">${esc(c.deva)}</span>` : `${c.deva ? `<span class="dv" lang="sa">${esc(c.deva)}</span>` : ''}<span class="cl">${esc(c.label)}</span>`}${CHEV}</button></li>`).join('<li class="sep" aria-hidden="true">›</li>')}</ol>`;
  bar.querySelectorAll('.crumb').forEach((b) => b.addEventListener('click', async () => {
    const c = currentPath[Number(b.dataset.i)];
    openSheet({ title: c.title, items: await c.items(), layout: c.layout || 'list' });
  }));
  bar.scrollLeft = bar.scrollWidth;
  // back goes up one level
  const page = r.parts[0] || '';
  const topLevel = ['', 'library', 'suktas', 'search', 'settings'].includes(page);
  const parentHref = path.length >= 2 ? path[path.length - 2].href : page === 'about' ? '#/settings' : topLevel ? null : '#/library';
  const back = $('#backBtn');
  back.hidden = !parentHref;
  if (parentHref) back.setAttribute('href', parentHref);
  $('#brand').classList.toggle('when-back', !!parentHref);
  const named = { library: 'Library', suktas: 'Sūktas', search: 'Search', settings: 'Settings', about: 'About' }[page];
  const lastC = path[path.length - 1];
  $('#topTitle').textContent = lastC ? Tp(lastC.label, lastC.deva) : (named ? Tp(named, MENU_SA[page]) : '');
  // tabs
  const tab = !page ? 'home' : (page === 'veda' || page === 'v' ? 'library' : page === 'about' ? 'settings' : page);
  $('#tabbar').querySelectorAll('[data-tab]').forEach((a) => (a.dataset.tab === tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.body.classList.toggle('reading', page === 'v' && r.parts[2] === 'c');
  if (!(page === 'v' && r.parts[2] === 'c')) { $('#readerbar').hidden = true; readerNav = null; }
}

// ---------- library, search, settings ----------
async function viewLibrary() {
  setTitle('Library');
  const cat = await catalog();
  const byId = Object.fromEntries(cat.texts.map((t) => [t.id, t]));
  main.innerHTML = `<div class="col">
    <h1>Library</h1>
    <p class="lede">Every text, by Veda and layer.</p>
    ${cat.vedas.map((v) => `<section class="lib-veda">
      <a class="lib-head" href="#/veda/${v.id}"><span class="dv" lang="sa">${esc(v.deva)}</span><span class="nm">${esc(v.name)}</span></a>
      ${cat.layers.map((l) => `<div class="lib-layer"><a class="lib-l" href="#/veda/${v.id}/${l}">${LAYERS[l].label}</a>
        <div class="lib-texts">${v.layers[l].length ? v.layers[l].map((t) => `<a href="#/v/${t}"><span>${esc(byId[t].name)}</span><small>${fmt(byId[t].verses)}</small></a>`).join('') : `<span class="none">${esc(v.absent?.[l] ? 'None' : 'Not available yet')}</span>`}</div></div>`).join('')}
    </section>`).join('')}
  </div>`;
}

const VEDA_SHORT = { rv: 'Ṛgveda', syv: 'Śukla Yajurveda', kyv: 'Kṛṣṇa Yajurveda', sv: 'Sāmaveda', av: 'Atharvaveda' };
const foldName = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function viewSuktas(params) {
  setTitle('Famous sūktas');
  const all = (cache.suktas ||= await json('data/suktas.json'));
  const cat = await catalog();
  const vedaF = params.get('veda') && VEDA_SHORT[params.get('veda')] ? params.get('veda') : '';
  const by = ['veda', 'devata', 'az'].includes(params.get('by')) ? params.get('by') : prefs.suktaBy;
  const list = all.filter((e) => !vedaF || e.veda === vedaF);
  const href = (o) => { const q = new URLSearchParams({ ...(vedaF ? { veda: vedaF } : {}), by, ...o }); for (const [k, v] of [...q]) if (!v) q.delete(k); return `#/suktas${q.toString() ? `?${q}` : ''}`; };

  // group
  let groups;
  if (by === 'veda') {
    groups = cat.vedas.map((v) => ({ key: v.id, title: v.name, deva: v.deva, items: list.filter((e) => e.veda === v.id) })).filter((g) => g.items.length);
  } else if (by === 'devata') {
    const m = new Map();
    for (const e of list) { if (!m.has(e.devata)) m.set(e.devata, { key: e.devata, title: e.devata, deva: e.devataDeva, items: [] }); m.get(e.devata).items.push(e); }
    groups = [...m.values()].sort((a, b) => b.items.length - a.items.length || foldName(a.title).localeCompare(foldName(b.title)));
  } else {
    const m = new Map();
    for (const e of [...list].sort((a, b) => foldName(a.name).localeCompare(foldName(b.name)))) {
      const k = foldName(e.name).charAt(0).toUpperCase();
      if (!m.has(k)) m.set(k, { key: k, title: k, items: [] });
      m.get(k).items.push(e);
    }
    groups = [...m.values()];
  }
  const row = (e) => `<a class="sk-row" href="${e.href}">
      <span class="sk-top"><span class="sk-name"><span class="dv" lang="sa">${esc(e.deva)}</span><span class="ia">${esc(e.name)}</span></span><span class="sk-ref">${esc(e.ref)}</span></span>
      <span class="sk-line" lang="sa">${esc(e.line)}</span>
      <span class="sk-meta">${by !== 'devata' ? `<span><em>Devatā</em> ${esc(e.devata)}</span>` : ''}${by !== 'veda' ? `<span>${esc(VEDA_SHORT[e.veda])}</span>` : ''}<span>${e.kind === 'mantra' ? 'Mantra' : `${fmt(e.count)} ${e.count === 1 ? 'verse' : 'verses'}`}</span></span>
    </a>`;
  const counts = Object.fromEntries(Object.keys(VEDA_SHORT).map((k) => [k, all.filter((e) => e.veda === k).length]));
  main.innerHTML = `<div class="col">
    <h1>Famous sūktas<span class="h1-deva" lang="sa">सूक्तानि</span></h1>
    <p class="lede">Well-known sūktas and mantras from every Veda. Each opens at its first verse.</p>
    <nav class="chips sk-filter" aria-label="Veda">
      <a class="chip" href="${href({ veda: '' })}"${!vedaF ? ' aria-current="true"' : ''}>All <small>${all.length}</small></a>
      ${Object.entries(VEDA_SHORT).filter(([k]) => counts[k]).map(([k, n]) => `<a class="chip" href="${href({ veda: k })}"${vedaF === k ? ' aria-current="true"' : ''}>${esc(n)} <small>${counts[k]}</small></a>`).join('')}
    </nav>
    <div class="seg sk-sort" role="group" aria-label="List by">
      ${[['veda', 'By Veda'], ['devata', 'By devatā'], ['az', 'A–Z']].map(([k, l]) => `<a href="${href({ by: k })}" data-by="${k}" aria-pressed="${by === k}">${l}</a>`).join('')}
    </div>
    ${groups.map((g) => `<section class="sk-group"><h2>${esc(g.title)}${g.deva ? `<span class="h2-deva" lang="sa">${esc(g.deva)}</span>` : ''}<small>${g.items.length}</small></h2>
      <div class="sk-list">${g.items.map(row).join('')}</div></section>`).join('')}
  </div>`;
  main.querySelectorAll('[data-by]').forEach((a) => a.addEventListener('click', () => { prefs.suktaBy = a.dataset.by; savePrefs(); }));
}

async function viewSearch() {
  setTitle('Search');
  main.innerHTML = `<div class="col">
    <h1 class="sr">Search</h1>
    <label class="big-search"><span class="sr">Search references, texts and names</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
      <input id="bq" autocomplete="off" placeholder="1.164.46, Kaṭha, Agni, अग्नि…"></label>
    <div id="bres" class="search-results" aria-live="polite"></div>
    <div class="search-tips"><h2>Try</h2><div class="chips">
      ${['1.164.46', 'rv 10.90', 'Kaṭha', 'Chāndogya', 'Agni', 'Vasiṣṭha', 'Gāyatrī'].map((t) => `<button class="chip" data-q="${esc(t)}">${esc(t)}</button>`).join('')}
    </div><p class="lede">References jump to a mantra in the text you were last reading, or in the Ṛgveda. Prefix a text to change it, as in <b>av 7.1</b> or <b>ts 1.1</b>.</p></div>
  </div>`;
  const input = $('#bq'); let token = 0;
  const run = async () => {
    const my = ++token; const q = input.value;
    if (!q.trim()) { $('#bres').innerHTML = ''; return; }
    const r = await suggestions(q);
    if (my !== token) return;
    $('#bres').innerHTML = r.map((it) => `<a href="${it.href}"><span>${esc(it.label)}</span><small>${esc(it.hint)}</small></a>`).join('')
      || '<p class="empty">No match. Try a reference like 1.1.1, or part of a name.</p>';
  };
  input.addEventListener('input', run);
  main.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.q; run(); input.focus(); }));
  if (matchMedia('(hover: hover)').matches) input.focus();
}

async function viewSettings() {
  setTitle('Settings');
  const opt = (k, v, l, cls = '') => `<button class="${cls}" data-k="${k}" data-v="${v}" aria-pressed="${String(prefs[k] === v)}">${l}</button>`;
  main.innerHTML = `<div class="col">
    <h1>Settings</h1>
    <section class="set"><h2>Appearance</h2><p>Light for daytime, dark for early-morning or evening chanting. “Match device” follows your phone or computer.</p>
      <div class="seg wide-seg">${opt('theme', 'system', 'Match device')}${opt('theme', 'light', 'Light')}${opt('theme', 'dark', 'Dark')}</div></section>
    <section class="set"><h2>Menus and labels</h2><p>In the reading script, names, levels, ṛṣi · devatā · chandas and numbers appear in Sanskrit, in Devanagari or Kannada as chosen above the text. The <b>En</b> button at the top switches back to English at any time.</p>
      <div class="seg wide-seg">${opt('menu', 'script', 'In the reading script')}${opt('menu', 'en', 'English')}</div></section>
    <section class="set"><h2>Script for Sanskrit text</h2><p>Names, headings and mantras switch together. Svara marks are kept.</p>
      <div class="seg wide-seg">${opt('lipi', 'deva', 'देवनागरी', 'dvb')}${opt('lipi', 'knda', 'ಕನ್ನಡ', 'knb')}</div></section>
    <section class="set"><h2>Ṛgveda svara style</h2><p>Śṛṅgeri style writes every svarita with one stroke, as in most printed editions. Kāñcī · Mādhva style, as in South Indian recitation books, writes a svarita on a heavy syllable with two strokes (dīrgha svarita <span lang="sa">ई᳚</span>) and spells out the vowel of a kampa: <span lang="sa">रा॒यो॒३॑(ओ॒)वनिः</span>.</p>
      <div class="seg wide-seg">${opt('patha', 'std', esc(PATHA.std[0]))}${opt('patha', 'dirgha', esc(PATHA.dirgha[0]))}</div>
      <p class="svara-demo" lang="sa">${esc(svaraLines('rv', ['अ॒ग्निमी॑ळे पु॒रोहि॑तं य॒ज्ञस्य॑ दे॒वमृ॒त्विज॑म्'])[0])}</p></section>
    <section class="set"><h2>Devanagari font</h2><p>Noto Serif is compact and even. Shobhika (IIT Bombay), made for Sanskrit and Vedic text, has larger letters and taller svarita marks. Kannada always uses Noto Serif Kannada.</p>
      <div class="seg wide-seg">${opt('dfont', 'noto', 'Noto Serif')}${opt('dfont', 'shobhika', 'Shobhika', 'fontb-shobhika')}</div></section>
    <section class="set"><h2>Svara marks</h2><p>Bold marks are drawn heavier so <span lang="sa">॑</span> and <span lang="sa">॒</span> stand out at reading size; Standard keeps each font’s own thin strokes. In both, every anudātta sits at the same depth under the line.</p>
      <div class="seg wide-seg">${opt('svara', 'bold', 'Bold')}${opt('svara', 'std', 'Standard')}</div>
      <p class="svara-demo" lang="sa">अ॒ग्निमी॑ळे पु॒रोहि॑तं य॒ज्ञस्य॑ दे॒वमृ॒त्विज॑म्</p></section>
    <section class="set"><h2>In the reader, show</h2>
      <div class="seg wide-seg">${opt('script', 'both', 'Both')}${opt('script', 'deva', 'Script only')}${opt('script', 'roman', 'IAST only')}</div></section>
    <section class="set"><h2>Ṛgveda text</h2>
      <div class="seg wide-seg">${opt('mode', 'samhita', 'Saṃhitā')}${opt('mode', 'pada', 'Padapāṭha')}</div></section>
    <section class="set"><h2>Translations</h2>
      <div class="seg wide-seg">${opt('tr', true, 'Show')}${opt('tr', false, 'Hide')}</div></section>
    <section class="set"><h2>Ṛṣi, devatā and chandas</h2><p>Shown at the top of a sūkta and again only where they change. Hide them for uninterrupted chanting.</p>
      <div class="seg wide-seg">${opt('tags', true, 'Show')}${opt('tags', false, 'Hide')}</div></section>
    <section class="set" id="offline"><h2>Offline</h2><p>Once installed, the app opens without a connection, and every text you have read stays available. Download a whole Veda to have all of it ready.</p>
      <div class="off" id="offList"><p class="loading">Checking what is stored…</p></div></section>
    <section class="set"><h2>About</h2><a class="about-link" href="#/about"><img src="icons/icon.svg" alt="" width="40" height="40"><span><b>Vedālokana</b><small>Version ${esc(APP.version)} · sources, licences, what’s new</small></span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></a></section>
  </div>`;
  renderOffline(document.getElementById('offList'));
  if (parse().params.get('s') === 'offline') document.getElementById('offline')?.scrollIntoView();
  main.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k; const raw = b.dataset.v;
    if (k === 'lipi') { setLipi(raw); return; }
    prefs[k] = raw === 'true' ? true : raw === 'false' ? false : raw;
    savePrefs();
    if (k === 'svara' || k === 'dfont') applyLipiClass();
    if (k === 'patha') { const y = window.scrollY; route().then(() => window.scrollTo(0, y)); return; }
    b.parentElement.querySelectorAll('button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  }));
}

// ---------- router ----------
function parse() {
  const [path, qs] = getHash().replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, params: new URLSearchParams(qs || ''), veda: parts[0] === 'v' ? parts[1] : null, group: parts[0] === 'veda' ? parts[1] : null, sub: parts[2] || null };
}
async function route() {
  const r = parse();
  if (r.veda) activeVeda = r.veda;
  closeSheet();
  main.ontouchstart = null; main.ontouchend = null;
  main.innerHTML = '<p class="loading">Loading…</p>';
  try {
    await renderRail(r);
    const [a, id, sub, p1, p2] = r.parts;
    if (!a) await viewHome();
    else if (a === 'about') await viewAbout();
    else if (a === 'library') await viewLibrary();
    else if (a === 'suktas') await viewSuktas(r.params);
    else if (a === 'search') await viewSearch();
    else if (a === 'settings') await viewSettings();
    else if (a === 'veda') await viewVedaGroup(id, sub);
    else if (a === 'v' && !sub) await viewVeda(id);
    else if (a === 'v' && sub === 'g') await viewGroups(id, p1 !== undefined ? Number(p1) : undefined);
    else if (a === 'v' && sub === 'f') await viewFacet(id, p1);
    else if (a === 'v' && sub === 'find') await viewFind(id, r.params);
    else if (a === 'v' && sub === 'c') await viewContainer(id, Number(p1), Number(p2), r.params);
    else notFound();
    await renderRail(r);
    renderChrome(r, await buildPath(r));
  } catch (err) {
    const off = !navigator.onLine || / \(503\)$/.test(err.message);
    main.innerHTML = off
      ? `<div class="col"><h1>Not downloaded yet</h1><p class="lede">You are offline, and this text hasn’t been stored on this device. Connect once to read it, or download the whole Veda in <a href="#/settings?s=offline">Settings → Offline</a>.</p></div>`
      : `<div class="col"><h1>Couldn’t load this page</h1><p class="lede">${esc(err.message)}. Check your connection and reload.</p></div>`;
  }
  if (keepScrollY !== null) {
    const y = keepScrollY; const a = keepAnchor; keepScrollY = null; keepAnchor = null;
    // wait for the newly needed font so the layout is final before restoring
    document.fonts.ready.then(() => requestAnimationFrame(() => {
      const el = a && document.getElementById(a.id);
      window.scrollTo(0, el ? window.scrollY + el.getBoundingClientRect().top - a.top : y);
    }));
  }
  else if (!r.params.get('v') || r.params.get('v') === '1') window.scrollTo(0, 0);
  paintLipiToggle();
  main.focus({ preventScroll: true });
}
if (MEMORY) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    go(a.getAttribute('href'));
  });
} else window.addEventListener('hashchange', route);
setupSearch();
document.querySelectorAll('#lipiToggle [data-lipi]').forEach((b) => b.addEventListener('click', () => setLipi(b.dataset.lipi)));
route();

// The svara fonts normally come from the stylesheet. Where a page embeds the app and
// blocks stylesheet font URLs, the marks would fall back to a font without them and
// show as boxes or "?": load the same files directly instead.
(async function ensureSvaraFonts() {
  const want = [['Vedalokana Devanagari', 'fonts/NotoSerifDevanagari-Vedic.woff'], ['Vedalokana Kannada', 'fonts/NotoSerifKannada-Vedic.woff']];
  for (const [family, url] of want) {
    try { await document.fonts.load(`16px "${family}"`, '॒॑'); } catch { /* checked below */ }
    const faces = [...document.fonts].filter((f) => f.family.replace(/"/g, '') === family);
    if (faces.some((f) => f.status === 'loaded')) continue;
    try {
      const res = await fetch(new URL(url, document.baseURI));
      const face = new FontFace(family, await res.arrayBuffer());
      await face.load();
      document.fonts.add(face);
    } catch { /* the Noto fallbacks in the font stack still carry the marks */ }
  }
})();

// ---------- moving between sections by gesture ----------
// In the reader, a sideways swipe moves to the previous or next section: the page follows
// the finger, an edge label names where it will go, and letting go past the threshold (or
// with a quick flick) turns the page. Vertical scrolling is left to the browser. Arrow keys
// do the same on a keyboard.
const NO_SWIPE = '.controls, .pathbar, .tags, .chips, .sheet, input, textarea, select, .readerbar, .tabbar';
(function swipeBetweenSections() {
  const hint = document.createElement('div');
  hint.className = 'swipe-hint'; hint.setAttribute('aria-hidden', 'true');
  document.body.append(hint);
  let g = null;
  const reset = (art) => { if (art) { art.style.transition = ''; art.style.transform = ''; art.style.opacity = ''; } hint.classList.remove('on', 'ready'); };
  main.addEventListener('touchstart', (e) => {
    g = null;
    if (!readerNav || e.touches.length !== 1 || e.target.closest(NO_SWIPE)) return;
    const art = main.querySelector('article'); if (!art) return;
    if (window.getSelection()?.toString()) return;
    g = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), axis: null, dx: 0, art };
  }, { passive: true });
  main.addEventListener('touchmove', (e) => {
    if (!g) return;
    const dx = e.touches[0].clientX - g.x; const dy = e.touches[0].clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      g.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      if (g.axis === 'y') { g = null; return; }
    }
    e.preventDefault();
    const target = dx < 0 ? readerNav.next : readerNav.prev;
    g.dx = target ? dx : dx * 0.25;              // resist where there is nowhere to go
    g.target = target; g.dir = dx < 0 ? 1 : -1;
    g.art.style.transition = 'none';
    g.art.style.transform = `translateX(${g.dx}px)`;
    g.art.style.opacity = String(1 - Math.min(Math.abs(g.dx) / window.innerWidth, 0.5));
    const th = Math.min(120, window.innerWidth * 0.28);
    hint.className = `swipe-hint on ${g.dir > 0 ? 'right' : 'left'}${target && Math.abs(dx) > th ? ' ready' : ''}`;
    hint.innerHTML = target
      ? `<span class="sh-arrow">${g.dir > 0 ? '›' : '‹'}</span><span><small>${g.dir > 0 ? 'Next' : 'Previous'} ${esc(readerNav.sec)}</small><b>${esc(target.label)}</b></span>`
      : `<span><small>${g.dir > 0 ? 'Last' : 'First'} ${esc(readerNav.sec)}</small></span>`;
  }, { passive: false });
  const end = () => {
    if (!g || g.axis !== 'x') { g = null; return; }
    const { art, target, dir } = g; const dx = g.dx;
    const fast = Math.abs(dx) > 40 && Math.abs(dx) / (Date.now() - g.t) > 0.45;
    const far = Math.abs(dx) > Math.min(120, window.innerWidth * 0.28);
    g = null;
    hint.classList.remove('on', 'ready');
    if (target && (far || fast)) {
      art.style.transition = 'transform .16s ease-in, opacity .16s ease-in';
      art.style.transform = `translateX(${-dir * window.innerWidth * 0.6}px)`; art.style.opacity = '0';
      swipeIn = dir;
      setTimeout(() => go(target.href), REDUCED_MOTION() ? 0 : 150);
    } else {
      art.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1), opacity .2s';
      art.style.transform = ''; art.style.opacity = '';
      setTimeout(() => reset(art), 220);
    }
  };
  main.addEventListener('touchend', end);
  main.addEventListener('touchcancel', end);
  document.addEventListener('keydown', (e) => {
    if (!readerNav || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('.sheet, .story')) return;
    const target = e.key === 'ArrowRight' ? readerNav.next : e.key === 'ArrowLeft' ? readerNav.prev : null;
    if (!target) return;
    e.preventDefault(); swipeIn = e.key === 'ArrowRight' ? 1 : -1; go(target.href);
  });
})();

function showSwipeTip() {
  if (!matchMedia('(pointer: coarse)').matches || !(readerNav?.next || readerNav?.prev)) return;
  try { if (localStorage.getItem('vedalokana.swipeTip')) return; localStorage.setItem('vedalokana.swipeTip', '1'); } catch { return; }
  const tip = document.createElement('div');
  tip.className = 'swipe-tip'; tip.textContent = `Swipe left or right for the next or previous ${readerNav.sec}`;
  document.body.append(tip);
  setTimeout(() => tip.classList.add('out'), 3200);
  setTimeout(() => tip.remove(), 3700);
}

// Remember how far into a section the reader has scrolled, for the Continue card on Home.
let progressTick = 0;
window.addEventListener('scroll', () => {
  if (!lastRead || !document.body.classList.contains('reading') || progressTick) return;
  progressTick = requestAnimationFrame(() => {
    progressTick = 0;
    const vs = [...main.querySelectorAll('.verse')];
    const i = vs.findIndex((el) => el.getBoundingClientRect().bottom > 140);
    const v = i < 0 ? vs.length : i + 1;
    if (v === lastRead.v) return;
    lastRead.v = v;
    try { localStorage.setItem('vedalokana.last', JSON.stringify(lastRead)); } catch { /* storage unavailable */ }
  });
}, { passive: true });

// ---------- chant view: one mantra at a time, full screen ----------
let wakeLock = null;
function openStory(st, start) {
  document.querySelector('.story')?.remove();
  const { verses, meta } = st;
  if (!verses.length) return;
  let i = Math.max(0, Math.min(start, verses.length - 1));
  const el = document.createElement('div');
  el.className = 'story';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `Chant view, ${meta.ref} ${st.cref}`);
  el.style.setProperty('--vc', `var(--v-${meta.veda})`);
  const segs = verses.length <= 60;
  el.innerHTML = `<div class="st-art" aria-hidden="true"><svg viewBox="0 0 520 520"><g fill="none" stroke="currentColor" stroke-width="1.2">
      <circle cx="260" cy="260" r="80"/><circle cx="260" cy="260" r="130"/><circle cx="260" cy="260" r="180"/><circle cx="260" cy="260" r="230"/>
      <path d="M260 30v460M30 260h460M97 97l326 326M423 97L97 423"/><path d="M260 120l121 210H139z"/><path d="M260 400L139 190h242z"/></g></svg></div>
    <div class="st-bar">${segs ? verses.map(() => '<span></span>').join('') : '<span class="st-fill"><i></i></span>'}</div>
    <div class="st-head">
      <span class="st-t"><b>${refHTML(meta, st.cref)}</b><small></small></span>
      <div class="st-lipi" role="group" aria-label="Script"><button type="button" data-l="deva" lang="sa-Deva">अ</button><button type="button" data-l="knda" lang="sa-Knda">ಅ</button></div>
      <button class="st-x" type="button" aria-label="Close chant view"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <div class="st-body" aria-live="polite"></div>
    <div class="st-foot">
      <button class="st-nav" type="button" data-d="-1" aria-label="Previous mantra"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <span class="st-count"></span>
      <button class="st-nav" type="button" data-d="1" aria-label="Next mantra"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>`;
  document.body.append(el);
  document.body.classList.add('story-open');
  const body = el.querySelector('.st-body');
  const end = () => i === verses.length; // the "next section" card after the last mantra
  const show = () => {
    if (end()) {
      body.innerHTML = st.next
        ? `<div class="st-end"><small>${SA() && lvl(meta.levels[1]) ? `<span lang="sa">${esc(lvl(meta.levels[1]))} समाप्तम्</span>` : `${esc(meta.levels[1] || 'Section')} complete`}</small><a class="st-next" href="${st.next.href}">${SA() ? `<span lang="sa">अग्रिमम्:</span> ${esc(st.next.label)}` : `Next: ${esc(st.next.label)}`}</a></div>`
        : `<div class="st-end"><small>${T('End of the text', 'ग्रन्थः समाप्तः')}</small></div>`;
      el.querySelector('.st-next')?.addEventListener('click', (e) => { e.preventDefault(); storyResume = 0; close(); swipeIn = 1; go(st.next.href); });
    } else {
      const [v, deva] = verses[i];
      body.innerHTML = `<div class="st-m" lang="sa">${svaraLines(meta.id, deva).map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
      el.querySelector('.st-t small').textContent = SA() ? inLipi(dg(refOf(meta, st.d1, st.d2, v, verses[i][5]))) : `${refOf(meta, st.d1, st.d2, v, verses[i][5])}`;
    }
    el.querySelector('.st-count').textContent = end() ? '' : SA() ? inLipi(dg(`${i + 1} / ${verses.length}`)) : `${i + 1} / ${verses.length}`;
    if (segs) el.querySelectorAll('.st-bar span').forEach((b, k) => b.classList.toggle('on', k <= i));
    else el.querySelector('.st-fill i').style.width = `${Math.min(1, (i + 1) / verses.length) * 100}%`;
    el.querySelector('[data-d="-1"]').disabled = i === 0;
    el.querySelector('[data-d="1"]').disabled = end();
    el.querySelectorAll('.st-lipi button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === prefs.lipi)));
    if (!REDUCED_MOTION()) body.firstElementChild?.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
    lastRead && Object.assign(lastRead, { v: Math.min(i + 1, verses.length) }) && (() => { try { localStorage.setItem('vedalokana.last', JSON.stringify(lastRead)); } catch { /* storage unavailable */ } })();
  };
  const step = (d) => { const n = i + d; if (n < 0 || n > verses.length) return; i = n; show(); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
  };
  function close() {
    document.removeEventListener('keydown', onKey, true);
    el.remove(); document.body.classList.remove('story-open');
    try { wakeLock?.release(); } catch { /* not held */ } wakeLock = null;
    const v = verses[Math.min(i, verses.length - 1)][0];
    document.getElementById(`v${v}`)?.scrollIntoView({ block: 'start' });
  }
  document.addEventListener('keydown', onKey, true);
  el.querySelector('.st-x').addEventListener('click', close);
  el.querySelectorAll('.st-nav').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.d))));
  el.querySelectorAll('.st-lipi button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.l === prefs.lipi) return;
    storyResume = Math.min(i, verses.length - 1); close(); setLipi(b.dataset.l);
  }));
  // tap the left or right third of the text to move; swipe sideways too
  let sx = null; let sy = null; let st0 = 0;
  body.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; st0 = Date.now(); }, { passive: true });
  body.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; const dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - st0 < 400 && !e.target.closest('a')) {
      const x = e.changedTouches[0].clientX / window.innerWidth;
      if (x > 0.66) step(1); else if (x < 0.33) step(-1);
    }
  });
  try { navigator.wakeLock?.request('screen').then((l) => { wakeLock = l; }).catch(() => {}); } catch { /* not supported */ }
  show();
  el.querySelector('.st-x').focus();
}
