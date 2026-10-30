// Vedālokana — a static, client-side browser for the Vedas: Saṃhitās,
// Brāhmaṇas, Āraṇyakas and Upaniṣads.
// Data lives in ./data (built by scripts/build-data.mjs); routing is hash-based.

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

const $ = (s, el = document) => el.querySelector(s);
const main = $('#main');
const rail = $('#rail');
const cache = { catalog: null, index: {}, text: {} };

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
  const d = { script: 'both', mode: 'samhita', tr: true, lipi: 'deva' };
  try { return { ...d, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return d; }
})();
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ } }

// ---------- Kannada script ----------
// Devanagari and Kannada share the ISCII layout, so most letters map by a fixed
// offset. Svara marks (U+0951/0952 and Vedic Extensions) and dandas are shared.
const KN_GAPS = new Set([0x0C84, 0x0C8D, 0x0C91, 0x0CA9, 0x0CB4, 0x0CC5, 0x0CC9, 0x0CCE, 0x0CCF]);
function toKnda(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c === 0x0950) { out += 'ಓಂ'; continue; }
    if ((c >= 0x0901 && c <= 0x094D) || (c >= 0x0960 && c <= 0x0963) || (c >= 0x0966 && c <= 0x096F)) {
      const k = c + 0x380;
      out += KN_GAPS.has(k) ? ch : String.fromCodePoint(k);
    } else out += ch;
  }
  return out;
}
function convertTree(root) {
  if (prefs.lipi !== 'knda' || !root.querySelectorAll) return;
  const els = [...root.querySelectorAll('[lang="sa"], .suggest a span')];
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
function applyLipiClass() { document.body.classList.toggle('kn', prefs.lipi === 'knda'); }
applyLipiClass();

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
    prefs.lipi = b.dataset.lipi; savePrefs(); applyLipiClass(); route();
  }));
}

