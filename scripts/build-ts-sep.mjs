// Finds where the Taittirīya Saṃhitā joins a word-final anusvāra or visarga to the next word, using the
// padapāṭha, and writes the edits that give the separate forms:
//   नम॑श्श॒र्वाय → नमः॑ श॒र्वाय     चि॒त्तञ्च॑ → चि॒त्तं च॑     तव्ँवो → तं वो     सँ॒व्वृध्व॑ने → सं॒वृध्व॑ने
//   नम॑ᳵ कप॒र्दिने → नमः॑ कप॒र्दिने
//   node scripts/build-ts-sep.mjs [web/data]
// Reads scripts/sources/gpl/ts-padapatha/ (GPL-3.0); writes web/data/gpl/ts/s<kāṇḍa>.json (GPL-3.0).
//
// Each pañcāśat of the saṃhitā and of the padapāṭha is reduced to its letters (no svara marks, spaces,
// daṇḍas or candrabindu) and the two are aligned letter by letter (edit distance). A padapāṭha word
// (or compound member) ending in ः or म्/ं is then looked up in the saṃhitā where the alignment puts its
// last letter: a doubled sibilant there (श्श) was the visarga, a nasal + consonant or a nasalised
// य्ँय / व्ँव / ल्ँल the anusvāra. Nothing else is touched: a nasal that belongs to the word (पञ्च)
// has no word end in the padapāṭha, so it is never matched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEP } from '../web/sandhi.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'sources', 'gpl', 'ts-padapatha');
const DATA = process.argv[2] || path.join(here, '..', 'web', 'data');
const OUT = path.join(DATA, 'gpl', 'ts');

const SKIP = /[॒॑᳚ँ\s।॥0-9०-९()\-.ऽ\u200c\u200d\u2005]/;
const FOLD = { 'ꣳ': 'ं', 'ꣴ': 'ं', 'ꣵ': 'ं' };
// letters of a string with the place of each in the string
function letters(s) {
  const out = []; const at = [];
  [...s].forEach((c, i) => { if (!SKIP.test(c)) { out.push(FOLD[c] || c); at.push(i); } });
  return { out, at };
}

// इत्य॑ग्रे → अ॑ग्रे, इत्यु॑प → उ॑प, इत्या॑ → आ॑, इत्वि → इ (iti before a vowel)
const SIGN = { 'ा': 'आ', 'ि': 'इ', 'ी': 'ई', 'ु': 'उ', 'ू': 'ऊ', 'ृ': 'ऋ', 'े': 'ए', 'ै': 'ऐ', 'ो': 'ओ', 'ौ': 'औ' };
function unIti(t) {
  const r = t.replace(/^इत्[यव]|^इत(?=ी)/, '');
  const m = r.match(/^([॒॑᳚]*)([ािीुूृेैोौ])/);
  if (m) return SIGN[m[2]] + m[1] + r.slice(m[0].length);
  return `अ${r}`;
}

