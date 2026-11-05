// Ṛgveda words you can tap: every word of the padapāṭha with its lemma and grammar.
// Data: web/data/rv/w<maṇḍala>.json + wl.json, built by scripts/build-rv-words.mjs from the VedaWeb annotation of the
// University of Zurich (CC BY 4.0, Zenodo 10.5281/zenodo.21527084). No DOM, so the tests can run it.
//   w<m>.json : { "<sūkta>": { "<verse>": [[word IAST ("-" marks a compound break), lemma index, grammar index], …] } }
//   wl.json   : { lemmas: [[stem IAST, kind (n noun · v verb root · i indeclinable · p pronoun), Grassmann id]], grams: [English grammar] }
import { iastToDeva } from './translit.js';

export const CAPELLER_CREDIT = {
  text: 'English: Cappeller, A Sanskrit-English Dictionary (1891), from the Cologne Digital Sanskrit Lexicon (© 2014 The Sanskrit Library and Thomas Malten, CC BY-NC-SA 3.0).',
  href: 'https://www.sanskrit-lexicon.uni-koeln.de/',
};
export const CREDIT = {
  text: 'Word forms, lemmas and grammar: VedaWeb, Zurich annotation of the Ṛgveda (Reinöhl, Casaretto, Coenen, Fischer, Halfmann, Korobzow, Kölligan 2024), CC BY 4.0.',
  href: 'https://doi.org/10.5281/zenodo.21527084',
};
export const KIND = { n: 'noun / adjective', v: 'verb root', i: 'indeclinable', p: 'pronoun' };

/** The dictionary headwords a lemma could be written as, best first (stems are headwords in the Kaustubha: अग्नि, होतृ). */
const IRREGULAR = { ayam: 'idam', gav: 'go', 'gō': 'go', tvam: 'tvad', ahar: 'ahan', pitar: 'pitṛ', mātar: 'mātṛ' };
export function headCandidates(stem, { sToS = true } = {}) {
  // the annotation writes śa as "sa" ("visva" for viśva) and marks homonyms with a superscript ("janⁱ")
  const s = stem.replace(/^√/, '').replace(/-$/, '').replace(/[ⁱ¹²³⁴⁵⁶⁷⁸⁹⁰]+$/u, '');
  const forms = new Set([IRREGULAR[s] || s, s]);
  const out = [];
  const add = (iast) => { const d = iastToDeva(iast); if (d && !out.includes(d)) out.push(d); };
  for (const f of forms) {
    add(f);
    if (/ar$/.test(f)) add(f.slice(0, -2) + 'ṛ');                     // hotar → hotṛ
    if (/(?:ant|at)$/.test(f)) { add(f.replace(/ant$/, 'at')); add(f.replace(/at$/, 'ant')); }
    if (/an$/.test(f)) add(f.slice(0, -2) + 'at');                    // maghavan → maghavat
    if (/d$/.test(f)) add(f.slice(0, -1) + 't');                      // cid → cit
    if (/[kgcjṭḍtdpbmnyrlvśṣsh]$/.test(f)) add(f + 'a');              // a bare consonant stem: also with its a
    if (/ā$/.test(f)) add(f.slice(0, -1) + 'a');
    if (/i$/.test(f)) add(f.slice(0, -1) + 'ī');
    if (/ī$/.test(f)) add(f.slice(0, -1) + 'i');
    if (/ū$/.test(f)) add(f.slice(0, -1) + 'u');
    // s may stand for ś: try every way of writing it (up to four s), unless the spelling is known to be right (sToS false)
    const at = sToS ? [...f].map((c, i) => (c === 's' ? i : -1)).filter((i) => i >= 0).slice(0, 4) : [];
    for (let mask = 1; mask < 1 << at.length; mask++) {
      const g = [...f]; at.forEach((p, k) => { if (mask & (1 << k)) g[p] = 'ś'; });
      add(g.join(''));
      if (/ar$/.test(f)) add(g.join('').slice(0, -2) + 'ṛ');
    }
  }
  return out;
}

/** Key of the Grassmann dictionary entry: the first id's word, without its running number ("agni_79" → "agni", SLP1). */
export const grassmannKey = (id) => (id || '').split(';')[0].replace(/_\d+$/, '');
/** Link into Grassmann's Wörterbuch zum Rig-Veda at Cologne's Sanskrit Lexicon (the dictionary's own entry text is German). */
export const grassmannHref = (id) => `https://www.sanskrit-lexicon.uni-koeln.de/scans/csl-apidev/basicadjust.php?dict=GRA&key=${encodeURIComponent(grassmannKey(id))}&input=slp1`;

/**
 * loader: { json(path) → Promise<data> }. Files are fetched once per maṇḍala; a failed fetch (offline, not stored yet)
 * resolves to null so the reader falls back to the plain padapāṭha.
 */
export function createRvWords(loader) {
  const pending = new Map(); const done = new Map();
  const get = (path) => {
    if (!pending.has(path)) pending.set(path, loader.json(path).then((x) => { done.set(path, x); return x; }).catch(() => { pending.delete(path); return null; }));
    return pending.get(path);
  };
  return {
    /** Load the lemma table and a maṇḍala. True when both are there. */
    async ensure(m) {
      const [l, w] = await Promise.all([get('data/rv/wl.json'), get(`data/rv/w${m}.json`)]);
      return !!(l && w);
    },
    /** [[word IAST, lemma index, grammar index], …] of a verse, or null. Only after ensure(m). */
    words: (m, s, v) => done.get(`data/rv/w${m}.json`)?.[s]?.[v] || null,
    lemma(i) { const e = done.get('data/rv/wl.json')?.lemmas[i]; return e ? { stem: e[0], kind: e[1], gid: e[2] } : null; },
    gram: (i) => done.get('data/rv/wl.json')?.grams[i] || '',
    /**
     * The dictionaries of a lemma, from scripts/build-rv-dict.mjs: { kosha: Kaustubha headword or null, capeller: first English
     * sense or null }. Loaded on the first tap; either file missing (offline, not stored yet) gives null for it.
     */
    async dict(i) {
      const [k, c] = await Promise.all([get('data/rv/wk.json'), get('data/cdsl/rv/capeller.json')]);
      return { kosha: k?.k?.[i] || null, capeller: c?.g?.[i] || null };
    },
  };
}