// ---------- views ----------
async function viewHome() {
  setTitle('');
  const cat = await catalog();
  const rv = await index('rv');
  const meta = cat.texts.find((v) => v.id === 'rv');
  const day = Math.floor(Date.now() / 86400000);
  const row = rv.rows[(day * 7919) % rv.rows.length];
  const t = await text('rv', row[0]);
  const verse = t[row[1]].find((x) => x[0] === row[2]);
  const dev = row[COL.devata] >= 0 ? rv.facets.devata[row[COL.devata]] : null;
  const ris = row[COL.rishi] >= 0 ? rv.facets.rishi[row[COL.rishi]] : null;
  const ref = refOf(meta, row[0], row[1], row[2]);
  const byId = Object.fromEntries(cat.texts.map((x) => [x.id, x]));
  let last = null;
  try { last = JSON.parse(localStorage.getItem('vedalokana.last') || 'null'); } catch { /* storage unavailable */ }
  main.innerHTML = `<div class="wide">
    ${last ? `<a class="continue" href="${esc(last.href)}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z"/></svg>
      <span class="ci-t"><small>Continue reading</small><b>${esc(last.where)}</b><small>${esc(last.text)}</small></span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></a>` : ''}
    <section class="today" aria-labelledby="todayH">
      <h1 id="todayH" class="sr">Mantra for today</h1>
      <div class="ref"><a href="#/v/rv/c/${row[0]}/${row[1]}?v=${row[2]}">Ṛgveda ${esc(ref)}</a>${dev ? `, to ${esc(cap(dev[1]))}` : ''}${ris ? `, seen by ${esc(cap(ris[1]))}` : ''}</div>
      <div class="deva mantra-deva" lang="sa">${verse[1].map((l) => `<div>${esc(l)}</div>`).join('')}</div>
      <div class="roman mantra-roman" lang="sa-Latn">${verse[2].map((l) => `<div>${esc(l)}</div>`).join('')}</div>
      ${verse[4] ? `<p class="tr">${esc(verse[4])}</p>` : ''}
    </section>
    <h2 class="section-title">Choose a Veda</h2>
    <div class="vedas">${cat.vedas.map((v) => `
      <a class="veda-card" href="#/veda/${v.id}">
        <span class="dv" lang="sa">${esc(v.deva)}</span>
        <span class="nm">${esc(v.name)}</span>
        <span class="layers">${cat.layers.map((l) => `<span class="lrow"><span class="lk">${LAYERS[l].label}</span><span class="lv">${
          v.layers[l].length ? esc(v.layers[l].map((i) => byId[i].name).join(', ')) : `<span class="none">${v.absent?.[l] ? 'None' : 'Not yet'}</span>`}</span></span>`).join('')}</span>
      </a>`).join('')}</div>
    <p class="lede" style="margin-top:28px">Every text comes from an openly published digital edition. <a href="#/about">See the sources and what is still missing.</a></p>
  </div>`;
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
      <span class="nm">${esc(t.name)}</span>
      ${t.shakha ? `<span class="sk">${esc(t.shakha)} śākhā</span>` : ''}
      <span class="ct">${fmt(t.verses)} ${esc(unitName(t))}${t.containers > 1 ? ` in ${fmt(t.containers)} ${esc((t.levels[1] || 'section').toLowerCase())}s` : ''}</span>
      ${badgesHTML(t)}
    </a>`;
  const blurb = {
    samhita: 'The collected mantras.',
    brahmana: 'Prose on the meaning and performance of the ritual.',
    aranyaka: 'The “forest” texts, on the inner meaning of the rites.',
    upanishad: 'The philosophical close of each Veda.',
  }[layer];
  main.innerHTML = `<div class="wide">
    <h1>${esc(v.name)}<span class="h1-deva" lang="sa">${esc(v.deva)}</span></h1>
    <nav class="layer-tabs" aria-label="Layers">${cat.layers.map((l) => `<a href="#/veda/${v.id}/${l}"${l === layer ? ' aria-current="page"' : ''}>
      <span class="lt-l">${LAYERS[l].label}</span><span class="lt-n">${v.layers[l].length || '–'}</span></a>`).join('')}</nav>
    <p class="lede">${esc(blurb)}</p>
    ${v.layers[layer].length
    ? `<div class="text-cards">${v.layers[layer].map((i) => card(byId[i])).join('')}</div>`
    : `<p class="note">${esc(v.absent?.[layer] || 'No openly licensed digital edition has been found yet.')}</p>`}
  </div>`;
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
  const hl = Number(params.get('v')) || null;

  // neighbours across groups
  const flat = x.groups.flatMap(([a, cs]) => cs.map(([b, , tt]) => [a, b, tt]));
  const pos = flat.findIndex(([a, b]) => a === d1 && b === d2);
  const prev = flat[pos - 1]; const next = flat[pos + 1];

  const summary = FKEYS.map((f) => [f, primaryTag(x, rows, f)]).filter(([, e]) => e);
  const seg = (name, opts) => `<div class="seg" role="group" aria-label="${esc(name)}">${opts.map(([k, v, l, dis]) => `<button data-p="${k}" data-v="${v}" aria-pressed="${String(prefs[k] === v)}"${dis ? ' disabled' : ''}>${esc(l)}</button>`).join('')}</div>`;
  const controls = [
    hasDeva && hasRoman ? seg('Script', [['script', 'both', 'Both'], ['script', 'deva', lipiName()], ['script', 'roman', 'IAST']]) : '',
    hasPada ? seg('Text', [['mode', 'samhita', 'Saṃhitā'], ['mode', 'pada', 'Padapāṭha']]) : '',
    hasTr && (hasDeva || hasRoman) ? seg('Translation', [['tr', true, 'Translation'], ['tr', false, 'Hide']]) : '',
  ].join('');

  main.innerHTML = `<article class="col">
    <div class="crumbs"><a href="#/v/${id}">${esc(meta.name)}</a>${x.groups.length > 1 ? `<span aria-hidden="true">/</span><a href="#/v/${id}/g/${d1}">${esc(groupName(meta, d1))}</a>` : ''}</div>
    <div class="reader-head"><div>
      <h1>${cref ? `${esc(meta.levels[1] || meta.levels[2])} ${esc(cref)}` : esc(meta.name)}</h1>
      ${c[2] && meta.refFmt !== 'label' ? `<div class="ctitle" lang="sa">${esc(c[2])}</div>` : ''}
    </div></div>
    ${summary.length ? `<div class="tags">${summary.map(([f, e]) => `<a class="tag" href="${findHref(id, { [f]: e[0] })}"><em>${FACETS[f].label}</em>${e[2] ? `<span class="dv" lang="sa">${esc(e[2])}</span>` : ''}<span>${esc(cap(e[1]))}</span></a>`).join('')}</div>` : ''}
    ${controls ? `<div class="controls">${controls}</div>` : ''}
    <div id="verses"></div>
    <nav class="pager" aria-label="Neighbouring ${esc(meta.levels[1].toLowerCase())}s">
      ${prev ? `<a href="#/v/${id}/c/${prev[0]}/${prev[1]}">‹ ${esc(meta.ref)} ${esc(containerRef(meta, prev[0], prev[1], prev[2]))}</a>` : '<span></span>'}
      ${next ? `<a href="#/v/${id}/c/${next[0]}/${next[1]}">${esc(meta.ref)} ${esc(containerRef(meta, next[0], next[1], next[2]))} ›</a>` : ''}
    </nav>
  </article>`;

  const draw = () => {
    const showDeva = hasDeva && prefs.script !== 'roman';
    const showRoman = hasRoman && (prefs.script !== 'deva' || !hasDeva);
    const pada = hasPada && prefs.mode === 'pada';
    $('#verses').innerHTML = verses.map(([v, deva, roman, pd, tr, label]) => {
      const r = rowOf.get(v);
      const tags = r ? FKEYS.filter((f) => r[COL[f]] >= 0 && meta.tagLevel === 'verse').map((f) => {
        const e = x.facets[f][r[COL[f]]];
        return `<a class="tag" href="${findHref(id, { [f]: e[0] })}"><em>${FACETS[f].label}</em><span>${esc(cap(e[1]))}</span></a>`;
      }).join('') : '';
      const ref = refOf(meta, d1, d2, v, label);
      let body = '';
      if (pada) {
        body += `<div class="pada" lang="sa-Latn">${pd.map((w) => `<span>${esc(w)}</span>`).join('<span aria-hidden="true">|</span>')}</div>`;
      } else {
        if (showDeva) body += `<div class="deva" lang="sa">${deva.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
        if (showRoman) body += `<div class="roman" lang="sa-Latn">${roman.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
      }
      if (tr && (prefs.tr || (!hasDeva && !hasRoman))) body += `<p class="tr" lang="en">${esc(tr)}</p>`;
      return `<section class="verse${v === hl ? ' hl' : ''}" id="v${v}" aria-label="${esc(meta.ref)} ${esc(ref)}">
        <div class="vnum"><a href="#/v/${id}/c/${d1}/${d2}?v=${v}">${esc(ref)}</a></div>
        <div>${label && meta.refFmt !== 'label' ? `<div class="vlabel">${esc(label)}</div>` : ''}${body}${tags ? `<div class="tags">${tags}</div>` : ''}</div>
        <button class="icon-btn copy" data-copy="${v}" aria-label="Copy ${esc(meta.ref)} ${esc(ref)}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg></button>
      </section>`;
    }).join('');
    main.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
      const v = Number(b.dataset.copy);
      const vs = verses.find((e) => e[0] === v);
      const txt = [...vs[1].map((l) => (prefs.lipi === 'knda' ? toKnda(l) : l)), ...vs[2], vs[4], `— ${meta.ref} ${refOf(meta, d1, d2, v, vs[5])}`].filter(Boolean).join('\n');
      try { await navigator.clipboard.writeText(txt); b.setAttribute('aria-label', 'Copied'); b.style.color = 'var(--indigo)'; } catch { /* clipboard blocked */ }
    }));
  };
  draw();
  main.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.p; const raw = b.dataset.v;
    prefs[k] = raw === 'true' ? true : raw === 'false' ? false : raw;
    savePrefs();
    b.parentElement.querySelectorAll('button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    draw();
  }));
  try { localStorage.setItem('vedalokana.last', JSON.stringify({ href: `#/v/${id}/c/${d1}/${d2}`, text: meta.name, where: cref ? `${meta.ref} ${cref}` : meta.name })); } catch { /* storage unavailable */ }
  // phone reader bar: previous · section picker · next
  const rb = $('#readerbar');
  rb.hidden = false;
  rb.innerHTML = `${prev ? `<a class="rb-step" href="#/v/${id}/c/${prev[0]}/${prev[1]}" aria-label="Previous ${esc((meta.levels[1] || 'section').toLowerCase())}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></a>` : '<span class="rb-step" aria-hidden="true"></span>'}
    <button class="rb-pick" aria-haspopup="dialog"><span>${esc(cref ? `${meta.ref} ${cref}` : meta.name)}</span>${CHEV}</button>
    ${next ? `<a class="rb-step" href="#/v/${id}/c/${next[0]}/${next[1]}" aria-label="Next ${esc((meta.levels[1] || 'section').toLowerCase())}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></a>` : '<span class="rb-step" aria-hidden="true"></span>'}`;
  rb.querySelector('.rb-pick').addEventListener('click', async () => {
    const c2 = currentPath[currentPath.length - 1];
    if (c2) openSheet({ title: c2.title, items: await c2.items(), layout: c2.layout || 'grid' });
  });
  // swipe left/right between sections on touch screens
  let sx = null; let sy = null;
  main.ontouchstart = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
  main.ontouchend = (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; const dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) {
      const t2 = dx < 0 ? next : prev;
      if (t2) go(`#/v/${id}/c/${t2[0]}/${t2[1]}`);
    }
  };
  // the first verse is already in view; only jump for later ones
  if (hl && hl !== verses[0]?.[0]) requestAnimationFrame(() => document.getElementById(`v${hl}`)?.scrollIntoView({ block: 'start' }));
}

