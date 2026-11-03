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
//   kosha/shards.json   { v, count, shards: [[first headword, file, headwords]] }  (sorted: a headword is in the last shard whose first headword is not after it)
//   kosha/<file>.json   [[headword, [variants], [sense, …]], …] sorted by headword
//                       sense = [पदविभागः, कन्नडार्थः, निष्पत्तिः, व्युत्पत्तिः, प्रयोगाः, उल्लेखाः, विस्तारः] (trailing empties dropped)
//   kosha/keys.tsv      "<looseKey>\t<headword>" for every headword and variant, sorted by key
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

export function buildKosha(babylonPath, dataDir = 'web/data') {
  const recs = [...parseBabylon(fs.readFileSync(babylonPath, 'utf8')).values()].filter((r) => r.senses.length);
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
  for (const r of recs) for (const w of [r.h, ...r.alts]) { const k = looseKey(w); if (k) keys.add(`${k}\t${r.h}`); }
  const lines = [...keys].sort();
  fs.writeFileSync(path.join(out, 'keys.tsv'), lines.join('\n'));
  fs.writeFileSync(path.join(out, 'shards.json'), JSON.stringify({ v: 1, count: recs.length, shards: manifest }));
  console.log(`kosha: ${recs.length} headwords, ${recs.reduce((n, r) => n + r.senses.length, 0)} senses, ${manifest.length} shards (${(bytes / 1e6).toFixed(1)} MB), ${lines.length} keys`);
  return { count: recs.length, shards: manifest.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.argv[2]) { console.error('usage: node scripts/build-kosha.mjs <shabdArtha_kaustubha.babylon> [web/data]'); process.exit(1); }
  buildKosha(process.argv[2], process.argv[3]);
}
