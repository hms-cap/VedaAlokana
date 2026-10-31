// Resolves the daily mantra cards (scripts/daily/*.mjs) against the built data and writes
// web/data/daily.json.   node scripts/build-daily.mjs [web/data]
// Each card names its mantra by place: 'rv 3.62.10' (text, then d1.d2.v; texts without a first
// level take d2.v, as the app writes their references) — the whole verse — or, inside a long
// section, `from` and `to`: the first and last words of the mantra, matched without accents.
// 'sk <sūkta id> <n>' takes verse n of a sūkta given in versions (Aithal's texts).
// Ṛgveda cards take ṛṣi, devatā and chandas from the index unless they say otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { norm as norm0 } from './build-suktas.mjs';
// a word-final म् and an anusvāra are the same here (तम् / तं)
const norm = (x) => norm0(x.replace(/म्(?=\s|$)/g, 'ं'));
import { GLOSS } from './daily/gloss.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.argv[2] || path.join(here, '..', 'web', 'data');
const dir = path.join(here, 'daily');
const CARDS = [];
for (const f of fs.readdirSync(dir).filter((x) => /^\d+.*\.mjs$/.test(x)).sort()) CARDS.push(...(await import(path.join(dir, f))).CARDS);

const cat = JSON.parse(fs.readFileSync(path.join(DATA, 'catalog.json'), 'utf8'));
const files = {};
const load = (t, d1) => (files[`${t}/${d1}`] ||= JSON.parse(fs.readFileSync(path.join(DATA, t, `t${d1}.json`), 'utf8')));
const idx = {};
const index = (t) => (idx[t] ||= JSON.parse(fs.readFileSync(path.join(DATA, t, 'index.json'), 'utf8')));
const suktas = JSON.parse(fs.readFileSync(path.join(DATA, 'suktas.json'), 'utf8'));

// the words of a section from `from` to `to`, as half-verse lines ending at । or ॥
function slice(lines, from, to, where) {
  const words = lines.join(' ').replace(/।\s*\d+\s*।/g, ' ').split(/\s+/).filter((w) => w && !/^\(\d+\)$/.test(w) && !/^।?\d+।?$/.test(w));
  let s = ''; const at = [];
  words.forEach((w, i) => { for (const c of norm(w)) { s += c; at.push(i); } });
  const nf = norm(from); const i0 = s.indexOf(nf);
  if (i0 < 0) throw new Error(`${where}: “${from}” not found`);
  let i1 = s.length - 1;
  if (to) { const nt = norm(to); const k = s.indexOf(nt, i0); if (k < 0) throw new Error(`${where}: “${to}” not found after “${from}”`); i1 = k + nt.length - 1; }
  const w0 = at[i0]; let w1 = at[i1];
  while (words[w1 + 1] && /^[।॥]+$/.test(words[w1 + 1])) w1++;
  const out = []; let cur = [];
  for (const w of words.slice(w0, w1 + 1)) {
    if (/^[।॥]+$/.test(w)) { if (cur.length) { cur.push(w); out.push(cur.join(' ')); cur = []; } continue; }
    cur.push(w);
    if (/[।॥]$/.test(w)) { out.push(cur.join(' ')); cur = []; }
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}

const facetOf = (t, row, f) => { const i = row?.[{ rishi: 3, devata: 4, chandas: 5 }[f]]; return i >= 0 ? index(t).facets[f][i] : null; };
const gl = (kind, key) => {
  if (!key) return null;
  const g = GLOSS[kind][key];
  if (!g) { missing.add(`${kind}:${key}`); return null; }
  return key;
};
const missing = new Set();
const out = []; const errors = []; const seen = new Set();
for (const c of CARDS) {
  try {
    const [t, ref] = c.at.split(' ');
    const item = { m: c.m, w: c.w, u: c.u };
    if (t === 'sk') {
      const s = suktas.find((x) => x.id === ref);
      const v = s?.versions?.[0].verses.find((x) => String(x.n) === c.at.split(' ')[2]);
      if (!v) throw new Error(`${c.at}: no such verse`);
      Object.assign(item, { t, lines: c.from ? slice(v.lines, c.from, c.to, c.at) : v.lines, href: `#/s/${ref}`, src: s.ref, srcSa: s.deva });
    } else {
      const meta = cat.texts.find((x) => x.id === t);
      if (!meta) throw new Error(`${c.at}: no text ${t}`);
      const parts = ref.split('.').map(Number);
      const [d1, d2, v] = parts.length === 3 ? parts : parts.length === 2 ? [1, ...parts] : [1, 1, ...parts];
      const verse = (load(t, d1)[d2] || []).find((x) => x[0] === v);
      if (!verse) throw new Error(`${c.at}: not found`);
      // a long section is cut at from/to; a whole verse outside the Ṛgveda is cleaned of its
      // section numbers and set as half-verses
      const lines = c.from ? slice(verse[1], c.from, c.to, c.at) : t === 'rv' ? verse[1] : slice(verse[1], verse[1][0].split(/\s+/)[0], null, c.at);
      if (!lines.length) throw new Error(`${c.at}: no text`);
      Object.assign(item, { t, ref, lines, href: `#/v/${t}/c/${d1}/${d2}?v=${v}`, src: `${meta.ref} ${ref}` });
      if (!c.from && verse[3]?.length) item.pada = verse[3];
      if (t === 'rv' || t === 'av') {
        const row = index(t).rows.find((r) => r[0] === d1 && r[1] === d2 && r[2] === v);
        for (const f of ['rishi', 'devata', 'chandas']) { const e = facetOf(t, row, f); if (e && !c[f[0]]) item[f[0]] = [e[0], e[1], e[2]]; }
      }
    }
    for (const f of ['r', 'd', 'c']) if (c[f]) item[f] = c[f];
    // glossary keys: a facet slug, or a key of GLOSS
    for (const [f, kind] of [['r', 'rishi'], ['d', 'devata'], ['c', 'chandas']]) {
      if (!item[f]) continue;
      const key = Array.isArray(item[f]) ? item[f][0] : item[f];
      const g = gl(kind, key);
      item[f] = Array.isArray(item[f]) ? [...item[f], g ? 1 : 0] : [key, GLOSS[kind][key]?.[0] || key, GLOSS[kind][key]?.[1] || '', g ? 1 : 0];
    }
    const id = `${c.at}:${c.from || ''}`;
    if (seen.has(id)) throw new Error(`${c.at}: listed twice`);
    seen.add(id);
    out.push(item);
  } catch (e) { errors.push(e.message); }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
// glossary entries actually used
const used = { rishi: {}, devata: {}, chandas: {} };
for (const it of out) for (const [f, kind] of [['r', 'rishi'], ['d', 'devata'], ['c', 'chandas']]) if (it[f]?.[3]) used[kind][it[f][0]] = GLOSS[kind][it[f][0]].slice(2);
// in files of 50, so Home reads one small file a day; the notes on ṛṣis, devatās and chandas
// go in the index with the count
const CH = 50;
const od = path.join(DATA, 'daily');
fs.rmSync(od, { recursive: true, force: true }); fs.mkdirSync(od, { recursive: true });
for (let k = 0; k * CH < out.length; k++) fs.writeFileSync(path.join(od, `c${k}.json`), JSON.stringify(out.slice(k * CH, (k + 1) * CH)));
fs.writeFileSync(path.join(od, 'index.json'), JSON.stringify({ n: out.length, chunk: CH, gloss: used }));
fs.rmSync(path.join(DATA, 'daily.json'), { force: true });
console.log(`daily: ${out.length} mantras${missing.size ? `; no glossary for ${[...missing].join(', ')}` : ''}`);
