// Resolves scripts/suktas.mjs against the built data and writes web/data/suktas.json.
//   node scripts/build-suktas.mjs [web/data]
// Run by build-data.mjs after the texts are written; can also run on its own.
// Each part becomes one or more segments { t, d1, d2, v: [first, last], a?, b? }: whole verses
// first..last of one section, `a` = [line, word] where the first verse starts, `b` = [line, word]
// (inclusive) where the last verse ends, when a sūkta starts or ends inside a unit of the source.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUKTAS } from './suktas.mjs';

// Spelling-insensitive form for finding words: no accents, nasals, visarga, viramas or
// punctuation; Taittirīya spellings (ख्ष, थ्स, doubled consonants, द्ध) folded to the common ones.
export const norm = (s) => s.normalize('NFC').replace(/ख्ष/g, 'क्ष').replace(/थ्स/g, 'त्स').replace(/द्ध/g, 'ध').replace(/ऱ/g, 'र')
  .replace(/ळ्ह/g, 'ढ').replace(/ळ/g, 'ड').replace(/[ङञणनम]्(?=[क-हळ])/g, '')
  .replace(/[ऀ-ः़॑-॔᳐-᳿꣠-ꣿᳪऽ\s।॥|,.0-9०-९()\-:;'"‌‍?!\[\]{}*]/g, '')
  .replace(/(.)्\1/g, '$1').replace(/्/g, '');

export function buildSuktas(OUT) {
  const cat = JSON.parse(fs.readFileSync(path.join(OUT, 'catalog.json'), 'utf8'));
  const meta = Object.fromEntries(cat.texts.map((t) => [t.id, t]));
  const files = {};
  const file = (t, d1) => (files[`${t}/${d1}`] ||= (() => {
    const p = path.join(OUT, t, `t${d1}.json`);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  })());
  const d1s = (t) => fs.readdirSync(path.join(OUT, t)).map((f) => f.match(/^t(\d+)\.json$/)).filter(Boolean).map((m) => Number(m[1])).sort((a, b) => a - b);
  // How a text's references read: which of d1, d2, v they name.
  const shape = (t) => ({ 'd1.d2.v': 3, label: 3, 'd2.v': 2, v: 1 }[meta[t].refFmt] || 3);

  // 'rv 8.81.1-9' → { t, d1, d2a, d2b, va, vb }
  function parseRef(s) {
    const [t, r] = s.split(' ');
    if (!meta[t]) throw new Error(`unknown text ${t}`);
    const [left, right] = r.split('-');
    const nums = left.split('.').map(Number);
    const k = shape(t);
    const full = k === 3 ? nums : k === 2 ? [1, ...nums] : [1, 1, ...nums];
    const [d1, d2, v] = full;
    if (v === undefined) return { t, d1, d2a: d2, d2b: right ? Number(right) : d2 };
    return { t, d1, d2a: d2, d2b: d2, va: v, vb: right ? Number(right) : v };
  }

  function refSegs(s) {
    const { t, d1, d2a, d2b, va, vb } = parseRef(s);
    const f = file(t, d1);
    if (!f) throw new Error(`${s}: no ${t} t${d1}.json`);
    const out = [];
    for (let d2 = d2a; d2 <= d2b; d2++) {
      const vs = f[d2];
      if (!vs || !vs.length) throw new Error(`${s}: ${t} ${d1}.${d2} not found`);
      const first = va ?? vs[0][0]; const last = vb ?? vs[vs.length - 1][0];
      if (!vs.some((x) => x[0] === first) || !vs.some((x) => x[0] === last)) throw new Error(`${s}: verses ${first}–${last} not in ${t} ${d1}.${d2}`);
      out.push({ t, d1, d2, v: [first, last] });
    }
    return out;
  }

  // words of a verse with their place: [[line, word, normalised]]
  const words = (verse) => verse[1].flatMap((l, li) => l.split(' ').map((w, wi) => [li, wi, norm(w)])).filter((w) => w[2]);

  function phraseSegs(p) {
    const q = norm(p.from); const e = p.to ? norm(p.to) : null;
    let scope = d1s(p.t).map((d1) => [d1, file(p.t, d1)]);
    let only = null;
    if (p.in) {
      const nums = p.in.split('.').map(Number);
      const full = shape(p.t) === 3 ? nums : [1, ...nums];
      scope = scope.filter(([d1]) => d1 === full[0]);
      if (full.length > 1) only = full[1];
    }
    // all verses in order
    const seq = [];
    for (const [d1, f] of scope) for (const [d2, vs] of Object.entries(f)) {
      if (only !== null && Number(d2) !== only) continue;
      for (const v of vs) seq.push({ d1, d2: Number(d2), v });
    }
    for (let i = 0; i < seq.length; i++) {
      const ws = words(seq[i].v);
      for (let w = 0; w < ws.length; w++) {
        let acc = ''; let k = w;
        while (k < ws.length && acc.length < q.length) acc += ws[k++][2];
        if (!acc.startsWith(q)) continue;
        // found the start at verse i, word w
        const segs = [];
        const push = (j, a, b) => {
          const s = seq[j]; const last = segs[segs.length - 1];
          if (last && last.d1 === s.d1 && last.d2 === s.d2 && !last.b && !a) { last.v[1] = s.v[0]; if (b) last.b = b; return; }
          segs.push({ t: p.t, d1: s.d1, d2: s.d2, v: [s.v[0], s.v[0]], ...(a ? { a } : {}), ...(b ? { b } : {}) });
        };
        const a = w > 0 ? [ws[w][0], ws[w][1]] : null;
        if (!e) {
          const n = p.n || 1;
          for (let j = i; j < i + n && j < seq.length; j++) push(j, j === i ? a : null, null);
          return segs;
        }
        // find the end: the phrase must finish at a word end, at or after the start
        for (let j = i; j < seq.length && j < i + 200; j++) {
          const wj = words(seq[j].v);
          const from = j === i ? w : 0;
          for (let x = from; x < wj.length; x++) {
            let tail = ''; let y = x;
            while (y >= from && tail.length < e.length) tail = wj[y--][2] + tail;
            if (tail.endsWith(e) && tail.length >= e.length) {
              const b = x < wj.length - 1 ? [wj[x][0], wj[x][1]] : null;
              for (let z = i; z <= j; z++) push(z, z === i ? a : null, z === j ? b : null);
              return segs;
            }
          }
        }
        throw new Error(`"${p.to}" not found after "${p.from}" in ${p.t}`);
      }
    }
    throw new Error(`"${p.from}" not found in ${p.t}${p.in ? ` ${p.in}` : ''}`);
  }

  const range = (a, b) => (a === b ? `${a}` : `${a}–${b}`);
  function refText(s) {
    const m = meta[s.t]; const k = shape(s.t);
    const f = file(s.t, s.d1)[s.d2];
    const whole = !s.a && !s.b && s.v[0] === f[0][0] && s.v[1] === f[f.length - 1][0];
    if (m.refFmt === 'label') {
      const l0 = f.find((x) => x[0] === s.v[0])[5]; const l1 = f.find((x) => x[0] === s.v[1])[5];
      return l0 === l1 ? l0 : `${l0}–${l1.split('.').pop()}`;
    }
    const head = k === 3 ? `${s.d1}.${s.d2}` : k === 2 ? `${s.d2}` : '';
    if (whole && head) return head;
    return head ? `${head}.${range(s.v[0], s.v[1])}` : range(s.v[0], s.v[1]);
  }

  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const seen = new Set();
  const out = SUKTAS.map((e) => {
    // a part may be [where, title, title deva]: a heading in the sūkta (Navagraha: सूर्यः, चन्द्रः …)
    const segs = e.parts.flatMap((p) => {
      const [where, title, titleDeva] = Array.isArray(p) ? p : [p];
      const out = typeof where === 'string' ? refSegs(where) : phraseSegs(where);
      if (title) Object.assign(out[0], { title, titleDeva });
      return out;
    });
    let id = slug(e.name); if (seen.has(id)) id = slug(`${e.name} ${e.veda}`); seen.add(id);
    const verses = segs.flatMap((s) => file(s.t, s.d1)[s.d2].filter((x) => x[0] >= s.v[0] && x[0] <= s.v[1]));
    // the opening line shown in lists: the first verse, cut where the sūkta starts
    const s0 = segs[0]; const v0 = verses[0];
    let line = (v0[1][0] || '');
    if (s0.a) line = v0[1][s0.a[0]].split(' ').slice(s0.a[1]).join(' ');
    // group references by text: "RV 8.81.1–9, 10.112.9–10"
    const parts = [];
    for (const s of segs) {
      const r = refText(s);
      const last = parts[parts.length - 1];
      if (last && last.t === s.t) last.refs.push(r); else parts.push({ t: s.t, refs: [r] });
    }
    for (const sg of segs) sg.ref = refText(sg);
    // refs: [[text, reference without the text's abbreviation]], so the app can write either RV or ऋ.
    let refs = parts.map((p) => [p.t, [...new Set(p.refs)].join(', ')]);
    if (e.label) refs = e.label.startsWith(`${meta[s0.t].ref} `) ? [[s0.t, e.label.slice(meta[s0.t].ref.length + 1)]] : [[s0.t, '']];
    const ref = e.label || refs.map(([t, r]) => `${meta[t].ref} ${r}`).join('; ');
    const single = segs.length === 1 && !s0.a && !s0.b;
    return {
      id, veda: e.veda, name: e.name, deva: e.deva, devata: e.devata, devataDeva: e.devataDeva, kind: e.kind,
      ref, refs, text: s0.t, segs, count: verses.length, line: line.trim(), roman: (!s0.a && v0[2] && v0[2][0]) || '',
      href: `#/s/${id}`, reader: single ? `#/v/${s0.t}/c/${s0.d1}/${s0.d2}${s0.v[0] !== file(s0.t, s0.d1)[s0.d2][0][0] ? `?v=${s0.v[0]}` : ''}` : '',
    };
  });
  fs.writeFileSync(path.join(OUT, 'suktas.json'), JSON.stringify(out));
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = buildSuktas(process.argv[2] || 'web/data');
  const by = {}; for (const s of out) by[s.veda] = (by[s.veda] || 0) + 1;
  console.log(`suktas: ${out.length}`, by);
}
