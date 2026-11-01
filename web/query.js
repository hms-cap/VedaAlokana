// Query parser: splits what was typed into words and tags the ones the search understands.
// Rule-based, no DOM. The word lists are in data/search-aliases.json (hand-edited, see
// scripts/search-aliases.json); words are compared by loose key, so any script matches.
//
//   parseQuery(q, aliases) → {
//     words:     loose keys of the words left over (names, mantra words)      ['indra', 'tristup']
//     kind:      a kind word was typed (sūkta, hymn, mantra …)               boosts sūktas
//     facets:    Set of 'rishi' | 'devata' | 'chandas' named by a facet word  (empty = any)
//     vedas:     Set of Veda ids from Veda words, or null                     {'kyv'}
//     concepts:  [{ word, to: [loose keys of the devatā names] }]
//     tagged:    true when any word was understood (so more than the plain name search is useful)
//   }
import { looseKey } from './search-key.js';

const YV = { yv: ['syv', 'kyv'] };

export function vocabulary(a) {
  const keys = (list) => new Set(list.map(looseKey).filter(Boolean));
  const map = (obj) => { const m = new Map(); for (const [id, ws] of Object.entries(obj)) for (const w of ws) { const k = looseKey(w); if (k) m.set(k, id); } return m; };
  const concept = new Map();
  for (const [name, c] of Object.entries(a.concept || {})) if (c && Array.isArray(c.words)) for (const w of c.words) { const k = looseKey(w); if (k) concept.set(k, { name, to: c.to.map(looseKey) }); }
  return { kind: keys(a.kind || []), stop: keys(a.stop || []), facet: map(a.facet || {}), veda: map(a.veda || {}), concept };
}

export function parseQuery(q, vocab) {
  const out = { words: [], kind: false, facets: new Set(), vedas: null, concepts: [], tagged: false };
  const vedaSets = [];
  for (const raw of String(q).split(/[\s,;]+/)) {
    const k = looseKey(raw);
    if (!k) continue;
    if (vocab.stop.has(k)) { out.tagged = true; continue; }
    if (vocab.kind.has(k)) { out.kind = true; out.tagged = true; continue; }
    if (vocab.facet.has(k)) { out.facets.add(vocab.facet.get(k)); out.tagged = true; continue; }
    if (vocab.veda.has(k)) { const id = vocab.veda.get(k); vedaSets.push(new Set(YV[id] || [id])); out.tagged = true; continue; }
    if (vocab.concept.has(k)) { out.concepts.push({ word: raw, ...vocab.concept.get(k) }); out.tagged = true; continue; }
    out.words.push(k);
  }
  if (vedaSets.length) {
    // "krishna yajurveda" = kyv ∩ {syv, kyv}; words that do not overlap ("rig atharva") add up
    const inter = vedaSets.reduce((x, y) => new Set([...x].filter((v) => y.has(v))));
    out.vedas = inter.size ? inter : new Set(vedaSets.flatMap((s) => [...s]));
  }
  return out;
}
