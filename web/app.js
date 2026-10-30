// Vedālokana — a static, client-side browser for the Veda Saṃhitās.
// Data lives in ./data (built by scripts/build-data.mjs); routing is hash-based.

const FACETS = {
  rishi: { label: 'Ṛṣi', deva: 'ऋषि', plural: 'seers', one: 'seer' },
  devata: { label: 'Devatā', deva: 'देवता', plural: 'deities', one: 'deity' },
  chandas: { label: 'Chandas', deva: 'छन्दस्', plural: 'metres', one: 'metre' },
};
const FKEYS = Object.keys(FACETS);
const COL = { d1: 0, d2: 1, v: 2, rishi: 3, devata: 4, chandas: 5 };

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
  const d = { script: 'both', mode: 'samhita', tr: true };
  try { return { ...d, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return d; }
})();
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ } }

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
async function vedaMeta(id) { return (await catalog()).vedas.find((v) => v.id === id); }
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

function refOf(meta, d1, d2, v) {
  const parts = meta.refFmt === 'd2.v' ? [d2, v] : [d1, d2, v];
  return parts.filter((p) => p !== undefined && p !== null).join('.');
}
function containerRef(meta, d1, d2) { return meta.refFmt === 'd2.v' ? `${d2}` : `${d1}.${d2}`; }
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
  const has = [
    ['Svara marks', meta.has.svara],
    ['IAST', meta.has.roman],
    ['Padapāṭha', meta.has.pada],
    [meta.has.translation ? `English · ${meta.has.translation}` : 'English', !!meta.has.translation],
    ['Ṛṣi', meta.facets.includes('rishi')],
    ['Devatā', meta.facets.includes('devata')],
    ['Chandas', meta.facets.includes('chandas')],
  ];
  return `<div class="badges">${has.map(([l, ok]) => `<span class="badge${ok ? '' : ' no'}">${esc(l)}</span>`).join('')}</div>`;
}

// ---------- rail ----------
async function renderRail(route) {
  const cat = await catalog();
  const id = route.veda;
  const meta = id && cat.vedas.find((v) => v.id === id);
  const cur = (href) => (getHash() === href || getHash().startsWith(`${href}?`) ? ' aria-current="page"' : '');
  let h = `<h2>Saṃhitās</h2>`;
  for (const v of cat.vedas) {
    h += `<a href="#/v/${v.id}"${v.id === id && !route.sub ? ' aria-current="page"' : ''}><span>${esc(v.name)}</span><span class="dv" lang="sa">${esc(v.deva)}</span></a>`;
  }
  if (meta) {
    h += `<h2>Browse ${esc(meta.name)}</h2>`;
    h += `<a href="#/v/${id}/g"${cur(`#/v/${id}/g`)}><span>Structure</span><span class="n">${fmt(meta.containers)}</span></a>`;
    for (const f of FKEYS) {
      if (meta.facets.includes(f)) h += `<a href="#/v/${id}/f/${f}"${cur(`#/v/${id}/f/${f}`)}><span>${FACETS[f].label}</span><span class="n">${fmt(meta.facetCounts[f])}</span></a>`;
      else h += `<div class="off">${FACETS[f].label}: not tagged in the source</div>`;
    }
  }
  h += `<h2>Project</h2><a href="#/about"${cur('#/about')}><span>Sources and licences</span></a>`;
  rail.innerHTML = h;
}

