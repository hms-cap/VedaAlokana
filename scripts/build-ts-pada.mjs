// Taittirīya Saṃhitā padapāṭha for the reader's Padapāṭha view.
// Reads scripts/sources/gpl/ts-padapatha/ (GPL-3.0: hvram1/krishnayajurveda); writes
// web/data/gpl/ts/p<kāṇḍa>.json (GPL-3.0): { prapāṭhaka: [ [word, word, …] per pañcāśat, in the order of t<k>.json ] }.
// A word is as the book prints it, with svara marks; an analysed form is kept whole ("उ॒तो इति॑",
// "बा॒हुभ्या॒मिति॑ बा॒हु-भ्या॒म्"), and a compound break is a hyphen.   node scripts/build-ts-pada.mjs [web/data]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawPadaUnits, tokSegs, letters, align } from './build-ts-sep.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.argv[2] || path.join(here, '..', 'web', 'data');
const OUT = path.join(DATA, 'gpl', 'ts');
fs.mkdirSync(OUT, { recursive: true });
let units = 0; let words = 0; const bad = [];
const rawByK = {};   // k → p → [ { toks } ]  (kept for the sūkta cuts)
for (let k = 1; k <= 7; k++) {
  const text = JSON.parse(fs.readFileSync(path.join(DATA, 'ts', `t${k}.json`), 'utf8'));
  const byP = {};
  // the heading of the next prapāṭhaka ("1.2  प्रथमकाण्डे द्वितीयः प्रश्नः-(…)") sits on the last pañcāśat of the one before
  const clean = (toks) => toks.map((t) => t.replace(/\s*\d+\.\d+\s+\S*काण्डे.*$/s, '').trim()).filter(Boolean);
  for (const u of rawPadaUnits(k)) (byP[u.p] ||= []).push(clean(u.toks));
  rawByK[k] = { text, byP };
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

// ---- sūktas drawn from the saṃhitā: the padapāṭha words of each piece, for the sūkta view
// A piece cut inside a pañcāśat (suktas.json: a = [line, word] start, b = [line, word] end) takes the words
// whose letters fall in the cut: the saṃhitā unit and its padapāṭha are aligned letter by letter, as for the
// separate forms.  File: web/data/gpl/ts/sukta.json = { sūktaId: { segIndex: [ [word, …] per unit of the seg ] } }.
const sukFile = path.join(DATA, 'suktas.json');
if (fs.existsSync(sukFile)) {
  const suktas = JSON.parse(fs.readFileSync(sukFile, 'utf8'));
  const outS = {}; let pieces = 0; let cutPieces = 0;
  for (const sk of suktas) {
    sk.segs?.forEach((g, gi) => {
      if (g.t !== 'ts') return;
      const { text, byP } = rawByK[g.d1];
      const vs = text[g.d2] || []; const pu = byP[g.d2] || [];
      const list = [];
      vs.forEach((v, i) => {
        if (v[0] < g.v[0] || v[0] > g.v[1]) return;
        const toks = pu[i]; if (!toks) { list.push([]); return; }
        const first = v[0] === g.v[0]; const last = v[0] === g.v[1];
        const a = first ? g.a : null; const b = last ? g.b : null;
        pieces++;
        if (!a && !b) { list.push(toks); return; }
        cutPieces++;
        // character range of the cut in the unit (lines joined by \n)
        const starts = []; let o = 0; for (const l of v[1]) { starts.push(o); o += l.length + 1; }
        let c0 = 0; let c1 = o;
        const wordAt = (li, wi, end) => {
          const ws = v[1][li].split(' '); let off = 0;
          for (let x = 0; x < wi; x++) off += ws[x].length + 1;
          return starts[li] + off + (end ? (ws[wi] || '').length : 0);
        };
        if (a) c0 = wordAt(a[0], a[1], false);
        if (b) c1 = wordAt(b[0], b[1], true);
        const S = letters(v[1].join('\n'));
        const L0 = S.at.findIndex((x) => x >= c0); let L1 = S.at.findIndex((x) => x >= c1); if (L1 < 0) L1 = S.out.length;
        // letters of the padapāṭha, with the token each belongs to
        const P = []; const owner = [];
        toks.forEach((t, ti) => { for (const sg of tokSegs(t)) for (const c of letters(sg.text).out) { P.push(c); owner.push(ti); } });
        const { map } = align(S.out, P);
        const mid = toks.map((_, ti) => { const m = []; owner.forEach((o2, j) => { if (o2 === ti && map[j] >= 0) m.push(map[j]); }); return m.length ? m[m.length >> 1] : null; });
        let prev = false;
        list.push(toks.filter((_, ti) => { const m = mid[ti]; prev = m === null ? prev : m >= L0 && m < L1; return prev; }));
      });
      (outS[sk.id] ||= {})[gi] = list;
    });
  }
  fs.writeFileSync(path.join(OUT, 'sukta.json'), JSON.stringify(outS));
  console.log(`ts-pada: ${Object.keys(outS).length} sūktas, ${pieces} pieces (${cutPieces} cut inside a pañcāśat)`);
}
