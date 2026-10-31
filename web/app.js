// Vedāvalokanam — a static, client-side browser for the Vedas: Saṃhitās,
// Brāhmaṇas, Āraṇyakas and Upaniṣads.
// Data lives in ./data (built by scripts/build-data.mjs); routing is hash-based.

import { toKnda } from './lipi.js';
import { dakshinatyaVerse, dakshinatyaNasals } from './dakshinatya.js';

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
const MENU_SA = { home: 'गृहम्', library: 'ग्रन्थालयः', suktas: 'सूक्तानि', search: 'अन्वेषणम्', settings: 'विन्यासः', about: 'परिचयः', my: 'मम सूक्तानि' };

const $ = (s, el = document) => el.querySelector(s);
const main = $('#main');
const rail = $('#rail');
const cache = { catalog: null, index: {}, text: {}, bhashya: {} };

// Routing: the URL hash by default; an in-memory route when embedded where
// path-like hashes can't be used (set window.VEDA_MEMORY_ROUTER before loading).
const MEMORY = !!window.VEDA_MEMORY_ROUTER;
let memHash = '';
const getHash = () => (MEMORY ? memHash : location.hash);

// ---------- history: back is the previous view, as in an app ----------
// Each history entry carries { k, i } in history.state: a key for its saved scroll position and
// its depth in this visit. Back (the top-left arrow or the phone's) steps to the previous entry;
// on the first entry of a visit (a shared link, a reload at the top) the arrow goes up to the
// parent page instead. Moves within a view (next section, filters, tabs inside a page) replace the
// entry, so back leaves the view in one step. Overlays (sheets, the chant view) push an entry of
// their own, so back closes them first.
const SCROLL_KEY = 'vedalokana.scroll';
let scrolls = {};
try { scrolls = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}'); } catch { /* storage unavailable */ }
const newKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
let navK = null; let navI = 0; let pendingReplace = false; let routing = false;
if (!MEMORY) {
  const st = history.state;
  if (st && st.k) { navK = st.k; navI = st.i || 0; } else { navK = newKey(); navI = 0; history.replaceState({ k: navK, i: 0 }, ''); }
}
// Called on every hash change before the view is drawn: a new entry gets a key and a depth; an entry
// we have been on before (back / forward) gets its scroll position back.
function navArrive() {
  if (MEMORY) return null;
  const st = history.state;
  if (st && st.k) { navK = st.k; navI = st.i || 0; return st.ov ? null : (scrolls[navK] ?? null); }
  navI = pendingReplace ? navI : navI + 1; pendingReplace = false;
  navK = newKey();
  history.replaceState({ k: navK, i: navI }, '');
  return null;
}
let scrollSaveT = 0;
window.addEventListener('scroll', () => {
  if (MEMORY || routing || !navK) return;
  scrolls[navK] = Math.round(window.scrollY);
  clearTimeout(scrollSaveT);
  scrollSaveT = setTimeout(() => { try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(scrolls)); } catch { /* storage full */ } }, 400);
}, { passive: true });
function go(h, opt = {}) {
  if (MEMORY) { memHash = h; route(); return; }
  if (h === location.hash) { if (!opt.replace) window.scrollTo(0, 0); return; }
  if (opt.replace) { pendingReplace = true; location.replace(h); } else location.hash = h;
}
// Links marked data-r move within a view: they replace the history entry.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-r]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault(); go(a.getAttribute('href'), { replace: true });
});
// Overlays: opening pushes an entry with the same address, so the phone's back closes the overlay.
let overlayClose = null; let ignorePop = false;
function overlayOpen(close) {
  overlayClose = close;
  if (!MEMORY) history.pushState({ k: navK, i: navI, ov: 1 }, '');
}
// The overlay was closed by its own button: drop its entry. `leaving`: a link inside it is being
// followed, which replaces the entry instead.
function overlayDone(leaving) {
  overlayClose = null;
  if (!MEMORY && !leaving && history.state?.ov) { ignorePop = true; history.back(); }
}
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; return; }
  if (overlayClose) { const f = overlayClose; overlayClose = null; f(); }
});

// ---------- preferences ----------
const PREF_KEY = 'vedalokana.prefs';
const prefs = (() => {
  // Default view is made for chanting: the text in script only, no romanisation or translation.
  // `v` is bumped when defaults change, so an earlier saved reading view moves to the new one once.
  const d = { v: 3, script: 'deva', mode: 'samhita', tr: false, tags: true, bhashya: false, lipi: 'deva', svara: 'bold', suktaBy: 'veda', theme: 'system', menu: 'script', patha: 'dakshinatya', dfont: 'noto' };
  try {
    const saved = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    if ((saved.v || 1) < 2) { delete saved.script; delete saved.tr; delete saved.mode; }
    // v3: the Ṛgveda opens in the Dākṣiṇātya pāṭha (the old 'dirgha' style, renamed)
    if ((saved.v || 1) < 3 && saved.patha !== 'dirgha') delete saved.patha;
    if (saved.patha === 'dirgha') saved.patha = 'dakshinatya';
    return { ...d, ...saved, v: 3 };
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
let readerNav = null;   // previous/next section of the open reader, for gestures and arrow keys
let swipeIn = 0;        // direction the next page slides in from after a swipe
const REDUCED_MOTION = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let keepAnchor = null;
function setLipi(l) {
  if (prefs.lipi === l) return;
  document.querySelectorAll('#brand span, #tabbar [data-tab] span').forEach((e) => { e.textContent = ''; });
  // remember which verse is at the top of the screen, not just the pixel offset,
  // because the two scripts wrap lines differently; measure before the font changes
  keepPlace();
  prefs.lipi = l; savePrefs(); applyLipiClass(); applyMenu();
  route();
}
function paintLipiToggle() { paintOptbar(); }
// ---------- Ṛgveda pāṭha: as South Indian books print it (default) or as VedaWeb publishes it ----------
const PATHA = { dakshinatya: ['Dākṣiṇātya pāṭha', 'दाक्षिणात्यपाठः'], std: ['Antarjāla pāṭha', 'अन्तर्जालपाठः'] };
// lines: the half-verses of one ṛk; pada: its padapāṭha words (word boundaries for nasals and avagraha)
// Ṛgveda: all four rules; Atharvaveda and Vājasaneyi: nasals inside a word as anusvāra (no
// padapāṭha here, and they keep their own svara marks). The Taittirīya texts already print
// the Taittirīya pāṭha, with its own nasals and avagrahas, so they are left as they are.
const PATHA_TEXTS = new Set(['rv', 'av', 'yv']);
const svaraLines = (textId, lines, pada) => {
  if (prefs.patha !== 'dakshinatya' || !PATHA_TEXTS.has(textId)) return lines;
  return textId === 'rv' ? dakshinatyaVerse(lines, pada) : dakshinatyaNasals(lines);
};

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
    const en = { home: 'Home', library: 'Library', suktas: 'Sūktas', my: 'My sūktas', search: 'Search', settings: 'Settings' }[k];
    span.innerHTML = T(en, MENU_SA[k]);
  });
  $('#brand span').innerHTML = T('Vedāvalokanam', 'वेदावलोकनम्');
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

// One-tap install: Chrome and Edge on Android and desktop offer the browser's own prompt through this event.
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; document.dispatchEvent(new Event('vl-install-ready')); });
addEventListener('appinstalled', () => { installEvt = null; document.dispatchEvent(new Event('vl-installed')); });
const UA = navigator.userAgent || '';
const IS_IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/.test(UA);
const IS_STANDALONE = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function installHTML() {
  if (IS_STANDALONE()) return '<section class="inst"><h2>Install</h2><p class="inst-done">✓ Installed — you are using the app now.</p></section>';
  const open = (k) => (k ? ' open' : '');
  const share = '<svg class="inst-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  const dots = '<svg class="inst-ico" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';
  return `<section class="inst" id="inst">
    <h2>Install as an app</h2>
    <p class="lede">Installing gives you a home-screen icon, a full-screen window and offline reading. It uses no app store and takes a few seconds.</p>
    <div class="inst-one" id="instOne" hidden><button type="button" class="off-btn" id="instBtn">Install now</button><span>One tap, your browser does the rest.</span></div>
    <details class="inst-d"${open(IS_ANDROID)}><summary>Android</summary>
      <p><b>Chrome or Edge:</b> if an <i>Install now</i> button appears above, tap it. Otherwise open the menu ${dots} and choose <i>Install app</i> (or <i>Add to Home screen</i>), then <i>Install</i>.</p>
      <p><b>Samsung Internet:</b> menu ☰ → <i>Add page to</i> → <i>Home screen</i>.</p>
      <p><b>Firefox:</b> menu ${dots} → <i>Install</i>.</p></details>
    <details class="inst-d"${open(IS_IOS)}><summary>iPhone and iPad</summary>
      <p>Apple does not allow a one-tap install, so it takes three taps. Open this page in <b>Safari</b>:</p>
      <ol><li>Tap the <i>Share</i> button ${share} at the bottom of the screen (top-right on iPad).</li>
      <li>Scroll down and tap <i>Add to Home Screen</i>.</li>
      <li>Tap <i>Add</i>. The icon appears on your home screen.</li></ol>
      <p>On iOS 16.4 and later, Chrome and Edge also offer <i>Add to Home Screen</i> in their Share menu.</p></details>
    <details class="inst-d"><summary>Computer</summary>
      <p><b>Chrome or Edge:</b> tap <i>Install now</i> above, or the install icon at the right end of the address bar.</p>
      <p><b>Safari (macOS Sonoma or later):</b> <i>File</i> → <i>Add to Dock</i>.</p></details>
    <p class="inst-note">After installing, open the app once while connected so the texts you want can be saved for offline use (Settings → Offline).</p>
  </section>`;
}
function wireInstall() {
  const one = document.getElementById('instOne'); const btn = document.getElementById('instBtn');
  if (!one || !btn) return;
  const sync = () => { one.hidden = !installEvt; };
  sync();
  const on = () => sync();
  document.addEventListener('vl-install-ready', on);
  document.addEventListener('vl-installed', () => { const i = document.getElementById('inst'); if (i) i.outerHTML = installHTML(); });
  btn.onclick = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    const { outcome } = await installEvt.userChoice.catch(() => ({}));
    installEvt = null; sync();
    if (outcome === 'accepted') btn.textContent = 'Installing…';
  };
}
const CHANGES = [
  ['1.14.1', '2026-10-31', ['Check for updates no longer says you have the latest version when it couldn’t reach the server; it says it couldn’t check.']],
  ['1.14.0', '2026-10-31', ['Today’s mantra is now a set of up to five cards to swipe through in a loop: the mantra, its meaning, words and grammar, ṛṣi · devatā · chandas, and its use and significance — in English, or Kannada when the script is Kannada. 365 mantras from all four Vedas and the Upaniṣads, one for each day of the year; ↻ shows another.']],
  ['1.13.0', '2026-10-31', ['An options bar under the top bar holds every setting that applies to the page: script, menus, theme, pāṭha, padapāṭha, IAST, ṛṣi · devatā · chandas, translation, bhāṣya, text size, save and chant. ⋯ opens the same options with their names, plus svara marks and font. On phones it slides away while you read down and returns when you scroll up.', 'My sūktas has its own tab in the bottom bar (in place of Search, which stays at the top).']],
  ['1.12.1', '2026-10-31', ['The About link moved to the top of the start page, with a small info icon.']],
  ['1.12.0', '2026-10-31', ['Back goes to the view you came from; moving verse to verse or sūkta to sūkta does not add back steps; scroll is restored; sheets and the chant view close on Back; tabs remember where you were.', 'My sūktas: save sūktas with ☆, see them with Recent and Frequent on Home and in the Sūktas tab, reorder, chant through the list, export or import it.', 'Chant view laid out like a recitation book: running text with ॥n॥, invocation, title, source and anukramaṇī; larger or smaller text; one-at-a-time view kept.']],
  ['1.11.0', '2026-10-31', ['Gaṇeśa Atharvaśīrṣa, Medhā Sūkta (Khila), Pavamāna Pariśiṣṭam, Pañcarudra Sūkta, Navagraha Mantras with adhidevatās, Vedapārāyaṇa Ārambha and Sandhyā Ṛk mantras.']],
  ['1.10.0', '2026-10-31', ['Śrī Sūkta under the Ṛgveda, in the South Indian pāṭha with svaras and the Khila pāṭha of Scheftelowitz; the words where they differ are marked.']],
  ['1.9.0', '2026-10-31', ['113 sūktas, mantras and śānti pāṭhas from every Veda (was 54), each on a page of its own, put together from all its parts.', 'Home: a button for each Veda under the Veda tiles shows its sūktas.']],
  ['1.8.0', '2026-10-31', ['Kannada: an anudātta after ಁ (ಲೋಁ॒ ವೀಁ॒) also sits under its letter; checked over every accented syllable of all the Vedas.', 'Dākṣiṇātya pāṭha in the Atharvaveda and the Vājasaneyi Saṃhitā: nasals as anusvāra (इंद्र). The Taittirīya texts already print their own pāṭha.']],
  ['1.7.3', '2026-10-31', ['Kannada: every anudātta sits under its own letter, also under letters joined with their vowel sign (ಜಾ ಪು ವೋ) and before a visarga (ತೀಃ), instead of drifting toward the next letter.']],
  ['1.7.2', '2026-10-31', ['The Ṛgveda’s single-stroke pāṭha is now called Antarjāla pāṭha: the text as the online source gives it.']],
  ['1.7.1', '2026-10-31', ['The Ṛgveda’s single-stroke pāṭha is now called Sāmānya pāṭha (previously Śṛṅgeri style).']],
  ['1.7.0', '2026-10-31', [
    'Dākṣiṇātya pāṭha (formerly Kāñcī · Mādhva), now the default for the Ṛgveda: dīrgha svarita, nasals inside a word as anusvāra (इंद्र), an avagraha where two pādas run together (दक्षि॑णेना॒ऽभि), and the kampa as Karnataka books print it (र॒प्स्व(अ॒)न्१॒॑तः). Checked against printed Gaṇapati, Hiraṇyagarbha, Puruṣa and Devī sūktas.']],
  ['1.6.0', '2026-10-31', [
    'Install instructions for Android, iPhone/iPad and computers under Settings → About, with a one-tap Install button where the browser allows it.']],
  ['1.5.0', '2026-10-31', [
    'The app is now called Vedāvalokanam (previously Vedālokana). Your settings, place and offline downloads are kept.']],
  ['1.4.1', '2026-10-31', [
    'Check for updates tries several ways to reach the server and says why when it can’t, instead of a bare “couldn’t reach the server”.']],
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
    'Install Vedāvalokanam as an app; it opens and works without a connection.',
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
    const t = toast('A new version of Vedāvalokanam is ready. <button type="button">Reload</button>', 0);
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
  // Ask for version.js a few different ways: some hosts and preview frames refuse a query string or
  // a cache-bypass request, and the answer is the same file either way.
  const tries = [
    [`version.js?fresh=${Date.now()}`, { cache: 'no-store' }],
    ['version.js', { cache: 'reload' }],
    ['version.js', {}],
  ];
  let latest = null; let why = '';
  for (const [u, o] of tries) {
    try {
      const r = await fetch(u, o);
      if (!r.ok) { why = `HTTP ${r.status}`; continue; }
      latest = (await r.text()).match(/version:\s*'([^']+)'/)?.[1] || null;
      if (latest) break;
      why = 'unexpected reply';
    } catch (err) { why = err?.message || 'network error'; }
  }
  // Last resort: let the browser fetch the service worker itself, which carries the version.
  let reg0 = null;
  if (!latest && swOK) {
    reg0 = await navigator.serviceWorker.getRegistration().catch(() => null);
    if (reg0) {
      try { await reg0.update(); } catch (err) { why ||= err?.message || ''; }
      const w0 = reg0.installing || reg0.waiting;
      if (w0) {
        const v = await new Promise((res) => {
          const t = setTimeout(() => res(null), 4000);
          navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.version) { clearTimeout(t); res(e.data.version); } }, { once: true });
          w0.postMessage('version');
        });
        latest = v;
      }
    }
  }
  if (!latest) { say(`Couldn’t reach the server${why ? ` (${why})` : ''}. Try again in a moment.`); return finish(); }
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
function setTitle(t) { document.title = t ? `${t} — Vedāvalokanam` : 'Vedāvalokanam — browse Veda mantras'; }

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
  h += `<a href="#/suktas"${rt.parts[0] === 'suktas' ? ' aria-current="page"' : ''}><span>Sūktas</span><span class="dv" lang="sa">सूक्तानि</span></a>`;
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
const SUN_SVG = `<svg class="hero-sun" width="260" height="260" viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="46"/><circle cx="130" cy="130" r="70" class="r1"/><circle cx="130" cy="130" r="94" class="r2"/><circle cx="130" cy="130" r="118" class="r3"/></svg>`;
const ARROW = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';


