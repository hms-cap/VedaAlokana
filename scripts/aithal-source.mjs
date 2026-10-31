// Extracts sūktas from Dayananda Aithal's Saswara Rigveda (github.com/daithal/saswara-rigveda,
// VisheshaSuktas/ and paMchAyatana/, Devanagari Format-1 pages) into scripts/sources/aithal.json:
//   { file: { title, items: [ { head } | { lines, ref? } ] } }
// `ref` is the Ṛgveda maṇḍala.sūkta.ṛk the page prints under a ṛk; such ṛks are shown from the
// app's own Ṛgveda (so the pāṭha switch applies), the rest as printed there.
//   node scripts/aithal-source.mjs path/to/saswara-rigveda name…
import fs from 'node:fs';
import path from 'node:path';

const [root, ...names] = process.argv.slice(2);
const out = {};
for (const name of names) {
  const dir = ['VisheshaSuktas', 'paMchAyatana'].find((d) => fs.existsSync(path.join(root, d, `${name}(Devanagari)-F1.html`)));
  if (!dir) throw new Error(`${name}: not found`);
  const raw = fs.readFileSync(path.join(root, dir, `${name}(Devanagari)-F1.html`), 'utf8')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ');
  const at = raw.indexOf('*****');
  const title = raw.slice(at).match(/\*+\s*([^*\n]+?)\s*\*+/)[1].replace(/‌/g, '').trim();
  const items = []; let cur = [];
  const flush = (ref) => { if (cur.length) items.push({ lines: cur, ...(ref ? { ref } : {}) }); cur = []; };
  for (const l0 of raw.slice(at).split('\n').slice(1)) {
    const l = l0.replace(/\s+/g, ' ').trim();
    if (!l || l.startsWith('*')) continue;
    const h = l.match(/^\|\|\s*(.+?)\s*\|\|$/);
    if (h && !/[॒॑᳚]/.test(h[1])) { flush(); items.push({ head: h[1].replace(/^[०-९]+।\s*/, '').trim() }); continue; }
    if (/^\{[^}]*\|[^}]*\}$/.test(l)) continue;                 // {ṛṣi | devatā | chandas}
    const r = l.match(/^\{(\d+)\.(\d+)\.(\d+)\}/);                // {maṇḍala.sūkta.ṛk}{…}{…}
    if (r) { flush(`${r[1]}.${r[2]}.${r[3]}`); continue; }
    if (!/[ऀ-ॿ]/.test(l)) continue;
    const end = /\|\|\s*$/.test(l);
    cur.push(l.replace(/\s*\|\|\s*$/, ' ॥').replace(/\s*\|\s*$/, ' ।').replace(/\|\|/g, '॥ ').replace(/\|/g, '।')
      .replace(/,\s*/g, ' ').replace(/\s+/g, ' ').trim());
    if (end && !items.length || end) {
      // a verse with a printed ref closes on the ref line; one without closes on ॥
      if (!raw.slice(raw.indexOf(l0) + l0.length, raw.indexOf(l0) + l0.length + 400).match(/^\s*\n\s*\{\d+\./)) flush();
    }
  }
  flush();
  out[name] = { title, items };
}
fs.writeFileSync(new URL('./sources/aithal.json', import.meta.url), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, v.title, v.items.length, 'items,', v.items.filter((i) => i.ref).length, 'with RV ref,', v.items.filter((i) => i.head).length, 'heads');
