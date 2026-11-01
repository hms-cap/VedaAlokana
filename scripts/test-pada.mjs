// Checks web/pada.js on every padapāṭha word of the data: each converts to Devanagari that reads back to the same
// IAST, compound breaks become ऽ, nothing Latin is left, and Kannada conversion is clean.
// Usage: node scripts/test-pada.mjs [web/data]
import fs from 'node:fs';
import path from 'node:path';
import { cleanPada, padaDeva } from '../web/pada.js';
import { devaToIast } from '../web/translit.js';
import { toKnda } from '../web/lipi.js';

const dir = process.argv[2] || 'web/data';
let failed = 0;
const fail = (m) => { failed++; if (failed <= 15) console.log('FAIL', m); };

// known cases
const eq = (got, want, what) => { if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${what}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
eq(padaDeva(['agnim', 'īḷe', 'puraḥ-hitam', 'ratna-dhātamam']), ['अग्निम्', 'ईळे', 'पुरःऽहितम्', 'रत्नऽधातमम्'], 'opening words');
eq(cleanPada(['vāyo iti', 'dravatpāṇī itidravat-pāṇī']), ['vāyo iti', 'dravatpāṇī iti', 'dravat-pāṇī'], 'iti');
eq(cleanPada(['&lt;b&gt;(ṛV_10,92)yajñasya', 'N/A', 'agne']), ['yajñasya', 'agne'], 'markup');
eq(toKnda(padaDeva(['puraḥ-hitam'])[0]), 'ಪುರಃಽಹಿತಮ್', 'Kannada');

// every word
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'catalog.json'), 'utf8'));
let words = 0; let dropped = 0;
for (const t of catalog.texts.filter((x) => x.has?.pada)) {
  for (const f of fs.readdirSync(path.join(dir, t.id)).filter((n) => /^t\d+\.json$/.test(n))) {
    for (const [d2, verses] of Object.entries(JSON.parse(fs.readFileSync(path.join(dir, t.id, f), 'utf8')))) {
      for (const v of verses) {
        const clean = cleanPada(v[3]); const deva = padaDeva(v[3]);
        dropped += v[3].length - clean.length; words += clean.length;
        clean.forEach((w, i) => {
          const d = deva[i];
          if (/[a-zA-Z]/.test(d)) fail(`${t.id} ${f}.${d2}.${v[0]}: Latin left in ${d}`);
          if (devaToIast(d).replace(/'/g, '-') !== w.replace(/-/g, '-')) fail(`${t.id} ${f}.${d2}.${v[0]}: ${w} → ${d} → ${devaToIast(d)}`);
          if (/[ऀ-ॿ]/.test(toKnda(d).replace(/[॒॑᳚ऽ।॥]/g, ''))) fail(`${t.id} ${f}.${d2}.${v[0]}: Kannada left Devanagari in ${d}`);
        });
      }
    }
  }
}
console.log(`padapāṭha: ${words} words converted, ${dropped} source entries dropped or merged`);
console.log(failed ? `\n${failed} check(s) failed` : '\nall padapāṭha checks passed');
process.exit(failed ? 1 : 0);
