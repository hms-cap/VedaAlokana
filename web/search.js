// Search: turns what someone typed into a list of links. No DOM and no module state, so the build
// scripts and tests can run it too. The app passes in how to load data and which Veda is open:
//
//   search(query, { catalog: () => Promise<catalog>, index: (id) => Promise<index>, names: () => Promise<names> }, { activeVeda })
//     → [{ group, score, href, label, hint }]
//
// The app reads href, label and hint; group ('ref' | 'sukta' | 'text' | 'facet') and score are for ranking.

import { FACETS, LAYERS, cap, fmt, refOf, groupName } from './common.js';
import { looseKey } from './search-key.js';

export const REF_PREFIX = { rv: 'rv', ṛv: 'rv', av: 'av', avś: 'av', vs: 'yv', yv: 'yv', ts: 'ts', tb: 'tb', ab: 'ab', kb: 'kb', pb: 'pb', gb: 'gb', chu: 'chu', bu: 'bu' };

// Devanagari and Kannada digits → 0-9, so "१.१६४.४६" and "೧.೧೬೪.೪೬" read as references
const asciiDigits = (s) => s.replace(/[०-९]/g, (c) => c.charCodeAt(0) - 0x966).replace(/[೦-೯]/g, (c) => c.charCodeAt(0) - 0xCE6);

export async function search(q, data, { activeVeda = 'rv' } = {}) {
  q = asciiDigits(q);
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
  // names: sūktas and their aliases, texts, named parts and the ṛṣis, devatās and metres of the open Veda.
  // Every spelling (Kannada, Devanagari, IAST, plain English) is folded to a loose key first.
  // Ranking: an exact match beats a prefix match beats a substring match; at equal quality a sūkta
  // comes before a text before a ṛṣi / devatā / metre (these by how many verses they have).
  const qk = m ? '' : looseKey(q);
  if (qk.length >= 2) {
    const { entries } = await data.names();
    const sukta = new Map(entries.filter((e) => e[0] === 's').map((e) => [e[1], e]));
    const best = new Map(); // href → hit, one row per target
    for (const e of entries) {
      const [type, id, label, deva, href, , keys, extra] = e;
      if (type === 'f' && extra[1] !== activeVeda) continue;
      let hit = 0;
      for (const k of keys) hit = Math.max(hit, k === qk ? 3 : k.startsWith(qk) ? 2 : qk.length >= 3 && k.includes(qk) ? 1 : 0);
      if (!hit) continue;
      let row;
      if (type === 's' || type === 'a') {
        const home = sukta.get(id);
        row = { group: 'sukta', score: hit * 1000 + 300 - (type === 'a' ? 1 : 0), href, label: `${type === 'a' ? `${label} → ${home[2]}` : label} · ${deva}`, hint: `Sūkta, ${extra[1]}` };
      } else if (type === 't') row = { group: 'text', score: hit * 1000 + 200, href, label: `${label} · ${deva}`, hint: LAYERS[extra].label };
      else if (type === 'g') row = { group: 'text', score: hit * 1000 + 200, href, label: `${label}`, hint: 'Part of a text' };
      else {
        const [f, , count] = extra;
        row = { group: 'facet', score: hit * 1000 + 100 + Math.log(count + 1), href, label: `${cap(label)}${deva ? ` · ${deva}` : ''}`, hint: `${FACETS[f].label}, ${fmt(count)}` };
      }
      const old = best.get(href);
      if (!old || old.score < row.score) best.set(href, row);
    }
    const hits = [...best.values()].sort((a, b) => b.score - a.score);
    for (const row of hits.slice(0, 9 - out.length)) out.push(row);
  }
  return out;
}
