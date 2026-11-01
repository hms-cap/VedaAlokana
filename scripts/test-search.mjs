// Runs web/search.js over scripts/search-tests.json and reports how often the expected link is
// first (top-1) and within the first five (top-5), by script and by phase.
//
// Usage: node scripts/test-search.mjs [options]
//   --phase N            tests with phase <= N must be top-1; exit 1 if one is not (default 0)
//   --verbose            list every failing test, not only the required ones
//   --write-baseline     save the current pass/fail of every test to scripts/search-baseline.json
//   --check-baseline     exit 1 if a test that passed in the baseline now fails (improvements are fine)
//   --min-top1 F --min-top5 F   exit 1 if the overall rates are below F (e.g. 0.85 and 0.95 at release)
//   --veda ID            Veda open while searching (default rv, as when the app opens on the Ṛgveda)
//   --data DIR           data folder (default web/data)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { search } from '../web/search.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i < 0 ? dflt : args[i + 1]; };
const flag = (name) => args.includes(`--${name}`);
const dataDir = path.resolve(opt('data', path.join(here, '../web/data')));
const requiredPhase = Number(opt('phase', 0));
const activeVeda = opt('veda', 'rv');
const baselineFile = path.join(here, 'search-baseline.json');

// ---- data, loaded the way the app loads it (the search only reads texts, groups and facets) ----
const cache = {};
const read = (rel) => (cache[rel] ||= JSON.parse(fs.readFileSync(path.join(dataDir, rel), 'utf8')));
const data = { catalog: async () => read('catalog.json'), index: async (id) => read(`${id}/index.json`), names: async () => read('search/names.json'), aliases: async () => read('search-aliases.json') };

// ---- matching: ignore the order of ?parameters; a trailing * accepts anything that starts with it ----
const norm = (h) => {
  const [base, q = ''] = h.split('?');
  return base + (q ? '?' + q.split('&').sort().join('&') : '');
};
const matches = (want, got) => (want.endsWith('*') ? norm(got).startsWith(norm(want.slice(0, -1))) : norm(want) === norm(got));

const tests = JSON.parse(fs.readFileSync(path.join(here, 'search-tests.json'), 'utf8'));
for (const t of tests) for (const k of ['q', 'script', 'phase', 'kind', 'top']) if (t[k] === undefined) { console.error(`bad test (missing ${k}):`, t); process.exit(2); }

const rows = [];
for (const t of tests) {
  const got = (await search(t.q, data, { activeVeda })).map((r) => r.href);
  const first5 = got.slice(0, 5);
  const topAt = first5.findIndex((h) => matches(t.top, h));
  const top1 = topAt === 0;
  const top5 = topAt >= 0 && (t.in5 || []).every((w) => first5.some((h) => matches(w, h)));
  rows.push({ t, got, top1, top5, key: `${t.script}|${t.q}` });
}

// ---- report ----
const pct = (n, d) => (d ? `${n}/${d} (${((100 * n) / d).toFixed(1)}%)` : '–');
const table = (title, groups) => {
  console.log(`\n${title.padEnd(8)} ${'tests'.padStart(5)}  ${'top-1'.padEnd(14)} top-5`);
  for (const [name, rs] of groups) {
    console.log(`${String(name).padEnd(8)} ${String(rs.length).padStart(5)}  ${pct(rs.filter((r) => r.top1).length, rs.length).padEnd(14)} ${pct(rs.filter((r) => r.top5).length, rs.length)}`);
  }
};
const by = (f) => { const m = new Map(); for (const r of rows) { const k = f(r); (m.get(k) || m.set(k, []).get(k)).push(r); } return [...m].sort((a, b) => String(a[0]).localeCompare(String(b[0]))); };

console.log(`Search tests: ${tests.length} queries, Veda open: ${activeVeda}`);
table('script', [...by((r) => r.t.script), ['all', rows]]);
table('phase', by((r) => r.t.phase));
table('kind', by((r) => r.t.kind));

const show = (r) => {
  console.log(`  [${r.t.script} p${r.t.phase}${r.t.unsure ? ' unsure' : ''}] ${JSON.stringify(r.t.q)}`);
  console.log(`      want  ${r.t.top}${r.t.in5?.length ? `  (+ top-5: ${r.t.in5.join(' ')})` : ''}`);
  console.log(`      got   ${r.got.slice(0, 3).join('  ') || '(nothing)'}`);
};
const required = rows.filter((r) => r.t.phase <= requiredPhase);
const requiredFail = required.filter((r) => !r.top1);
console.log(`\nRequired now (phase <= ${requiredPhase}): ${pct(required.length - requiredFail.length, required.length)} are top-1`);
for (const r of requiredFail) show(r);
if (flag('verbose')) {
  const rest = rows.filter((r) => !r.top1 && r.t.phase > requiredPhase);
  console.log(`\nNot yet passing, later phases (${rest.length}):`);
  for (const r of rest) show(r);
}

// ---- baseline ----
let failed = requiredFail.length > 0;
const snapshot = Object.fromEntries(rows.map((r) => [r.key, { top1: r.top1, top5: r.top5 }]));
if (flag('write-baseline')) {
  const sum = (rs) => ({ tests: rs.length, top1: rs.filter((r) => r.top1).length, top5: rs.filter((r) => r.top5).length });
  fs.writeFileSync(baselineFile, JSON.stringify({
    note: 'Pass/fail of every query in search-tests.json. Regenerate with: node scripts/test-search.mjs --write-baseline',
    veda: activeVeda,
    overall: sum(rows),
    byScript: Object.fromEntries(by((r) => r.t.script).map(([k, rs]) => [k, sum(rs)])),
    byPhase: Object.fromEntries(by((r) => r.t.phase).map(([k, rs]) => [`p${k}`, sum(rs)])),
    results: snapshot,
  }, null, 1) + '\n');
  console.log(`\nWrote ${path.relative(process.cwd(), baselineFile)}`);
}
if (flag('check-baseline')) {
  const base = JSON.parse(fs.readFileSync(baselineFile, 'utf8')).results;
  const lost = []; const gained = [];
  for (const r of rows) {
    const b = base[r.key];
    if (!b) continue;
    if (b.top1 && !r.top1) lost.push(r); else if (!b.top1 && r.top1) gained.push(r);
    else if (b.top5 && !r.top5) lost.push(r);
  }
  console.log(`\nAgainst baseline: ${gained.length} newly top-1, ${lost.length} regressed`);
  for (const r of lost) show(r);
  if (lost.length) failed = true;
}
const overall1 = rows.filter((r) => r.top1).length / rows.length;
const overall5 = rows.filter((r) => r.top5).length / rows.length;
if (opt('min-top1') && overall1 < Number(opt('min-top1'))) { console.log(`\ntop-1 ${(overall1 * 100).toFixed(1)}% is below ${opt('min-top1')}`); failed = true; }
if (opt('min-top5') && overall5 < Number(opt('min-top5'))) { console.log(`\ntop-5 ${(overall5 * 100).toFixed(1)}% is below ${opt('min-top5')}`); failed = true; }
process.exit(failed ? 1 : 0);
