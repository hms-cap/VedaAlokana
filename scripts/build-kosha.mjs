#!/usr/bin/env node
// Builds the Śabdārtha Kaustubha (Sanskrit → Kannada dictionary) data in web/data/kosha/.
//   node scripts/build-kosha.mjs <shabdArtha_kaustubha.babylon> [web/data]
//
// Source: indic-dict/stardict-sanskrit, sa-head/other-indic-entries/shabdArtha_kaustubha/shabdArtha_kaustubha.babylon
// (Ambuda's copy in ambuda-org/data is the same text, but its build script rewrote the Devanagari labels and
// headwords into SLP1, so this reads the original). The file is not kept in the repo: it is 35 MB.
// Licence: not stated by the source. See docs/DATA_SOURCES.md before publishing this data.
//
// Source format: blocks of two lines separated by a blank line,
//   <headword>[|<variant>…]
//   <headword><br><br><b>पदविभागः - </b>…<br><b>कन्नडार्थः - </b>…<br><br><headword><br><br>…  (one block per sense)
//
// Output:
//   kosha/shards.json   { v, count, shards: [[first headword, file, headwords]], letters: [[letter, headwords, first headword]] }  (sorted: a headword is in the last shard whose first headword is not after it)
//   kosha/<file>.json   [[headword, [variants], [sense, …]], …] sorted by headword
//                       sense = [पदविभागः, कन्नडार्थः, निष्पत्तिः, व्युत्पत्तिः, प्रयोगाः, उल्लेखाः, विस्तारः] (trailing empties dropped)
//   kosha/wotd.json     { v, words: [[headword, पदविभागः, कन्नडार्थः, व्युत्पत्तिः, प्रयोगाः, उल्लेखाः]] } for the word-of-the-day card:
//                       about 1,100 well-documented words in a fixed shuffled order (see pickWords)
//   kosha/keys.tsv      "<looseKey>\t<headword>" for every headword and variant, sorted by key
// Corrections: scripts/kosha-errata.tsv (reviewed, word by word) and cleanSa (mechanical encoding slips) are applied to the text.
// Shards are runs of the sorted headwords, about 700 KB each.
import fs from 'node:fs';
import path from 'node:path';
import { looseKey } from '../web/search-key.js';

export const LABELS = ['पदविभागः', 'कन्नडार्थः', 'निष्पत्तिः', 'व्युत्पत्तिः', 'प्रयोगाः', 'उल्लेखाः', 'विस्तारः'];
const SHARD_CHARS = 250_000; // characters of JSON per shard (about 700 KB: Devanagari and Kannada are 3 bytes each)

/** Parses the babylon text → Map(headword → { h, alts: Set, senses }) in source order. */
export function parseBabylon(text) {
  const recs = new Map();
  let buf = [];
  const flush = () => {
    if (buf.length === 2) {
      const [keyLine, body] = buf;
      const [head, ...rest] = keyLine.split('|').map((s) => s.trim()).filter(Boolean);
      if (head) {
        if (!recs.has(head)) recs.set(head, { h: head, alts: new Set(), senses: [] });
        const r = recs.get(head);
        for (const a of rest) if (a !== head) r.alts.add(a);
        for (const chunk of body.split('<br><br>')) {
          if (!chunk.includes('<b>')) continue; // the headword repeated before each sense
          const sense = Array(LABELS.length).fill('');
          const parts = chunk.split(/<b>([^<]+?) - <\/b>/);
          for (let i = 1; i < parts.length; i += 2) {
            const k = LABELS.indexOf(parts[i].trim());
            if (k < 0) continue;
            const v = parts[i + 1].replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim();
            sense[k] = sense[k] ? `${sense[k]} ${v}` : v;
          }
          while (sense.length && !sense.at(-1)) sense.pop();
          if (sense.length) r.senses.push(sense);
        }
      }
    }
    buf = [];
  };
  for (const raw of text.split('\n')) {
    if (raw.startsWith('#')) continue;
    const line = raw.trim();
    if (line) buf.push(line); else flush();
  }
  flush();
  return recs;
}

/**
 * Words for the word-of-the-day card: a single word of 3-9 letters whose first sense has a Kannada meaning, a derivation and a
 * quotation with its source, and that has at most four senses. A seeded shuffle fixes the order, so the same data always gives
 * the same list; the card walks along it one word a day.
 */
export function pickWords(recs, count = 1100) {
  const ok = [];
  for (const r of recs) {
    const n = [...r.h].filter((c) => /[\u0904-\u0939]/.test(c)).length;
    const s = r.senses[0];
    if (/[\s()+]/.test(r.h) || n < 3 || n > 9 || r.senses.length > 4) continue;
    if (!s[1] || !s[3] || !s[4] || !s[5] || s[1].length > 60 || s[4].length > 140) continue;
    ok.push([r.h, s[0] || '', s[1], s[3], s[4], s[5]]);
  }
  let a = 0x1927; // mulberry32
  const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = ok.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ok[i], ok[j]] = [ok[j], ok[i]]; }
  return ok.slice(0, count);
}

/** The letters the headwords start with, in order: [[letter, number of headwords, first headword]] (for the dictionary's letter grid). */
export function lettersOf(recs) {
  const out = [];
  for (const r of recs) {
    const ch = [...r.h][0];
    if (!/[\u0904-\u0939]/.test(ch)) continue;
    if (out.at(-1)?.[0] === ch) out.at(-1)[1]++; else out.push([ch, 1, r.h]);
  }
  return out;
}