// ---------- views ----------
async function viewHome() {
  setTitle('');
  const cat = await catalog();
  const rv = await index('rv');
  const meta = cat.vedas.find((v) => v.id === 'rv');
  const day = Math.floor(Date.now() / 86400000);
  const row = rv.rows[(day * 7919) % rv.rows.length];
  const t = await text('rv', row[0]);
  const verse = t[row[1]].find((x) => x[0] === row[2]);
  const dev = row[COL.devata] >= 0 ? rv.facets.devata[row[COL.devata]] : null;
  const ris = row[COL.rishi] >= 0 ? rv.facets.rishi[row[COL.rishi]] : null;
  const ref = refOf(meta, row[0], row[1], row[2]);
  main.innerHTML = `<div class="wide">
    <section class="today" aria-labelledby="todayH">
      <h1 id="todayH" class="sr">Mantra for today</h1>
      <div class="ref"><a href="#/v/rv/c/${row[0]}/${row[1]}?v=${row[2]}">Ṛgveda ${esc(ref)}</a>${dev ? `, to ${esc(cap(dev[1]))}` : ''}${ris ? `, seen by ${esc(cap(ris[1]))}` : ''}</div>
      <div class="deva mantra-deva" lang="sa">${verse[1].map((l) => `<div>${esc(l)}</div>`).join('')}</div>
      <div class="roman mantra-roman" lang="sa-Latn">${verse[2].map((l) => `<div>${esc(l)}</div>`).join('')}</div>
      ${verse[4] ? `<p class="tr">${esc(verse[4])}</p>` : ''}
    </section>
    <h2 class="section-title">Choose a Saṃhitā</h2>
    <div class="vedas">${cat.vedas.map((v) => `
      <a class="veda-card" href="#/v/${v.id}">
        <span class="dv" lang="sa">${esc(v.deva)}</span>
        <span><span class="nm">${esc(v.name)}</span><br><span class="sk">${esc(v.shakha)} śākhā</span></span>
        ${badgesHTML(v)}
        <span class="ct">${fmt(v.verses)} ${v.id === 'rv' ? 'ṛks' : 'mantras'} in ${fmt(v.containers)} ${esc(v.levels[1].toLowerCase())}s</span>
      </a>`).join('')}</div>
    <p class="lede" style="margin-top:28px">Struck-through badges mark what the open sources don't include yet. <a href="#/about">See where the data comes from.</a></p>
  </div>`;
}

async function viewVeda(id) {
  const meta = await vedaMeta(id);
  if (!meta) return notFound();
  setTitle(meta.name);
  const x = await index(id);
  const tiles = [
    `<a class="tile" href="#/v/${id}/g"><span class="dv" lang="sa">${{ rv: 'मण्डल', av: 'काण्ड', yv: 'अध्याय', sv: 'आर्चिक' }[id] || ''}</span><span><span class="t">Structure</span><br><span class="s">${esc(meta.levels.filter(Boolean).join(' › '))}</span></span></a>`,
    ...FKEYS.map((f) => (meta.facets.includes(f)
      ? `<a class="tile" href="#/v/${id}/f/${f}"><span class="dv" lang="sa">${FACETS[f].deva}</span><span><span class="t">${FACETS[f].label}</span><br><span class="s">${fmt(meta.facetCounts[f])} ${FACETS[f].plural}</span></span></a>`
      : `<span class="tile" aria-disabled="true"><span class="dv" lang="sa">${FACETS[f].deva}</span><span><span class="t">${FACETS[f].label}</span><br><span class="s">Not in the open source yet</span></span></span>`)),
  ].join('');
  const tagNote = {
    verse: 'Ṛṣi, devatā and chandas are tagged for every ṛk, from the Sarvānukramaṇī.',
    sukta: 'Tags come from each sūkta’s Anukramaṇī header, so every mantra in a sūkta carries its main ṛṣi, devatā and chandas. Kāṇḍa 20 has no headers in the source.',
    hymn: 'Only Griffith’s English translation is open so far; devatā comes from his hymn headings. The Sanskrit text is not in the source yet.',
  }[meta.tagLevel] || 'The open text has no ṛṣi, devatā or chandas tags yet, so it can be browsed by adhyāya only.';
  main.innerHTML = `<div class="wide">
    <h1>${esc(meta.name)}<span class="h1-deva" lang="sa">${esc(meta.deva)}</span></h1>
    <p class="lede">${esc(meta.shakha)} śākhā. ${esc(tagNote)}</p>
    <div class="stats">
      ${x.groups.length > 1 ? `<span><b>${x.groups.length}</b> ${esc(meta.levels[0].toLowerCase())}s</span>` : ''}
      <span><b>${fmt(meta.containers)}</b> ${esc(meta.levels[1].toLowerCase())}s</span>
      <span><b>${fmt(meta.verses)}</b> ${esc(meta.levels[2].toLowerCase())}s</span>
    </div>
    <div style="margin-top:14px">${badgesHTML(meta)}</div>
    <h2 class="section-title">Browse by</h2>
    <div class="tiles">${tiles}</div>
    <h2 class="section-title">${x.groups.length > 1 ? `${esc(meta.levels[0])}s` : `${esc(meta.levels[1])}s`}</h2>
    ${x.groups.length > 1
    ? `<div class="groups">${x.groups.map(([d1, cs]) => `<a class="group" href="#/v/${id}/g/${d1}"><b>${esc(groupName(meta, d1))}</b><small>${cs.length} ${esc(meta.levels[1].toLowerCase())}s, ${fmt(cs.reduce((a, c) => a + c[1], 0))} ${esc(meta.levels[2].toLowerCase())}s</small></a>`).join('')}</div>`
    : containerGrid(meta, x.groups[0][0], x.groups[0][1])}
  </div>`;
}

