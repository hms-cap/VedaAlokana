#!/usr/bin/env node
// Builds the static JSON data the web app reads, from open sources.
// Usage:
//   node scripts/build-data.mjs --vedaweb <vedaweb-data dir> \
//        --anukramani <WSC2023/Anukramani dir> --dharmic <DharmicData dir> \
//        --raw <sanskrit/raw_etexts dir> --gretil <sanskrit/gretil-mirror dir> [--out web/data]
// See docs/DATA_SOURCES.md for where each source comes from and its licence.

import fs from 'node:fs';
import path from 'node:path';
import { iastToDeva, devaToIast, isoToIast, stripRomanAccents, nameKey } from './translit.mjs';
import { extraTexts } from './texts.mjs';
import { SUKTAS } from './suktas.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
  return acc;
}, []));
for (const k of ['vedaweb', 'anukramani', 'dharmic', 'raw', 'gretil']) {
  if (!args[k]) { console.error(`missing --${k}`); process.exit(1); }
}
const OUT = args.out || 'web/data';

const FACETS = ['rishi', 'devata', 'chandas'];
const DEVA_NUM = '०१२३४५६७८९';
const devaNum = (s) => s.replace(/[०-९]/g, (d) => String(DEVA_NUM.indexOf(d)));

// Spelling fixes in the source index, keyed by folded name.
const CANON = { 'maitravarunirvasitha': 'maitrāvaruṇirvasiṣṭhaḥ', 'jagatii': 'jagatī', 'anustap': 'anuṣṭup', 'asari-gayatri': 'āsurī gāyatrī', 'tristubh': 'triṣṭup', 'anustubh': 'anuṣṭup' };

// ---- shared facet registry (one name space across all Saṃhitās) ----------
const registry = new Map(); // key -> { iast, deva }
function register(iastRaw, devaRaw) {
  let iast = stripRomanAccents(isoToIast(iastRaw.trim()));
  let key = nameKey(iast);
  if (!key) return null;
  if (CANON[key]) { iast = CANON[key]; key = nameKey(iast); }
  if (!registry.has(key)) registry.set(key, { iast, deva: devaRaw ? devaRaw.trim() : iastToDeva(iast) });
  return key;
}

