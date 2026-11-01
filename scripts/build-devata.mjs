// Writes web/data/devata.json from scripts/devata-index.mjs and the Ṛgveda facets.
//   node scripts/build-devata.mjs [web/data]
import fs from 'node:fs';
import path from 'node:path';
import { DEVATAS, SPHERES } from './devata-index.mjs';

const OUT = process.argv[2] || 'web/data';
const rv = JSON.parse(fs.readFileSync(path.join(OUT, 'rv/index.json'), 'utf8'));
const byKey = new Map(rv.facets.devata.map((e) => [e[0], e]));
const sections = new Set();
for (const f of fs.readdirSync(path.join(OUT, 'rv'))) { const m = f.match(/^s(\d+)-\d+\.json$/); if (m) { const j = JSON.parse(fs.readFileSync(path.join(OUT, 'rv', f), 'utf8')); for (const k of Object.keys(j)) sections.add(`${m[1]}.${k}`); } }
const out = { spheres: SPHERES, items: DEVATAS.map(([name, deva, sphere, key, where, hymns]) => {
  if (key && !byKey.has(key)) throw new Error(`no devatā facet "${key}"`);
  const missing = hymns.filter((h) => !sections.has(h)); if (missing.length) throw new Error(`${name}: no such sūkta ${missing}`);
  return { name, deva, sphere, key, n: key ? byKey.get(key)[4] : 0, where, hymns };
}) };
fs.writeFileSync(path.join(OUT, 'devata.json'), JSON.stringify(out));
console.log(`devatā entries: ${out.items.length}`);
