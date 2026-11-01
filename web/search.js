// Search: turns what someone typed into a list of links. No DOM and no module state, so the build
// scripts and tests can run it too. The app passes in how to load data and which Veda is open:
//
//   search(query, { catalog: () => Promise<catalog>, index: (id) => Promise<index> }, { activeVeda })
//     → [{ group, score, href, label, hint }]
//
// The app reads href, label and hint; group ('ref' | 'text' | 'facet') and score are for ranking.

import { FACETS, FKEYS, LAYERS, cap, fmt, refOf, groupName, findHref } from './common.js';

export const REF_PREFIX = { rv: 'rv', ṛv: 'rv', av: 'av', avś: 'av', vs: 'yv', yv: 'yv', ts: 'ts', tb: 'tb', ab: 'ab', kb: 'kb', pb: 'pb', gb: 'gb', chu: 'chu', bu: 'bu' };

export async function search(q, data, { activeVeda = 'rv' } = {}) {
  const out = [];
  const m = q.trim().toLowerCase().match(/^(?:([a-zṛś]{2,3})\s*)?(\d+)(?:[.\s:/](\d+))?(?:[.\s:/](\d+))?$/);
  const cat = await data.catalog();
  if (m) {
    const id = REF_PREFIX[m[1]] || activeVeda;
    const meta = cat.texts.find((v) => v.id === id);
    const x = await data.index(id);
    const nums = [m[2], m[3], m[4]].filter(Boolean).map(Number);
    let d1; let d2; let v;
    if (meta.refFmt === 'v') { d1 = x.groups[0][0]; d2 = x.groups[0][1][0][0]; [v] = nums; }
    else if (meta.refFmt === 'd2.v') { d1 = x.groups[0][0]; [d2, v] = nums; } else [d1, d2, v] = nums;
    const g = x.groups.find((e) => e[0] === d1);
    if (g && d2 === undefined) out.push({ group: 'ref', score: 1000, href: x.groups.length > 1 ? `#/v/${id}/g/${d1}` : `#/v/${id}/c/${d1}/${d1}`, label: `${meta.name}, ${groupName(meta, d1)}`, hint: 'Open' });
    else if (meta.refFmt !== 'label' && g && g[1].some((c) => c[0] === d2)) out.push({ group: 'ref', score: 1000, href: `#/v/${id}/c/${d1}/${d2}${v ? `?v=${v}` : ''}`, label: `${meta.ref} ${refOf(meta, d1, d2, v)}`, hint: meta.name });
  }
  const ql = q.trim().toLowerCase();
  if (ql.length >= 2 && !m) {
    for (const t of cat.texts) {
      if (t.name.toLowerCase().includes(ql) || t.deva.includes(q.trim())) out.push({ group: 'text', score: 500, href: `#/v/${t.id}`, label: `${t.name} · ${t.deva}`, hint: LAYERS[t.layer].label });
      if (out.length >= 4) break;
    }
  }
  if (ql.length >= 2) {
    const x = await data.index(activeVeda);
    const hits = [];
    for (const f of FKEYS) {
      for (const e of x.facets[f]) {
        const ia = e[1].toLowerCase();
        const starts = ia.startsWith(ql) || e[0].startsWith(ql) || (e[2] && e[2].startsWith(q.trim()));
        if (starts || ia.includes(ql) || e[0].includes(ql) || (e[2] && e[2].includes(q.trim()))) hits.push([Math.log(e[3] + 1) + (starts ? 2 : 0), e[3], f, e]);
      }
    }
    hits.sort((a, b) => b[0] - a[0]);
    for (const hit of hits.slice(0, 9 - out.length)) {
      const [, , f, e] = hit;
      out.push({ group: 'facet', score: hit[0], href: findHref(activeVeda, { [f]: e[0] }), label: `${cap(e[1])}${e[2] ? ` · ${e[2]}` : ''}`, hint: `${FACETS[f].label}, ${fmt(e[3])}` });
    }
  }
  return out;
}