function makeVeda() {
  return { containers: new Map(), rows: [], facets: Object.fromEntries(FACETS.map((f) => [f, new Map()])), text: new Map() };
}
// Remove encoding debris from Indic text lines: C1 controls, private-use
// characters, stray Latin-1 symbols, editorial notes in square brackets and
// lines that are really file headers (several Latin letters).
function cleanIndic(line) {
  let l = line.normalize('NFC')
    .replace(/[\u0080-\u009F\uE000-\uF8FF\u00AC\u00E8\u00F0\u017D]/g, '')
    .replace(/\[[^\]]*\]>?/g, '')
    .replace(/\([^()]*[A-Za-z][^()]*\)/g, '')                       // editorial notes in English
    .replace(/\b\d+ \d+ \d+ \d+[a-z]\b/g, '')                       // stray verse-index numbers
    .replace(/(?<=[\u0900-\u097F][\u0951\u0952]?)[jk](?=[\u0900-\u097F\s])/g, 'ᳪ') // ITRANS leak for the "gum" anusvāra
    .replace(/(?<=[\u0900-\u097F][\u0951\u0952]?)H(?=[\s।॥]|$)/g, 'ः')   // ITRANS leak for visarga
    .replace(/`/g, 'ऽ')
    .replace(/[<>\\!@]/g, '')
    .replace(/([\u0900-\u097F])o(?=[\s,।|]|$)/g, '$1॰') // "o" used as an abbreviation mark
    .replace(/\s+/g, ' ').trim();
  if ((l.match(/[A-Za-z]/g) || []).length >= 2) return '';
  return l;
}
// Editors' query marks in the sources. They are not part of the text and showed
// up as stray "?" in both scripts. Doubtful insertions keep their letters
// ("यज्ञं (नि?)षेदथुः" → "यज्ञं निषेदथुः"); alternative readings attached to a
// word are dropped ("जी(जि?)गि॒वाꣳसः" keeps the source's reading); bare "(?)",
// "[?]", ".?." and "??" placeholders go. Two Śatapatha lines lost a letter to a
// "?" and are restored (anvāhāryapacana, kṛtānukara).
const QUERY_FIXES = [['ऽन्वा?आर्यपचनो', 'ऽन्वाहार्यपचनो'], ["'nvā?āryapacano", "'nvāhāryapacano"],
  ['कृता?उकराम', 'कृतानुकराम'], ['kṛtā?ukarām', 'kṛtānukarām'],
  // three single-letter typos left by the sources
  ['tūfaro', 'tūparo'], ['तूfअरो', 'तूपरो'], ['हिHꣳसीः', 'हिꣳसीः'], ['प्या॑यतां॒j', 'प्या॑यतां॒']];
export function dropQueries(line) {
  let l = line;
  for (const [a, b] of QUERY_FIXES) l = l.split(a).join(b);
  return l
    .replace(/\s*[([]\?[)\]]/g, '')                    // (?) [?]
    .replace(/(?<=\s|^)\(([^()?]+)\?\)/g, '$1')        // (नि?)षेदथुः: doubtful letters, kept
    .replace(/\([^()?]+\?\)/g, '')                      // जी(जि?)गि: alternative reading, dropped
    .replace(/\.\?\.|\?+/g, '')                          // .?. ?? ? placeholders
    .replace(/\s+/g, ' ').trim();
}

function addVerse(V, d1, d2, v, tags, text) {
  text = { ...text };
  for (const k of ['deva', 'roman', 'pada']) if (text[k]) text[k] = text[k].map(dropQueries);
  if (text.deva) {
    const deva = text.deva.map(cleanIndic).filter(Boolean);
    // romanisation derived from the Devanagari is redone from the cleaned lines
    text = { ...text, deva, roman: text.romanAuto ? deva.map(devaToIast) : text.roman };
  }
  const cid = `${d1}.${d2}`;
  if (!V.containers.has(cid)) V.containers.set(cid, { d1, d2, verses: 0, title: text.ctitle || null });
  V.containers.get(cid).verses += 1;
  const ix = FACETS.map((f) => {
    const key = tags[f];
    if (!key) return -1;
    const m = V.facets[f];
    if (!m.has(key)) m.set(key, { n: 0, containers: new Set() });
    const e = m.get(key); e.n += 1; e.containers.add(cid);
    return key;
  });
  V.rows.push([d1, d2, v, ...ix]);
  if (!V.text.has(d1)) V.text.set(d1, {});
  const t = V.text.get(d1);
  (t[d2] ||= []).push([v, text.deva || [], text.roman || [], text.pada || [], text.tr || '', text.label || '']);
}

function writeVeda(id, V, meta) {
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  const facetIndex = {}; const facetLists = {};
  for (const f of FACETS) {
    const list = [...V.facets[f].entries()].sort((a, b) => b[1].n - a[1].n);
    facetIndex[f] = new Map(list.map(([k], i) => [k, i]));
    facetLists[f] = list.map(([k, e]) => {
      const r = registry.get(k);
      return [k, r.iast, r.deva, e.n, e.containers.size];
    });
  }
  const rows = V.rows.map(([d1, d2, v, ...keys]) => [d1, d2, v, ...keys.map((k, i) => (k === -1 ? -1 : facetIndex[FACETS[i]].get(k)))]);
  const groups = new Map();
  for (const c of V.containers.values()) {
    if (!groups.has(c.d1)) groups.set(c.d1, []);
    groups.get(c.d1).push([c.d2, c.verses, c.title]);
  }
  const index = {
    id, facets: facetLists, rows,
    groups: [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([d1, cs]) => [d1, cs.sort((a, b) => a[0] - b[0])]),
  };
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index));
  for (const [d1, t] of V.text) fs.writeFileSync(path.join(dir, `t${d1}.json`), JSON.stringify(t));
  return {
    ...meta, id,
    containers: V.containers.size, verses: V.rows.length,
    facets: FACETS.filter((f) => V.facets[f].size > 0),
    facetCounts: Object.fromEntries(FACETS.map((f) => [f, V.facets[f].size])),
  };
}

// ---- Ṛgveda: VedaWeb TEI + Anukramaṇī -----------------------------------
function expandRanges(field, n) {
  const out = new Array(n + 1).fill(null);
  const parts = [...field.matchAll(/(?:\(([\d,\-\s]+)\))?([^,(]+)/g)];
  if (parts.length === 1 && !parts[0][1]) { for (let i = 1; i <= n; i++) out[i] = parts[0][2].trim(); return out; }
  for (const [, rng, name] of parts) {
    if (!rng) continue;
    for (const r of rng.split(',')) {
      const [a, b] = r.trim().split('-').map(Number);
      if (!a) continue;
      for (let i = a; i <= (b || a); i++) if (i <= n) out[i] = name.trim();
    }
  }
  // verses the ranges skipped inherit the first named value
  const first = parts.find((p) => p[2]?.trim())?.[2]?.trim() || null;
  for (let i = 1; i <= n; i++) if (!out[i]) out[i] = first;
  return out;
}

function loadAnukramani(dir) {
  const tags = new Map(); // "m.h" -> [{rishi,devata,chandas}] index by verse
  for (let m = 1; m <= 10; m++) {
    const lines = fs.readFileSync(path.join(dir, `Mandala_${m}.txt`), 'utf8').normalize('NFC').split(/\r?\n/).slice(1);
    for (const line of lines) {
      const p = line.trim().split('.');
      if (p.length < 5) continue;
      const [h, n] = [Number(p[0]), Number(p[1])];
      if (!h || !n) continue;
      const fields = [p[2], p[3], p.slice(4).join('.')].map((f) => expandRanges(f, n));
      const per = [];
      for (let v = 1; v <= n; v++) per[v] = Object.fromEntries(FACETS.map((f, i) => [f, fields[i][v] ? register(fields[i][v]) : null]));
      tags.set(`${m}.${h}`, per);
    }
  }
  return tags;
}

function buildRigveda() {
  const V = makeVeda();
  const tags = loadAnukramani(args.anukramani);
  const teiDir = path.join(args.vedaweb, 'rigveda', 'TEI');
  const lines = (block) => [...block.matchAll(/<l xml:id="[^"]+"[^>]*>([^<]*)<\/l>/g)].map((m) => m[1].trim()).filter(Boolean);
  const lg = (s, id, src) => {
    const m = s.match(new RegExp(`<lg xml:id="${id}_${src}"[^>]*>([\\s\\S]*?)</lg>`));
    return m ? m[1] : '';
  };
  let missing = 0;
  for (let b = 1; b <= 10; b++) {
    const t = fs.readFileSync(path.join(teiDir, `rv_book_${String(b).padStart(2, '0')}.tei`), 'utf8');
    const starts = [...t.matchAll(/<div xml:id="b(\d+)_h(\d+)_(\d+)" type="stanza">/g)];
    starts.forEach((m, i) => {
      const s = t.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : t.length);
      const id = `b${m[1]}_h${m[2]}_${m[3]}`;
      const [d1, d2, v] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const tg = tags.get(`${d1}.${d2}`)?.[v];
      if (!tg) missing++;
      addVerse(V, d1, d2, v, tg || {}, {
        deva: lines(lg(s, id, 'eichler')),
        roman: lines(lg(s, id, 'aufrecht')).map(isoToIast),
        pada: [...lg(s, id, 'padapatha').matchAll(/<w [^>]*>([^<]*)<\/w>/g)].map((w) => isoToIast(w[1])),
        tr: lines(lg(s, id, 'griffith')).join(' '),
      });
    });
  }
  console.log(`rv: ${V.rows.length} ṛks, ${missing} without Anukramaṇī tags`);
  return writeVeda('rv', V, {
    veda: 'rv', layer: 'samhita', name: 'Ṛgveda Saṃhitā', deva: 'ऋग्वेद संहिता', shakha: 'Śākala', levels: ['Maṇḍala', 'Sūkta', 'Ṛk'], ref: 'RV', refFmt: 'd1.d2.v',
    has: { svara: true, roman: true, pada: true, translation: 'Griffith (1896)' },
    tagLevel: 'verse',
    sources: ['vedaweb', 'anukramani'],
  });
}

// ---- Atharvaveda (Śaunaka): DharmicData; sūkta headers carry ṛṣi/devatā/chandas
function cleanTag(s) {
  let x = s;
  for (let k = 0; k < 4; k++) x = x.replace(/\([^()]*\)/g, ''); // drop exception lists
  x = x.split(/[,;(]/)[0];
  x = x.replace(/[०-९0-9]+(\s*-\s*[०-९0-9]+)?/g, '').replace(/[-.\s]+$/, '').replace(/^[-.\s,]+/, '').trim();
  return x || null;
}
const VERSE_END = /(?:॥|।।)\s*([०-९0-9]+)\s*(?:॥|।।)/;

function splitVerses(lines) {
  const verses = []; let cur = [];
  for (const raw of lines) {
    let line = raw.replace(/\s\|\s*$/, ' ।').trim();
    if (!line) continue;
    // a line may hold several numbered verses
    while (VERSE_END.test(line)) {
      const m = line.match(VERSE_END);
      const before = line.slice(0, m.index).trim();
      if (before) cur.push(before);
      verses.push({ n: Number(devaNum(m[1])), lines: cur }); cur = [];
      line = line.slice(m.index + m[0].length).trim();
    }
    if (line) cur.push(line);
  }
  if (cur.length) verses.push({ n: (verses.at(-1)?.n || 0) + 1, lines: cur });
  return verses;
}

function buildAtharvaveda() {
  const V = makeVeda();
  const dir = path.join(args.dharmic, 'AtharvaVeda');
  let headerless = 0;
  for (let k = 1; k <= 20; k++) {
    const entries = JSON.parse(fs.readFileSync(path.join(dir, `atharvaveda_kaanda_${k}.json`), 'utf8'));
    for (const e of entries) {
      const lines = e.text.normalize('NFC').split('\n').map((l) => l.trim()).filter(Boolean);
      // Leading lines without svara marks are the sūkta title + Anukramaṇī header
      // ("१-४ अथर्वा। वाचस्पतिः। अनुष्टुप्, …"), possibly wrapped over several lines.
      let top = 0;
      while (top < lines.length && !/[॒॑]/.test(lines[top]) && !VERSE_END.test(lines[top])) top++;
      const lead = lines.slice(0, top).join(' ');
      const body = lines.slice(top);
      let title = null; let header = null;
      const rng = lead.search(/[०-९]+(?:\s*-\s*[०-९]+)?\s+\S/);
      if (rng >= 0) { title = lead.slice(0, rng).replace(/[।\s]+$/, '') || null; header = lead.slice(rng); }
      else if (lead) {
        const cut = lead.indexOf('।');
        const rest = cut >= 0 ? lead.slice(cut + 1) : '';
        if ((rest.match(/।/g) || []).length >= 2) { title = lead.slice(0, cut).trim(); header = rest; }
        else if ((lead.match(/।/g) || []).length >= 2) header = lead;
        else title = lead.replace(/[।\s]+$/, '');
      }
      const tg = {};
      const parts = header ? header.split('।').map((p) => p.trim()).filter(Boolean) : [];
      if (parts.length >= 3) {
        FACETS.forEach((f, i) => {
          const d = parts[i] && cleanTag(parts[i]);
          if (d) tg[f] = register(devaToIast(d), d);
        });
      } else headerless++;
      for (const { n, lines: vl } of splitVerses(body)) {
        addVerse(V, Number(e.kaanda), Number(e.sukta), n, tg, {
          deva: vl, roman: vl.map(devaToIast), romanAuto: true, ctitle: title ? `${title} · ${devaToIast(title)}` : null,
        });
      }
    }
  }
  console.log(`av: ${V.rows.length} mantras, ${headerless} sūktas without header`);
  return writeVeda('av', V, {
    veda: 'av', layer: 'samhita', name: 'Atharvaveda Saṃhitā', deva: 'अथर्ववेद संहिता', shakha: 'Śaunaka', levels: ['Kāṇḍa', 'Sūkta', 'Mantra'], ref: 'AVŚ', refFmt: 'd1.d2.v',
    has: { svara: true, roman: true, pada: false, translation: null },
    tagLevel: 'sukta',
    sources: ['dharmic'],
  });
}

// ---- Śukla Yajurveda (Vājasaneyi Mādhyandina): DharmicData, structure only
function buildYajurveda() {
  const V = makeVeda();
  const entries = JSON.parse(fs.readFileSync(path.join(args.dharmic, 'Yajurveda', 'vajasneyi_madhyadina_samhita.json'), 'utf8'));
  for (const e of entries) {
    const lines = e.text.normalize('NFC').split('\n').map((l) => l.trim()).filter((l) => l && !/ध्यायः\s*।?$/.test(l));
    for (const { n, lines: vl } of splitVerses(lines)) {
      addVerse(V, 1, Number(e.adhyaya), n, {}, { deva: vl, roman: vl.map(devaToIast), romanAuto: true });
    }
  }
  console.log(`yv: ${V.rows.length} mantras`);
  return writeVeda('yv', V, {
    veda: 'syv', layer: 'samhita', name: 'Vājasaneyi Saṃhitā', deva: 'वाजसनेयि संहिता', shakha: 'Mādhyandina', levels: ['', 'Adhyāya', 'Mantra'], ref: 'VS', refFmt: 'd2.v',
    has: { svara: true, roman: true, pada: false, translation: null },
    tagLevel: null,
    sources: ['dharmic'],
  });
}

// ---- Sāmaveda (Kauthuma): Griffith's translation only, devatā per hymn
const ROMAN = { I: 1, V: 5, X: 10, L: 50 };
const roman = (s) => [...s.toUpperCase()].reduce((acc, ch, i, a) => {
  const v = ROMAN[ch] || 0; const nx = ROMAN[a[i + 1]] || 0; return acc + (v < nx ? -v : v);
}, 0);

// Griffith's English deity names -> the Sanskrit entries already in the registry
const SV_ALIAS = {
  'soma-pavamana': 'pavamana-soma', 'indra-agni': 'indragni', 'agni-indra': 'indragni', 'mitra-varuna': 'mitravarunau',
  'mitra-varuva': 'mitravarunau', 'dawn': 'usa', 'asvins': 'asvinau', 'maruts': 'maruta', 'vishnu': 'visnu',
  'adityas': 'aditya', 'visvedevas': 'visvedeva', 'all-gods': 'visvedeva', 'heaven-and-eart': 'dyavaprthivi',
  'the-waters': 'apa', 'svitar-brahmapaspati-agni': 'savita', 'sarasvati': 'sarasvati', 'surya': 'surya',
  'vata': 'vata', 'vena': 'vena', 'varuna': 'varuna', 'pusan': 'pusa', 'visvakarman': 'visvakarma', 'vayu-indra-and-vayu': 'vayu',
};

function buildSamaveda() {
  const V = makeVeda();
  const sv = JSON.parse(fs.readFileSync(path.join(args.dharmic, 'Samaveda', 'Samaveda.json'), 'utf8'));
  const counters = new Map();
  for (const r of sv.verses) {
    const d1 = /second/i.test(r.part) ? 2 : 1;
    const d2 = roman(r.book.replace(/book\s*/i, '').trim());
    const k = `${d1}.${d2}`;
    const n = (counters.get(k) || 0) + 1; counters.set(k, n);
    const tg = {};
    if (r.deity) {
      const key = SV_ALIAS[nameKey(r.deity)] || nameKey(r.deity);
      // English names ("Agni") reuse the Ṛgveda entry when one exists; no Devanagari otherwise
      tg.devata = registry.has(key) ? key : register(r.deity, ' ');
    }
    addVerse(V, d1, d2, n, tg, {
      tr: r.text,
      label: [r.chapter, r.section, `Hymn ${r.hymn}.${r.verse}`].filter(Boolean).join(' · '),
    });
  }
  console.log(`sv: ${V.rows.length} verses (translation only)`);
  return writeVeda('sv', V, {
    veda: 'sv', layer: 'samhita', name: 'Sāmaveda, Griffith’s translation', deva: 'सामवेद (अनुवाद)', shakha: 'Kauthuma', levels: ['Ārcika', 'Book', 'Verse'], ref: 'SV', refFmt: 'd1.d2.v',
    groupNames: { 1: 'Pūrvārcika', 2: 'Uttarārcika' },
    has: { svara: false, roman: false, pada: false, translation: 'Griffith (1895)' },
    tagLevel: 'hymn',
    sources: ['dharmic'],
  });
}

// ---- Brāhmaṇas, Āraṇyakas, Upaniṣads and extra Saṃhitās ----------------
const REF = {
  ab: 'AB', kb: 'KB', aa: 'AĀ', sa: 'ŚĀ', aiu: 'AiU', sb: 'ŚB', isu: 'ĪU', bu: 'BĀU', ts: 'TS', tb: 'TB', ta: 'TĀ', tu: 'TU',
  kathu: 'KaU', svu: 'ŚvU', svs: 'SV', pb: 'PB', jub: 'JUB', chu: 'ChU', keu: 'KeU', gb: 'GB', mu: 'MuU', mau: 'MāU', pru: 'PrU',
};
function buildExtra(def) {
  const V = makeVeda();
  const units = def.units();
  for (const u of units) addVerse(V, u.d1, u.d2, u.v, {}, { deva: u.deva, roman: u.roman, romanAuto: !!u.romanAuto, label: u.label || '', ctitle: u.ctitle || null });
  const oneD1 = units.every((u) => u.d1 === units[0].d1);
  const oneC = oneD1 && units.every((u) => u.d2 === units[0].d2);
  const refFmt = def.refFmt || (oneC ? 'v' : oneD1 ? 'd2.v' : 'd1.d2.v');
  console.log(`${def.id}: ${units.length} units in ${V.containers.size} sections`);
  return writeVeda(def.id, V, {
    veda: def.veda, layer: def.layer, name: def.name, deva: def.deva, shakha: def.shakha || null,
    levels: def.levels, ref: REF[def.id] || def.id.toUpperCase(), refFmt, groupNames: def.groupNames,
    has: { svara: !!def.svara, roman: true, pada: false, translation: null },
    tagLevel: null, note: def.note || null, sources: [def.src],
  });
}

const VEDAS = [
  { id: 'rv', name: 'Ṛgveda', deva: 'ऋग्वेद' },
  { id: 'syv', name: 'Śukla Yajurveda', deva: 'शुक्ल यजुर्वेद' },
  { id: 'kyv', name: 'Kṛṣṇa Yajurveda', deva: 'कृष्ण यजुर्वेद' },
  { id: 'sv', name: 'Sāmaveda', deva: 'सामवेद' },
  { id: 'av', name: 'Atharvaveda', deva: 'अथर्ववेद', absent: { aranyaka: 'The Atharvaveda has no Āraṇyaka.' } },
];
VEDAS[1].absent = { aranyaka: 'Its Āraṇyaka is the Bṛhadāraṇyaka, listed under Upaniṣads.' };
const LAYERS = ['samhita', 'brahmana', 'aranyaka', 'upanishad'];

fs.mkdirSync(OUT, { recursive: true });
const texts = [buildRigveda(), buildYajurveda(), buildSamaveda(), buildAtharvaveda()];
for (const def of extraTexts({ raw: args.raw, gretil: args.gretil })) texts.push(buildExtra(def));
// the Sanskrit Sāmaveda first, its translation after
texts.sort((a, b) => (a.id === 'sv' && b.id === 'svs' ? 1 : a.id === 'svs' && b.id === 'sv' ? -1 : 0));
const vedas = VEDAS.map((v) => ({
  ...v,
  layers: Object.fromEntries(LAYERS.map((l) => [l, texts.filter((t) => t.veda === v.id && t.layer === l).map((t) => t.id)])),
}));
fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify({ built: new Date().toISOString().slice(0, 10), layers: LAYERS, vedas, texts }, null, 1));

// ---- famous sūktas: resolve each entry against the data and check its opening
const fold = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const byText = Object.fromEntries(texts.map((t) => [t.id, t]));
const textCache = {};
const suktas = SUKTAS.map((e) => {
  const meta = byText[e.text];
  const t = (textCache[`${e.text}/${e.d1}`] ||= JSON.parse(fs.readFileSync(path.join(OUT, e.text, `t${e.d1}.json`), 'utf8')));
  const verses = t[e.d2] || [];
  const first = e.v ? verses.find((x) => x[0] === e.v) : verses[0];
  if (!first) throw new Error(`sūkta ${e.name}: ${e.text} ${e.d1}.${e.d2}.${e.v} not found`);
  const opening = first[2].join(' ');
  const found = e.within ? fold(opening).includes(fold(e.starts)) : fold(opening).startsWith(fold(e.starts));
  if (!found) throw new Error(`sūkta ${e.name}: expected "${e.starts}", found "${opening.slice(0, 60)}"`);
  const parts = meta.refFmt === 'v' ? [first[0]] : meta.refFmt === 'd2.v' ? [e.d2, e.v] : [e.d1, e.d2, e.v];
  const ref = meta.refFmt === 'label' && first[5] ? first[5] : parts.filter((x) => x !== null && x !== undefined).join('.');
  return {
    ...e, ref: `${meta.ref} ${ref}`, href: `#/v/${e.text}/c/${e.d1}/${e.d2}${e.v ? `?v=${e.v}` : ''}`,
    count: e.v ? 1 : verses.length, line: first[1][0] || '', roman: first[2][0] || '',
  };
});
fs.writeFileSync(path.join(OUT, 'suktas.json'), JSON.stringify(suktas));
console.log(`suktas: ${suktas.length} checked against the text`);
console.log('wrote', OUT);
