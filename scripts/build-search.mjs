// Builds the search indexes in web/data/search/ from the built data.
//   node scripts/build-search.mjs [web/data]
// Run by build-data.mjs after suktas.json is written; can also run on its own on existing data.
//
// names.json — what a person types when they know a name: sūktas and their aliases, texts, the
// named parts of a text (Pūrvārcika …), and every ṛṣi / devatā / chandas of every Veda.
//   { v: 1, built, entries: [[type, id, label, deva, href, strictKey, [looseKey, …], extra]] }
//   strictKey and the first looseKey are of the name without its bracket; further loose keys are of the
//   full label and of the Devanagari name when it sounds different.
//   type 's' sūkta (id = sūkta id, extra = veda)    'a' alias of a sūkta (same id and href)
//        't' text (id = text id, extra = layer)     'g' named part (id = text id, extra = d1)
//        'f' facet (id = facet id, extra = [facet, text, verse count])
// The Kannada spelling is not stored: the keys fold Kannada, Devanagari and IAST to the same
// string (web/search-key.js), so a Kannada query finds the same entry.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strictKey, looseKey } from '../web/search-key.js';
import { findHref } from '../web/common.js';

export function buildNames(dataDir) {
  const read = (...p) => JSON.parse(fs.readFileSync(path.join(dataDir, ...p), 'utf8'));
  const catalog = read('catalog.json');
  const suktas = read('suktas.json');
  const entries = [];
  // Keys: the name without its bracket ("Sūrya Sūkta (ud u tyam)" → "Sūrya Sūkta") is the main key, so
  // "surya suktam" finds it; the full label and a Devanagari name that sounds different (सौरसूक्तम्)
  // follow as extra loose keys.
  const core = (l) => l.replace(/\s*\([^)]*\)/g, '').trim() || l;
  const add = (type, id, label, deva, href, extra) => {
    const c = core(label);
    const lks = [...new Set([looseKey(c), looseKey(label), looseKey(deva || '')].filter(Boolean))];
    if (!lks.length) return;
    entries.push([type, id, label, deva || '', href, strictKey(c) || strictKey(deva || ''), lks, extra ?? null]);
  };
  for (const s of suktas) {
    add('s', s.id, s.name, s.deva, s.href, s.veda);
    for (const [en, deva] of s.aliases || []) add('a', s.id, en, deva, s.href, s.veda);
  }
  for (const t of catalog.texts) {
    add('t', t.id, t.name, t.deva, `#/v/${t.id}`, t.layer);
    for (const [d1, name] of Object.entries(t.groupNames || {})) add('g', t.id, name, '', `#/v/${t.id}/g/${d1}`, Number(d1));
    const facets = read(t.id, 'index.json').facets || {};
    for (const [f, list] of Object.entries(facets)) {
      for (const [id, en, deva, count] of list) add('f', id, en, deva, findHref(t.id, { [f]: id }), [f, t.id, count]);
    }
  }
  const out = { v: 1, built: catalog.built, entries };
  fs.mkdirSync(path.join(dataDir, 'search'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'search', 'names.json'), JSON.stringify(out));
  return out;
}

export function buildSearch(dataDir) {
  const names = buildNames(dataDir);
  const by = {}; for (const e of names.entries) by[e[0]] = (by[e[0]] || 0) + 1;
  console.log('search/names.json:', names.entries.length, by);
  return { names };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildSearch(process.argv[2] || 'web/data');
