// Writes web/data/offline.json: the files each Veda needs to work offline, with sizes,
// so Settings can offer "Download for offline" per Veda (and the Sāyaṇa bhāṣya separately).
// Run after build-data.mjs:  node scripts/offline-index.mjs
import fs from 'node:fs';
import path from 'node:path';

const web = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'web');
const cat = JSON.parse(fs.readFileSync(path.join(web, 'data', 'catalog.json'), 'utf8'));
const size = (f) => fs.statSync(path.join(web, f)).size;
const filesOf = (id) => fs.readdirSync(path.join(web, 'data', id)).filter((f) => f.endsWith('.json')).sort()
  .map((f) => `data/${id}/${f}`);

const packs = [];
for (const v of cat.vedas) {
  const ids = Object.values(v.layers).flat();
  const all = ids.flatMap(filesOf);
  const text = all.filter((f) => !/\/s\d+-\d+\.json$/.test(f));
  const bh = all.filter((f) => /\/s\d+-\d+\.json$/.test(f));
  packs.push({ id: v.id, name: v.name, deva: v.deva, files: text, bytes: text.reduce((n, f) => n + size(f), 0) });
  if (bh.length) {
    const t = cat.texts.find((x) => ids.includes(x.id) && x.has?.bhashya);
    packs.push({ id: `${v.id}-bhashya`, name: `${t.has.bhashya} bhāṣya`, of: v.id, files: bh, bytes: bh.reduce((n, f) => n + size(f), 0) });
  }
}
const out = { built: cat.built, packs };
fs.writeFileSync(path.join(web, 'data', 'offline.json'), JSON.stringify(out));
for (const p of packs) console.log(`${p.id.padEnd(12)} ${String(p.files.length).padStart(4)} files ${(p.bytes / 1e6).toFixed(1).padStart(6)} MB`);