// ---- padapāṭha: units "TS k.p.a.n" in order; each a list of segments { text, end: 'word'|'member' }
function padaUnits(k) {
  const s = fs.readFileSync(path.join(SRC, `PadaPaatha_00${k}.html`), 'utf8').replace(/<[^>]+>/g, ' ');
  const parts = s.split(/TS (\d+)\.(\d+)\.(\d+)\.(\d+)/);
  const units = [];
  for (let i = 1; i < parts.length; i += 5) {
    const p = Number(parts[i + 1]);
    let body = parts[i + 4].replace(/\s\d+\s*\(\s*\d*\s*\)\s*$/, '').replace(/\(\s*\)/g, ' ');
    body = body.replace(/\s\d+\s*\(\s*\d+\s*\)/g, ' ');
    const segs = [];
    for (let tok of body.split(/[।॥]/)) {
      tok = tok.trim().replace(/\s*-\s*/g, '-'); if (!tok) continue;
      // "बा॒हुभ्या॒मिति॑ बा॒हु-भ्या॒म्": the analysed form after iti; "उ॒तो इति॑": the word before it
      // "अ॒ग्रे॒पु॒व॒ इत्य॑ग्रे-पु॒वः॒": iti run into the analysis (iti + agre); the analysis is what follows it
      // "अ॒श्विभ्या॒मित्य॒श्वि-भ्या॒म्": the same with no space at all
      if (!/\s/.test(tok) && tok.includes('-')) {
        const m = tok.slice(0, tok.indexOf('-')).match(/^(.*)(?:इ|ि)त(्[यव].*|ी.*)$/);
        if (m) tok = `${m[1]}इति ${unIti(`इत${m[2]}`)}${tok.slice(tok.indexOf('-'))}`;
      }
      const sp = tok.split(/\s+/).flatMap((t, k) => (k > 0 && /^इत्[यव]|^इती/.test(t) ? ['इति', unIti(t)] : [t]));
      const iti = sp.length > 1 ? sp.findIndex((t) => /ति[॒॑᳚]*$/.test(t)) : -1;
      const rest = iti >= 0 ? sp.slice(iti + 1).join(' ') : '';
      let words;
      if (rest.includes('-')) words = rest.replace(/\s+/g, '').split('-').filter(Boolean);
      else if (iti > 0) words = [sp.slice(0, iti).join('')];
      else words = [sp.join('')];
      words.forEach((w, j) => segs.push({ text: w, end: j === words.length - 1 ? 'word' : 'member' }));
    }
    units.push({ p, segs });
  }
  return units;
}

