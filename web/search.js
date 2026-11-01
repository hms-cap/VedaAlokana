// Search: turns what someone typed into a list of links. No DOM and no module state, so the build
// scripts and tests can run it too. The app passes in how to load data and which Veda is open:
//
//   search(query, { catalog: () => Promise<catalog>, index: (id) => Promise<index>, names: () => Promise<names>, aliases?: () => Promise<aliases> }, { activeVeda })
//     → [{ group, score, href, label, hint }]
//
// The app reads href, label and hint; group ('ref' | 'sukta' | 'text' | 'facet') and score are for ranking.

import { FACETS, LAYERS, cap, fmt, refOf, groupName, findHref } from './common.js';
import { looseKey } from './search-key.js';
import { parseQuery, vocabulary } from './query.js';

export const REF_PREFIX = { rv: 'rv', ṛv: 'rv', av: 'av', avś: 'av', vs: 'yv', yv: 'yv', ts: 'ts', tb: 'tb', ab: 'ab', kb: 'kb', pb: 'pb', gb: 'gb', chu: 'chu', bu: 'bu' };

// Devanagari and Kannada digits → 0-9, so "१.१६४.४६" and "೧.೧೬೪.೪೬" read as references
const asciiDigits = (s) => s.replace(/[०-९]/g, (c) => c.charCodeAt(0) - 0x966).replace(/[೦-೯]/g, (c) => c.charCodeAt(0) - 0xCE6);

// The groups a result list is sorted into, best first. A group is shown with its title in English or Sanskrit.
export const RESULT_GROUPS = [
  { id: 'ref', en: 'Go to', sa: 'गम्यताम्' },
  { id: 'sukta', en: 'Sūktas', sa: 'सूक्तानि' },
  { id: 'text', en: 'Texts and parts', sa: 'ग्रन्थाः' },
  { id: 'facet', en: 'Ṛṣi · devatā · metre', sa: 'ऋषिः · देवता · छन्दः' },
];

/** Sorted results → [{ group, items }] in RESULT_GROUPS order; at most perGroup items each. */
export function groupResults(items, perGroup = Infinity) {
  return RESULT_GROUPS.map((g) => ({ group: g, all: items.filter((i) => i.group === g.id) }))
    .filter((g) => g.all.length)
    .map((g) => ({ group: g.group, items: g.all.slice(0, perGroup), more: Math.max(0, g.all.length - perGroup) }));
}

