// Extracts the two texts of the Śrī Sūkta used by the app into scripts/sources/sri-sukta.json:
//   south  the South Indian recitation text with svaras (15 ṛks + phalaśruti), from
//          Dayananda Aithal's Saswara Rigveda, VisheshaSuktas/shrI-sUkta(Devanagari)-F1.html
//          (github.com/daithal/saswara-rigveda), dīrgha svarita as published there;
//   khila  Ṛgveda Khila 2.6 after Scheftelowitz (Die Apokryphen des Ṛgveda, 1906), GRETIL
//          input by Muneo Tokunaga, from sanskrit/raw_etexts
//          mixed/gretil_devanAgarI/1_sanskr/1_veda/1_sam/1_rv/rgveda_-_khila.md (no svaras,
//          words divided as in the edition).
//   node scripts/sri-sukta-source.mjs <aithal html> <gretil khila md>
import fs from 'node:fs';

const [html, md] = process.argv.slice(2);
const text = fs.readFileSync(html, 'utf8').replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ');
const body = text.slice(text.indexOf('श्री सूक्त'));
const south = [];
let cur = [];
for (const raw of body.split('\n')) {
  const l = raw.replace(/\s+/g, ' ').trim();
  if (!/[ऀ-ॿ]/.test(l) || l.includes('श्री सूक्त')) continue;
  const end = /\|\|\s*$/.test(l);
  cur.push(l.replace(/\s*\|\|\s*$/, ' ॥').replace(/\s*\|\s*$/, ' ।').replace(/,\s*/g, ' ').replace(/\s+/g, ' ').trim());
  if (end) { south.push(cur); cur = []; }
}
const khila = [];
for (const line of fs.readFileSync(md, 'utf8').split('\n')) {
  const m = line.match(/^र्व्ख्_२,६।(%?)([०-९]+)([अबच])्?:\s*(.*)$/);
  if (!m) continue;
  const n = (m[1] ? '%' : '') + [...m[2]].map((c) => '०१२३४५६७८९'.indexOf(c)).join('');
  const words = m[4].replace(/\(।प्।[०-९]+।\)/g, '').replace(/।?॥[०-९]*/g, '').replace(/।।+.*$/, '').split('।').map((w) => w.trim()).filter(Boolean);
  let v = khila.find((x) => x.n === n);
  if (!v) { v = { n, lines: [] }; khila.push(v); }
  v.lines.push(words);
}
fs.writeFileSync(new URL('./sources/sri-sukta.json', import.meta.url), JSON.stringify({ south, khila }, null, 1));
console.log(`south ${south.length} verses, khila ${khila.length} verses`);