// edit-distance alignment: for each letter of b, the index of the letter of a it falls on (or -1)
function align(a, b) {
  const n = a.length; const m = b.length; const W = m + 1;
  const D = new Uint16Array((n + 1) * W);
  for (let i = 0; i <= n; i++) D[i * W] = i;
  for (let j = 0; j <= m; j++) D[j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = D[(i - 1) * W + j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      const del = D[(i - 1) * W + j] + 1; const ins = D[i * W + j - 1] + 1;
      D[i * W + j] = Math.min(sub, del, ins);
    }
  }
  const map = new Int32Array(m).fill(-1);
  let i = n; let j = m;
  while (i > 0 && j > 0) {
    const cur = D[i * W + j];
    if (cur === D[(i - 1) * W + j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { map[j - 1] = i - 1; i--; j--; } else if (cur === D[(i - 1) * W + j] + 1) i--; else j--;
  }
  return { map, dist: D[n * W + m] };
}

const STOPS = /[कखगघचछजझटठडढतथदधपफबभनम]/;   // a stop, or न / म (यज्ञन्नयत = yajñam nayata)
const NASALS = /[ङञणनम]/;
const MARK = /[॒॑᳚]/;
// the edits [at, delete, insert] on string s (one pañcāśat, lines joined by \n)
export function unitEdits(s, segs) {
  const S = letters(s);
  const P = []; const bounds = [];
  for (const g of segs) {
    const L = letters(g.text).out;
    P.push(...L);
    const last = L.at(-1); const prev = L.at(-2);
    let kind = null; let k = -1;
    if (last === 'ः') { kind = 'h'; k = P.length - 1; } else if (last === 'ं') { kind = 'm'; k = P.length - 1; } else if (last === '्' && prev === 'म') { kind = 'm'; k = P.length - 2; }
    if (kind) bounds.push({ kind, k, end: g.end });
  }
  const { map, dist } = align(S.out, P);
  const edits = [];
  for (const b of bounds) {
    // the joined letters sit where the word's last letter or the next word's first letter fell
    const fits = (j) => {
      if (j < 0 || j >= S.out.length) return false;
      const c = S.out[j]; const v = S.out[j + 1]; const c2 = S.out[j + 2];
      if (b.kind === 'h') return (/[शषस]/.test(c) && v === '्' && c2 === c && P[b.k + 1] === c) || c === 'ᳵ' || c === 'ᳶ';
      return v === '्' && ((NASALS.test(c) && STOPS.test(c2 || '') && P[b.k + (P[b.k] === 'ं' ? 1 : 2)] === c2) || (/[यवल]/.test(c) && c2 === c));
    };
    const a1 = map[b.k]; const a2 = map[b.k + (b.kind === 'm' && P[b.k] === 'म' ? 2 : 1)] ?? -1;
    const j = [a1, a1 - 1, a1 + 1, a2 - 2, a2, a2 - 1].find((x) => x >= 0 && fits(x));
    if (j === undefined) continue;
    const c = S.out[j]; const v = S.out[j + 1]; const c2 = S.out[j + 2];
    const o = S.at[j];
    // marks (and a candrabindu) just before the joined letter belong to the syllable before it
    let r0 = o; while (r0 > 0 && /[॒॑᳚ँ]/.test(s[r0 - 1])) r0--;
    const marks = [...s.slice(r0, o)].filter((x) => MARK.test(x)).join('');
    const space = b.end === 'word' && s[S.at[j + 2] - 1] !== ' ' ? SEP : '';
    if (b.kind === 'h' && /[शषस]/.test(c) && v === '्' && c2 === c) {
      // नम॑श्श॒र्वाय: delete श् (with the marks before it), write ः + marks + space
      const end = S.at[j + 1] + 1;
      edits.push([r0, end - r0, `ः${marks}${space}`]);
    } else if (b.kind === 'h' && (c === 'ᳵ' || c === 'ᳶ')) {
      edits.push([r0, o + 1 - r0, `ः${marks}`]);
    } else if (b.kind === 'm' && v === '्' && ((NASALS.test(c) && STOPS.test(c2 || '')) || (/[यवल]/.test(c) && c2 === c))) {
      // चि॒त्तञ्च॑ / तव्ँवो / सँ॒व्वृ: delete the nasal + virama (+ a candrabindu after either), write ं + marks + space
      let end = S.at[j + 1] + 1;
      if (s[end] === 'ँ') end++;
      const k2 = S.at[j + 2];
      const tailCandra = /[यवल]/.test(c) && s[k2 + 1] === 'ँ';
      edits.push([r0, end - r0, `ं${marks}${space}`]);
      if (tailCandra) edits.push([k2 + 1, 1, '']);
    }
  }
  return { edits, dist, len: S.out.length };
}

export function applyEdits(s, edits) {
  let out = s;
  for (const [at, del, ins] of [...edits].sort((x, y) => y[0] - x[0])) out = out.slice(0, at) + ins + out.slice(at + del);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(OUT, { recursive: true });
  const tot = { units: 0, edits: 0, poor: [] };
  for (let k = 1; k <= 7; k++) {
    const text = JSON.parse(fs.readFileSync(path.join(DATA, 'ts', `t${k}.json`), 'utf8'));
    const byP = {};
    for (const u of padaUnits(k)) (byP[u.p] ||= []).push(u);
    const out = {};
    for (const [p, vs] of Object.entries(text)) {
      const pu = byP[p] || [];
      if (pu.length !== vs.length) console.warn(`TS ${k}.${p}: ${vs.length} saṃhitā units, ${pu.length} in the padapāṭha`);
      vs.forEach((v, i) => {
        const pd = pu[i]; if (!pd) return;
        const s = v[1].join('\n');
        const { edits, dist, len } = unitEdits(s, pd.segs);
        tot.units++;
        if (dist / Math.max(len, 1) > 0.4) tot.poor.push(`${k}.${p}.${v[0]} (${Math.round(100 * dist / len)}%)`);
        // per line: [line, at, delete, insert]
        const starts = []; let a = 0; for (const l of v[1]) { starts.push(a); a += l.length + 1; }
        const per = [];
        for (const [at, del, ins] of edits) {
          let li = starts.length - 1; while (li > 0 && starts[li] > at) li--;
          if (at + del > starts[li] + v[1][li].length) continue;   // never across a line break
          per.push([li, at - starts[li], del, ins]);
        }
        if (per.length) { (out[p] ||= {})[v[0]] = per; tot.edits += per.length; }
      });
    }
    fs.writeFileSync(path.join(OUT, `s${k}.json`), JSON.stringify(out));
  }
  console.log(`ts-sep: ${tot.units} pañcāśats, ${tot.edits} edits; poorly aligned: ${tot.poor.length}${tot.poor.length ? ` (${tot.poor.slice(0, 8).join(', ')}…)` : ''}`);
}
