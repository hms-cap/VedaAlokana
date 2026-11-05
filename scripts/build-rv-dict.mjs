#!/usr/bin/env node
// Dictionary links for the Ṛgveda word lemmas (web/data/rv/wl.json, from build-rv-words.mjs):
//   node scripts/build-rv-dict.mjs <capeller-sanskrit-english.babylon> [web/data]
//
// Output
//   rv/wk.json                { v, k: { "<lemma index>": "<Kaustubha headword>" } }   which Śabdārtha Kaustubha entry a lemma opens
//   cdsl/rv/capeller.json     { v, g: { "<lemma index>": "<first sense, English>" } }  Cappeller's Sanskrit-English Dictionary (1891)
//
// Capeller: the indic-dict StarDict text (indic-dict/stardict-sanskrit, sa-head/en-entries/capeller-sanskrit-english), from the
// Cologne Digital Sanskrit Lexicon's XML edition (© 2014 The Sanskrit Library and Thomas Malten, CC BY-NC-SA 3.0). The input is
// not kept in the repo; the extract is, under web/data/cdsl/ with its licence.
//
// Matching is exact on spelling, never phonetic: a lemma is tried as the annotation writes it, as the Grassmann key spells it
// (ś as ś), with the stem changes of headCandidates, a few pronoun and particle forms, the Kaustubha's own spellings (doubled
// consonants as in पुत्त्र, a final visarga as in बृहस्पतिः, ḍ for ḷ), and for verb roots the dhātupāṭha forms with their markers
// (डुकृञ् for kṛ).
import fs from 'node:fs';
import path from 'node:path';
import { headCandidates } from '../web/rvwords.js';
import { devaToIast, iastToDeva } from '../web/translit.js';

const SLP = 'aAiIuUfFxXeEoOMHkKgGNcCjJYwWqQRtTdDnpPbBmyrlvSzsh';
const IAST = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ḹ', 'e', 'ai', 'o', 'au', 'ṃ', 'ḥ', 'k', 'kh', 'g', 'gh', 'ṅ', 'c', 'ch', 'j', 'jh', 'ñ', 'ṭ', 'ṭh', 'ḍ', 'ḍh', 'ṇ', 't', 'th', 'd', 'dh', 'n', 'p', 'ph', 'b', 'bh', 'm', 'y', 'r', 'l', 'v', 'ś', 'ṣ', 's', 'h'];
const slpToIast = (k) => [...k].map((c) => { const i = SLP.indexOf(c); return i < 0 ? '' : IAST[i]; }).join('');
// Grassmann ids: "agni_79", "sa_9064;ta_3606", "pra_5833.1", "asat_1312, Asat"
const gKeys = (id) => (id || '').split(/[;,]\s*/).map((x) => x.replace(/_[\d.]+$/, '').trim()).filter((x) => /^[A-Za-z]+$/.test(x));

// pronouns and particles the Kaustubha lists under another form
const ALIAS = { tvam: ['युष्मद्'], yuvam: ['युष्मद्'], aham: ['अस्मद्'], vayam: ['अस्मद्'], sya: ['त्यद्'], tya: ['त्यद्'], asau: ['अदस्'], ena: ['एतद्'], acha: ['अच्छ'], adha: ['अथ'], sa: ['तद्'], ta: ['तद्'] };

// spelling folds, applied to both sides (Devanagari): ttr → tr, rtt → rt, ddh → dh, ḷ → ḍ, a final visarga dropped
const fold = (d) => d.replace(/ळ्ह/g, 'ढ').replace(/ळ/g, 'ड')
  .replace(/([क-ह])्\1्(?=[रयलव])/g, '$1्')
  .replace(/(?<=र्)([क-ह])्\1(?=[्ािीुूृेैोौ]|$)/g, '$1')
  .replace(/([कगचजटडतदपब])्(?=[खघछझठढथधफभ])/g, '')
  .replace(/(?:ः|र्)$/, '');   // a final visarga or r: पुनः for punar

// The spellings to look up, best first: the Grassmann key (SLP1 tells ś from s) before the annotation's lemma; the guesses of ś for
// s only when there is no Grassmann key (svapati 'own lord' is not śvapati 'lord of dogs').
function candsOf(stem, gid) {
  const gs = gKeys(gid);
  const out = [...gs.flatMap((g) => headCandidates(slpToIast(g), { sToS: false })), ...headCandidates(stem, { sToS: !gs.length })];
  return [...new Set(out)];
}

