// Taittirīya Saṃhitā padapāṭha for the reader's Padapāṭha view.
// Reads scripts/sources/gpl/ts-padapatha/ (GPL-3.0: hvram1/krishnayajurveda); writes
// web/data/gpl/ts/p<kāṇḍa>.json (GPL-3.0): { prapāṭhaka: [ [word, word, …] per pañcāśat, in the order of t<k>.json ] }.
// A word is as the book prints it, with svara marks; an analysed form is kept whole ("उ॒तो इति॑",
// "बा॒हुभ्या॒मिति॑ बा॒हु-भ्या॒म्"), and a compound break is a hyphen.   node scripts/build-ts-pada.mjs [web/data]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawPadaUnits } from './build-ts-sep.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.argv[2] || path.join(here, '..', 'web', 'data');
const OUT = path.join(DATA, 'gpl', 'ts');
fs.mkdirSync(OUT, { recursive: true });
let units = 0; let words = 0; const bad = [];
for (let k = 1; k <= 7; k++) {
  const text = JSON.parse(fs.readFileSync(path.join(DATA, 'ts', `t${k}.json`), 'utf8'));
  const byP = {};
  // the heading of the next prapāṭhaka ("1.2  प्रथमकाण्डे द्वितीयः प्रश्नः-(…)") sits on the last pañcāśat of the one before
  const clean = (toks) => toks.map((t) => t.replace(/\s*\d+\.\d+\s+\S*काण्डे.*$/s, '').trim()).filter(Boolean);
  for (const u of rawPadaUnits(k)) (byP[u.p] ||= []).push(clean(u.toks));
  const out = {};
  for (const [p, vs] of Object.entries(text)) {
    const pu = byP[p] || [];
    if (pu.length !== vs.length) { bad.push(`${k}.${p} (${vs.length}/${pu.length})`); continue; }
    out[p] = pu;
    units += pu.length; words += pu.reduce((a, t) => a + t.length, 0);
  }
  fs.writeFileSync(path.join(OUT, `p${k}.json`), JSON.stringify(out));
}
console.log(`ts-pada: ${units} pañcāśats, ${words} words${bad.length ? `; skipped (count differs): ${bad.join(', ')}` : ''}`);
