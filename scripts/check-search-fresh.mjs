// Checks that the committed search indexes (web/data/search/ and web/data/search-aliases.json) match
// what scripts/build-search.mjs would produce from the rest of web/data.
//   node scripts/check-search-fresh.mjs          exit 1 and list stale files if they differ
//   node scripts/check-search-fresh.mjs --fix    rebuild them in place (prints what changed)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearch } from './build-search.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'data');
const fix = process.argv.includes('--fix');
const mine = (rel) => rel === 'search-aliases.json' || rel.startsWith('search' + path.sep);
const list = (d, base = '') => fs.readdirSync(path.join(d, base), { withFileTypes: true }).flatMap((e) => {
  const rel = path.join(base, e.name);
  return e.isDirectory() ? list(d, rel) : [rel];
}).filter(mine);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'search-fresh-'));
fs.cpSync(root, path.join(tmp, 'data'), { recursive: true });
const out = path.join(tmp, 'data');
const log = console.log; console.log = () => {};
try { buildSearch(out); } finally { console.log = log; }

const stale = [];
for (const rel of new Set([...list(root), ...list(out)])) {
  const a = path.join(root, rel), b = path.join(out, rel);
  const same = fs.existsSync(a) && fs.existsSync(b) && fs.readFileSync(a).equals(fs.readFileSync(b));
  if (!same) { stale.push(rel); if (fix && fs.existsSync(b)) { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.copyFileSync(b, a); } }
}
fs.rmSync(tmp, { recursive: true, force: true });

if (!stale.length) { console.log('search indexes are up to date'); process.exit(0); }
if (fix) { console.log('rebuilt: ' + stale.map((f) => 'web/data/' + f).join(', ')); process.exit(0); }
console.log('search indexes are out of date: ' + stale.map((f) => 'web/data/' + f).join(', '));
console.log('run: node scripts/check-search-fresh.mjs --fix');
process.exit(1);