export function buildRvDict(capFile, dataDir = 'web/data') {
  const wl = JSON.parse(fs.readFileSync(path.join(dataDir, 'rv', 'wl.json'), 'utf8'));
  // ---- Śabdārtha Kaustubha headwords, their folds, and the verb roots under their dhātupāṭha forms ----
  const heads = new Set(fs.readFileSync(path.join(dataDir, 'kosha', 'keys.tsv'), 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')[1]));
  const folded = new Map();
  for (const h of heads) { const f = fold(h); if (!folded.has(f)) folded.set(f, h); }
  const roots = new Map();   // bare root (Devanagari, with and without the final virāma) → [headword, senses]
  const man = JSON.parse(fs.readFileSync(path.join(dataDir, 'kosha', 'shards.json'), 'utf8'));
  for (const [, file] of man.shards) {
    for (const e of JSON.parse(fs.readFileSync(path.join(dataDir, 'kosha', `${file}.json`), 'utf8'))) {
      // a root: marked धातुः, or (most entries) given with its dhātupāṭha meaning in the locative ("गतौ", "प्रापणे") and senses
      // without a part of speech
      const isRoot = e[2].some((s) => /^धातु/.test(s[0])) || (/(?:[ेौ]|योः|ेषु)$/.test(e[1][0] || '') && e[2].some((s) => !s[0]));
      if (e[0].includes('+') || !isRoot) continue;
      const r0 = e[0].replace(/^(डु|टु|ञि)/, '').replace(/(ञ्|ङ्|ण्|ष्|इर्|लृ|ॢ|ँ)$/, '')
        .replace(/^ण/, 'न').replace(/^ष्ठ/, 'स्थ').replace(/^ष्ट/, 'स्त').replace(/^ष(?=[^्])/, 'स');
      // the root as written, and without a final marker vowel (क्रमु, जनी, मदी: the u or ī is a marker; हु, पा keep theirs)
      const forms = [[r0, 2]];
      if (/[क-ह][ुीि]$/.test(r0)) forms.push([r0.slice(0, -1), 1]);
      for (const [r, pri] of forms) {
        const p = pri + (e[0] === r ? 1 : 0);   // written without markers ranks first (अस, to be, before असु, to throw)
        for (const k of new Set([r, r.replace(/्$/, ''), /[क-ह]$/.test(r) ? r + '्' : r])) {
          const prev = roots.get(k);
          if (!prev || p > prev[2] || (p === prev[2] && e[2].length > prev[1])) roots.set(k, [e[0], e[2].length, p]);
        }
      }
    }
  }
  const kOf = ([stem, kind, gid]) => {
    const bare = stem.replace(/^√/, '').replace(/-$/, '').replace(/[ⁱ¹²³⁴⁵⁶⁷⁸⁹⁰()]+/gu, '').replace(/[ⁱ]/gu, '');
    const cands = [...(ALIAS[bare] || []), ...candsOf(stem, gid)];
    if (kind === 'v') {
      // a root: its dhātupāṭha entry (कृ is not a headword, डुकृञ् is); a noun of the same spelling is not the root, and a root's
      // vowel is not lengthened or shortened (hū 'call' is not hu 'offer')
      const gs = gKeys(gid);
      const rc = [...new Set([...gs.map((g) => iastToDeva(slpToIast(g))), ...(gs.length ? [] : [iastToDeva(bare)])])];
      for (const c of rc) { const r = roots.get(c) || roots.get(c + '्') || roots.get(c.replace(/्$/, '')); if (r) return r[0]; }
      return null;
    }
    for (const c of cands) if (heads.has(c)) return c;
    for (const c of cands) { const h = folded.get(fold(c)); if (h) return h; }
    return null;
  };
  // ---- Capeller ----
  const cap = new Map();   // headword → [entry text, …]
  for (const block of fs.readFileSync(capFile, 'utf8').split(/\n\n+/)) {
    const [h, ...rest] = block.split('\n');
    if (h.startsWith('#') || !rest.length) continue;
    const body = rest.join(' ');
    for (const k of h.split('|')) { const key = k.trim(); if (!cap.has(key)) cap.set(key, []); cap.get(key).push(body); }
  }
  const clean = (s) => s.replace(/<BR>\s*<a[^]*$/i, '').replace(/\s*\[\d+\]\s*Correction[^]*$/i, '').replace(/\[\]/g, '')
    .replace(/\{\{([^;|}]*);[^}]*\}\}/g, '$1').replace(/^[^]*\}\}[/#}]*\s*/, '')   // correction notes: {{new; old->new; …}}
    .replace(/<a [^>]*>[^<]*<\/a>/gi, '').replace(/<br>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/🞄/g, '').replace(/\s+/g, ' ').trim();
  const DEVA = /[ऀ-ॿ]/;
  const KINDS = {
    v: (t) => / pp\. /.test(t) || DEVA.test(t.replace(/^\d+ \S+ ?/, '').slice(0, 2)) || !/^(?:\d+ )?\S+ \(?(?:m|f|n|a|adv|ind|indecl|encl|pron|conj|interj|prep|num)\./.test(t),
    i: (t) => /^(?:\d+ )?\S+ \(?(?:adv|indecl|encl|conj|interj|prep|part)\b/.test(t) || /\((?:indecl|encl)\.\)/.test(t.slice(0, 40)),
    p: (t) => /\bpron\b/.test(t.slice(0, 40)),
    n: (t) => /^(?:\d+ )?\S+ (?:\([^)]*\) )?(?:m|f|n|a|mfn)\./.test(t),
  };
  // the first sense: drop the homonym number and the headword (and for a root its verb forms: the meaning starts after the last
  // Devanagari of the first clause), stop at the prefixed verbs ("— अति …") and keep it short, ending at a semicolon where one falls
  const gloss = (t, verb) => {
    let s = t.replace(/^\d+ /, '').replace(/^\S+\s+/, '');
    if (verb) {
      // the verb forms before the meaning: Devanagari words, "pp.", "P.", "M.", "&", "older", "etc.", "(q.v.)" and other
      // parentheses, commas and semicolons
      const SKIP = /^(?:pp\.|[PMAC]\.|&|older|etc\.|or|also|and|[,;])$/;
      let i = 0;
      while (i < s.length) {
        const rest = s.slice(i);
        const sp = rest.match(/^\s+/); if (sp) { i += sp[0].length; continue; }
        if (rest[0] === '(') { let d = 0; let j = 0; for (; j < rest.length; j++) { if (rest[j] === '(') d++; else if (rest[j] === ')' && --d === 0) break; } i += j + 1; continue; }
        const tok = rest.match(/^[^\s(]+/)[0];
        if (DEVA.test(tok) || SKIP.test(tok.replace(/[,;]$/, "")) || SKIP.test(tok) || /^[,;˚॑]+$/.test(tok)) { i += tok.length; continue; }
        break;
      }
      s = s.slice(i);
    }
    s = s.split(/\s+—\s*(?=[ऀ-ॿ])/)[0].replace(/\s+[CDIP]\.\s+[ऀ-ॿ][^]*$/, '').trim();
    if (s.length > 220) { const cut = s.lastIndexOf(';', 220); s = cut > 60 ? s.slice(0, cut) : `${s.slice(0, 217).replace(/\s+\S*$/, '')} …`; }
    return s.replace(/^[\s,;.]+/, '').replace(/[;,]\s*$/, '');
  };
  const capOf = ([stem, kind, gid]) => {
    const bare = stem.replace(/^√/, '').replace(/-$/, '');
    const cands = candsOf(stem, gid);
    if (/^(?:tvam|aham|vayam|yuvam)$/.test(bare)) return null;   // listed under the stem; the grammar line says enough
    for (const c of cands) {
      const es = cap.get(c);
      if (!es) continue;
      const ts = es.map(clean);
      const want = KINDS[kind] || KINDS.n;
      const verbish = (t) => / pp\. /.test(t) || DEVA.test(t.replace(/^\d+ \S+ ?/, '').slice(0, 2));
      const pick = ts.find(want) || (kind === 'v' ? null : ts.find((t) => !verbish(t)) || null);
      if (pick) { const g = gloss(pick, kind === 'v'); if (g) return g; }
    }
    return null;
  };
  const k = {}; const g = {};
  let kn = 0; let gn = 0;
  wl.lemmas.forEach((l, i) => {
    const h = kOf(l); if (h) { k[i] = h; kn++; }
    const c = capOf(l); if (c) { g[i] = c; gn++; }
  });
  fs.writeFileSync(path.join(dataDir, 'rv', 'wk.json'), JSON.stringify({ v: 1, k }));
  fs.mkdirSync(path.join(dataDir, 'cdsl', 'rv'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'cdsl', 'rv', 'capeller.json'), JSON.stringify({ v: 1, g }));
  console.log(`rv dictionary links: ${kn} of ${wl.lemmas.length} lemmas open a Kaustubha entry, ${gn} have a Capeller sense`);
  return { k, g };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.argv[2]) { console.error('usage: node scripts/build-rv-dict.mjs <capeller-sanskrit-english.babylon> [web/data]'); process.exit(1); }
  buildRvDict(process.argv[2], process.argv[3] || 'web/data');
}
export { fold, slpToIast, devaToIast, iastToDeva };
