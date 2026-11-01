// Checks web/data/search/names.json: seed names typed in IAST, plain English, Devanagari and Kannada
// reach the intended entries, and every entry's keys agree with web/search-key.js.
// Usage: node scripts/test-names.mjs [web/data]
import fs from 'node:fs';
import path from 'node:path';
import { looseKey, strictKey } from '../web/search-key.js';
import { toKnda } from '../web/lipi.js';

const dir = process.argv[2] || 'web/data';
const { entries } = JSON.parse(fs.readFileSync(path.join(dir, 'search', 'names.json'), 'utf8'));
let failed = 0;
const fail = (m) => { failed++; console.log('FAIL', m); };
const ids = (q) => entries.filter((e) => e[6].includes(looseKey(q))).map((e) => `${e[0]}:${e[1]}`);

// [typed in IAST, Devanagari, plain English] → ids that must be among the hits
const seeds = [
  [['Rudram', 'रुद्रम्', 'rudram'], ['a:sri-rudram-namakam']],
  [['Śrī Rudram (Namakam)', 'श्रीरुद्रम् (नमकम्)', 'sri rudram namakam'], ['s:sri-rudram-namakam']],
  [['Namakam', 'नमकम्', 'namakam'], ['a:sri-rudram-namakam']],
  [['Camakam', 'चमकम्', 'chamakam'], ['s:camakam']],
  [['Puruṣa Sūkta', 'पुरुषसूक्तम्', 'purusha suktam'], ['s:purusa-sukta', 's:purusa-sukta-vajasaneyi', 's:purusa-sukta-taittiriya', 's:purusa-sukta-atharva']],
  [['Nārāyaṇa Sūkta', 'नारायणसूक्तम्', 'narayana suktam'], ['s:narayana-sukta']],
  [['Śrī Sūkta', 'श्रीसूक्तम्', 'shri suktam'], ['s:sri-sukta']],
  [['Durgā Sūkta', 'दुर्गासूक्तम्', 'durga suktam'], ['s:durga-sukta']],
  [['Medhā Sūkta', 'मेधासूक्तम्', 'medha suktam'], ['s:medha-sukta']],
  [['Mantrapuṣpam', 'मन्त्रपुष्पम्', 'mantra pushpam'], ['s:mantrapuspam']],
  [['Śānti Mantra', 'शान्तिमन्त्रः', 'shanti mantra'], ['s:santi-mantra-sam-no-mitrah']],
  [['Mahāmṛtyuñjaya Mantra', 'महामृत्युञ्जयमन्त्रः', 'maha mrityunjaya mantra'], ['s:mahamrtyunjaya-mantra']],
  [['Mṛtyuñjaya Mantra', 'मृत्युञ्जयमन्त्रः', 'mrityunjaya mantra'], ['a:mahamrtyunjaya-mantra', 'a:mahamrtyunjaya-mantra-vajasaneyi']],
  [['Tryambaka Mantra', 'त्र्यम्बकमन्त्रः', 'tryambaka mantra'], ['a:mahamrtyunjaya-mantra']],
  [['Lakṣmī Sūkta', 'लक्ष्मीसूक्तम्', 'lakshmi suktam'], ['a:sri-sukta']],
  [['Agni', 'अग्निः', 'agni'], ['f:agni']],
];
// bracketed qualifiers and Devanagari names that sound different
seeds.push([['Sūrya Sūkta', 'सूर्यसूक्तम्', 'surya suktam'], ['s:surya-sukta-ud-u-tyam', 's:surya-sukta-citram-devanam']]);
seeds.push([['Sūrya Sūkta (citraṃ devānām)', 'सौरसूक्तम्', 'saura suktam'], ['s:surya-sukta-citram-devanam']]);
seeds.push([['Ā brahman', 'आ ब्रह्मन्', 'a brahman'], ['s:a-brahman-prayer-for-the-nation']]);
let checked = 0;
for (const [spellings, want] of seeds) {
  for (const sp of [...spellings, toKnda(spellings[1])]) {
    const got = ids(sp);
    for (const w of want) { checked++; if (!got.includes(w)) fail(`"${sp}" should reach ${w}, got ${got.slice(0, 6).join(' ') || 'nothing'}`); }
  }
}
console.log(`seed names: ${checked} lookups`);

// stored keys must equal what the browser will compute; the Devanagari name must be reachable
let bad = 0;
const core = (l) => l.replace(/\s*\([^)]*\)/g, '').trim() || l;
for (const e of entries) {
  const want = [...new Set([looseKey(core(e[2])), looseKey(e[2]), looseKey(e[3])].filter(Boolean))];
  if (e[5] !== (strictKey(core(e[2])) || strictKey(e[3])) || JSON.stringify(e[6]) !== JSON.stringify(want)) bad++;
  if (e[3] && !e[6].includes(looseKey(e[3]))) fail(`${e[0]}:${e[1]} Devanagari "${e[3]}" is not a key`);
}
if (bad) fail(`${bad} entries with stale keys`);
console.log(`keys: ${entries.length} entries — ${bad ? bad + ' stale' : 'ok'}`);
console.log(failed ? `\n${failed} check(s) failed` : '\nall names checks passed');
process.exit(failed ? 1 : 0);
