// Sāyaṇa's Ṛgveda bhāṣya, from Sanskrit Wikisource (CC BY-SA 4.0), as packaged by
// Project Vyasa (github.com/project-vyasa/sa.wikisource.org, branch gh-pages,
// rigveda/rigveda.vyview: an SQLite file with zstd-compressed HTML blocks per ṛk).
//
// Writes web/data/rv/s{maṇḍala}-{n}.json = { sūkta: { ṛk: "bhāṣya" } } for sūktas
// 20n+1 … 20n+20, loaded only when a reader turns the bhāṣya on. Each Wikisource ṛk is matched to ours by its saṃhitā text;
// where Wikisource joins two dvipadā ṛks into one (RV 1.65), the bhāṣya goes with the first.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const skeleton = (s) => s.replace(/<[^>]+>/g, '').replace(/[ङञणनम]्|ं|ँ/g, '')
  .replace(/[^अ-हा-ौॠ-ॣ]/g, '');

function clean(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .split('\u001f').map((s) => s.trim()).filter(Boolean).join(' ')
    .replace(/(^|[\s(])["”](?=[ऀ-ॿ])/g, '$1“')   // straight and closing quotes used to open pratīkas too
    .replace(/\s+/g, ' ')
    .trim();
}

export const CHUNK = 20;

export async function buildSayana(vyview, outDir) {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(vyview, { readOnly: true });
  const streams = Object.fromEntries(db.prepare('select id, name from streams').all().map((r) => [r.id, r.name]));
  const W = new Map();
  for (const r of db.prepare('select stream_id s, sequence_id q, content c from html_blocks').all()) {
    const q = BigInt(r.q); const lo = Number(q & 0xffffn);
    if (!lo || lo % 16) continue;                     // maṇḍala / sūkta headers
    const key = `${Number(q >> 40n)}.${Number((q >> 16n) & 0xffffffn)}.${lo >> 4}`;
    if (!W.has(key)) W.set(key, {});
    W.get(key)[streams[r.s]] = zlib.zstdDecompressSync(r.c).toString();
  }
  let matched = 0; let total = 0; let empty = 0;
  for (let m = 1; m <= 10; m++) {
    const t = JSON.parse(fs.readFileSync(path.join(outDir, 'rv', `t${m}.json`), 'utf8'));
    const out = {};
    for (const [d2, verses] of Object.entries(t)) {
      for (const [v, deva] of verses) {
        total++;
        const ours = skeleton(deva.join(' ')).slice(0, 16);
        // the same ṛk, or the next one when Wikisource has joined two
        const cand = [W.get(`${m}.${d2}.${v}`), W.get(`${m}.${d2}.${v + 1}`)]
          .find((w) => w?.sayana && skeleton(w.samhita || '').slice(0, 16) === ours)
          || W.get(`${m}.${d2}.${v}`);
        const text = cand?.sayana ? clean(cand.sayana) : '';
        if (cand?.used || text.length < 12) { empty++; continue; }
        cand.used = true;
        (out[d2] ||= {})[v] = text;
        matched++;
      }
    }
    const chunks = {};
    for (const [d2, e] of Object.entries(out)) (chunks[Math.floor((d2 - 1) / CHUNK)] ||= {})[d2] = e;
    for (const [n, c] of Object.entries(chunks)) fs.writeFileSync(path.join(outDir, 'rv', `s${m}-${n}.json`), JSON.stringify(c));
  }
  console.log(`sayana: bhāṣya for ${matched} of ${total} ṛks (${empty} without)`);
  return matched;
}