const SOURCES = {
  vedaweb: 'VedaWeb, University of Cologne (CC BY-NC-SA 4.0)',
  anukramani: 'Digitised Sarvānukramaṇī, WSC 2023 (Apache-2.0)',
  dharmic: 'DharmicData (ODbL), text from the Vedic Heritage Portal',
  raw: 'sanskrit/raw_etexts on GitHub, collected from public e-text sites',
  gretil: 'GRETIL, Göttingen (reference and research use)',
};
async function viewAbout() {
  setTitle('Sources and licences');
  const cat = await catalog();
  const byId = Object.fromEntries(cat.texts.map((x) => [x.id, x]));
  const rows = cat.vedas.flatMap((v) => cat.layers.flatMap((l) => v.layers[l].map((i) => byId[i])
    .map((t) => `<tr><td>${esc(v.name)}</td><td>${LAYERS[l].label}</td><td><a href="#/v/${t.id}">${esc(t.name)}</a></td><td>${t.sources.map((k) => esc(SOURCES[k] || k)).join('; ')}</td></tr>`))).join('');
  main.innerHTML = `<div class="prose">
    <h1>Sources and licences</h1>
    <p class="lede">Vedālokana is a non-commercial browser built from openly published digital texts. Text and tags are shown as the sources give them; corrections belong upstream.</p>
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
    <h2>Data build</h2>
    <p>Built ${esc(cat.built)} by <code>scripts/build-data.mjs</code>. The source repositories and steps to rebuild are in the project README.</p>
  </div>`;
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
        <span class="si-main">${it.deva ? `<span class="dv" lang="sa">${esc(it.deva)}</span>` : ''}<span>${esc(it.label)}</span></span>
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
    label: v.name, deva: v.deva, href: `#/veda/${v.id}`, title: 'Choose a Veda',
    items: async () => cat.vedas.map((x) => ({ label: x.name, deva: x.deva, href: `#/veda/${x.id}`, current: x.id === v.id,
      sub: cat.layers.reduce((n, l) => n + x.layers[l].length, 0) + ' texts' })),
  });
  path.push({
    label: LAYERS[layer].label, deva: LAYERS[layer].deva, href: `#/veda/${v.id}/${layer}`, title: `${v.name}: choose a layer`,
    items: async () => cat.layers.map((l) => ({ label: LAYERS[l].plural, deva: LAYERS[l].deva, href: `#/veda/${v.id}/${l}`, current: l === layer,
      sub: v.layers[l].length ? v.layers[l].map((t) => byId[t].name).join(', ') : (v.absent?.[l] ? 'None' : 'Not available yet') })),
  });
  if (!meta) return path;
  const x = await index(meta.id);
  path.push({
    label: meta.name, deva: meta.deva, href: `#/v/${meta.id}`, title: `Texts of the ${v.name}`,
    items: async () => cat.layers.flatMap((l) => v.layers[l].map((t) => ({ label: byId[t].name, deva: byId[t].deva, href: `#/v/${t}`, current: t === meta.id, sub: LAYERS[l].label }))),
  });
  const groupItems = async (cur) => x.groups.map(([g, cs]) => ({ label: groupName(meta, g), href: `#/v/${meta.id}/g/${g}`, current: g === cur, sub: `${cs.length} ${(meta.levels[1] || 'section').toLowerCase()}s` }));
  const containerItems = (g, cur) => async () => (x.groups.find((e) => e[0] === g)?.[1] || []).map(([d2, n, tt]) => ({
    label: containerRef(meta, g, d2, tt) || String(d2), href: `#/v/${meta.id}/c/${g}/${d2}`, current: d2 === cur,
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
      path.push({ label: groupName(meta, g), href: `#/v/${meta.id}/g/${g}`, title: `${meta.levels[0]}s`, items: () => groupItems(g), layout: 'list' });
    }
    if (sub === 'c') {
      const d2 = Number(p2);
      const tt = containerTitle(x, g, d2);
      const cref = containerRef(meta, g, d2, tt);
      path.push({
        label: cref ? `${meta.levels[1] || meta.levels[2]} ${cref}` : meta.name, href: `#/v/${meta.id}/c/${g}/${d2}`,
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
  const bar = $('#pathbar');
  bar.hidden = !path.length;
  bar.innerHTML = `<ol>${path.map((c, i) => `<li><button class="crumb${i === path.length - 1 ? ' last' : ''}" data-i="${i}" aria-haspopup="dialog">
    ${c.deva ? `<span class="dv" lang="sa">${esc(c.deva)}</span>` : ''}<span class="cl">${esc(c.label)}</span>${CHEV}</button></li>`).join('<li class="sep" aria-hidden="true">›</li>')}</ol>`;
  bar.querySelectorAll('.crumb').forEach((b) => b.addEventListener('click', async () => {
    const c = currentPath[Number(b.dataset.i)];
    openSheet({ title: c.title, items: await c.items(), layout: c.layout || 'list' });
  }));
  bar.scrollLeft = bar.scrollWidth;
  // back goes up one level
  const page = r.parts[0] || '';
  const topLevel = ['', 'library', 'search', 'settings'].includes(page);
  const parentHref = path.length >= 2 ? path[path.length - 2].href : page === 'about' ? '#/settings' : topLevel ? null : '#/library';
  const back = $('#backBtn');
  back.hidden = !parentHref;
  if (parentHref) back.setAttribute('href', parentHref);
  $('#brand').classList.toggle('when-back', !!parentHref);
  const named = { library: 'Library', search: 'Search', settings: 'Settings', about: 'Sources' }[page];
  $('#topTitle').textContent = path.length ? path[path.length - 1].label : (named || '');
  // tabs
  const tab = !page ? 'home' : (page === 'veda' || page === 'v' ? 'library' : page === 'about' ? 'settings' : page);
  $('#tabbar').querySelectorAll('[data-tab]').forEach((a) => (a.dataset.tab === tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.body.classList.toggle('reading', page === 'v' && r.parts[2] === 'c');
  if (!(page === 'v' && r.parts[2] === 'c')) $('#readerbar').hidden = true;
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
    <section class="set"><h2>Script for Sanskrit text</h2><p>Names, headings and mantras switch together. Svara marks are kept.</p>
      <div class="seg wide-seg">${opt('lipi', 'deva', 'देवनागरी', 'dvb')}${opt('lipi', 'knda', 'ಕನ್ನಡ', 'knb')}</div></section>
    <section class="set"><h2>In the reader, show</h2>
      <div class="seg wide-seg">${opt('script', 'both', 'Both')}${opt('script', 'deva', 'Script only')}${opt('script', 'roman', 'IAST only')}</div></section>
    <section class="set"><h2>Ṛgveda text</h2>
      <div class="seg wide-seg">${opt('mode', 'samhita', 'Saṃhitā')}${opt('mode', 'pada', 'Padapāṭha')}</div></section>
    <section class="set"><h2>Translations</h2>
      <div class="seg wide-seg">${opt('tr', true, 'Show')}${opt('tr', false, 'Hide')}</div></section>
    <section class="set"><h2>About</h2><p><a href="#/about">Sources, licences and known gaps</a></p></section>
  </div>`;
  main.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k; const raw = b.dataset.v;
    prefs[k] = raw === 'true' ? true : raw === 'false' ? false : raw;
    savePrefs();
    if (k === 'lipi') { applyLipiClass(); route(); return; }
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
    main.innerHTML = `<div class="col"><h1>Couldn’t load this page</h1><p class="lede">${esc(err.message)}. Check your connection and reload.</p></div>`;
  }
  if (!r.params.get('v') || r.params.get('v') === '1') window.scrollTo(0, 0);
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
route();