function containerGrid(meta, d1, cs) {
  return `<div class="containers">${cs.map(([d2, n]) => `<a href="#/v/${meta.id}/c/${d1}/${d2}" title="${n} ${esc(meta.levels[2].toLowerCase())}s">${esc(containerRef(meta, d1, d2))}</a>`).join('')}</div>`;
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
    const label = [dv && cap(dv[1]), rs2 && cap(rs2[1])].filter(Boolean).join(', ') || title || '';
    return `<a href="#/v/${id}/c/${d1}/${d2}"><b>${esc(containerRef(meta, d1, d2))}</b><span>${esc(label)}</span><span style="margin-left:auto;color:var(--muted);font-size:14px;font-family:var(--ui)">${n}</span></a>`;
  }).join('');
  const idx = x.groups.findIndex((e) => e[0] === d1);
  const prev = x.groups[idx - 1]; const next = x.groups[idx + 1];
  main.innerHTML = `<div class="col">
    <div class="crumbs"><a href="#/v/${id}">${esc(meta.name)}</a>${x.groups.length > 1 ? `<span aria-hidden="true">/</span><a href="#/v/${id}/g">Structure</a>` : ''}</div>
    <h1>${esc(x.groups.length > 1 ? groupName(meta, d1) : `${meta.levels[1]}s`)}</h1>
    <p class="lede">${g[1].length} ${esc(meta.levels[1].toLowerCase())}s, with their main ${meta.facets.includes('devata') ? 'devatā and ṛṣi' : 'heading'} and number of ${esc(meta.levels[2].toLowerCase())}s.</p>
    <div class="titled" style="margin-top:18px">${items}</div>
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
  const cref = containerRef(meta, d1, d2);
  setTitle(`${meta.ref} ${cref}`);
  const hasDeva = verses.some((v) => v[1].length);
  const hasRoman = verses.some((v) => v[2].length);
  const hasPada = verses.some((v) => v[3].length);
  const hasTr = verses.some((v) => v[4]);
  const hl = Number(params.get('v')) || null;

  // neighbours across groups
  const flat = x.groups.flatMap(([a, cs]) => cs.map(([b]) => [a, b]));
  const pos = flat.findIndex(([a, b]) => a === d1 && b === d2);
  const prev = flat[pos - 1]; const next = flat[pos + 1];

  const summary = FKEYS.map((f) => [f, primaryTag(x, rows, f)]).filter(([, e]) => e);
  const seg = (name, opts) => `<div class="seg" role="group" aria-label="${esc(name)}">${opts.map(([k, v, l, dis]) => `<button data-p="${k}" data-v="${v}" aria-pressed="${String(prefs[k] === v)}"${dis ? ' disabled' : ''}>${esc(l)}</button>`).join('')}</div>`;
  const controls = [
    hasDeva && hasRoman ? seg('Script', [['script', 'both', 'Both'], ['script', 'deva', 'देवनागरी'], ['script', 'roman', 'IAST']]) : '',
    hasPada ? seg('Text', [['mode', 'samhita', 'Saṃhitā'], ['mode', 'pada', 'Padapāṭha']]) : '',
    hasTr && (hasDeva || hasRoman) ? seg('Translation', [['tr', true, 'Translation'], ['tr', false, 'Hide']]) : '',
  ].join('');

  main.innerHTML = `<article class="col">
    <div class="crumbs"><a href="#/v/${id}">${esc(meta.name)}</a><span aria-hidden="true">/</span><a href="#/v/${id}/g/${d1}">${esc(x.groups.length > 1 ? groupName(meta, d1) : `${meta.levels[1]}s`)}</a></div>
    <div class="reader-head"><div>
      <h1>${esc(meta.levels[1])} ${esc(cref)}</h1>
      ${c[2] ? `<div class="ctitle" lang="sa">${esc(c[2])}</div>` : ''}
    </div></div>
    ${summary.length ? `<div class="tags">${summary.map(([f, e]) => `<a class="tag" href="${findHref(id, { [f]: e[0] })}"><em>${FACETS[f].label}</em>${e[2] ? `<span class="dv" lang="sa">${esc(e[2])}</span>` : ''}<span>${esc(cap(e[1]))}</span></a>`).join('')}</div>` : ''}
    ${controls ? `<div class="controls">${controls}</div>` : ''}
    <div id="verses"></div>
    <nav class="pager" aria-label="Neighbouring ${esc(meta.levels[1].toLowerCase())}s">
      ${prev ? `<a href="#/v/${id}/c/${prev[0]}/${prev[1]}">‹ ${esc(meta.ref)} ${esc(containerRef(meta, prev[0], prev[1]))}</a>` : '<span></span>'}
      ${next ? `<a href="#/v/${id}/c/${next[0]}/${next[1]}">${esc(meta.ref)} ${esc(containerRef(meta, next[0], next[1]))} ›</a>` : ''}
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
      const ref = refOf(meta, d1, d2, v);
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
        <div>${label ? `<div class="vlabel">${esc(label)}</div>` : ''}${body}${tags ? `<div class="tags">${tags}</div>` : ''}</div>
        <button class="icon-btn copy" data-copy="${v}" aria-label="Copy ${esc(meta.ref)} ${esc(ref)}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg></button>
      </section>`;
    }).join('');
    main.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
      const v = Number(b.dataset.copy);
      const vs = verses.find((e) => e[0] === v);
      const txt = [...vs[1], ...vs[2], vs[4], `— ${meta.ref} ${refOf(meta, d1, d2, v)}`].filter(Boolean).join('\n');
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
  // the first verse is already in view; only jump for later ones
  if (hl && hl !== verses[0]?.[0]) requestAnimationFrame(() => document.getElementById(`v${hl}`)?.scrollIntoView({ block: 'start' }));
}

async function viewAbout() {
  setTitle('Sources and licences');
  const cat = await catalog();
  main.innerHTML = `<div class="prose">
    <h1>Sources and licences</h1>
    <p class="lede">Vedālokana is a non-commercial browser built entirely from openly published data. Text and tags are shown as the sources give them; corrections belong upstream.</p>
    <h2>What each Saṃhitā draws on</h2>
    <div class="table-wrap"><table class="src-table"><thead><tr><th>Saṃhitā</th><th>Text</th><th>Ṛṣi, devatā, chandas</th></tr></thead><tbody>
      <tr><td>Ṛgveda (Śākala)</td><td>VedaWeb, University of Cologne: Devanagari with svaras (Eichler), Aufrecht’s transliteration, Padapāṭha, Griffith’s translation. CC BY-NC-SA 4.0 for the texts.</td><td>Digitised Sarvānukramaṇī per ṛk, from Krishna et al., WSC 2023. Apache-2.0.</td></tr>
      <tr><td>Atharvaveda (Śaunaka)</td><td>DharmicData (ODbL), which takes its text from the Vedic Heritage Portal, Ministry of Culture.</td><td>Parsed from each sūkta’s Anukramaṇī header in the same text.</td></tr>
      <tr><td>Śukla Yajurveda (Mādhyandina)</td><td>DharmicData (ODbL), from the Vedic Heritage Portal.</td><td>Not available yet.</td></tr>
      <tr><td>Sāmaveda (Kauthuma)</td><td>Griffith’s English translation (1895, public domain), via DharmicData.</td><td>Devatā from Griffith’s hymn headings.</td></tr>
    </tbody></table></div>
    <h2>Known gaps</h2>
    <ul>
      <li>The Sanskrit text of the Sāmaveda, and any Kṛṣṇa Yajurveda Saṃhitā, are not yet in an openly licensed digital edition we can use.</li>
      <li>Atharvaveda kāṇḍa 20 has no Anukramaṇī headers in the source, so its mantras carry no tags.</li>
      <li>18 ṛks of the Ṛgveda have no entry in the digitised Anukramaṇī.</li>
      <li>Audio recitation is not included: the Vedic Heritage Portal’s recordings need permission to reuse.</li>
    </ul>
    <h2>Data build</h2>
    <p>Built ${esc(cat.built)} by <code>scripts/build-data.mjs</code>. The source repositories and steps to rebuild are in the project README.</p>
  </div>`;
}

function notFound() {
  setTitle('Not found');
  main.innerHTML = `<div class="col"><h1>That page doesn’t exist</h1><p class="lede">The link may point to a sūkta or name that isn’t in this Saṃhitā. <a href="#/">Go to the start page</a>.</p></div>`;
}

// ---------- search ----------
const REF_PREFIX = { rv: 'rv', ṛv: 'rv', av: 'av', avś: 'av', vs: 'yv', yv: 'yv', sv: 'sv' };
let activeVeda = 'rv';
async function suggestions(q) {
  const out = [];
  const m = q.trim().toLowerCase().match(/^(?:([a-zṛś]{2,3})\s*)?(\d+)(?:[.\s:/](\d+))?(?:[.\s:/](\d+))?$/);
  const cat = await catalog();
  if (m) {
    const id = REF_PREFIX[m[1]] || activeVeda;
    const meta = cat.vedas.find((v) => v.id === id);
    const x = await index(id);
    const nums = [m[2], m[3], m[4]].filter(Boolean).map(Number);
    let d1; let d2; let v;
    if (meta.refFmt === 'd2.v') { d1 = x.groups[0][0]; [d2, v] = nums; } else [d1, d2, v] = nums;
    const g = x.groups.find((e) => e[0] === d1);
    if (g && d2 === undefined) out.push({ href: x.groups.length > 1 ? `#/v/${id}/g/${d1}` : `#/v/${id}/c/${d1}/${d1}`, label: `${meta.name}, ${groupName(meta, d1)}`, hint: 'Open' });
    else if (g && g[1].some((c) => c[0] === d2)) out.push({ href: `#/v/${id}/c/${d1}/${d2}${v ? `?v=${v}` : ''}`, label: `${meta.ref} ${refOf(meta, d1, d2, v)}`, hint: meta.name });
  }
  const ql = q.trim().toLowerCase();
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

