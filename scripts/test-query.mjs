// Checks web/query.js: which words of a query are understood, in English, Devanagari and Kannada.
// Usage: node scripts/test-query.mjs
import fs from 'node:fs';
import { parseQuery, vocabulary } from '../web/query.js';
import { looseKey } from '../web/search-key.js';
import { groupResults, RESULT_GROUPS } from '../web/search.js';

const vocab = vocabulary(JSON.parse(fs.readFileSync(new URL('./search-aliases.json', import.meta.url), 'utf8')));
let failed = 0;
const sorted = (x) => JSON.stringify(x === null ? null : [...x].sort());

// [query, expected]; omitted fields default to { words: [], kind: false, facets: [], vedas: null, concepts: [] }
const cases = [
  ['agni suktam', { words: ['agni'], kind: true }],
  ['अग्नि सूक्तम्', { words: ['agni'], kind: true }],
  ['ಅಗ್ನಿ ಸೂಕ್ತ', { words: ['agni'], kind: true }],
  ['hymn to dawn', { kind: true, concepts: ['dawn'] }],
  ['the hymns of the waters', { kind: true, concepts: ['waters'] }],
  ['devata agni', { words: ['agni'], facets: ['devata'] }],
  ['देवता अग्नि', { words: ['agni'], facets: ['devata'] }],
  ['ದೇವತೆ ಅಗ್ನಿ', { words: ['agni'], facets: ['devata'] }],
  ['rishi vasishtha', { words: ['vasista'], facets: ['rishi'] }],
  ['indra trishtup', { words: ['indra', 'trstup'] }],
  ['krishna yajurveda rudram', { words: ['rudra'], vedas: ['kyv'] }],
  ['yajurveda rudram', { words: ['rudra'], vedas: ['kyv', 'syv'] }],
  ['atharva medha suktam', { words: ['meda'], kind: true, vedas: ['av'] }],
  ['rig atharva agni', { words: ['agni'], vedas: ['rv', 'av'] }],
  ['sun', { concepts: ['sun'] }],
  ['agnimile', { words: ['agnimile'] }],
  ['   ', {}],
  ['1.164.46', {}],
];
for (const [q, want] of cases) {
  const got = parseQuery(q, vocab);
  const w = { words: [], kind: false, facets: [], vedas: null, concepts: [], ...want };
  const bad = [];
  if (JSON.stringify(got.words) !== JSON.stringify(w.words)) bad.push(`words ${JSON.stringify(got.words)}`);
  if (got.kind !== w.kind) bad.push(`kind ${got.kind}`);
  if (sorted(got.facets) !== sorted(w.facets)) bad.push(`facets ${sorted(got.facets)}`);
  if (sorted(got.vedas) !== sorted(w.vedas)) bad.push(`vedas ${sorted(got.vedas)}`);
  if (JSON.stringify(got.concepts.map((c) => c.name)) !== JSON.stringify(w.concepts)) bad.push(`concepts ${JSON.stringify(got.concepts.map((c) => c.name))}`);
  if (bad.length) { failed++; console.log('FAIL', JSON.stringify(q), bad.join('; ')); }
}

// every word in search-aliases.json folds to a non-empty key, and no word sits in two lists
const a = JSON.parse(fs.readFileSync(new URL('./search-aliases.json', import.meta.url), 'utf8'));
const lists = { kind: a.kind, stop: a.stop };
for (const [id, ws] of Object.entries(a.facet)) lists[`facet.${id}`] = ws;
for (const [id, ws] of Object.entries(a.veda)) lists[`veda.${id}`] = ws;
for (const [id, c] of Object.entries(a.concept)) if (!id.startsWith('_')) lists[`concept.${id}`] = c.words;
const seen = new Map();
for (const [name, ws] of Object.entries(lists)) {
  for (const w of ws) {
    const k = looseKey(w);
    if (!k) { failed++; console.log('FAIL empty key for', name, JSON.stringify(w)); continue; }
    const other = seen.get(k);
    // the Veda ids may share words (yv with kyv); everything else must be in one list only
    if (other && other !== name && !(other.startsWith('veda.') && name.startsWith('veda.'))) { failed++; console.log('FAIL', JSON.stringify(w), 'is in both', other, 'and', name); }
    seen.set(k, name);
  }
}
// result groups: fixed order, empty groups left out, perGroup limit, the rest counted
const rows = ['facet', 'sukta', 'facet', 'facet', 'ref', 'sukta'].map((group, i) => ({ group, href: `#${i}` }));
const g = groupResults(rows, 2);
const order = RESULT_GROUPS.map((x) => x.id).filter((id) => rows.some((r) => r.group === id));
if (JSON.stringify(g.map((x) => x.group.id)) !== JSON.stringify(order)) { failed++; console.log('FAIL group order', g.map((x) => x.group.id)); }
if (g.find((x) => x.group.id === 'facet').items.length !== 2 || g.find((x) => x.group.id === 'facet').more !== 1) { failed++; console.log('FAIL perGroup limit'); }
if (groupResults(rows).some((x) => x.more)) { failed++; console.log('FAIL no limit should show all'); }
console.log(`query parser: ${cases.length} queries, ${seen.size} vocabulary words — ${failed ? failed + ' failed' : 'ok'}`);
process.exit(failed ? 1 : 0);
