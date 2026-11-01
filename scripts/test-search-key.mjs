// Checks web/search-key.js: spellings that must fold together, spellings that must not,
// and, on every verse in the data, that the Devanagari and IAST lines give one loose key and
// that Kannada round-trips.
// Usage: node scripts/test-search-key.mjs [web/data]
import fs from 'node:fs';
import path from 'node:path';
import { toDeva, toIast, strictKey, looseKey } from '../web/search-key.js';
import { toKnda } from '../web/lipi.js';

const dataDir = process.argv[2] || 'web/data';
let failed = 0;
const fail = (msg) => { failed++; console.log('FAIL', msg); };

// ---- 1. spellings that must share one loose key ----
const same = [
  ['Vasishta', 'vasishtha', 'vasiṣṭha', 'वसिष्ठः', 'ವಸಿಷ್ಠ'],
  ['shri suktam', 'shree suktam', 'śrīsūktam', 'श्रीसूक्तम्', 'ಶ್ರೀಸೂಕ್ತಮ್', 'Śrī Sūkta'],
  ['agnim ile', 'agnimile', 'agnimīḷe', 'अ॒ग्निमी॑ळे', 'ಅಗ್ನಿಮೀಳೇ', 'agním īḷe'],
  ['tryambakam yajamahe', 'tryambakaṃ yajāmahe', 'त्र्य॑म्बकं यजा॑महे', 'ತ್ರ್ಯಂಬಕಂ ಯಜಾಮಹೇ'],
  ['taitiriya samhita', 'taittirīya saṃhitā', 'तैत्तिरीय संहिता', 'ತೈತ್ತಿರೀಯ ಸಂಹಿತಾ'],
  ['chamakam', 'Camakam', 'चमकम्', 'ಚಮಕಂ'],
  ['purusha suktam', 'puruṣa sūkta', 'पुरुषसूक्तम्', 'ಪುರುಷಸೂಕ್ತಮ್'],
  ['krishna', 'kṛṣṇa', 'कृष्ण', 'ಕೃಷ್ಣ'],
  ['vishnu', 'viṣṇu', 'विष्णु', 'ವಿಷ್ಣು'],
  ['katha upanishad', 'Kaṭha Upaniṣad', 'कठ उपनिषद्', 'ಕಠ ಉಪನಿಷದ್'],
  ['agnih', 'agniḥ', 'अग्निः', 'ಅಗ್ನಿಃ', 'agni'],
  ['rudram', 'rudra', 'रुद्रम्'],
  ['ishavasya', 'īśāvāsya', 'ईशावास्यम्'],
  ['gananam tva', 'gaṇānāṃ tvā', 'गणानां त्वा', 'ಗಣಾನಾಂ ತ್ವಾ'],
  ['sam gacchadhvam', 'saṃ gacchadhvaṃ', 'सं गच्छध्वं', 'ಸಂ ಗಚ್ಛಧ್ವಂ'],
  ['sahanavavatu', 'saha nāv avatu', 'सह नाववतु', 'स॒हना॑ववतु'],
  ['asato ma sadgamaya', 'asato mā sadgamaya', 'असतो मा सद्गमय'],
  ['ritvijam', 'ṛtvijam', 'ऋत्विजम्', 'ಋತ್ವಿಜಂ'],
  ['om', 'oṃ', 'ॐ', 'ಓಂ'],
  ['indram maho', 'indraṃ maho', 'इन्द्रं महो'],
  ['rajan suyamad', 'rājantsuyamād'],
];
for (const group of same) {
  const keys = group.map(looseKey);
  if (new Set(keys).size !== 1) fail(`loose key differs: ${group.map((g, i) => `${g} → ${keys[i]}`).join(' | ')}`);
}

// ---- 2. spellings that must NOT fold together ----
const differ = [['agni', 'indra'], ['soma', 'sama'], ['rudra', 'varuna'], ['atharva', 'rigveda'], ['purusa', 'pusan']];
for (const [a, b] of differ) if (looseKey(a) === looseKey(b)) fail(`loose key should differ: ${a} / ${b}`);

