// Checks web/dirgha.js against Dayananda Aithal's Saswara Rigveda (Format-1, Devanagari):
//   git clone --depth 1 https://github.com/daithal/saswara-rigveda
//   node scripts/test-dirgha.mjs saswara-rigveda
// Compares every svarita mark (॑ vs ᳚) where the two texts have the same letters.
import fs from 'node:fs';
import path from 'node:path';
import { dirghaLine } from '../web/dirgha.js';

const root = process.argv[2];
if (!root) { console.error('usage: node scripts/test-dirgha.mjs path/to/saswara-rigveda'); process.exit(2); }
const dir = path.join(root, 'Rigveda/SamhitaPatha/Devanagari/Mandala/Format1');
const theirs = {};
for (const f of fs.readdirSync(dir).filter((x) => /-T1\.html$/.test(x))) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const [, td] of s.matchAll(/<td class='VargaStyle\d'>([\s\S]*?)<\/td>/g)) {
    const num = td.match(/<span class='MantraNumbering'>\{[^}]*\}\{([\d.]+)\}/);
    if (!num) continue;
    theirs[num[1]] = td.replace(/<span class='(RishiDevChandas|MantraNumbering)'>[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  }
}
const data = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'web', 'data', 'rv');
const norm = (s) => s.replace(/[‌‍]/g, '').replace(/र्ऋ/g, 'रृ').replace(/\([^)]*\)/g, '')
  .replace(/[|,०-९॥ऽ]/g, ' ').replace(/\s+/g, '');
const marks = (s) => { const a = []; for (const c of norm(s)) { if (/[॒॑᳚]/.test(c)) { if (a.length) a[a.length - 1][1] += c; } else a.push([c, '']); } return a; };
let n = 0; let same = 0; let skipped = 0;
for (const f of fs.readdirSync(data).filter((x) => /^t\d+\.json$/.test(x))) {
  const d1 = f.match(/\d+/)[0];
  const t = JSON.parse(fs.readFileSync(path.join(data, f), 'utf8'));
  for (const [d2, vs] of Object.entries(t)) for (const v of vs) {
    const other = theirs[`${d1}.${d2}.${v[0]}`];
    if (!other) { skipped++; continue; }
    const a = marks(v[1].map(dirghaLine).join(' ')); const b = marks(other);
    if (a.length !== b.length || a.some((x, i) => x[0] !== b[i][0])) { skipped++; continue; }
    a.forEach((x, i) => {
      const p = x[1].replace('॒', ''); const q = b[i][1].replace('॒', '');
      if (/[॑᳚]/.test(p + q)) { n++; if (p === q) same++; }
    });
  }
}
console.log(`dīrgha svarita: ${same} of ${n} svarita marks agree (${(same / n * 100).toFixed(2)}%); ${skipped} ṛks with different wording skipped`);
if (same / n < 0.995) process.exit(1);
