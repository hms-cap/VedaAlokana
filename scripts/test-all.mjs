// Runs every test script and the search quality gate. Usage: node scripts/test-all.mjs
// The data in web/data must be built (node scripts/build-data.mjs, or node scripts/build-search.mjs on existing data).
import { spawnSync } from 'node:child_process';

const runs = [
  ['check-search-fresh.mjs'], // first: later tests read the same data
  ['test-lipi.mjs'], ['test-dakshinatya.mjs'], ['test-search-key.mjs'], ['test-names.mjs'],
  ['test-query.mjs'], ['test-mantra-index.mjs'], ['test-pada.mjs'], ['test-sandhi.mjs'], ['test-kosha.mjs'], ['test-kosha-app.mjs'],
  // release gate for search: phase 0 must pass, no query that passed before may fail, and overall top-1 / top-5
  ['test-search.mjs', '--check-baseline', '--min-top1', '0.85', '--min-top5', '0.95'],
];
let failed = 0;
for (const [script, ...args] of runs) {
  const r = spawnSync(process.execPath, [new URL(`./${script}`, import.meta.url).pathname, ...args], { encoding: 'utf8' });
  const last = (r.stdout.trim().split('\n').filter(Boolean).pop() || '').slice(0, 100);
  console.log(`${r.status === 0 ? 'ok  ' : 'FAIL'} ${script.padEnd(24)} ${last}`);
  if (r.status !== 0) { failed++; console.log(r.stdout.split('\n').filter((l) => /FAIL|below|regress/i.test(l)).slice(0, 10).join('\n')); }
}
console.log(failed ? `\n${failed} script(s) failed` : '\nall tests passed');
process.exit(failed ? 1 : 0);
