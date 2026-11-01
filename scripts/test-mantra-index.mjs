// Checks web/data/search/pratika.tsv and text-<veda>.tsv: every Saṃhitā and Upaniṣad verse is in, refs point
// at real verses, and typed openings and middles of well-known mantras find the right ref in all scripts.
// Usage: node scripts/test-mantra-index.mjs [web/data]
import fs from 'node:fs';
import path from 'node:path';
import { looseKey } from '../web/search-key.js';
import { toKnda } from '../web/lipi.js';

const dir = process.argv[2] || 'web/data';
const sdir = path.join(dir, 'search');
let failed = 0;
const fail = (m) => { failed++; console.log('FAIL', m); };
const readTsv = (f) => fs.readFileSync(path.join(sdir, f), 'utf8').split('\n').map((l) => l.split('\t'));

const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'catalog.json'), 'utf8'));
const suktas = JSON.parse(fs.readFileSync(path.join(dir, 'suktas.json'), 'utf8'));
const pratika = readTsv('pratika.tsv'); // [key, refs]
const texts = {}; // veda → [[ref, key]]
for (const f of fs.readdirSync(sdir).filter((n) => /^text-.*\.tsv$/.test(n))) texts[f.slice(5, -4)] = readTsv(f);

// 1. every verse of the indexed texts, and the inline sūktas, is there once
const lines = Object.values(texts).flat();
const indexed = new Set(lines.map((r) => r[0])); // a few verse numbers repeat inside a section (av 11.3, yv 1.6, 1.12): one ref, several units
let expected = 0; let missing = 0;
for (const t of catalog.texts) {
  if (!['samhita', 'upanishad'].includes(t.layer) || !(t.has?.roman || t.has?.svara)) continue;
  for (const f of fs.readdirSync(path.join(dir, t.id)).filter((n) => /^t\d+\.json$/.test(n))) {
    const d1 = f.slice(1, -5);
    for (const [d2, verses] of Object.entries(JSON.parse(fs.readFileSync(path.join(dir, t.id, f), 'utf8')))) {
      for (const v of verses) {
        if (!/\p{L}/u.test((v[1].length ? v[1] : v[2]).join(''))) continue; // av 16.8.5 is only a number
        expected++; if (!indexed.has(`${t.id}/${d1}/${d2}/${v[0]}`)) { if (missing++ < 5) console.log('  missing', t.id, d1, d2, v[0]); }
      }
    }
  }
}
for (const s of suktas) if (!s.segs.length) for (const v of s.versions[0].verses) if (v.lines) { expected++; if (!indexed.has(`s/${s.id}/${v.n}`)) missing++; }
if (missing) fail(`${missing} verses are not indexed`);
if (lines.length !== expected) fail(`indexed ${lines.length} units, expected ${expected}`);
console.log(`mantra text: ${lines.length} units in ${Object.keys(texts).length} files`);

// 2. every ref in pratika.tsv is a unit of the text files
let stray = 0;
for (const [, refs] of pratika) for (const r of refs.split(' ')) if (!indexed.has(r)) stray++;
if (stray) fail(`${stray} refs in pratika.tsv are not in the text files`);

// 3. lookups: a typed opening is a prefix of a pratīka key, or (when more than three words were typed) a pratīka
// key is a prefix of it; any middle is inside a text key
const opening = (q) => { const k = looseKey(q); return pratika.filter(([pk]) => pk.startsWith(k) || (pk.length >= 6 && k.startsWith(pk))).flatMap(([, r]) => r.split(' ')); };
const middle = (q) => { const k = looseKey(q); return Object.values(texts).flat().filter(([, tk]) => tk.includes(k)).map(([r]) => r); };
const cases = [
  ['opening', ['agnimile', 'अग्निमीळे', 'ಅಗ್ನಿಮೀಳೇ', 'agnim ile purohitam'], 'rv/1/1/1'],
  ['opening', ['tryambakam yajamahe', 'त्र्यम्बकं यजामहे', 'ತ್ರ್ಯಮ್ಬಕಂ ಯಜಾಮಹೇ'], 'rv/7/59/12'],
  ['opening', ['tryambakam yajamahe', 'त्र्यम्बकं यजामहे'], 'yv/1/3/60'],
  ['opening', ['tat savitur varenyam', 'तत्सवितुर्वरेण्यं'], 'rv/3/62/10'],
  ['opening', ['gananam tva', 'गणानां त्वा', 'ಗಣಾನಾಂ ತ್ವಾ'], 'rv/2/23/1'],
  ['opening', ['hiranyavarnam harinim', 'हिरण्यवर्णां हरिणीं', 'ಹಿರಣ್ಯವರ್ಣಾಂ ಹರಿಣೀಂ'], 's/sri-sukta/1'],
  ['opening', ['purnamadah purnamidam', 'पूर्णमदः पूर्णमिदम्'], 'bu/5/1/1'],
  ['middle', ['ekam sad viprah bahudha', 'एकं सद्विप्रा बहुधा', 'ಏಕಂ ಸದ್ವಿಪ್ರಾ ಬಹುಧಾ'], 'rv/1/164/46'],
  ['middle', ['asato ma sadgamaya', 'असतो मा सद्गमय', 'ಅಸತೋ ಮಾ ಸದ್ಗಮಯ'], 'bu/1/3/28'],
];
for (const [how, queries, ref] of cases) {
  for (const q of queries) {
    const got = (how === 'opening' ? opening : middle)(q);
    if (!got.includes(ref)) fail(`${how} "${q}" should reach ${ref}, got ${got.slice(0, 5).join(' ') || 'nothing'}`);
  }
}
console.log(`lookups: ${cases.reduce((n, c) => n + c[1].length, 0)} queries`);
console.log(failed ? `\n${failed} check(s) failed` : '\nall mantra-index checks passed');
process.exit(failed ? 1 : 0);