/**
 * Mechanical clean-ups of Sanskrit text in the source (not the Kannada meanings), from encoding slips in the digital text:
 * two vowel signs in a row (keep the last), a virama before a vowel sign, the Latin letter s for the avagraha, zero-width joiners
 * standing where a space belongs, and the digit zero used as the abbreviation sign (माघ० → माघ॰).
 */
export function cleanSa(s) {
  if (!s) return s;
  return s
    .replace(/[\u093E-\u094C]+(?=[\u093E-\u094C])/g, '')
    .replace(/\u094D(?=[\u093E-\u094C])/g, '')
    .replace(/([\u0900-\u097F])[sS](?=[\u0900-\u097F])/g, '$1\u093D')
    .replace(/(?<!\u094D)[ \t]*[\u200C\u200D][ \t]*/g, ' ')
    .replace(/([\u0905-\u0939\u093E-\u094C\u0902\u0903])\u0966(?![\u0966-\u096F])/g, '$1\u0970')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** Reads scripts/kosha-errata.tsv → { head: Map(wrong → right), text: [[wrong, right]] }. */
export function readErrata(file = new URL('./kosha-errata.tsv', import.meta.url)) {
  const head = new Map(); const text = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [kind, wrong, right] = line.split('\t');
    if (kind === 'head') head.set(wrong, right); else if (kind === 'text') text.push([wrong, right]);
  }
  return { head, text };
}

/** Applies the errata and the clean-ups to parsed records, merging records whose corrected headwords meet. */
export function correctRecs(recs, errata) {
  const out = new Map();
  const fixText = (v, k) => {
    if (!v) return v;
    for (const [a, b] of errata.text) v = v.split(a).join(b);
    return k === 1 ? v : cleanSa(v); // field 1 is the Kannada meaning: left as it is
  };
  const fixHead = (h) => cleanSa(errata.head.get(h) ?? h);
  for (const r of recs.values()) {
    const h = fixHead(r.h);
    if (!out.has(h)) out.set(h, { h, alts: new Set(), old: new Set(), senses: [] });
    const o = out.get(h);
    if (h !== r.h) o.old.add(r.h); // the source spelling stays findable in search, but is not shown
    for (const a of r.alts) { const f = fixHead(a); if (f !== h) o.alts.add(f); if (a !== f) o.old.add(a); }
    for (const s of r.senses) o.senses.push(s.map(fixText));
  }
  return out;
}

export function buildKosha(babylonPath, dataDir = 'web/data') {
  const raw = parseBabylon(fs.readFileSync(babylonPath, 'utf8'));
  const errata = readErrata();
  // the word-of-the-day list is picked from the source as it is, so corrections never reshuffle it; its text is then corrected
  const wotd = pickWords([...raw.values()].filter((r) => r.senses.length).sort((a, b) => (a.h < b.h ? -1 : a.h > b.h ? 1 : 0))).map(([h, ...f]) => {
    const fh = cleanSa(errata.head.get(h) ?? h);
    const fixed = f.map((v, i) => { for (const [a, b] of errata.text) v = v.split(a).join(b); return i === 1 ? v : cleanSa(v); });
    return [fh, ...fixed];
  });
  const recs = [...correctRecs(raw, errata).values()].filter((r) => r.senses.length);
  recs.sort((a, b) => (a.h < b.h ? -1 : a.h > b.h ? 1 : 0));

  // shards: runs of the sorted headwords of about SHARD_CHARS characters each, so every file is a similar size
  const out = path.join(dataDir, 'kosha');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const manifest = [];
  let bytes = 0;
  let cur = []; let n = 0;
  const write = () => {
    if (!cur.length) return;
    const file = `k${String(manifest.length).padStart(3, '0')}`;
    const json = JSON.stringify(cur);
    fs.writeFileSync(path.join(out, file + '.json'), json);
    bytes += Buffer.byteLength(json);
    manifest.push([cur[0][0], file, cur.length]);
    cur = []; n = 0;
  };
  for (const r of recs) {
    const e = [r.h, [...r.alts], r.senses];
    const len = JSON.stringify(e).length;
    if (n + len > SHARD_CHARS) write();
    cur.push(e); n += len;
  }
  write();

  const keys = new Set();
  for (const r of recs) for (const w of [r.h, ...r.alts, ...(r.old || [])]) { const k = looseKey(w); if (k) keys.add(`${k}\t${r.h}`); }
  const lines = [...keys].sort();
  fs.writeFileSync(path.join(out, 'keys.tsv'), lines.join('\n'));
  fs.writeFileSync(path.join(out, 'wotd.json'), JSON.stringify({ v: 1, words: wotd }));
  fs.writeFileSync(path.join(out, 'shards.json'), JSON.stringify({ v: 1, count: recs.length, shards: manifest, letters: lettersOf(recs) }));
  console.log(`kosha: ${recs.length} headwords, ${recs.reduce((n, r) => n + r.senses.length, 0)} senses, ${manifest.length} shards (${(bytes / 1e6).toFixed(1)} MB), ${lines.length} keys`);
  return { count: recs.length, shards: manifest.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.argv[2]) { console.error('usage: node scripts/build-kosha.mjs <shabdArtha_kaustubha.babylon> [web/data]'); process.exit(1); }
  buildKosha(process.argv[2], process.argv[3]);
}
