// Builds the search indexes in web/data/search/ from the built data.
//   node scripts/build-search.mjs [web/data]
// Run by build-data.mjs after suktas.json is written; can also run on its own on existing data.
//
// names.json — what a person types when they know a name: sūktas and their aliases, texts, the
// named parts of a text (Pūrvārcika …), and every ṛṣi / devatā / chandas of every Veda.
//   { v: 1, built, entries: [[type, id, label, deva, href, strictKey, [looseKey, …], extra]] }
//   strictKey and the first looseKey are of the name without its bracket; further loose keys are of the
//   full label, of the Devanagari name when it sounds different, and of each word of a facet name.
//   type 's' sūkta (id = sūkta id, extra = [veda, reference, devatā, devatā in Devanagari])    'a' alias of a sūkta (same id, href, extra)
//        't' text (id = text id, extra = [layer, veda])     'g' named part (id = text id, extra = [d1, veda])
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
    // a ṛṣi or devatā named by several words (gāthino viśvāmitraḥ) is also found by any one of them
    const words = type === 'f' ? label.split(/\s+/).filter((w) => w.length > 1).map(looseKey).filter((k) => k.length >= 3) : [];
    const lks = [...new Set([looseKey(c), looseKey(label), looseKey(deva || ''), ...words].filter(Boolean))];
    if (!lks.length) return;
    entries.push([type, id, label, deva || '', href, strictKey(c) || strictKey(deva || ''), lks, extra ?? null]);
  };
  for (const s of suktas) {
    add('s', s.id, s.name, s.deva, s.href, [s.veda, s.ref, s.devata, s.devataDeva]);
    for (const [en, deva] of s.aliases || []) add('a', s.id, en, deva, s.href, [s.veda, s.ref, s.devata, s.devataDeva]);
  }
  for (const t of catalog.texts) {
    add('t', t.id, t.name, t.deva, `#/v/${t.id}`, [t.layer, t.veda]);
    for (const [d1, name] of Object.entries(t.groupNames || {})) add('g', t.id, name, '', `#/v/${t.id}/g/${d1}`, [Number(d1), t.veda]);
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

// scripts/search-aliases.json → web/data/search-aliases.json, after checking its shape
export function copyAliases(dataDir) {
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), 'search-aliases.json');
  const a = JSON.parse(fs.readFileSync(src, 'utf8'));
  const bad = [];
  for (const k of ['kind', 'stop']) if (!Array.isArray(a[k]) || !a[k].every((w) => typeof w === 'string')) bad.push(k);
  for (const k of ['facet', 'veda']) for (const [id, ws] of Object.entries(a[k] || {})) if (!Array.isArray(ws)) bad.push(`${k}.${id}`);
  for (const [id, c] of Object.entries(a.concept || {})) if (!id.startsWith('_') && !(Array.isArray(c.to) && Array.isArray(c.words))) bad.push(`concept.${id}`);
  if (bad.length) throw new Error(`search-aliases.json: wrong shape at ${bad.join(', ')}`);
  delete a._about; delete a.concept._about;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'search-aliases.json'), JSON.stringify(a));
}

// ---- mantra words: opening words (pratika.tsv) and the whole mantra (text-<veda>.tsv) ----
// Saṃhitās and Upaniṣads (Hemanth); the Brāhmaṇas and Āraṇyakas are not indexed. One unit per verse.
// A unit is named by a ref: "<text>/<d1>/<d2>/<verse>" for a verse in the reading files (the app link is
// #/v/<text>/c/<d1>/<d2>?v=<verse>), "s/<sūkta id>/<n>" for a verse of a sūkta whose text is kept in
// suktas.json (the app link is #/s/<sūkta id>).
//   text-<veda>.tsv   <ref> TAB <loose key of the whole mantra>        one file per Veda, so a query loads one
//   pratika.tsv       <loose key of the first three words> TAB <refs, space separated>   sorted by key
// Keys are made by web/search-key.js, the same code that folds a typed query. No strict key is stored here:
// it would add 45% to a file read at the first keystroke and only separates spellings that differ in a diacritic.
const INDEXED_LAYERS = new Set(['samhita', 'upanishad']);
const words = (lines) => lines.join(' ').split(/\s+/).filter((w) => /[\p{L}\p{M}]/u.test(w) && !/^[।॥|]+$/.test(w));

export function buildMantras(dataDir) {
  const read = (...p) => JSON.parse(fs.readFileSync(path.join(dataDir, ...p), 'utf8'));
  const catalog = read('catalog.json');
  const perVeda = {}; // veda → [ref, key]
  const opening = new Map(); // loose key of the first three words → { strict, refs }
  let units = 0;
  const unit = (veda, ref, lines) => {
    const ws = words(lines);
    if (!ws.length) return;
    const lk = looseKey(ws.join(' '));
    if (!lk) return;
    (perVeda[veda] ||= []).push(`${ref}\t${lk}`);
    // a leading ॐ is not part of how a mantra is named: "pūrṇam adaḥ …", not "oṃ pūrṇam adaḥ"
    let from = 0; while (from < ws.length - 1 && looseKey(ws[from]) === 'o') from++;
    const first = ws.slice(from, from + 3).join(' ');
    const pk = looseKey(first);
    const o = opening.get(pk) || { refs: [] };
    o.refs.push(ref); opening.set(pk, o);
    units++;
  };
  for (const t of catalog.texts) {
    if (!INDEXED_LAYERS.has(t.layer) || !t.has?.roman && !t.has?.svara) continue; // sv has the English only
    for (const f of fs.readdirSync(path.join(dataDir, t.id)).filter((n) => /^t\d+\.json$/.test(n))) {
      const d1 = f.slice(1, -5);
      for (const [d2, verses] of Object.entries(read(t.id, f))) {
        for (const v of verses) unit(t.veda, `${t.id}/${d1}/${d2}/${v[0]}`, v[1].length ? v[1] : v[2]);
      }
    }
  }
  // sūktas whose text lives in suktas.json (Śrī Sūkta, Medhā Sūkta …): their verses are not in a reading file
  for (const s of read('suktas.json')) {
    if (s.segs.length) continue;
    for (const v of s.versions[0].verses) if (v.lines) unit(s.veda, `s/${s.id}/${v.n}`, v.lines);
  }
  fs.mkdirSync(path.join(dataDir, 'search'), { recursive: true });
  const sizes = {};
  for (const [veda, rows] of Object.entries(perVeda)) {
    fs.writeFileSync(path.join(dataDir, 'search', `text-${veda}.tsv`), rows.join('\n'));
    sizes[veda] = rows.length;
  }
  const lines = [...opening].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, o]) => `${k}\t${o.refs.join(' ')}`);
  fs.writeFileSync(path.join(dataDir, 'search', 'pratika.tsv'), lines.join('\n'));
  return { units, openings: lines.length, perVeda: sizes };
}

export function buildSearch(dataDir) {
  copyAliases(dataDir);
  const names = buildNames(dataDir);
  const by = {}; for (const e of names.entries) by[e[0]] = (by[e[0]] || 0) + 1;
  console.log('search/names.json:', names.entries.length, by);
  const m = buildMantras(dataDir);
  console.log('search/pratika.tsv + text-<veda>.tsv:', m.units, 'mantras,', m.openings, 'distinct openings', m.perVeda);
  return { names, mantras: m };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildSearch(process.argv[2] || 'web/data');