// ---------- the daily mantra: a set of up to five cards, swiped in a loop ----------
// 1 the mantra · 2 its meaning · 3 words and grammar · 4 ṛṣi, devatā, chandas · 5 use and significance.
// The notes are in English, or Kannada when the script is Kannada.
let dmPick = null;   // { k } of a set chosen with "Another"; null = today's
let dmIndex = null;
const GAYATRI = { t: 'rv', ref: '3.62.10', src: 'RV 3.62.10', lines: ['तत्स॑वि॒तुर्वरे॑ण्यं॒ भर्गो॑ दे॒वस्य॑ धीमहि ।', 'धियो॒ यो नः॑ प्रचो॒दया॑त् ॥'], href: '#/v/rv/c/3/62?v=10',
  d: ['savita', 'savitā', 'सविता'], r: ['gathino-visvamitra', 'gāthino viśvāmitraḥ', 'गाथिनो विश्वामित्रः'], c: ['gayatri', 'gāyatrī', 'गायत्री'] };
async function dailyItem(pick) {
  try {
    const ix = (dmIndex ||= await json('data/daily/index.json'));
    const now = new Date();
    const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
    const k = pick ? pick.k : (day * 7919) % ix.n;
    const items = await json(`data/daily/c${Math.floor(k / ix.chunk)}.json`);
    return { ...items[k % ix.chunk], k, today: !pick };
  } catch { return { ...GAYATRI, today: true }; }
}
const dmKn = () => prefs.lipi === 'knda';
const dmL = (pair) => esc(pair?.[dmKn() ? 1 : 0] || pair?.[0] || '');
function dailyCards(m) {
  const ref = m.t === 'sk' ? T(m.src, m.srcSa) : SA() ? `<span lang="sa">${esc(`${REF_SA[m.t] || ''} ${dg(m.ref)}`)}</span>` : esc(m.t === 'rv' ? `Ṛgveda ${m.ref}` : m.src);
  const names = [m.d, m.r, m.c].filter(Boolean);
  const tags = SA() ? `<span lang="sa">${esc(names.map((x) => x[2] || x[1]).join(' · '))}</span>` : esc(names.map((x) => cap(x[1])).join(' · '));
  const lines = m.t === 'sk' ? m.lines : svaraLines(m.t, m.lines, m.pada);
  const cards = [{ k: T('Mantra', 'मन्त्रः'), html: `<div class="hero-m" lang="sa">${lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
      <div class="hero-r"><b>${ref}</b><span>${tags}</span></div>` }];
  if (m.m) cards.push({ k: T('Meaning', 'अर्थः'), html: `<p class="dm-p">${dmL(m.m)}</p>` });
  if (m.w?.length) cards.push({ k: T('Words and grammar', 'पदानि व्याकरणं च'), html: `<dl class="dm-w">${m.w.map((w) => `<div><dt lang="sa">${esc(w[0])}</dt><dd>${esc(w[dmKn() ? 2 : 1] || w[1])}</dd></div>`).join('')}</dl>` });
  const g = dmIndex?.gloss || {};
  const who = [['r', 'rishi', 'Ṛṣi', 'ऋषिः'], ['d', 'devata', 'Devatā', 'देवता'], ['c', 'chandas', 'Chandas', 'छन्दः']].filter(([f]) => m[f]);
  if (m.m && who.length) {
    cards.push({ k: T('Ṛṣi · devatā · chandas', 'ऋषिः · देवता · छन्दः'), html: `<dl class="dm-w dm-who">${who.map(([f, kind, en, sa]) => {
      const x = m[f]; const note = g[kind]?.[x[0]];
      return `<div><dt><small>${T(en, sa)}</small> <span lang="sa">${esc(x[2] || x[1])}</span></dt>${note ? `<dd>${esc(note[dmKn() ? 1 : 0])}</dd>` : ''}</div>`;
    }).join('')}</dl>` });
  }
  if (m.u) cards.push({ k: T('Use and significance', 'विनियोगः महत्त्वं च'), html: `<p class="dm-p">${dmL(m.u)}</p>` });
  return cards;
}
function dailyHTML(m) {
  const cards = dailyCards(m);
  const kick = m.today ? T('Today’s mantra', 'अद्यतनमन्त्रः') : T('Another mantra', 'अन्यो मन्त्रः');
  return `${SUN_SVG}
    <div class="dm-top"><h1 id="todayH" class="hero-k">${kick}<span class="dm-sub"> · <span id="dmK">${cards[0].k}</span></span></h1>
      ${m.today ? '' : `<button type="button" class="dm-today">${T('Today’s', 'अद्यतनम्')}</button>`}
      ${dmIndex ? `<button type="button" class="dm-new" aria-label="${esc(Tp('Another mantra', 'अन्यो मन्त्रः'))}" title="${esc(Tp('Another mantra', 'अन्यो मन्त्रः'))}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"/></svg></button>` : ''}</div>
    <div class="dm-view" aria-live="polite">${cards.map((c, i) => `<div class="dm-card${i ? '' : ' on'}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${cards.length}"${i ? ' aria-hidden="true"' : ''}>${c.html}</div>`).join('')}</div>
    <div class="hero-f dm-f">
      ${cards.length > 1 ? `<div class="dm-dots" role="tablist">${cards.map((c, i) => `<button type="button" role="tab" data-i="${i}" aria-selected="${String(!i)}" aria-label="${esc(c.k.replace(/<[^>]+>/g, ''))}"></button>`).join('')}</div>` : '<span></span>'}
      <a class="hero-go" href="${esc(m.href)}" aria-label="Open in the reader">${ARROW}</a>
    </div>`;
}
function wireDaily(m) {
  const box = $('#dm'); if (!box) return;
  const cards = [...box.querySelectorAll('.dm-card')]; const n = cards.length;
  const kicks = dailyCards(m).map((c) => c.k);
  let at = 0;
  const show = (i, dir) => {
    const j = ((i % n) + n) % n; if (j === at) return;
    const from = cards[at]; const to = cards[j];
    from.classList.remove('on'); from.setAttribute('aria-hidden', 'true');
    to.classList.add('on'); to.removeAttribute('aria-hidden');
    if (!REDUCED_MOTION()) {
      to.animate([{ transform: `translateX(${dir * 40}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    at = j;
    box.querySelectorAll('.dm-dots button').forEach((b, k) => b.setAttribute('aria-selected', String(k === j)));
    $('#dmK').innerHTML = kicks[j];
  };
  box.querySelectorAll('.dm-dots button').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.i); show(i, i > at ? 1 : -1); }));
  const view = box.querySelector('.dm-view');
  let x0 = null; let y0 = 0;
  view.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  view.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; const dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && n > 1) show(at + 1, 1);   // a tap moves on
  });
  view.addEventListener('pointercancel', () => { x0 = null; });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); show(at + 1, 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); show(at - 1, -1); }
  });
  const redraw = async (pick) => {
    dmPick = pick;
    const m2 = await dailyItem(pick);
    box.innerHTML = dailyHTML(m2);
    wireDaily(m2);
    if (!REDUCED_MOTION()) box.querySelector('.dm-view')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
  };
  box.querySelector('.dm-new')?.addEventListener('click', () => {
    if (!dmIndex) return;
    let k; do { k = Math.floor(Math.random() * dmIndex.n); } while (dmIndex.n > 1 && k === m.k);
    redraw({ k });
  });
  box.querySelector('.dm-today')?.addEventListener('click', () => redraw(null));
}

async function viewHome() {
  setTitle('');
  const cat = await catalog();
  // Today's mantra: a card set from data/daily (scripts/build-daily.mjs); offline, before it
  // is stored, the Gāyatrī alone.
  if (keepScrollY === null) dmPick = null;
  const dm = await dailyItem(dmPick);
  const byId = Object.fromEntries(cat.texts.map((x) => [x.id, x]));
  let last = null;
  try { last = JSON.parse(localStorage.getItem('vedalokana.last') || 'null'); } catch { /* storage unavailable */ }
  let suk = [];
  try { suk = (cache.suktas ||= await json('data/suktas.json')); } catch { /* optional */ }
  const pct = last?.of ? Math.min(1, last.v / last.of) : 0;
  main.innerHTML = `${ASHRAMA_SVG}<div class="home">
    <a class="home-about" href="#/about" aria-label="About Vedāvalokanam, version ${esc(APP.version)}: sources and what’s new">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/></svg>
      <span>${T('About', 'परिचयः')}</span><small>${esc(APP.version)}</small></a>
    <section class="pc" id="pc" aria-label="Today’s pañcāṅga"></section>
    <section class="hero dm" id="dm" aria-roledescription="carousel" aria-labelledby="todayH">${dailyHTML(dm)}</section>
    ${last ? `<a class="cont" href="${esc(last.v > 1 ? `${last.href}${last.href.includes('?') ? '&' : '?'}v=${last.v}` : last.href)}">
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
    ${suk.length ? `<div class="sec-h"><h2>${T('Sūktas', 'सूक्तानि')}</h2><a href="#/suktas">${SA() ? `<span lang="sa">सर्वाणि ${dg(suk.length)}</span>` : `All ${suk.length}`}</a></div>
    ${sukVedaButtons(cat, suk, homeVeda(suk), 'button')}
    <div class="schips" id="homeSk">${sukChips(suk, homeVeda(suk))}</div>` : ''}
    <p class="lede home-foot">Every text comes from an openly published digital edition.</p>
  </div>`;
  renderPanchanga();
  wireDaily(dm);
  main.querySelectorAll('[data-myk]').forEach((b) => b.addEventListener('click', () => {
    prefs.homeMy = b.dataset.myk; savePrefs();
    main.querySelectorAll('[data-myk]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#homeMy').innerHTML = myChips(suk, prefs.homeMy);
    $('#homeMyOpen')?.setAttribute('href', `#/suktas?list=${prefs.homeMy}`);
  }));
  main.querySelectorAll('.skv [data-skv]').forEach((b) => b.addEventListener('click', () => {
    prefs.homeSk = b.dataset.skv; savePrefs();
    main.querySelectorAll('.skv [data-skv]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#homeSk').innerHTML = sukChips(suk, prefs.homeSk);
  }));
}

// ---------- My sūktas on Home: Saved · Recent · Frequent ----------
function myChips(suk, k) {
  return myList(k, suk).map((e) => `<a class="schip" href="${esc(e.href)}${k === 'saved' ? '?from=my' : ''}"><span lang="sa">${esc(e.deva)}</span><small>${sukRef(e)}</small></a>`).join('');
}
function homeMy(suk) {
  const have = MY_LISTS.filter(([k]) => myList(k, suk).length);
  if (!have.length) return '';
  const cur = have.some(([k]) => k === prefs.homeMy) ? prefs.homeMy : have[0][0];
  return `<div class="sec-h"><h2>${T('My sūktas', 'मम सूक्तानि')}</h2><a id="homeMyOpen" href="#/suktas?list=${cur}">${T('Open', 'सर्वम्')}</a></div>
    <div class="seg my-seg" role="group" aria-label="My sūktas">${have.map(([k, en, sa]) => `<button type="button" data-myk="${k}" aria-pressed="${String(k === cur)}">${T(en, sa)}</button>`).join('')}</div>
    <div class="schips" id="homeMy">${myChips(suk, cur)}</div>`;
}

// ---------- sūktas: the Veda buttons and chips shared by Home and the Sūktas tab ----------
const homeVeda = (suk) => (suk.some((e) => e.veda === prefs.homeSk) ? prefs.homeSk : 'rv');
const sukRef = (e) => (SA() && e.refs?.length ? `<span lang="sa">${esc(e.refs.map(([t, r]) => (r ? `${REF_SA[t] || ''} ${dg(r)}` : (cache.catalog?.texts.find((x) => x.id === t)?.deva || dg(e.ref)))).join('; ').trim())}</span>` : SA() ? `<span lang="sa">${esc(dg(e.ref))}</span>` : esc(e.ref));
function sukChips(suk, veda) {
  return suk.filter((e) => e.veda === veda).map((e) => `<a class="schip" href="${esc(e.href)}"><span lang="sa">${esc(e.deva)}</span><small>${sukRef(e)}</small></a>`).join('');
}
// as buttons (Home: switch the chips in place) or as links (Sūktas tab: filter the list)
function sukVedaButtons(cat, suk, cur, as, href) {
  const n = (id) => suk.filter((e) => e.veda === id).length;
  return `<div class="skv" role="group" aria-label="Veda">${cat.vedas.filter((v) => n(v.id)).map((v) => {
    const inner = `${VEDA_ICON[v.id] ? vedaIcon(v.id, 'skv-i') : ''}<span class="skv-n"><b>${T(v.name, VEDA_SA[v.id])}</b><small>${F(n(v.id))}</small></span>`;
    return as === 'button'
      ? `<button type="button" class="skv-b" style="--vc: var(--v-${v.id})" data-skv="${v.id}" aria-pressed="${String(v.id === cur)}">${inner}</button>`
      : `<a class="skv-b" data-r style="--vc: var(--v-${v.id})" href="${href(v.id)}" aria-pressed="${String(v.id === cur)}">${inner}</a>`;
  }).join('')}</div>`;
}
// ---------- My sūktas: one saved list, and recent / frequent, kept on this device ----------
const MY_KEY = 'vedalokana.my';
const MY_LISTS = [['saved', 'My list', 'मम सङ्ग्रहः'], ['recent', 'Recent', 'अचिरपठितानि'], ['frequent', 'Frequent', 'बहुपठितानि']];
const my = (() => {
  const d = { saved: [], hist: {}, keep: true };
  try { return { ...d, ...JSON.parse(localStorage.getItem(MY_KEY) || '{}') }; } catch { return d; }
})();
const saveMy = () => { try { localStorage.setItem(MY_KEY, JSON.stringify(my)); } catch { /* storage unavailable */ } };
const HALF_LIFE = 14 * 864e5;   // a visit counts half as much after two weeks
const decayed = (h, now) => h.s * 0.5 ** ((now - h.t) / HALF_LIFE);
function visitSukta(sid) {
  if (!my.keep) return;
  const now = Date.now(); const h = my.hist[sid];
  if (h && now - h.t < 10 * 60e3) { h.t = now; saveMy(); return; }   // a reload or a return within minutes is one visit
  my.hist[sid] = { n: (h?.n || 0) + 1, s: (h ? decayed(h, now) : 0) + 1, t: now };
  saveMy();
}
const isSaved = (sid) => my.saved.includes(sid);
function toggleSaved(sid) {
  my.saved = isSaved(sid) ? my.saved.filter((x) => x !== sid) : [...my.saved, sid];
  saveMy();
}
function myList(kind, all) {
  const byId = new Map(all.map((e) => [e.id, e]));
  const now = Date.now();
  const ids = kind === 'saved' ? my.saved
    : kind === 'recent' ? Object.entries(my.hist).sort((a, b) => b[1].t - a[1].t).slice(0, 20).map(([k]) => k)
      : Object.entries(my.hist).filter(([, h]) => h.n >= 2).sort((a, b) => decayed(b[1], now) - decayed(a[1], now)).slice(0, 12).map(([k]) => k);
  return ids.map((k) => byId.get(k)).filter(Boolean);
}
// a reader section that is a whole sūkta of the list (Ṛgveda 10.90 = Puruṣa Sūkta)
async function sukOfSection(t, d1, d2, n) {
  let all = cache.suktas;
  if (!all) { try { all = (cache.suktas = await json('data/suktas.json')); } catch { return null; } }
  return all.find((e) => e.reader === `#/v/${t}/c/${d1}/${d2}` && e.count === n) || null;
}
const STAR = (on) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>`;
function addStar(box, sid) {
  if (!box) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'star-btn';
  const paint = () => { const on = isSaved(sid); b.innerHTML = `${STAR(on)}<span>${on ? T('In my list', 'सङ्गृहीतम्') : T('Save', 'सङ्गृहाण')}</span>`; b.setAttribute('aria-pressed', String(on)); };
  paint();
  b.addEventListener('click', () => { toggleSaved(sid); paint(); });
  box.append(b);
}
// bar actions: save to My list, open the chant view
function obStar(sid) {
  return { id: 'star', get on() { return isSaved(sid); }, get label() { return isSaved(sid) ? Tp('In my list', 'सङ्गृहीतम्') : Tp('Save to my list', 'सङ्गृहाण'); },
    get icon() { return STAR(isSaved(sid)); }, act() { toggleSaved(sid); paintOptbar(); } };
}
const obChant = (fn) => ({ id: 'chant', label: Tp('Chant view', 'पारायणम्'), icon: OB_ICON.chant, act: fn });
// the next and previous items when a sūkta was opened from My list
function listNeighbours(sid, all) {
  const l = myList('saved', all); const k = l.findIndex((e) => e.id === sid);
  if (k < 0) return {};
  const at = (e) => e && { href: `${e.href}?from=my`, label: e.deva };
  return { prev: at(l[k - 1]), next: at(l[k + 1]), pos: k, of: l.length };
}

const KIND = { upaniṣad: ['Upaniṣad', 'उपनिषत्'], sūkta: ['Sūkta', 'सूक्तम्'], mantra: ['Mantra', 'मन्त्रः'], anuvāka: ['Anuvāka', 'अनुवाकः'], praśna: ['Praśna', 'प्रश्नः'], adhyāya: ['Adhyāya', 'अध्यायः'], parva: ['Parva', 'पर्व'], śānti: ['Śānti mantra', 'शान्तिमन्त्रः'] };

// ---------- a sūkta given in pāṭhas of its own (Śrī Sūkta): switch between them, with the
// words where the first differs from the critical text marked and that text's reading noted ----------
async function viewSuktaVersions(s, params) {
  const ver = s.versions.find((v) => v.id === params?.get('p')) || s.versions[0];
  // the South Indian text is published with dīrgha svarita; the Antarjāla pāṭha writes one stroke
  const style = (l) => (prefs.patha === 'std' ? l.replace(/᳚/g, '॑') : l);
  const wordsHTML = (line, li, marks) => line.split(' ').map((w, wi) => (marks?.some(([a, b]) => a === li && b === wi) ? `<mark class="pv">${esc(w)}</mark>` : esc(w))).join(' ');
  // ṛks taken from the app's Ṛgveda (src: [text, d1, d2, v]) follow the pāṭha like the reader
  const rv = await Promise.all(ver.verses.map(async (v) => {
    if (!v.src) return null;
    const [t, d1, d2, n] = v.src;
    return ((await text(t, d1))[d2] || []).find((x) => x[0] === n) || null;
  }));
  const linesOf = (v, i) => (v.src ? (rv[i] ? svaraLines(v.src[0], rv[i][1], rv[i][3]) : []) : v.lines.map(style));
  let body = '';
  ver.verses.forEach((v, i) => {
    if (v.head) body += `<h2 class="sk-seg">${T(v.head[0], v.head[1])}</h2>`;
    const lines = linesOf(v, i);
    const where = v.src ? `<a href="#/v/${v.src[0]}/c/${v.src[1]}/${v.src[2]}?v=${v.src[3]}" class="pv-src">${SA() ? `<span lang="sa">${esc(`${REF_SA.rv} ${dg(v.src.slice(1).join('.'))}`)}</span>` : esc(`RV ${v.src.slice(1).join('.')}`)}</a>` : '';
    const note = v.reads?.length ? `<p class="pv-note">${SA() ? `<span lang="sa">खिलपाठः ${esc(dg(`2.6.${v.khila}`))}:</span>` : `Khila 2.6.${esc(v.khila)} reads`} <span lang="sa">${v.reads.map(esc).join(' · ')}</span></p>` : '';
    body += `<section class="verse" id="sv${i + 1}"><div class="vnum">${N(String(v.n))}</div><div><div class="deva" lang="sa">${lines.map((l, li) => `<div>${wordsHTML(l, li, v.marks)}</div>`).join('')}</div>${note}${where}</div></section>`;
  });
  const k = KIND[s.kind] || KIND.sūkta;
  const all = cache.suktas;
  main.innerHTML = `<article class="col sk-page" style="--vc: var(--v-${s.veda})">
    ${listBar(s, all, params)}
    <h1>${SA() ? `<span lang="sa">${esc(s.deva)}</span>` : `${esc(s.name)}<span class="h1-deva" lang="sa">${esc(s.deva)}</span>`}</h1>
    <p class="sk-info">${T(VEDA_SHORT[s.veda] || '', VEDA_SA[s.veda])} · ${sukRef(s)} · ${T(k[0], k[1])} · ${SA() ? `<span lang="sa">${esc(s.devataDeva)}</span>` : `<em>Devatā</em> ${esc(s.devata)}`} · ${F(ver.verses.length)} ${T('verses', 'मन्त्राः')}</p>
    ${s.versions.length < 2 ? '' : `<div class="seg wide-seg sk-ver" role="group" aria-label="Pāṭha">${s.versions.map((v) => `<a data-r href="#/s/${s.id}${v === s.versions[0] ? '' : `?p=${v.id}`}" aria-pressed="${String(v === ver)}">${T(v.name, v.deva)}</a>`).join('')}</div>`}
    <p class="lede sk-note">${esc(ver.note)}${ver === s.versions[0] && s.versions.length > 1 ? ' Words that read differently in the Khila text are <mark class="pv">marked</mark>, with its reading under the verse.' : ''}</p>
    <div class="sk-acts"><button type="button" class="chip" id="skCopy">${T('Copy', 'प्रतिलिपिः')}</button></div>
    <div class="verses">${body}</div>
  </article>`;
  const cparts = [];
  ver.verses.forEach((v, j) => {
    if (!cparts.length || v.head) cparts.push({ title: v.head ? v.head[1] : '', group: s.veda === 'rv' ? 5 : 1, verses: [] });
    cparts[cparts.length - 1].verses.push({ n: v.n, lines: linesOf(v, j), label: v.src ? `RV ${v.src.slice(1).join('.')}` : '' });
  });
  obAdd('patha');
  suktaExtras(s, all, params, cparts);
  $('#skCopy')?.addEventListener('click', async (e) => {
    const txt = [s.deva, ...ver.verses.flatMap((v, i) => linesOf(v, i).map((l) => (prefs.lipi === 'knda' ? toKnda(l) : l))), `— ${s.ref}`].join('\n');
    try { await navigator.clipboard.writeText(txt); e.target.textContent = SA() ? 'प्रतिलिपिः ✓' : 'Copied'; } catch { /* clipboard blocked */ }
  });
}

// ---------- My list on the Sūktas tab: reorder, remove, chant straight through ----------
function myListHTML(k, all, row) {
  const items = myList(k, all);
  const empty = { saved: ['Nothing saved yet. Tap ☆ Save on any sūkta to keep it here.', 'किमपि न सङ्गृहीतम्। सूक्ते ☆ स्पृश।'],
    recent: ['Sūktas you open will appear here.', 'पठितानि सूक्तानि अत्र दृश्यन्ते।'],
    frequent: ['Sūktas you open often will appear here.', 'बहुशः पठितानि सूक्तानि अत्र दृश्यन्ते।'] }[k];
  if (!items.length) return `<p class="lede">${T(empty[0], empty[1])}</p>`;
  if (k !== 'saved') return `<div class="sk-list">${items.map(row).join('')}</div>`;
  const ctl = (e, j) => `<span class="my-ctl">
      <button type="button" data-mv="-1" data-id="${e.id}" aria-label="Move up"${j === 0 ? ' disabled' : ''}>↑</button>
      <button type="button" data-mv="1" data-id="${e.id}" aria-label="Move down"${j === items.length - 1 ? ' disabled' : ''}>↓</button>
      <button type="button" data-rm="${e.id}" aria-label="Remove from my list">✕</button></span>`;
  return `<div class="sk-acts"><button type="button" class="chant-btn" id="chantList"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.8l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>${T('Chant my list', 'सङ्ग्रहं पठ')}</button></div>
    <div class="sk-list my-list">${items.map((e, j) => `<div class="my-row">${row(e)}${ctl(e, j)}</div>`).join('')}</div>`;
}
function wireMyList(all) {
  main.querySelectorAll('[data-mv]').forEach((b) => b.addEventListener('click', () => {
    const j = my.saved.indexOf(b.dataset.id); const t = j + Number(b.dataset.mv);
    if (j < 0 || t < 0 || t >= my.saved.length) return;
    [my.saved[j], my.saved[t]] = [my.saved[t], my.saved[j]]; saveMy();
    keepScrollY = window.scrollY; route();
  }));
  main.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => {
    toggleSaved(b.dataset.rm); keepScrollY = window.scrollY; route();
  }));
  $('#chantList')?.addEventListener('click', () => {
    const first = myList('saved', all)[0];
    if (first) { chantResume = 0; go(`${first.href}?from=my`); }
  });
}

// ---------- what every sūkta page has: save, chant, My-list moves, Continue ----------
const chantBtn = () => `<button class="chant-btn" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.8l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>${T('Chant view', 'पारायणम्')}</button>`;
let sukNav = null;   // My-list neighbours of the open sūkta, kept through renderChrome
function listBar(s, all, params) {
  if (params?.get('from') !== 'my') return '';
  const nb = listNeighbours(s.id, all);
  if (nb.pos === undefined) return '';
  const arrow = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  return `<nav class="list-bar" aria-label="My list">
    ${nb.prev ? `<a data-r href="${esc(nb.prev.href)}" aria-label="Previous in my list">${arrow('M15 5l-7 7 7 7')}</a>` : '<span></span>'}
    <a href="#/my"><b>${T('My list', 'मम सङ्ग्रहः')}</b> <small>${F(nb.pos + 1)} / ${F(nb.of)}</small></a>
    ${nb.next ? `<a data-r href="${esc(nb.next.href)}" aria-label="Next in my list">${arrow('M9 5l7 7-7 7')}</a>` : '<span></span>'}</nav>`;
}
function suktaExtras(s, all, params, cparts) {
  visitSukta(s.id);
  const nb = params?.get('from') === 'my' ? listNeighbours(s.id, all) : {};
  sukNav = nb.pos !== undefined ? { prev: nb.prev, next: nb.next, sec: 'sūkta' } : null;
  readerNav = sukNav;
  lastRead = { href: `#/s/${s.id}${nb.pos !== undefined ? '?from=my' : ''}`, text: 'Sūktas', textSa: 'सूक्तानि', where: s.name, whereSa: s.deva, v: 1, of: s.count };
  try { localStorage.setItem('vedalokana.last', JSON.stringify(lastRead)); } catch { /* storage unavailable */ }
  const model = () => ({
    title: s.deva, veda: s.veda, parts: cparts, prev: sukNav?.prev, next: sukNav?.next,
    onClose: (k) => document.getElementById(`sv${k + 1}`)?.scrollIntoView({ block: 'start' }),
    onPlace: (k) => { lastRead.v = k + 1; try { localStorage.setItem('vedalokana.last', JSON.stringify(lastRead)); } catch { /* storage unavailable */ } },
  });
  obAdd('tsize', obStar(s.id), obChant(() => openChant(model(), 0)));
  const v = Number(params?.get('v'));
  if (chantResume !== null) { const k = chantResume; chantResume = null; openChant(model(), k); }
  else if (v > 1) requestAnimationFrame(() => document.getElementById(`sv${v}`)?.scrollIntoView({ block: 'start' }));
  if (swipeIn) {
    const dir = swipeIn; swipeIn = 0;
    if (!REDUCED_MOTION()) main.querySelector('article')?.animate([{ transform: `translateX(${dir * 48}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
}

// ---------- one sūkta, put together from its parts ----------
async function viewSukta(sid, params) {
  const all = (cache.suktas ||= await json('data/suktas.json'));
  const s = all.find((x) => x.id === sid);
  if (!s) { notFound(); return; }
  setTitle(s.name);
  if (s.versions) { await viewSuktaVersions(s, params); return; }
  const cat = await catalog();
  const metaOf = (t) => cat.texts.find((x) => x.id === t);
  const blocks = [];
  for (const g of s.segs) {
    const meta = metaOf(g.t);
    const vs = ((await text(g.t, g.d1))[g.d2] || []).filter((v) => v[0] >= g.v[0] && v[0] <= g.v[1]);
    vs.forEach((v, i) => {
      const a = i === 0 ? g.a : null; const b = i === vs.length - 1 ? g.b : null;
      const lines = !a && !b ? v[1] : v[1].map((l, li) => {
        if ((a && li < a[0]) || (b && li > b[0])) return '';
        const w = l.split(' ');
        return w.slice(a && li === a[0] ? a[1] : 0, b && li === b[0] ? b[1] + 1 : w.length).join(' ');
      }).filter((l) => l.trim());
      blocks.push({ g, meta, v, lines, cut: !!(a || b) });
    });
  }
  const showRoman = (b) => !b.cut && b.v[2]?.length && (prefs.script !== 'deva' || !b.lines.length);
  const vedaName = cat.vedas.find((v) => v.id === s.veda);
  let n = 0; let lastSeg = null;
  const body = blocks.map((b) => {
    n++;
    const head = b.g !== lastSeg && new Set(s.segs.map((x) => x.t)).size + s.segs.length > 2
      ? `<h2 class="sk-seg">${b.g.title ? `${T(b.g.title, b.g.titleDeva)} · ` : ''}<a href="#/v/${b.g.t}/c/${b.g.d1}/${b.g.d2}?v=${b.g.v[0]}">${SA() ? `<span lang="sa">${esc(`${REF_SA[b.g.t] || b.meta.deva} ${dg(b.g.ref || '')}`)}</span>` : esc(`${b.meta.ref} ${b.g.ref || ''}`)}</a></h2>` : '';
    lastSeg = b.g;
    const ref = refOf(b.meta, b.g.d1, b.g.d2, b.v[0], b.v[5]);
    let html = '';
    if (b.lines.length && prefs.script !== 'roman') html += `<div class="deva" lang="sa">${svaraLines(b.g.t, b.lines, b.cut ? null : b.v[3]).map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
    if (showRoman(b)) html += `<div class="roman" lang="sa-Latn">${b.v[2].map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
    if (!b.cut && b.v[4] && prefs.tr) html += `<p class="tr" lang="en">${esc(b.v[4])}</p>`;
    return `${head}<section class="verse" id="sv${n}" aria-label="${esc(b.meta.ref)} ${esc(ref)}">
      <div class="vnum"><a href="#/v/${b.g.t}/c/${b.g.d1}/${b.g.d2}?v=${b.v[0]}" title="${esc(`${b.meta.ref} ${ref}`)}">${N(String(n))}</a></div><div>${html}</div></section>`;
  }).join('');
  const k = KIND[s.kind] || KIND.sūkta;
  main.innerHTML = `<article class="col sk-page" style="--vc: var(--v-${s.veda})">
    ${listBar(s, all, params)}
    <h1>${SA() ? `<span lang="sa">${esc(s.deva)}</span>` : `${esc(s.name)}<span class="h1-deva" lang="sa">${esc(s.deva)}</span>`}</h1>
    <p class="sk-info">${T(vedaName?.name || '', VEDA_SA[s.veda])} · ${sukRef(s)} · ${T(k[0], k[1])} · ${SA() ? `<span lang="sa">${esc(s.devataDeva)}</span>` : `<em>Devatā</em> ${esc(s.devata)}`}${s.count > 1 ? ` · ${F(s.count)} ${T('verses', 'मन्त्राः')}` : ''}</p>
    <div class="sk-acts">${s.reader ? `<a class="chip" href="${s.reader}">${T('Open in the reader', 'मूलग्रन्थे पठ')}</a>` : ''}<button type="button" class="chip" id="skCopy">${T('Copy', 'प्रतिलिपिः')}</button></div>
    <div class="verses">${body}</div>
  </article>`;
  // chant view: one part per place the sūkta is gathered from
  const rvx = s.segs.some((g) => g.t === 'rv') ? await index('rv') : null;
  let cn = 0;
  const cparts = s.segs.map((g) => {
    const bs = blocks.filter((b) => b.g === g && b.lines.length);
    const rows = g.t === 'rv' ? rvx.rows.filter((r) => r[0] === g.d1 && r[1] === g.d2 && r[2] >= g.v[0] && r[2] <= g.v[1]) : [];
    return {
      title: g.titleDeva || '',
      src: `(${REF_SA[g.t] || bs[0]?.meta.deva || ''} ${dg(String(g.ref || '').replace(/\./g, ','))})`,
      anu: g.t === 'rv' && bs.length ? anukramani(bs[0].lines, bs.length, rows, rvx.facets) : '',
      group: METRICAL.has(g.t) ? 5 : 1,
      verses: bs.map((b) => ({ n: ++cn, lines: svaraLines(b.g.t, b.lines, b.cut ? null : b.v[3]), label: refText(b.meta, refOf(b.meta, b.g.d1, b.g.d2, b.v[0], b.v[5])) })),
    };
  });
  obAdd(s.segs.some((g) => PATHA_TEXTS.has(g.t)) && 'patha', blocks.some((b) => !b.cut && b.v[2]?.length && b.lines.length) && 'script',
    blocks.some((b) => !b.cut && b.v[4]) && 'tr');
  suktaExtras(s, all, params, cparts);
  $('#skCopy')?.addEventListener('click', async (e) => {
    const txt = [s.deva, ...blocks.flatMap((b) => svaraLines(b.g.t, b.lines, b.cut ? null : b.v[3]).map((l) => (prefs.lipi === 'knda' ? toKnda(l) : l))), `— ${s.ref}`].join('\n');
    try { await navigator.clipboard.writeText(txt); e.target.textContent = SA() ? 'प्रतिलिपिः ✓' : 'Copied'; } catch { /* clipboard blocked */ }
  });
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
    <nav class="veda-switch" aria-label="Veda">${cat.vedas.map((x) => `<a data-r href="#/veda/${x.id}${layer !== 'samhita' ? `/${layer}` : ''}"${x.id === v.id ? ' aria-current="page"' : ''} style="--vc: var(--v-${x.id})">${T(x.name.replace(/veda$/, ''), VEDA_SA_SHORT[x.id])}</a>`).join('')}</nav>
    <h1>${SA() ? `<span lang="sa">${esc(VEDA_SA[v.id] || v.deva)}</span>` : `${esc(v.name)}<span class="h1-deva" lang="sa">${esc(v.deva)}</span>`}</h1>
    <nav class="layer-tabs" aria-label="Layers">${cat.layers.map((l) => `<a data-r href="#/veda/${v.id}/${l}"${l === layer ? ' aria-current="page"' : ''}>
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
    PATHA_TEXTS.has(id) && hasDeva ? seg('Pāṭha', Object.entries(PATHA).map(([k, [en, sa]]) => ['patha', k, `<span class="pt-m" lang="sa" aria-hidden="true">${id !== 'rv' ? (k === 'dakshinatya' ? 'इं' : 'इन्') : k === 'dakshinatya' ? 'ई᳚' : 'ई॑'}</span>${T(en.replace(' style', '').replace(' pāṭha', ''), sa)}`])).replace('class="seg"', 'class="seg patha-seg"') : '',
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
    </div></div>

    ${summary.length ? `<div class="tags" id="sumTags"${prefs.tags ? '' : ' hidden'}>${summary.map(([f, e]) => `<a class="tag" href="${findHref(id, { [f]: e[0] })}"><em>${T(FACETS[f].label, FACET_SA[f])}</em>${e[2] ? `<span class="dv" lang="sa">${esc(e[2])}</span>` : ''}${SA() && e[2] ? '' : `<span>${esc(cap(e[1]))}</span>`}</a>`).join('')}</div>` : ''}

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
        if (showDeva) body += `<div class="deva" lang="sa">${svaraLines(id, deva, pd).map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
        if (showRoman) body += `<div class="roman" lang="sa-Latn">${roman.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
      }
      if (tr && (prefs.tr || (!hasDeva && !hasRoman))) body += `<p class="tr" lang="en">${esc(tr)}</p>`;
      const bh = !(hasBh && prefs.bhashya) ? '' : `<details class="bh" data-bh="${v}"><summary>${SA() ? '<span lang="sa">सायणभाष्यम्</span>' : `${esc(meta.has.bhashya)} bhāṣya <span class="dv" lang="sa">सायणभाष्यम्</span>`}</summary><div class="bh-text" lang="sa"><p class="bh-wait">Loading…</p></div></details>`;
      return `<section class="verse${v === hl ? ' hl' : ''}" id="v${v}" aria-label="${esc(meta.ref)} ${esc(ref)}">
        <div class="vnum"><a data-r href="#/v/${id}/c/${d1}/${d2}?v=${v}">${N(ref)}</a></div>
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
      const txt = [...svaraLines(id, vs[1], vs[3]).map((l) => (prefs.lipi === 'knda' ? toKnda(l) : l)), ...vs[2], vs[4], `— ${meta.ref} ${refOf(meta, d1, d2, v, vs[5])}`].filter(Boolean).join('\n');
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
  rb.innerHTML = `${prev ? `<a class="rb-step" data-r href="#/v/${id}/c/${prev[0]}/${prev[1]}" aria-label="Previous ${esc((meta.levels[1] || 'section').toLowerCase())}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></a>` : '<span class="rb-step" aria-hidden="true"></span>'}
    <button class="rb-pick" aria-haspopup="dialog"><span>${cref ? refHTML(meta, cref) : T(meta.name, meta.deva)}</span>${CHEV}</button>
    ${next ? `<a class="rb-step" data-r href="#/v/${id}/c/${next[0]}/${next[1]}" aria-label="Next ${esc((meta.levels[1] || 'section').toLowerCase())}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></a>` : '<span class="rb-step" aria-hidden="true"></span>'}`;
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
  // chant view: this section as a book page
  const sk = await sukOfSection(id, d1, d2, verses.length);
  obAdd(PATHA_TEXTS.has(id) && hasDeva && 'patha', hasPada && 'mode', hasDeva && hasRoman && 'script', summary.length && 'tags',
    hasTr && (hasDeva || hasRoman) && 'tr', hasBh && 'bhashya', 'tsize', sk && obStar(sk.id), hasDeva && obChant(() => openChant(chantModel(), 0)));
  if (sk) visitSukta(sk.id);
  const chantModel = () => {
    const vs = verses.filter((v) => v[1].length);
    const title = sk ? sk.deva : `${meta.deva} ${dg(cref || '')}`.trim();
    return {
      title, veda: meta.veda,
      parts: [{
        src: cref ? `(${REF_SA[id] || meta.deva} ${dg(String(cref).replace(/\./g, ','))})` : '',
        anu: id === 'rv' ? anukramani(vs[0][1], vs.length, vs.map((v) => rowOf.get(v[0])).filter(Boolean), x.facets) : '',
        group: METRICAL.has(id) ? 5 : 1,
        verses: vs.map((v) => ({ n: v[0], lines: svaraLines(id, v[1], v[3]), label: refText(meta, refOf(meta, d1, d2, v[0], v[5])) })),
      }],
      prev: readerNav.prev && { href: readerNav.prev.href, label: readerNav.prev.label },
      next: readerNav.next && { href: readerNav.next.href, label: readerNav.next.label },
      onClose: (k) => document.getElementById(`v${vs[k][0]}`)?.scrollIntoView({ block: 'start' }),
      onPlace: (k) => { if (lastRead) { lastRead.v = k + 1; try { localStorage.setItem('vedalokana.last', JSON.stringify(lastRead)); } catch { /* storage unavailable */ } } },
    };
  };
  if (chantResume !== null) { const k = chantResume; chantResume = null; openChant(chantModel(), k); }
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
      <div class="app-id"><h1>Vedāvalokanam</h1>
        <p class="app-v">Version <b>${esc(APP.version)}</b>${APP.released ? ` · ${esc(fmtDay(APP.released))}` : ''}</p>
        <p class="app-v">Texts built ${esc(fmtDay(cat.built))}</p></div>
      <div class="app-state" id="appState"><span class="dot"></span><span>Checking offline readiness…</span></div>
      <div class="app-acts"><button type="button" class="off-btn ghost" id="chkUpd">Check for updates</button><a class="off-btn ghost" href="#/settings?s=offline">Offline downloads</a></div>
      <p class="upd-out" id="updOut" role="status" aria-live="polite"></p>
    </section>
    ${installHTML()}
    <p class="lede">Vedāvalokanam is a non-commercial browser for the Vedas, built from openly published digital texts. Text and tags are shown as the sources give them; corrections belong upstream.</p>
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
    <p>The data is built by <code>scripts/build-data.mjs</code> and the fonts by <code>scripts/make-fonts.py</code>; the source repositories and steps are in the project README.</p>
  </div>`;
  const upd = document.getElementById('chkUpd');
  upd.onclick = () => checkForUpdate(upd, document.getElementById('updOut'));
  wireInstall();
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
// silent: the page is changing anyway (a link in the sheet, a new route), so leave history alone
function closeSheet(silent) {
  if (!sheetRoot.firstChild) return;
  sheetRoot.innerHTML = '';
  document.body.classList.remove('sheet-open');
  if (overlayClose === sheetPop) overlayDone(silent);
  lastFocus?.focus?.();
}
function sheetPop() { sheetRoot.innerHTML = ''; document.body.classList.remove('sheet-open'); lastFocus?.focus?.(); }
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
  sheetRoot.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeSheet()));
  // following a link from the sheet takes the sheet's place in history
  sheetRoot.querySelectorAll('.sheet-body a').forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault(); closeSheet(true); go(a.getAttribute('href'), { replace: true });
  }));
  if (overlayClose !== sheetPop) overlayOpen(sheetPop);
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
  // a sūkta: Sūktas › its Veda › the sūkta, each a picker
  if (a === 's') {
    const all = (cache.suktas ||= await json('data/suktas.json'));
    const sk = all.find((x) => x.id === id);
    if (!sk) return path;
    const sv = cat.vedas.find((x) => x.id === sk.veda);
    const n = (vv) => all.filter((e) => e.veda === vv).length;
    path.push({ label: 'Sūktas', deva: MENU_SA.suktas, href: '#/suktas', title: 'Sūktas',
      items: async () => [{ label: 'All sūktas', deva: 'सर्वाणि सूक्तानि', href: '#/suktas' }, ...MY_LISTS.map(([k, en, sa]) => ({ label: en, deva: sa, href: `#/suktas?list=${k}` }))] });
    path.push({ label: sv.name, deva: VEDA_SA[sv.id], href: `#/suktas?veda=${sv.id}`, title: 'Sūktas of',
      items: async () => cat.vedas.filter((x) => n(x.id)).map((x) => ({ label: x.name, deva: VEDA_SA[x.id], href: `#/suktas?veda=${x.id}`, current: x.id === sv.id, sub: `${n(x.id)} sūktas` })) });
    path.push({ label: sk.name, deva: sk.deva, href: sk.href, title: `${sv.name}: sūktas`,
      items: async () => all.filter((e) => e.veda === sv.id).map((e) => ({ label: e.name, deva: e.deva, href: e.href, current: e.id === sk.id, sub: e.ref })) });
    return path;
  }
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

// ---------- the options bar: every setting that applies to this page, one tap away ----------
// Global settings (script, menus, theme) are always there; a view adds its own with obAdd() while
// it renders. "⋯" opens a panel with the same options labelled, plus text size, svara marks and font.
const OB_ICON = {
  theme: { system: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    light: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>',
    dark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>' },
  tags: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.2V4.8a1.3 1.3 0 0 1 1.3-1.3h7.4l8.3 8.3a1.3 1.3 0 0 1 0 1.8l-7.4 7.4a1.3 1.3 0 0 1-1.8 0z"/><circle cx="8.2" cy="8.2" r="1.6"/></svg>',
  tr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h9M7.5 3v2M10 5c-.8 3.6-3 6.4-6 8M6 8.5c1.2 2 2.9 3.6 5 4.6"/><path d="M12.5 21l4-10 4 10M14 17.5h5"/></svg>',
  bhashya: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 5.5c3-1.3 6-1.3 9 .8 3-2.1 6-2.1 9-.8v13c-3-1.3-6-1.3-9 .8-3-2.1-6-2.1-9-.8z"/><path d="M12 6.3v13" stroke-linecap="round"/></svg>',
  chant: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.8l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>',
  more: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
};
const TSIZES = [0.85, 1, 1.15, 1.3, 1.5, 1.75];
function applySize() { document.documentElement.style.setProperty('--tz', String(prefs.tsize || 1)); }
applySize();
// a setting the bar or panel can change: k (pref), its choices [value, en, sa], how the icon looks
const OB = {
  lipi: { en: 'Script', sa: 'लिपिः', ch: [['deva', 'Devanagari', 'देवनागरी'], ['knda', 'Kannada', 'ಕನ್ನಡ']],
    icon: (v) => `<span class="ob-l ${v}" aria-hidden="true">${v === 'knda' ? 'ಅ' : 'अ'}</span>`, on: () => false },
  menu: { en: 'Menus', sa: 'सूचिभाषा', ch: [['script', 'In the script', 'संस्कृतम्'], ['en', 'English', 'English']],
    icon: () => '<span class="ob-t" aria-hidden="true">En</span>', on: (v) => v === 'en' },
  theme: { en: 'Theme', sa: 'वर्णविन्यासः', ch: [['system', 'Match device', 'यन्त्रानुसारम्'], ['light', 'Light', 'प्रकाशः'], ['dark', 'Dark', 'अन्धकारः']],
    icon: (v) => OB_ICON.theme[v], on: () => false },
  patha: { en: 'Pāṭha', sa: 'पाठः', ch: [['dakshinatya', 'Dākṣiṇātya', 'दाक्षिणात्यः'], ['std', 'Antarjāla', 'अन्तर्जालः']],
    icon: (v) => `<span class="ob-l" lang="sa" aria-hidden="true">${v === 'dakshinatya' ? 'ई᳚' : 'ई॑'}</span>`, on: (v) => v === 'dakshinatya' },
  mode: { en: 'Padapāṭha', sa: 'पदपाठः', ch: [['samhita', 'Saṃhitā', 'संहिता'], ['pada', 'Padapāṭha', 'पदपाठः']],
    icon: () => '<span class="ob-l" lang="sa" aria-hidden="true">पद</span>', on: (v) => v === 'pada' },
  script: { en: 'Show', sa: 'दर्शय', ch: [['deva', 'Script only', 'लिपिः'], ['both', 'Script and IAST', 'उभयम्'], ['roman', 'IAST only', 'IAST']],
    icon: (v) => `<span class="ob-t ob-ia" aria-hidden="true">${v === 'both' ? '<span class="ob-l">अ</span>ā' : 'ā'}</span>`, on: (v) => v !== 'deva' },
  tags: { en: 'Ṛṣi · devatā · chandas', sa: 'ऋषिः · देवता · छन्दः', ch: [[true, 'Show', 'दर्शय'], [false, 'Hide', 'गोपय']], icon: () => OB_ICON.tags, on: (v) => v },
  tr: { en: 'Translation', sa: 'अनुवादः', ch: [[true, 'Show', 'दर्शय'], [false, 'Hide', 'गोपय']], icon: () => OB_ICON.tr, on: (v) => v },
  bhashya: { en: 'Sāyaṇa bhāṣya', sa: 'सायणभाष्यम्', ch: [[true, 'Show', 'दर्शय'], [false, 'Hide', 'गोपय']], icon: () => OB_ICON.bhashya, on: (v) => v },
  tsize: { en: 'Text size', sa: 'अक्षरमानम्', icon: () => '<span class="ob-t" aria-hidden="true">A<small>A</small></span>', on: () => (prefs.tsize || 1) !== 1 },
  svara: { en: 'Svara marks', sa: 'स्वरचिह्नानि', ch: [['bold', 'Bold', 'स्थूलम्'], ['std', 'Standard', 'सामान्यम्']] },
  dfont: { en: 'Devanagari font', sa: 'देवनागरीलिपिरूपम्', ch: [['noto', 'Noto Serif', 'Noto Serif'], ['shobhika', 'Shobhika', 'Shobhika']] },
};
const OB_GLOBAL = ['lipi', 'menu', 'theme'];
let obPage = [];   // this page's options: pref keys, or { id, en, sa, icon, on, act } actions
const obAdd = (...xs) => { obPage.push(...xs.filter(Boolean)); };
let obPanel = null;
const obLabel = (o, v) => {
  const c = o.ch?.find(([x]) => x === v);
  return `${Tp(o.en, o.sa)}${c ? `: ${Tp(c[1], c[2])}` : ''}`;
};
// the top of the reading area, under the bars, for keeping a verse in place while the page redraws
function headBottom() {
  return Math.max(...['.topbar', '#optbar', '#pathbar'].map((s) => { const e = $(s); return e && !e.hidden ? e.getBoundingClientRect().bottom : 0; }));
}
function keepPlace() {
  const head = headBottom();
  const verses = [...document.querySelectorAll('.verse[id]')];
  const anchor = verses.find((el) => el.getBoundingClientRect().top >= head - 4) || verses.find((el) => el.getBoundingClientRect().bottom > head + 8);
  keepScrollY = window.scrollY;
  keepAnchor = anchor ? { id: anchor.id, top: anchor.getBoundingClientRect().top } : null;
}
function setPref(k, v) {
  if (prefs[k] === v) return;
  if (k === 'lipi') { setLipi(v); return; }
  if (k === 'menu') { setMenu(v); return; }
  if (k === 'theme') { setTheme(v); paintOptbar(); return; }
  prefs[k] = v; savePrefs();
  if (k === 'svara' || k === 'dfont') { applyLipiClass(); paintOptbar(); return; }
  if (k === 'tsize') { keepPlace(); applySize(); const y = keepScrollY; const a = keepAnchor; keepScrollY = null; keepAnchor = null;
    const el = a && document.getElementById(a.id); window.scrollTo(0, el ? window.scrollY + el.getBoundingClientRect().top - a.top : y); paintOptbar(); return; }
  keepPlace(); route();
}
const obNext = (k) => { const o = OB[k]; const i = o.ch.findIndex(([x]) => x === prefs[k]); return o.ch[(i + 1) % o.ch.length][0]; };
function paintOptbar() {
  const bar = $('#optbar'); if (!bar) return;
  const btn = (k) => {
    if (typeof k === 'object') return `<button type="button" class="ob-b${k.on ? ' on' : ''}" data-act="${k.id}" aria-label="${esc(k.label)}" title="${esc(k.label)}"${k.on !== undefined ? ` aria-pressed="${String(!!k.on)}"` : ''}>${k.icon}</button>`;
    const o = OB[k]; const v = prefs[k];
    const lab = k === 'tsize' ? `${Tp(o.en, o.sa)}: ${Math.round((prefs.tsize || 1) * 100)}%` : obLabel(o, v);
    return `<button type="button" class="ob-b${o.on(v) ? ' on' : ''}" data-ob="${k}" aria-label="${esc(lab)}" title="${esc(lab)}">${o.icon(v)}</button>`;
  };
  bar.innerHTML = `<div class="ob-in">${OB_GLOBAL.map(btn).join('')}${obPage.length ? `<span class="ob-sep" aria-hidden="true"></span>${obPage.map(btn).join('')}` : ''}</div>
    <button type="button" class="ob-b ob-more" data-more aria-label="${esc(Tp('All options', 'सर्वे विकल्पाः'))}" title="${esc(Tp('All options', 'सर्वे विकल्पाः'))}" aria-haspopup="dialog">${OB_ICON.more}</button>`;
  bar.querySelectorAll('[data-ob]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.ob;
    if (k === 'tsize') { openOptPanel('tsize'); return; }
    setPref(k, obNext(k));
  }));
  bar.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => obPage.find((x) => x.id === b.dataset.act)?.act(b)));
  bar.querySelector('[data-more]').addEventListener('click', () => openOptPanel());
  if (obPanel) obPanel.fill();
}
// the panel: the same options with their names, and the ones too rare for the bar
function openOptPanel(only) {
  if (obPanel) { obPanel.close(); return; }
  const wrap = document.createElement('div');
  wrap.className = 'ob-panel-wrap';
  wrap.innerHTML = `<div class="ob-scrim"></div><section class="ob-panel" role="dialog" aria-modal="true" aria-label="${esc(Tp('Options', 'विकल्पाः'))}"></section>`;
  document.body.append(wrap);
  const panel = wrap.querySelector('.ob-panel');
  const sizeRow = () => {
    const i = Math.max(0, TSIZES.indexOf(prefs.tsize || 1));
    return `<div class="ob-row"><span>${T(OB.tsize.en, OB.tsize.sa)}</span><div class="seg"><button type="button" data-tz="-1" aria-label="Smaller"${i === 0 ? ' disabled' : ''}>A−</button><button type="button" data-tz="0" class="ob-pct" aria-label="Reset text size">${Math.round(TSIZES[i] * 100)}%</button><button type="button" data-tz="1" aria-label="Larger"${i === TSIZES.length - 1 ? ' disabled' : ''}>A+</button></div></div>`;
  };
  const row = (k) => {
    const o = OB[k];
    if (k === 'tsize') return sizeRow();
    return `<div class="ob-row"><span>${T(o.en, o.sa)}</span><div class="seg">${o.ch.map(([v, en, sa]) => `<button type="button" data-k="${k}" data-v="${String(v)}" aria-pressed="${String(prefs[k] === v)}">${k === 'lipi' ? `<span lang="${v === 'knda' ? 'sa-Knda' : 'sa-Deva'}" class="ob-l ${v}">${v === 'knda' ? 'ಕನ್ನಡ' : 'देवनागरी'}</span>` : T(en, sa)}</button>`).join('')}</div></div>`;
  };
  const fill = () => {
    const pageKeys = obPage.filter((x) => typeof x === 'string');
    const acts = obPage.filter((x) => typeof x === 'object');
    panel.innerHTML = only === 'tsize' ? `<div class="ob-h">${T('Text size', 'अक्षरमानम्')}</div>${sizeRow()}`
      : `<div class="ob-h">${T('Everywhere', 'सर्वत्र')}</div>${OB_GLOBAL.map(row).join('')}
      ${pageKeys.length ? `<div class="ob-h">${T('This page', 'अस्मिन् पृष्ठे')}</div>${pageKeys.filter((k) => k !== 'tsize').map(row).join('')}` : ''}
      ${pageKeys.includes('tsize') ? sizeRow() : ''}
      ${acts.length ? `<div class="ob-acts">${acts.map((a) => `<button type="button" class="chip" data-pact="${a.id}"${a.on !== undefined ? ` aria-pressed="${String(!!a.on)}"` : ''}>${a.icon}<span>${esc(a.label)}</span></button>`).join('')}</div>` : ''}
      <div class="ob-h">${T('Reading', 'पठनम्')}</div>${row('svara')}${row('dfont')}
      <a class="ob-all" href="#/settings">${T('All settings', 'सर्वे विन्यासाः')} ›</a>`;
    panel.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.k; const raw = b.dataset.v;
      setPref(k, raw === 'true' ? true : raw === 'false' ? false : raw);
      if (OB_GLOBAL.includes(k) || k === 'svara' || k === 'dfont') fill();
    }));
    panel.querySelectorAll('[data-tz]').forEach((b) => b.addEventListener('click', () => {
      const d = Number(b.dataset.tz); const i = Math.max(0, TSIZES.indexOf(prefs.tsize || 1));
      setPref('tsize', d === 0 ? 1 : TSIZES[Math.min(TSIZES.length - 1, Math.max(0, i + d))]); fill();
    }));
    panel.querySelectorAll('[data-pact]').forEach((b) => b.addEventListener('click', () => { const a = obPage.find((x) => x.id === b.dataset.pact); close(); a?.act(); }));
    panel.querySelector('.ob-all')?.addEventListener('click', (e) => { e.preventDefault(); close(true); go('#/settings', { replace: true }); });
  };
  const shut = () => { wrap.remove(); obPanel = null; document.removeEventListener('keydown', onKey); };
  const close = (leaving) => { shut(); overlayDone(leaving); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  wrap.querySelector('.ob-scrim').addEventListener('click', () => close());
  obPanel = { fill, close };
  fill();
  overlayOpen(shut);
  panel.querySelector('button')?.focus({ preventScroll: true });
}
// on phones the bar slides away while reading down the page and comes back on scrolling up
let obLastY = window.scrollY;
window.addEventListener('scroll', () => {
  const y = window.scrollY; const d = y - obLastY;
  if (Math.abs(d) < 6) return;
  obLastY = y;
  if (routing || obPanel) return;
  document.body.classList.toggle('ob-hide', d > 0 && y > 140);
}, { passive: true });

let tabLast = {};
try { tabLast = JSON.parse(sessionStorage.getItem('vedalokana.tabs') || '{}'); } catch { /* storage unavailable */ }
$('#backBtn').addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  if (!MEMORY && navI > 0) history.back();
  else go($('#backBtn').getAttribute('href'), { replace: true });
});
// a tab returns to where you were in it; the tab you are on goes to its first page, at the top
$('#tabbar').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-tab]');
  if (!a || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  const root = a.getAttribute('href'); const t = a.dataset.tab;
  const here = a.getAttribute('aria-current') === 'page';
  if (here) { if (getHash() !== root && (getHash() || '#/') !== root) go(root); else window.scrollTo({ top: 0, behavior: REDUCED_MOTION() ? 'auto' : 'smooth' }); return; }
  go(tabLast[t] || root);
});
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
  // back: the previous view; on the first view of a visit, the parent page
  const page = r.parts[0] || '';
  const topLevel = ['', 'library', 'suktas', 'my', 'search', 'settings'].includes(page);
  const parentHref = topLevel ? null : path.length >= 2 ? path[path.length - 2].href : page === 'about' ? '#/settings' : page === 's' ? (r.params.get('from') === 'my' ? '#/my' : '#/suktas') : '#/library';
  const back = $('#backBtn');
  back.hidden = !parentHref;
  if (parentHref) back.setAttribute('href', parentHref);
  $('#brand').classList.toggle('when-back', !!parentHref);
  // each tab remembers where you were in it
  const tabNow = !page ? 'home' : (page === 'veda' || page === 'v' ? 'library' : page === 'about' ? 'settings' : page === 's' ? 'suktas' : page);
  if (tabNow === 'library' || tabNow === 'suktas' || tabNow === 'my') { tabLast[tabNow] = getHash(); try { sessionStorage.setItem('vedalokana.tabs', JSON.stringify(tabLast)); } catch { /* storage unavailable */ } }
  const named = { library: 'Library', suktas: 'Sūktas', s: 'Sūktas', search: 'Search', settings: 'Settings', about: 'About' }[page];
  const lastC = path[path.length - 1];
  $('#topTitle').textContent = lastC ? Tp(lastC.label, lastC.deva) : (named ? Tp(named, MENU_SA[page === 's' ? 'suktas' : page]) : '');
  // tabs
  const tab = !page ? 'home' : (page === 'veda' || page === 'v' ? 'library' : page === 'about' ? 'settings' : page === 's' ? (r.params.get('from') === 'my' ? 'my' : 'suktas') : page);
  $('#tabbar').querySelectorAll('[data-tab]').forEach((a) => (a.dataset.tab === tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.body.classList.toggle('reading', page === 'v' && r.parts[2] === 'c');
  if (!(page === 'v' && r.parts[2] === 'c')) { $('#readerbar').hidden = true; readerNav = page === 's' ? sukNav : null; }
  if (page !== 's') sukNav = null;
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
  setTitle('Sūktas');
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
  if (MY_LISTS.some(([k]) => k === params.get('list'))) { go(`#/my?list=${params.get('list')}`, { replace: true }); return; }
  const listK = '';
  const row = sukRow(by, listK);
  main.innerHTML = `<div class="col">
    <h1>${T('Sūktas', 'सूक्तानि')}${SA() ? '' : '<span class="h1-deva" lang="sa">सूक्तानि</span>'}</h1>
    <p class="lede">The sūktas, mantras and śānti pāṭhas of recitation books such as the Sasvara Vedamantrāḥ, from every Veda. Each opens as one piece, even when it is gathered from several places.</p>
    ${sukVedaButtons(cat, all, vedaF, 'link', (k) => href({ veda: vedaF === k ? '' : k }))}
    <div class="seg sk-sort" role="group" aria-label="List by">
      ${[['veda', 'By Veda'], ['devata', 'By devatā'], ['az', 'A–Z']].map(([k, l]) => `<a data-r href="${href({ by: k })}" data-by="${k}" aria-pressed="${by === k}">${l}</a>`).join('')}
    </div>
    ${groups.map((g) => `<section class="sk-group"><h2>${esc(g.title)}${g.deva ? `<span class="h2-deva" lang="sa">${esc(g.deva)}</span>` : ''}<small>${g.items.length}</small></h2>
      <div class="sk-list">${g.items.map(row).join('')}</div></section>`).join('')}
  </div>`;
  main.querySelectorAll('[data-by]').forEach((a) => a.addEventListener('click', () => { prefs.suktaBy = a.dataset.by; savePrefs(); }));
}
// one row of a sūkta list
const sukRow = (by, listK) => (e) => `<a class="sk-row" href="${e.href}${listK === 'saved' ? '?from=my' : ''}">
      <span class="sk-top"><span class="sk-name"><span class="dv" lang="sa">${esc(e.deva)}</span><span class="ia">${esc(e.name)}</span></span><span class="sk-ref">${esc(e.ref)}</span></span>
      <span class="sk-line" lang="sa">${esc(e.line)}</span>
      <span class="sk-meta">${by !== 'devata' ? `<span><em>Devatā</em> ${esc(e.devata)}</span>` : ''}${by !== 'veda' ? `<span>${esc(VEDA_SHORT[e.veda])}</span>` : ''}<span>${esc((KIND[e.kind] || KIND.sūkta)[0])}${e.count > 1 ? ` · ${fmt(e.count)} verses` : ''}</span></span>
    </a>`;
// ---------- the My sūktas tab: My list · Recent · Frequent ----------
async function viewMy(params) {
  setTitle('My sūktas');
  const all = (cache.suktas ||= await json('data/suktas.json'));
  const k = MY_LISTS.some(([x]) => x === params.get('list')) ? params.get('list') : (prefs.myTab || 'saved');
  if (prefs.myTab !== k) { prefs.myTab = k; savePrefs(); }
  main.innerHTML = `<div class="col">
    <h1>${T('My sūktas', 'मम सूक्तानि')}${SA() ? '' : '<span class="h1-deva" lang="sa">मम सूक्तानि</span>'}</h1>
    <nav class="chips my-tabs" aria-label="My sūktas">${MY_LISTS.map(([x, en, sa]) => `<a class="chip" data-r href="#/my?list=${x}"${k === x ? ' aria-current="true"' : ''}>${x === 'saved' ? STAR(k === x) : ''}${T(en, sa)} <small>${F(myList(x, all).length)}</small></a>`).join('')}</nav>
    ${myListHTML(k, all, sukRow('veda-none', k))}
    <p class="my-foot">${T('Kept on this device. Export or import your list in', 'अस्मिन् यन्त्रे एव। सङ्ग्रहस्य निर्यातः आयातश्च')} <a href="#/settings?s=mysk">${T('Settings', 'विन्यासे')}</a>.</p>
  </div>`;
  if (k === 'saved') wireMyList(all);
}

async function viewSearch(params) {
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
  // the query is kept in the address, so back from a result returns to the same results
  const keepQ = () => { if (!MEMORY) history.replaceState(history.state, '', `#/search${input.value.trim() ? `?q=${encodeURIComponent(input.value)}` : ''}`); };
  input.addEventListener('input', () => { run(); keepQ(); });
  main.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.q; run(); keepQ(); input.focus(); }));
  if (params?.get('q')) { input.value = params.get('q'); await run(); } else if (matchMedia('(hover: hover)').matches) input.focus();
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
    <section class="set"><h2>Pāṭha</h2><p>Dākṣiṇātya pāṭha prints the Ṛgveda as South Indian recitation books do: a svarita on a heavy syllable with two strokes (dīrgha svarita <span lang="sa">ई᳚</span>), a nasal inside a word as anusvāra (<span lang="sa">इंद्र</span>), an avagraha where two pādas run together (<span lang="sa">दक्षि॑णेना॒ऽभि</span>), and a kampa with its vowel spelled out (<span lang="sa">र॒प्स्व(अ॒)न्१॒॑तः</span>). Antarjāla pāṭha is the text as the online source gives it (VedaWeb, after Aufrecht), every svarita with one stroke. In the Atharvaveda and the Vājasaneyi Saṃhitā the Dākṣiṇātya pāṭha writes nasals as anusvāra too; the Taittirīya texts keep their own pāṭha.</p>
      <div class="seg wide-seg">${opt('patha', 'dakshinatya', esc(PATHA.dakshinatya[0]))}${opt('patha', 'std', esc(PATHA.std[0]))}</div>
      <p class="svara-demo" lang="sa">${svaraLines('rv', ['आ नो॑ भर॒ दक्षि॑णेना॒भि स॒व्येन॒ प्र मृ॑श', 'इन्द्र॒ मा नो॒ वसो॒र्निर्भा॑क्'], ['ā', 'naḥ', 'bhara', 'dakṣiṇena', 'abhi', 'savyena', 'pra', 'mṛśa', 'indra', 'mā', 'naḥ', 'vasoḥ', 'niḥ', 'bhāk']).map((l) => `<span>${esc(l)}</span>`).join(' । ')}</p></section>
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
    <section class="set" id="mysk"><h2>My sūktas</h2><p>Your list, and the sūktas you open (Recent and Frequent), are kept on this device only. Export the list to keep a copy or move it to another device.</p>
      <div class="seg wide-seg"><button data-keep="true" aria-pressed="${String(my.keep)}">Keep recent and frequent</button><button data-keep="false" aria-pressed="${String(!my.keep)}">Don’t keep</button></div>
      <div class="app-acts"><button type="button" class="off-btn ghost" id="myClear">Clear recent and frequent</button><button type="button" class="off-btn ghost" id="myExport">Export my list</button><label class="off-btn ghost">Import a list<input type="file" id="myImport" accept="application/json,.json" hidden></label></div>
      <p class="pc-note" id="myMsg" aria-live="polite"></p></section>
    <section class="set" id="offline"><h2>Offline</h2><p>Once installed, the app opens without a connection, and every text you have read stays available. Download a whole Veda to have all of it ready.</p>
      <div class="off" id="offList"><p class="loading">Checking what is stored…</p></div></section>
    <section class="set"><h2>About</h2><a class="about-link" href="#/about"><img src="icons/icon.svg" alt="" width="40" height="40"><span><b>Vedāvalokanam</b><small>Version ${esc(APP.version)} · sources, licences, what’s new</small></span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></a></section>
  </div>`;
  renderOffline(document.getElementById('offList'));
  if (parse().params.get('s') === 'offline') document.getElementById('offline')?.scrollIntoView();
  // My sūktas
  const myMsg = (t) => { const m = $('#myMsg'); if (m) m.textContent = t; };
  main.querySelectorAll('[data-keep]').forEach((b) => b.addEventListener('click', () => {
    my.keep = b.dataset.keep === 'true'; saveMy();
    main.querySelectorAll('[data-keep]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('#myClear')?.addEventListener('click', () => { my.hist = {}; saveMy(); myMsg('Recent and frequent cleared.'); });
  $('#myExport')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'Vedavalokanam', list: my.saved }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-suktas.json';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#myImport')?.addEventListener('change', async (e) => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      const all = (cache.suktas ||= await json('data/suktas.json'));
      const ids = (Array.isArray(d) ? d : d.list || []).filter((x) => all.some((s2) => s2.id === x));
      my.saved = [...new Set([...my.saved, ...ids])]; saveMy();
      myMsg(`${ids.length} sūktas added to your list.`);
    } catch { myMsg('That file is not a list exported from this app.'); }
  });
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
  routing = true;
  closeSheet(true);
  main.ontouchstart = null; main.ontouchend = null;
  main.innerHTML = '<p class="loading">Loading…</p>';
  obPage = [];
  if (keepScrollY === null) document.body.classList.remove('ob-hide');
  try {
    await renderRail(r);
    const [a, id, sub, p1, p2] = r.parts;
    if (!a) await viewHome();
    else if (a === 'about') await viewAbout();
    else if (a === 'library') await viewLibrary();
    else if (a === 'suktas') await viewSuktas(r.params);
    else if (a === 'my') await viewMy(r.params);
    else if (a === 's') await viewSukta(id, r.params);
    else if (a === 'search') await viewSearch(r.params);
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
    paintOptbar();
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
      routing = false;
    }));
  } else {
    if (!r.params.get('v') || r.params.get('v') === '1') window.scrollTo(0, 0);
    routing = false;
  }
  paintOptbar();
  main.focus({ preventScroll: true });
}
if (MEMORY) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    go(a.getAttribute('href'));
  });
} else {
  window.addEventListener('hashchange', () => {
    const y = navArrive();
    if (y !== null) { keepScrollY = y; keepAnchor = null; }
    route();
  });
}
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
const NO_SWIPE = '.dm, .controls, .pathbar, .tags, .chips, .sheet, input, textarea, select, .readerbar, .tabbar';
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
      setTimeout(() => go(target.href, { replace: true }), REDUCED_MOTION() ? 0 : 150);
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
    e.preventDefault(); swipeIn = e.key === 'ArrowRight' ? 1 : -1; go(target.href, { replace: true });
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
  if (!lastRead || !(document.body.classList.contains('reading') || getHash().startsWith('#/s/')) || progressTick || document.querySelector('.chant')) return;
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

// ---------- chant view ----------
// Two layouts, switched in the view: a page set like a recitation book (the default) and one
// mantra at a time. Both take a model:
//   { title, veda, parts: [{ title?, src?, anu?, group, verses: [{ n, lines, label }] }],
//     prev?, next?: { href, label }, onClose(i), onPlace(i) }
// lines are the Devanagari lines as the page shows them (pāṭha applied); `group` ṛks make a paragraph.
let wakeLock = null;
let chantResume = null; // open the chant view on the next page drawn (next sūkta, next section)
const INVOCATION = '॥ ॐ श्रीगुरुभ्यो नमः हरिः ॐ ॥';
// texts whose verses are ṛks / mantras: a paragraph every five, as the books print the vargas
const METRICAL = new Set(['rv', 'av', 'yv', 'svs', 'sv']);
const RCH = [, , , 'तृचस्य', 'चतुरृचस्य', 'पञ्चर्चस्य', 'षळृचस्य', 'सप्तर्चस्य', 'अष्टर्चस्य', 'नवर्चस्य', 'दशर्चस्य', 'एकादशर्चस्य', 'द्वादशर्चस्य', 'त्रयोदशर्चस्य', 'चतुर्दशर्चस्य', 'पञ्चदशर्चस्य', 'षोडशर्चस्य', 'सप्तदशर्चस्य', 'अष्टादशर्चस्य', 'एकोनविंशत्यृचस्य', 'विंशत्यृचस्य', 'एकविंशत्यृचस्य', 'द्वाविंशत्यृचस्य', 'त्रयोविंशत्यृचस्य', 'चतुर्विंशत्यृचस्य', 'पञ्चविंशत्यृचस्य', 'षड्विंशत्यृचस्य', 'सप्तविंशत्यृचस्य', 'अष्टाविंशत्यृचस्य', 'एकोनत्रिंशदृचस्य', 'त्रिंशदृचस्य'];
const plain = (l) => l.replace(/[॒॑᳚]/g, '');
// "a" + voiced sound: इन्द्रः गायत्री → इन्द्रो गायत्री, as the anukramaṇī is read
const visargaSandhi = (s) => s.replace(/([क-हळ])ः(?= [गघजझडढदधबभमयरलवहनणङञ])/g, '$1ो');
// The anukramaṇī line of a run of ṛks: pratīka इति count ṛṣi devatā chandas.
function anukramani(firstLines, n, rows, facets) {
  const prat = plain(firstLines[0] || '').split(' ').filter((w) => w && !/^[।॥]/.test(w)).slice(0, 3).join(' ');
  const uniq = (f, c) => [...new Set(rows.map((r) => (r[c] >= 0 ? facets[f][r[c]][2] : '')).filter(Boolean))].slice(0, 3);
  const who = [...uniq('rishi', COL.rishi), ...uniq('devata', COL.devata), ...uniq('chandas', COL.chandas)].join(' ');
  const cnt = n === 1 ? 'इति मन्त्रस्य' : n === 2 ? 'इति द्वयोः' : `इति ${RCH[n] || `${dg(n)} ऋचः`} सूक्तस्य`;
  return visargaSandhi(`${prat} ${cnt} ${who}`.trim()) + ' ।';
}
// a ṛk as one run of text: half-verses joined by । and closed by ॥n॥
function bookVerse(lines, n) {
  const clean = lines.map((l) => l.replace(/\s*\(\s*[0-9०-९]+\s*\)\s*$/, '').replace(/[\s।॥]*[0-9०-९]*[\s।॥]*$/, '').trim()).filter(Boolean);
  return `${clean.join('\u00a0। ')}\u00a0॥${dg(n)}॥`;
}

function openChant(model, start = 0) {
  document.querySelector('.chant')?.remove();
  const flat = model.parts.flatMap((p) => p.verses);
  if (!flat.length) return;
  let i = Math.max(0, Math.min(start, flat.length - 1));
  const el = document.createElement('div');
  el.className = 'chant';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `Chant view, ${model.title}`);
  el.style.setProperty('--vc', `var(--v-${model.veda || 'rv'})`);
  document.body.append(el);
  document.body.classList.add('story-open');
  const ICON = { x: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' };
  const head = () => `<div class="ch-head">
      <button class="ch-x" type="button" aria-label="Close chant view">${ICON.x}</button>
      <span class="ch-t" lang="sa">${esc(model.title)}</span>
      <div class="ch-tools">
        <div class="seg ch-lay" role="group" aria-label="Layout"><button type="button" data-lay="book" aria-pressed="${prefs.chantLayout !== 'one'}" title="Book page">${T('Page', 'पुटम्')}</button><button type="button" data-lay="one" aria-pressed="${prefs.chantLayout === 'one'}" title="One mantra at a time">${T('One', 'एकैकम्')}</button></div>
        <div class="seg ch-size" role="group" aria-label="Text size"><button type="button" data-z="-1" aria-label="Smaller text">A−</button><button type="button" data-z="1" aria-label="Larger text">A+</button></div>
        <div class="seg ch-lipi" role="group" aria-label="Script"><button type="button" data-l="deva" lang="sa-Deva" aria-pressed="${prefs.lipi === 'deva'}">अ</button><button type="button" data-l="knda" lang="sa-Knda" aria-pressed="${prefs.lipi === 'knda'}">ಅ</button></div>
      </div></div>`;
  const nextHTML = () => (model.next
    ? `<a class="ch-next" href="${esc(model.next.href)}"><small>${T('Next', 'अग्रिमम्')}</small><b lang="sa">${esc(model.next.label)}</b></a>`
    : `<p class="ch-end" lang="sa">॥ इति ॥</p>`);
  const prevHTML = () => (model.prev ? `<a class="ch-prev" href="${esc(model.prev.href)}"><small>${T('Previous', 'पूर्वम्')}</small><b lang="sa">${esc(model.prev.label)}</b></a>` : '');
  let onScroll = null;
  // ---- book layout: the whole text as a page, ṛks running on, paragraphs of `group` ṛks
  function book() {
    let k = 0;
    const parts = model.parts.map((p) => {
      const paras = [];
      p.verses.forEach((v, j) => {
        if (j % (p.group || 1) === 0) paras.push([]);
        paras[paras.length - 1].push(`<span class="ch-v" data-i="${k++}">${esc(bookVerse(v.lines, v.n))}</span>`);
      });
      return `${p.title ? `<h2 class="ch-pt">${esc(p.title)}</h2>` : ''}${p.src ? `<p class="ch-src">${esc(p.src)}</p>` : ''}${p.anu ? `<p class="ch-anu">${esc(p.anu)}</p>` : ''}
        ${paras.map((ps) => `<p class="ch-par">${ps.join(' ')}</p>`).join('')}`;
    }).join('');
    el.innerHTML = `${head()}<div class="ch-scroll"><div class="ch-page" lang="sa" style="--chz: ${prefs.chantSize || 23}px">
        <p class="ch-inv">${INVOCATION}</p><h1 class="ch-title">${esc(model.title)}</h1>${parts}
        <div class="ch-move">${prevHTML()}${nextHTML()}</div></div></div>`;
    const sc = el.querySelector('.ch-scroll');
    const target = el.querySelector(`.ch-v[data-i="${i}"]`);
    if (i > 0 && target) sc.scrollTop = target.offsetTop - 80;
    onScroll = () => {
      const top = sc.getBoundingClientRect().top + 70;
      const spans = [...el.querySelectorAll('.ch-v')];
      const cur = spans.find((s) => s.getBoundingClientRect().bottom > top);
      const n = cur ? Number(cur.dataset.i) : flat.length - 1;
      if (n !== i) { i = n; model.onPlace?.(i); }
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    wire();
  }
  // ---- one mantra at a time
  function one() {
    el.innerHTML = `${head()}<div class="ch-one" style="--chz: ${(prefs.chantSize || 23) + 7}px"><div class="ch-body" aria-live="polite"></div>
      <div class="ch-foot"><button class="ch-step" type="button" data-d="-1" aria-label="Previous mantra"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <span class="ch-count"></span>
      <button class="ch-step" type="button" data-d="1" aria-label="Next mantra"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div></div>`;
    const body = el.querySelector('.ch-body');
    const show = () => {
      if (i >= flat.length) body.innerHTML = `<div class="ch-move">${prevHTML()}${nextHTML()}</div>`;
      else body.innerHTML = `<div class="ch-m" lang="sa">${flat[i].lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div><p class="ch-ref">${esc(flat[i].label || '')}</p>`;
      el.querySelector('.ch-count').textContent = i >= flat.length ? '' : SA() ? inLipi(dg(`${i + 1} / ${flat.length}`)) : `${i + 1} / ${flat.length}`;
      el.querySelector('[data-d="-1"]').disabled = i === 0;
      el.querySelector('[data-d="1"]').disabled = i >= flat.length;
      if (!REDUCED_MOTION()) body.firstElementChild?.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
      if (i < flat.length) model.onPlace?.(i);
      wireMove();
    };
    one.step = (d) => { const n = i + d; if (n < 0 || n > flat.length) return; i = n; show(); };
    el.querySelectorAll('.ch-step').forEach((b) => b.addEventListener('click', () => one.step(Number(b.dataset.d))));
    show(); wire();
  }
  const render = () => { one.step = null; (prefs.chantLayout === 'one' ? one : book)(); };
  function wireMove() {
    el.querySelectorAll('.ch-next, .ch-prev').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      chantResume = 0; finish(true); swipeIn = a.classList.contains('ch-next') ? 1 : -1;
      go(a.getAttribute('href'), { replace: true });
    }));
  }
  function wire() {
    el.querySelector('.ch-x').addEventListener('click', () => finish(false));
    el.querySelectorAll('[data-lay]').forEach((b) => b.addEventListener('click', () => {
      if (prefs.chantLayout === b.dataset.lay || (!prefs.chantLayout && b.dataset.lay === 'book')) return;
      prefs.chantLayout = b.dataset.lay; savePrefs(); render();
    }));
    el.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => {
      prefs.chantSize = Math.max(16, Math.min(40, (prefs.chantSize || 23) + 2 * Number(b.dataset.z))); savePrefs();
      el.querySelectorAll('.ch-page, .ch-one').forEach((x) => x.style.setProperty('--chz', `${prefs.chantSize + (x.classList.contains('ch-one') ? 7 : 0)}px`));
    }));
    el.querySelectorAll('[data-l]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.l === prefs.lipi) return;
      setLipi(b.dataset.l); render();     // the page underneath is redrawn too; this view stays open
    }));
    wireMove();
    el.querySelector('.ch-x').focus({ preventScroll: true });
  }
  // sideways swipe: a mantra in the one-at-a-time layout, the next / previous sūkta on the page
  let sx = null; let sy = null;
  el.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; const dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2 || e.target.closest('.ch-head')) return;
    if (one.step) { one.step(dx < 0 ? 1 : -1); return; }
    el.querySelector(dx < 0 ? '.ch-next' : '.ch-prev')?.click();
  });
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); finish(false); return; }
    if (!one.step) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); one.step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); one.step(-1); }
  };
  document.addEventListener('keydown', onKey, true);
  function teardown() {
    document.removeEventListener('keydown', onKey, true);
    el.remove(); document.body.classList.remove('story-open');
    try { wakeLock?.release(); } catch { /* not held */ } wakeLock = null;
  }
  // leaving: a next / previous link replaces the overlay's history entry
  function finish(leaving) {
    teardown();
    if (overlayClose === popClose) overlayDone(leaving);
    if (!leaving) model.onClose?.(Math.min(i, flat.length - 1));
  }
  function popClose() { teardown(); model.onClose?.(Math.min(i, flat.length - 1)); }
  overlayOpen(popClose);
  try { navigator.wakeLock?.request('screen').then((l) => { wakeLock = l; }).catch(() => {}); } catch { /* not supported */ }
  render();
}
