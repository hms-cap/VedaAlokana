// Checks the Devanagari → Kannada converter on known words and on every line of the data.
// Usage: node scripts/test-lipi.mjs [web/data]
import fs from 'node:fs';
import path from 'node:path';
import { toKnda, isCleanKannada } from '../web/lipi.js';

const cases = [
  ['अ॒ग्निमी॑ळे पु॒रोहि॑तं', 'ಅ॒ಗ್ನಿಮೀ॑ಳೇ ಪು॒ರೋಹಿ॑ತಂ'],
  ['य॒ज्ञस्य॑ दे॒वमृ॒त्विज॑म्', 'ಯ॒ಜ್ಞಸ್ಯ॑ ದೇ॒ವಮೃ॒ತ್ವಿಜ॑ಮ್'],
  ['होता॑रं रत्न॒धात॑मम्', 'ಹೋತಾ॑ರಂ ರತ್ನ॒ಧಾತ॑ಮಮ್'],
  ['स दे॒वाँ एह व॑क्षति', 'ಸ ದೇ॒ವಾಁ ಏಹ ವ॑ಕ್ಷತಿ'],
  ['माघश॑ꣳसो', 'ಮಾಘಶ॑ಗ್ಂಸೋ'],
  ['सꣵसृजामि', 'ಸಗ್ಗ್ಂಸೃಜಾಮಿ'],
  ['शान्ति॒ᳶ पुरु॑षः', 'ಶಾನ್ತಿ॒ೲ ಪುರು॑ಷಃ'],
  ['यᳵ कृत्ति॑काः', 'ಯೱ ಕೃತ್ತಿ॑ಕಾಃ'],
  ['स्थि॒रैरङ्गै᳚स्तुष्टु॒वाꣳस॑', 'ಸ್ಥಿ॒ರೈರಙ್ಗೈ᳚ಸ್ತುಷ್ಟು॒ವಾಗ್ಂಸ॑'],
  ['ॐ नमो॑ ब्रह्म॑णे ॥१॥', 'ಓಂ ನಮೋ॑ ಬ್ರಹ್ಮ॑ಣೇ ॥೧॥'],
  ['कॢप्तिः पितॄणाम्', 'ಕೢಪ್ತಿಃ ಪಿತೄಣಾಮ್'],
  ['तदेतत्सत्यम्‌', 'ತದೇತತ್ಸತ್ಯಮ್‌'],
  ['नमोऽस्तु', 'ನಮೋಽಸ್ತು'],
];
let fail = 0;
for (const [d, k] of cases) {
  const got = toKnda(d);
  if (got !== k) { fail++; console.log('FAIL', d, '\n  want', k, '\n  got ', got); }
}
console.log(`${cases.length - fail}/${cases.length} word checks passed`);

const root = process.argv[2] || 'web/data';
const bad = new Map(); let lines = 0;
for (const id of fs.readdirSync(root)) {
  const dir = path.join(root, id);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((x) => /^t\d+\.json$/.test(x))) {
    const t = JSON.parse(fs.readFileSync(path.join(dir, f)));
    for (const k in t) for (const v of t[k]) for (const line of v[1]) {
      lines++;
      const kn = toKnda(line);
      if (!isCleanKannada(kn)) {
        for (const ch of kn) if (!isCleanKannada(ch)) {
          const key = `${id} U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} ${ch}`;
          bad.set(key, (bad.get(key) || 0) + 1);
        }
      }
    }
  }
}
console.log(`${lines} lines converted; ${bad.size ? 'characters left over:' : 'every character is valid Kannada or a shared mark.'}`);
for (const [k, n] of [...bad].sort((a, b) => b[1] - a[1])) console.log('  ', k, n);
process.exit(fail ? 1 : 0);