// ---------- drawer ----------
function setDrawer(open) {
  rail.classList.toggle('open', open);
  $('#scrim').hidden = !open;
  $('#menuBtn').setAttribute('aria-expanded', String(open));
}
$('#menuBtn').addEventListener('click', () => setDrawer(!rail.classList.contains('open')));
$('#scrim').addEventListener('click', () => setDrawer(false));

// ---------- router ----------
function parse() {
  const [path, qs] = getHash().replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, params: new URLSearchParams(qs || ''), veda: parts[0] === 'v' ? parts[1] : null, sub: parts[2] || null };
}
async function route() {
  const r = parse();
  if (r.veda) activeVeda = r.veda;
  setDrawer(false);
  main.innerHTML = '<p class="loading">Loading…</p>';
  try {
    await renderRail(r);
    const [a, id, sub, p1, p2] = r.parts;
    if (!a) await viewHome();
    else if (a === 'about') await viewAbout();
    else if (a === 'v' && !sub) await viewVeda(id);
    else if (a === 'v' && sub === 'g') await viewGroups(id, p1 !== undefined ? Number(p1) : undefined);
    else if (a === 'v' && sub === 'f') await viewFacet(id, p1);
    else if (a === 'v' && sub === 'find') await viewFind(id, r.params);
    else if (a === 'v' && sub === 'c') await viewContainer(id, Number(p1), Number(p2), r.params);
    else notFound();
    await renderRail(r);
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