// veda: null (all) or one of rv kyv syv av sv; limit: how many rows at most
export async function search(q, data, { activeVeda = 'rv', veda = null, limit = 9 } = {}) {
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
    const parsed = data.aliases ? parseQuery(q, vocabulary(await data.aliases())) : null;
    const vedas = veda ? new Set([veda]) : parsed?.vedas || null; // rows of sūktas and texts outside these Vedas are dropped
    // ṛṣi / devatā / metre are only recorded for the Ṛgveda, Atharvaveda and Sāmaveda; a Yajurveda chip has none
    const facetText = vedas ? ['rv', 'av', 'sv'].find((v) => vedas.has(v)) || (veda ? null : activeVeda) : activeVeda;
    const best = new Map(); // href → row, one row per target
    const keep = (row) => { const old = best.get(row.href); if (!old || old.score < row.score) best.set(row.href, row); };
    const hitOf = (keys, k) => keys.reduce((h, x) => Math.max(h, x === k ? 3 : x.startsWith(k) ? 2 : k.length >= 4 && x.includes(k) ? 1 : 0), 0);

    // rows for one key; minHit 3 = exact matches only
    const rowsFor = (k, minHit = 1) => {
      for (const e of entries) {
        const [type, id, label, deva, href, , keys, extra] = e;
        if (type === 'f' && extra[1] !== facetText) continue;
        const hit = hitOf(keys, k);
        if (hit < minHit) continue;
        let row;
        if (type === 's' || type === 'a') {
          const home = sukta.get(id);
          row = { group: 'sukta', score: hit * 1000 + 300 - (type === 'a' ? 1 : 0), href, label: `${type === 'a' ? `${label} → ${home[2]}` : label} · ${deva}`, hint: `Sūkta, ${extra[1]}`, veda: extra[0] };
        } else if (type === 't') row = { group: 'text', score: hit * 1000 + 200, href, label: `${label} · ${deva}`, hint: LAYERS[extra[0]].label, veda: extra[1] };
        else if (type === 'g') row = { group: 'text', score: hit * 1000 + 200, href, label: `${label}`, hint: 'Part of a text', veda: extra[1] };
        else {
          const [f, , count] = extra;
          row = { group: 'facet', score: hit * 1000 + 100 + Math.log(count + 1), href, label: `${cap(label)}${deva ? ` · ${deva}` : ''}`, hint: `${FACETS[f].label}, ${fmt(count)}`, facet: f };
        }
        keep(row);
      }
    };
    rowsFor(qk);
    const exactName = [...best.values()].some((r) => r.score >= 3000); // the whole query is a name: no combining

    if (parsed?.tagged) {
      // the kind, Veda, facet and stop words are not part of the name: "agni suktam" also looks for agni
      const rest = parsed.words.join('');
      if (rest.length >= 2 && rest !== qk) rowsFor(looseKey(rest));
      // everyday words point to devatās: "dawn" → Uṣas
      for (const c of parsed.concepts) for (const t of c.to) rowsFor(t, 3);
      // sūktas of a devatā: "agni suktam", "hymn to dawn" → the sūktas whose devatā is Agni, Uṣas
      const wanted = new Set([...parsed.words, ...parsed.concepts.flatMap((c) => c.to)].filter((k) => k.length >= 2));
      for (const e of entries) {
        if (e[0] !== 's' || !wanted.size) continue;
        const [, , label, deva, href, , , extra] = e;
        const dev = [extra[2], extra[3]].filter(Boolean).flatMap((d) => [d, d.replace(/\s*\([^)]*\)/g, '')]).map(looseKey);
        if (dev.some((k) => wanted.has(k))) keep({ group: 'sukta', score: parsed.kind ? 3050 : 2200, href, label: `${label} · ${deva}`, hint: `Sūkta, ${extra[1]}`, veda: extra[0] });
      }
      // a Veda word restricts sūktas; a facet word restricts the kind of ṛṣi / devatā / metre
      if (parsed.facets.size && (parsed.words.length || parsed.concepts.length)) for (const [h, r] of best) if (r.facet && !parsed.facets.has(r.facet)) best.delete(h);
      // a kind word asks for sūktas: ṛṣi / devatā / metre rows come after them
      if (parsed.kind) for (const r of best.values()) if (r.group === 'facet') r.score -= 1500;
    }
    // two or three facet values: "vasishtha varuna", "indra trishtup" → one list with all the filters
    if (parsed && !exactName && parsed.words.length >= 2 && parsed.words.length <= 3) {
      facetCombos(entries, facetText, parsed.words, parsed.facets).forEach((c, i) => keep({ group: 'facet', score: 5000 - i * 10, href: findHref(facetText, c.filters), label: c.label, hint: 'Filter' }));
    }
    // a Veda chip (or Veda words next to a name) drops sūktas and texts of other Vedas
    if (vedas && (veda || parsed?.words.length || parsed?.concepts.length)) for (const [h, r] of best) if (r.veda && !vedas.has(r.veda)) best.delete(h);
    const hits = [...best.values()].sort((a, b) => b.score - a.score);
    for (const row of hits.slice(0, limit - out.length)) out.push(row);
  }
  return out;
}

// Every word must name a different kind of facet (ṛṣi, devatā, chandas). For each word and kind the best
// reading is the one that matches the word most closely and has the most verses behind it; the three best
// ways of pairing words with kinds are returned as { filters: { rishi: id, … }, label }.
function facetCombos(entries, text, words, only) {
  const pick = words.map((w) => {
    const per = {}; // facet → best entry for this word
    for (const [type, id, label, , , , keys, extra] of entries) {
      if (type !== 'f' || extra[1] !== text || (only.size && !only.has(extra[0]))) continue;
      const hit = keys.reduce((h, k) => Math.max(h, k === w ? 3 : k.startsWith(w) ? 2 : w.length >= 4 && k.includes(w) ? 1 : 0), 0);
      if (!hit) continue;
      const value = hit * 1.5 + Math.log(extra[2] + 1);
      if (!per[extra[0]] || per[extra[0]].value < value) per[extra[0]] = { f: extra[0], id, label, value };
    }
    return Object.values(per);
  });
  if (pick.some((p) => !p.length)) return [];
  const found = [];
  const walk = (i, used, chosen, sum) => {
    if (i === pick.length) { found.push({ sum, chosen }); return; }
    for (const c of pick[i]) if (!used.has(c.f)) walk(i + 1, new Set([...used, c.f]), [...chosen, c], sum + c.value);
  };
  walk(0, new Set(), [], 0);
  return found.sort((a, b) => b.sum - a.sum).slice(0, 3).map(({ chosen }) => ({
    filters: Object.fromEntries(chosen.map((c) => [c.f, c.id])),
    label: chosen.map((c) => `${FACETS[c.f].label} ${cap(c.label)}`).join(' + '),
  }));
}
