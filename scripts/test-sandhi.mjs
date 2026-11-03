// Checks web/sandhi.js (joined anusvāra and visarga) and the Taittirīya separate-form data
// (web/data/gpl/ts, from scripts/build-ts-sep.mjs).   node scripts/test-sandhi.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { joinForms } from '../web/sandhi.js';
import { toKnda } from '../web/lipi.js';

let failed = 0;
const eq = (got, want, what) => { if (got !== want) { failed++; console.log(`FAIL ${what}\n  got  ${got}\n  want ${want}`); } };

// joined forms
const J = [
  ['संकल्प', 'सङ्कल्प'], ['शंकर', 'शङ्कर'], ['संचय', 'सञ्चय'], ['कंटक', 'कण्टक'], ['शांत', 'शान्त'], ['संपद्', 'सम्पद्'],
  ['सं॑कल्प', 'स॑ङ्कल्प'], ['यं॒ प्रति', 'यं॒ प्रति'],                       // marks move; across a space the anusvāra stays
  ['सं॒वत्स॒र', 'स॒व्ँवत्स॒र'], ['संशय', 'संशय'], ['सिंह', 'सिंह'], ['संराज्', 'संराज्'],   // no class nasal for ś s h r
  ['नमः॑ श॒र्वाय', 'नम॑श्श॒र्वाय'], ['नमः॑ स॒हमा॑नाय', 'नम॑स्स॒हमा॑नाय'], ['ततः षट्', 'ततष्षट्'],
  ['नमः॑ क॒पर्दि॑ने', 'नमः॑ क॒पर्दि॑ने'], ['नमः॑', 'नमः॑'],                    // visarga before k / at the end stays
];
for (const [a, b] of J) eq(joinForms(a), b, `joinForms(${a})`);
// in Kannada: the same, then the script map (the conjuncts are what the Kannada fonts draw as ottakshara)
eq(toKnda(joinForms('संकल्प')), 'ಸಙ್ಕಲ್ಪ', 'Kannada ಸಙ್ಕಲ್ಪ');
eq(toKnda(joinForms('नमः शिवाय')), 'ನಮಶ್ಶಿವಾಯ', 'Kannada ನಮಶ್ಶಿವಾಯ');

// Taittirīya separate forms: the edits of a few known places
const here = path.dirname(fileURLToPath(import.meta.url));
const data = path.join(here, '..', 'web', 'data');
const apply = (l, ed) => { let o = l; for (const [a, d, i] of [...ed].sort((x, y) => y[0] - x[0])) o = o.slice(0, a) + i + o.slice(a + d); return o; };
function sepLine(k, p, n, li) {
  const t = JSON.parse(fs.readFileSync(path.join(data, 'ts', `t${k}.json`), 'utf8'))[p].find((v) => v[0] === n)[1][li];
  const e = JSON.parse(fs.readFileSync(path.join(data, 'gpl', 'ts', `s${k}.json`), 'utf8'))[p]?.[n] || [];
  return apply(t, e.filter((x) => x[0] === li).map((x) => x.slice(1))).replace(/ /g, ' ').replace(/[॒॑᳚]/g, '');
}
const has = (s, frag, what) => { if (!s.includes(frag)) { failed++; console.log(`FAIL ${what}: no “${frag}” in\n  ${s}`); } };
const r11 = sepLine(4, '5', 11, 0);
has(r11, 'नमः शर्वाय', 'Rudram 4.5.11 visarga');
has(r11, 'नमः कपर्दिने', 'Rudram 4.5.11 jihvāmūlīya');
has(r11, 'नमः सहस्राख्षाय', 'Rudram 4.5.11 visarga before s');
has(sepLine(4, '7', 3, 0), 'ज्यैष्ठ्यं च', 'Camakam anusvāra before c');
has(sepLine(4, '7', 1, 0), 'वां गिरः', 'Camakam anusvāra before g');
// a nasal that belongs to the word is not touched
has(sepLine(4, '7', 1, 0), 'वर्धन्तु', 'word-internal nasal kept');

// coverage: doubled sibilants left in the Taittirīya Saṃhitā after the edits
let before = 0; let after = 0;
for (let k = 1; k <= 7; k++) {
  const t = JSON.parse(fs.readFileSync(path.join(data, 'ts', `t${k}.json`), 'utf8'));
  const e = JSON.parse(fs.readFileSync(path.join(data, 'gpl', 'ts', `s${k}.json`), 'utf8'));
  for (const [p, vs] of Object.entries(t)) for (const v of vs) v[1].forEach((l, li) => {
    const re = /([शषस])्[॒॑᳚]*\1/g;
    before += (l.match(re) || []).length;
    after += (apply(l, (e[p]?.[v[0]] || []).filter((x) => x[0] === li).map((x) => x.slice(1))).match(re) || []).length;
  });
}
if (after > before * 0.02) { failed++; console.log(`FAIL doubled sibilants left: ${after} of ${before}`); }
console.log(failed ? `${failed} check(s) failed` : `all sandhi checks passed (${J.length} joined forms; TS doubled sibilants ${before} → ${after})`);
process.exit(failed ? 1 : 0);
