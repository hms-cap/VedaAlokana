// The standalone Dictionary app (Śabdārtha Kaustubha). The screens are in ../kosha-ui.js, shared with Vedāvalokanam.
import { createKosha } from '../kosha-ui.js';
import { koshaHref } from '../kosha.js';

const $ = (s, el = document) => el.querySelector(s);
const main = $('#main');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SUN_SVG = '<svg class="hero-sun" width="260" height="260" viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="46"/><circle cx="130" cy="130" r="70" class="r1"/><circle cx="130" cy="130" r="94" class="r2"/><circle cx="130" cy="130" r="118" class="r3"/></svg>';
const ARROW = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
let readerNav = null; // the previous and next word, for swipes and the arrow keys
const getHash = () => location.hash;
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };
const json = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`Could not load ${u} (${r.status})`); return r.json(); };
const tsv = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`Could not load ${u} (${r.status})`); return (await r.text()).split('\n'); };
const K = createKosha({
  main, $, esc, T: esc, Tp: (en) => en, go, getHash, json, tsv, SUN_SVG, ARROW, base: '../',
  setTitle: (t) => { document.title = t ? `${t} — Śabdārtha Kaustubha` : 'Śabdārtha Kaustubha — Sanskrit–Kannada dictionary'; },
  setReaderNav: (v) => { readerNav = v; },
  sourcesHref: '../#/about',
  creditExtra: ' · <a href="../">Vedāvalokanam</a> · <button type="button" class="k-dl" id="kDl"></button>',
});

let routing = false;
async function route() {
  const h = location.hash;
  const m = h.match(/^#\/kosha(?:\/([^?]*))?(?:\?(.*))?$/);
  const head = m?.[1] ? decodeURIComponent(m[1]) : null;
  const params = new URLSearchParams(m?.[2] || '');
  routing = true;
  try { await K.view(head, params); }
  catch (err) { main.innerHTML = `<div class="col"><h1>Couldn’t load this page</h1><p class="lede">${esc(err.message)}. Check your connection and reload.</p></div>`; readerNav = null; }
  chrome(head, params);
  // the list scrolls itself to a letter, to where you left it, or to the author note
  const placed = !head && (params.get('at') || params.get('about') || params.get('letter') || params.get('find'));
  if (!placed) window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
  paintDownload();
  routing = false;
}
function chrome(head, params) {
  const home = !head && !params.get('letter') && !params.get('at') && !params.get('find') && !params.get('about');
  $('#backBtn').hidden = home;
  $('#brand').classList.toggle('when-back', !home);
  const find = !!params.get('find');
  document.querySelectorAll('#kbar [data-k]').forEach((a) => ((a.dataset.k === 'home' && home) || (a.dataset.k === 'find' && find) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
}
$('#kToday').addEventListener('click', async (e) => {
  e.preventDefault();
  try { go(koshaHref((await K.wotd())[0])); } catch { go('#/kosha'); }
});
window.addEventListener('hashchange', () => { if (!location.hash || location.hash === '#' || location.hash === '#/') { history.replaceState(null, '', '#/kosha'); } route(); });
// swipe sideways on a word, or press the arrow keys, for the neighbouring word
let sx = 0; let sy = 0; let st = 0;
document.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!readerNav || e.target.closest?.('input, textarea, .k-sug, details')) return;
  const t = e.changedTouches[0]; const dx = t.clientX - sx; const dy = t.clientY - sy;
  if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - st > 700) return;
  const to = dx < 0 ? readerNav.next : readerNav.prev; if (to) go(to.href);
}, { passive: true });
document.addEventListener('keydown', (e) => {
  if (!readerNav || e.target.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const to = e.key === 'ArrowRight' ? readerNav.next : e.key === 'ArrowLeft' ? readerNav.prev : null; if (to) go(to.href);
});

// ---------- offline: the app shell is stored by the service worker; the words are stored here on request ----------
const DATA_CACHE = 'vedalokana-data'; // the same store Vedāvalokanam uses, so a download in either app serves both
const abs = (f) => new URL(`../${f}`, location.href).href;
let pack = null; let state = 'idle';
async function loadPack() { try { pack = (await json('../data/offline.json')).packs.find((p) => p.id === 'kosha'); } catch { pack = null; } }
async function haveCount() { const c = await caches.open(DATA_CACHE); const have = new Set((await c.keys()).map((r) => r.url)); return pack.files.filter((f) => have.has(abs(f))).length; }
async function paintDownload(msg) {
  const b = $('#kDl'); if (!b) return;
  if (!pack || !('caches' in window)) { b.hidden = true; return; }
  const n = await haveCount().catch(() => 0);
  const done = n === pack.files.length;
  b.disabled = state === 'busy' || done;
  b.textContent = msg || (done ? 'Available offline' : state === 'busy' ? 'Downloading…' : `Download for offline use (${Math.round(pack.bytes / 1e6)} MB)`);
}
async function download() {
  if (state === 'busy' || !pack) return;
  state = 'busy'; navigator.storage?.persist?.().catch(() => {});
  const c = await caches.open(DATA_CACHE); const have = new Set((await c.keys()).map((r) => r.url));
  const todo = pack.files.filter((f) => !have.has(abs(f))); let done = pack.files.length - todo.length; let failed = 0;
  const tick = () => paintDownload(`Downloading… ${Math.round((done / pack.files.length) * 100)}%`);
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (todo.length) { const f = todo.shift(); try { const r = await fetch(`../${f}`); if (!r.ok) throw new Error(r.status); await c.put(abs(f), r); } catch { failed++; } done++; tick(); }
  }));
  state = 'idle'; paintDownload(failed ? `${failed} files did not download. Try again.` : undefined);
}
main.addEventListener('click', (e) => { if (e.target.closest('#kDl')) download(); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/kosha');
loadPack().then(() => route());