// ---- 3. exact values ----
const exact = [
  [strictKey, 'agním īḷe', 'agnimīḷe'],
  [strictKey, 'अ॒ग्निमी॑ळे', 'agnimīḷe'],
  [strictKey, 'ಅಗ್ನಿಮೀಳೇ', 'agnimīḷe'],
  [strictKey, 'Vasiṣṭha', 'vasiṣṭha'],
  [strictKey, 'vasishtha', 'vasishtha'],
  [strictKey, 'अग्न आ याहि१ वीतये', 'agnaāyāhivītaye'], // svara digit dropped
  [looseKey, 'vasishtha', 'vasista'],
  [looseKey, 'श्रीसूक्तम्', 'srsukta'],
  [looseKey, 'tryambakam yajamahe', 'tryanbakanyajamahe'],
  [looseKey, 'ॐ', 'o'], // final nasal dropped, like om
  [looseKey, '', ''],
  [looseKey, '1.164.46', ''],
  [toIast, 'ಅಗ್ನಿಮೀಳೇ', 'agnimīḷe'],
  [toIast, 'अ॒ग्निमी॑ळे', 'agnimīḷe'],
  [toDeva, 'ಅಗ್ನಿಮೀಳೇ', 'अग्निमीळे'],
  [toDeva, 'agni', 'agni'],
  [toDeva, 'ಓಂ ೧೨', 'ओं १२'],
];
for (const [fn, input, want] of exact) {
  const got = fn(input);
  if (got !== want) fail(`${fn.name}(${JSON.stringify(input)}) = ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
}
console.log(`spelling checks: ${same.length} groups, ${differ.length} pairs, ${exact.length} values — ${failed ? failed + ' failed' : 'ok'}`);

// ---- 4 and 5. every verse in the data ----
const catalog = JSON.parse(fs.readFileSync(path.join(dataDir, 'catalog.json'), 'utf8'));
const MIN_AGREE = 0.98; // Devanagari and IAST come from different editions in the Ṛgveda (cit/cid, spandrā/syandrā …)
let knLines = 0; let knBad = 0; let knSkipped = 0; const knExamples = [];
for (const t of catalog.texts) {
  let both = 0; let agree = 0; const examples = [];
  for (const f of fs.readdirSync(path.join(dataDir, t.id)).filter((n) => /^t\d+\.json$/.test(n))) {
    const file = JSON.parse(fs.readFileSync(path.join(dataDir, t.id, f), 'utf8'));
    for (const [d2, verses] of Object.entries(file)) {
      for (const v of verses) {
        const [n, deva, roman] = v;
        if (deva.length && roman.length) {
          both++;
          // The IAST column of the Yajurveda texts is made by devaToIast, which drops ᳪ and ꣵ as svara marks,
          // so those two signs are left out of the Devanagari side here; the search key reads them as anusvāra.
          const a = looseKey(deva.join(' ').replace(/[\u1CEA\uA8F5]/g, '')); const b = looseKey(roman.join(' '));
          if (a === b) agree++; else if (examples.length < 3) {
            let i = 0; while (a[i] === b[i]) i++;
            examples.push(`${t.id} ${f.slice(1, -5)}.${d2}.${n}: …${a.slice(Math.max(0, i - 8), i + 8)} / …${b.slice(Math.max(0, i - 8), i + 8)}`);
          }
        }
        for (const line of deva) {
          // ग्ं (ga + virama + anusvāra) is the same letters Kannada books use for the "gum" sign ꣳ (ಗ್ಂ), so
          // the two cannot be told apart on the Kannada side. It occurs only as a typo in the source.
          if (line.includes('ग्ं')) { knSkipped++; continue; }
          knLines++;
          const k = toKnda(line);
          if (looseKey(k) !== looseKey(line) || strictKey(k) !== strictKey(line)) {
            knBad++; if (knExamples.length < 5) knExamples.push(`${t.id} ${f.slice(1, -5)}.${d2}.${n}: ${line.slice(0, 50)}`);
          }
        }
      }
    }
  }
  const rate = both ? agree / both : 1;
  console.log(`${t.id.padEnd(6)} deva vs IAST: ${both ? `${agree}/${both} (${(rate * 100).toFixed(2)}%)` : 'no IAST lines'}`);
  for (const e of examples) console.log('       differs:', e);
  if (both && rate < MIN_AGREE) fail(`${t.id}: only ${(rate * 100).toFixed(2)}% of verses agree between Devanagari and IAST`);
}
console.log(`Kannada round trip: ${knLines - knBad}/${knLines} lines give the same strict and loose key (${knSkipped} lines with a ग्ं typo skipped)`);
for (const e of knExamples) console.log('       differs:', e);
if (knBad) fail(`${knBad} Kannada round-trip lines differ`);

console.log(failed ? `\n${failed} check(s) failed` : '\nall search-key checks passed');
process.exit(failed ? 1 : 0);
