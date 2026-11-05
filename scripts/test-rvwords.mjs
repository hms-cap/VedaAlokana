// Ṛgveda tap-a-word data (web/data/rv/w*.json, wl.json): every verse has words, every index points at a lemma and a grammar string,
// the words match the padapāṭha in count, and lemmas find their dictionary headwords. Usage: node scripts/test-rvwords.mjs
import { readFileSync, existsSync } from 'node:fs';
import { headCandidates, grassmannKey, grassmannHref } from '../web/rvwords.js';
import { gramSa } from '../web/gramsa.js';
import { padaDeva } from '../web/pada.js';
import { iastToDeva } from '../web/translit.js';

const D = new URL('../web/data/', import.meta.url).pathname;
const rd = (f) => JSON.parse(readFileSync(D + f, 'utf8'));
let bad = 0; const fail = (m) => { bad++; if (bad < 20) console.log('FAIL', m); };
if (!existsSync(D + 'rv/wl.json')) { console.log('FAIL no rv/wl.json'); process.exit(1); }
const wl = rd('rv/wl.json');
const heads = new Set(readFileSync(D + 'kosha/keys.tsv', 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')[1]));
let verses = 0; let words = 0; let hitTok = 0; let mismatch = 0;
const hit = wl.lemmas.map(([stem]) => headCandidates(stem).some((c) => heads.has(c)));
for (let m = 1; m <= 10; m++) {
  const w = rd(`rv/w${m}.json`); const t = rd(`rv/t${m}.json`);
  for (const [s, vs] of Object.entries(t)) {
    for (const v of vs) {
      verses++;
      const ws = w[s]?.[v[0]];
      if (!ws?.length) { fail(`${m}.${s}.${v[0]} has no words`); continue; }
      for (const [form, li, gi] of ws) {
        words++; if (hit[li]) hitTok++;
        if (!form || !wl.lemmas[li] || gi < 0 || gi >= wl.grams.length && gi !== -1) fail(`${m}.${s}.${v[0]} bad token ${JSON.stringify([form, li, gi])}`);
      }
      // the padapāṭha of the text and the aligned words differ only where the annotation fixed a defect
      if (v[3]?.length && Math.abs(padaDeva(v[3]).length - ws.length) > 3) mismatch++;
    }
  }
}
const share = hitTok / words;
console.log(`${verses} verses, ${words} words, ${wl.lemmas.length} lemmas (${(share * 100).toFixed(0)}% of the words find a Kaustubha headword; verb roots mostly do not, the book lists them with markers), ${mismatch} verses with a different word count`);
if (verses < 10500) fail('fewer than 10500 verses');
if (share < 0.65) fail('under 65% of the words find a headword');
if (mismatch > verses * 0.02) fail('too many verses differ from the padapāṭha in word count');
if (grassmannKey('sa_9064;ta_3606') !== 'sa' || grassmannKey('agni_79') !== 'agni') fail('grassmannKey');
if (!grassmannHref('fzi_2253').includes('key=fzi')) fail('grassmannHref');
if (iastToDeva('puraḥ-hitam'.replace(/-/g, 'ऽ')) === '') fail('iastToDeva');
// dictionary links (scripts/build-rv-dict.mjs): every Kaustubha link is a headword, every index a lemma, and with Capeller nearly
// every word has a meaning
const wk = rd('rv/wk.json').k; const cap = rd('cdsl/rv/capeller.json').g;
for (const [i, h] of Object.entries(wk)) { if (!heads.has(h)) fail(`wk ${i}: ${h} is not a headword`); if (!wl.lemmas[i]) fail(`wk ${i}: no lemma`); }
for (const [i, g] of Object.entries(cap)) { if (!wl.lemmas[i]) fail(`capeller ${i}: no lemma`); if (!g || g.length > 240 || /Correction|https?:|<[a-z]/i.test(g)) fail(`capeller ${i}: ${g}`); }
let kTok = 0; let anyTok = 0; let all = 0;
for (let m = 1; m <= 10; m++) for (const vs of Object.values(rd(`rv/w${m}.json`))) for (const ws of Object.values(vs)) for (const [, li] of ws) { all++; if (wk[li]) kTok++; if (wk[li] || cap[li]) anyTok++; }
console.log(`Kaustubha links ${(100 * kTok / all).toFixed(1)}% of words, with Capeller ${(100 * anyTok / all).toFixed(1)}%`);
if (kTok / all < 0.74) fail('Kaustubha links under 74% of words');
if (anyTok / all < 0.95) fail('a dictionary meaning for under 95% of words');
const L = (s) => wl.lemmas.findIndex((l) => l[0] === s);
if (wk[L('√kṛ')] !== 'डुकृञ्') fail('√kṛ should open डुकृञ्');
if (wk[L('tvam')] !== 'युष्मद्') fail('tvam should open युष्मद्');
if (wk[L('putra')] !== 'पुत्त्र') fail('putra should open पुत्त्र');
if (wk[L('√hū')] === 'हु') fail('√hū must not open हु');
if (/dogs/.test(cap[L('svapati')] || '')) fail('svapati is not śvapati');
if (!/^m\. fire/.test(cap[L('agni')] || '')) fail(`agni: ${cap[L('agni')]}`);
if (!/^make, do/.test(cap[L('√kṛ')] || '')) fail(`√kṛ: ${cap[L('√kṛ')]}`);
// the grammar in Sanskrit terms: every English string has one, built only from known words
for (const g of wl.grams) if (g && !gramSa(g)) fail(`no Sanskrit grammar for "${g}"`);
const sa = (g, want) => { if (gramSa(g) !== want) fail(`gramSa("${g}") = ${gramSa(g)}, wanted ${want}`); };
sa('indicative present middle 1st person singular', 'लट् · आत्मनेपदम् · उत्तमपुरुषः · एकवचनम्');
sa('present active participle nominative singular masculine local particle', 'शतृ · प्रथमा · एकवचनम् · पुंलिङ्गम् · उपसर्गः');
sa('accusative or dative or genitive plural', 'द्वितीया / चतुर्थी / षष्ठी · बहुवचनम्');
sa('optative present active 3rd person singular', 'विधिलिङ् · परस्मैपदम् · प्रथमपुरुषः · एकवचनम्');
console.log(bad ? `${bad} failure(s)` : 'ok');
process.exit(bad ? 1 : 0);
