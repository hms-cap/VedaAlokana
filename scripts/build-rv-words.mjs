#!/usr/bin/env node
// Builds the Ṛgveda word data (web/data/rv/w1.json … w10.json and wl.json) from the VedaWeb Zurich annotation:
//   node scripts/build-rv-words.mjs <vedaweb_zurich.xlsx> [web/data]
//
// Source: "The morphologically glossed Rigveda – The Zurich annotation corpus revised and extended" (Reinöhl, Casaretto, Coenen,
// Fischer, Halfmann, Korobzow, Kölligan), hosted by VedaWeb; Zenodo, DOI 10.5281/zenodo.21527084, CC BY 4.0.
// The file is not kept in the repo (10 MB); the built data is.
//
// Output
//   rv/wl.json   { v, lemmas: [[stem (IAST), kind, Grassmann id], …], grams: ["accusative singular masculine", …] }
//                kind: n noun/adjective stem · v verb root · i invariable word · p pronoun
//   rv/w<m>.json { "<sūkta>": { "<verse>": [[word (IAST), lemma index, grammar index], …], … }, … }
// The words are the padapāṭha words of the verse, as the app shows them: where a word of our own Ṛgveda padapāṭha (the t<m>.json
// files, with its compound breaks) agrees with the annotation, it is kept; where it does not (words run together, letters lost), the
// annotation's word is used. Every word carries the lemma and the grammar of the annotation.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { cleanPada } from '../web/pada.js';

// ---- a small .xlsx reader (zip + XML), enough for one plain sheet ----
function unzip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16);
  const files = new Map();
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10); const csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28); const xl = buf.readUInt16LE(p + 30); const cl = buf.readUInt16LE(p + 32); const off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    const ln = buf.readUInt16LE(off + 26); const lx = buf.readUInt16LE(off + 28);
    const data = buf.subarray(off + 30 + ln + lx, off + 30 + ln + lx + csize);
    files.set(name, () => (method === 0 ? data : zlib.inflateRawSync(data)));
    p += 46 + nl + xl + cl;
  }
  return files;
}
const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
export function readXlsx(file) {
  const z = unzip(fs.readFileSync(file));
  const ss = [];
  if (z.has('xl/sharedStrings.xml')) {
    for (const m of z.get('xl/sharedStrings.xml')().toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      ss.push(unxml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')));
    }
  }
  const sheet = z.get('xl/worksheets/sheet1.xml')().toString('utf8');
  const col = (r) => { let n = 0; for (const c of r.replace(/\d+/g, '')) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };
  const rows = [];
  for (const rm of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const r = /r="([A-Z]+\d+)"/.exec(cm[1])?.[1]; const t = /t="(\w+)"/.exec(cm[1])?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(cm[2] || '')?.[1];
      let val = null;
      if (t === 's') val = ss[Number(v)]; else if (t === 'inlineStr') val = unxml(/<t[^>]*>([\s\S]*?)<\/t>/.exec(cm[2])?.[1] || ''); else if (v !== undefined) val = unxml(v);
      if (r && val !== null && val !== '') row[col(r)] = val;
    }
    rows.push(row);
  }
  return rows;
}

// ---- spelling ----
/** IAST of the annotation: accents removed, ṛ written as one letter. */
export const plain = (s) => s.normalize('NFD').replace(/[́̀̂̍]/g, '').replace(/r̥/g, 'ṛ').replace(/l̥/g, 'ḷ').normalize('NFC').replace(/ṁ/g, 'ṃ').replace(/m̐/g, 'ṃ');
/** The same, for comparing: no length-insensitive tricks, but no hyphens and only letters. */
export const norm = (s) => plain(s).toLowerCase().replace(/[-\s]/g, '').replace(/ṝ/g, 'r').replace(/ṛ/g, 'r').replace(/ḷ/g, 'l').replace(/[^a-zāīūṃḥṅñṇṭḍśṣ]/g, '');
/** Two spellings of one word that differ only at the end (the annotation writes sa, punar where the padapāṭha has saḥ, punaḥ). */
export const sameStem = (a, b) => { const n = Math.min(a.length, b.length) - 1; return n >= 1 && Math.abs(a.length - b.length) <= 2 && a.slice(0, n) === b.slice(0, n); };

// ---- grammar in English words ----
const CASE = { 'Nom.': 'nominative', 'Akk.': 'accusative', 'Instr.': 'instrumental', 'Dat.': 'dative', 'Abl.': 'ablative', 'Gen.': 'genitive', 'Lok.': 'locative', 'Vok.': 'vocative' };
const NUM = { 'Sg.': 'singular', 'Du.': 'dual', 'Pl.': 'plural' };
const GEN = { 'm.': 'masculine', 'f.': 'feminine', 'n.': 'neuter' };
const TENSE = { 'Präs.': 'present', 'Aor.': 'aorist', 'Perf.': 'perfect', 'Imperf.': 'imperfect', 'Pluperf.': 'pluperfect', 'Fut.': 'future' };
const MOOD = { 'Ind.': 'indicative', 'Ipv.': 'imperative', 'Inj.': 'injunctive', 'Konj.': 'subjunctive', 'Opt.': 'optative', 'Prek.': 'precative', 'si-Ipv.': 'si-imperative', 'Kond.': 'conditional' };
const VOICE = { 'akt.': 'active', 'med.': 'middle', 'pass.': 'passive' };
const NONFIN = { 'Ptz.': 'participle', 'ta-Ptz.': 'participle in -ta', 'na-Ptz.': 'participle in -na', 'Inf.': 'infinitive', 'Gdv.': 'gerundive', 'Abs.': 'absolutive' };
const DERIV = { 'Kaus.': 'causative', 'Den.': 'denominative', 'Int.': 'intensive', 'Des.': 'desiderative' };
const DEGREE = { 'comp.': 'comparative', 'sup.': 'superlative' };
/** Translates "Dat./Gen."-style alternatives word by word. */
const tr = (map, v) => (v ? String(v).replace(/\?/g, '').split('/').map((x) => map[x.trim()] ?? x.trim()).join(' or ') : '');
export function gramOf(r, H) {
  const g = (k) => r[H[k]];
  const person = g('PERSON') ? `${String(g('PERSON')).replace('.', '').replace('?', '')}${{ 1: 'st', 2: 'nd', 3: 'rd' }[String(g('PERSON'))[0]]} person` : '';
  const parts = [
    g('ABGELEITETE_KONJUGATION') && tr(DERIV, g('ABGELEITETE_KONJUGATION')),
    tr(MOOD, g('MODUS')), tr(TENSE, g('TEMPUS')), tr(VOICE, g('DIATHESE')),
    person, tr(NONFIN, g('INFINIT')), tr(DEGREE, g('GRADUS')),
    tr(CASE, g('KASUS')), tr(NUM, g('NUMERUS')), tr(GEN, g('GENUS')),
  ].filter(Boolean);
  if (g('LOKALPARTIKEL')) parts.push('local particle');
  return parts.join(' ');
}

const KIND = { Nominalstamm: 'n', 'nominal stem': 'n', Wurzel: 'v', Invariabile: 'i', Pronomen: 'p' };
/** "agní-" → "agni"; "√īḍ- ~ īḷ-" → "√īḍ"; "√vr̥- 1" → "√vṛ". */
export const lemmaOf = (l) => {
  const first = String(l).split(/\s*[~/]\s*/)[0];
  return plain(first).replace(/\s+\d+$/, '').replace(/[-\s]+$/, '').replace(/^-/, '').trim();
};

/** A compound of ours (puraḥ-hitam) and the annotation's one-word form (purohitam), which differ at the joint by sandhi. */
export const compoundOk = (oursRaw, theirsForm) => {
  const parts = oursRaw.split('-'); if (parts.length < 2) return false;
  const first = norm(parts[0]); const last = norm(parts.at(-1)); const b = norm(theirsForm);
  return first.length >= 2 && last.length >= 3 && b.startsWith(first.slice(0, first.length > 3 ? -2 : -1)) && b.endsWith(last.slice(1)) && b.length >= first.length + last.length - 3;
};

/** Aligns our padapāṭha words with the annotation's: returns, per annotation word, our word if it agrees, else null. */
export function align(ours, theirs) {
  const A = ours.map(norm); const B = theirs.map(norm);
  const ok = (i, j) => A[i] === B[j] || sameStem(A[i], B[j]) || compoundOk(ours[i], theirs[j]);
  const n = A.length; const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = ok(i, j) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = Array(m).fill(null);
  let i = 0; let j = 0;
  while (i < n && j < m) {
    if (ok(i, j) && dp[i][j] === dp[i + 1][j + 1] + 1) { out[j] = ours[i]; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return out;
}

export function buildRvWords(xlsxFile, dataDir = 'web/data') {
  const rows = readXlsx(xlsxFile);
  const H = Object.fromEntries(rows[0].map((h, i) => [h, i]));
  const lemmas = []; const lemmaIdx = new Map(); const grams = []; const gramIdx = new Map();
  const byVerse = new Map();
  for (const r of rows.slice(1)) {
    if (!r[H.VERS_NR]) continue;
    const key = r[H.VERS_NR].split('.').map(Number).join('.');
    const form = plain(r[H.FORM] || '');
    const stem = lemmaOf(r[H.LEMMA_ZÜRICH] || '');
    const lk = `${stem}|${KIND[r[H.LEMMA_ZÜRICH_LEMMATYP]] || 'n'}|${r[H.LEMMA_GRASSMANN_ID] || ''}`;
    if (!lemmaIdx.has(lk)) { lemmaIdx.set(lk, lemmas.length); lemmas.push([stem, KIND[r[H.LEMMA_ZÜRICH_LEMMATYP]] || 'n', r[H.LEMMA_GRASSMANN_ID] || '']); }
    const gs = gramOf(r, H);
    if (!gramIdx.has(gs)) { gramIdx.set(gs, grams.length); grams.push(gs); }
    if (!byVerse.has(key)) byVerse.set(key, []);
    byVerse.get(key).push({ form, lem: lemmaIdx.get(lk), gram: gramIdx.get(gs) });
  }
  const out = path.join(dataDir, 'rv');
  let tokens = 0; let kept = 0; let versesN = 0;
  for (let mand = 1; mand <= 10; mand++) {
    const t = JSON.parse(fs.readFileSync(path.join(out, `t${mand}.json`), 'utf8'));
    const w = {};
    for (const [s, verses] of Object.entries(t)) {
      for (const v of verses) {
        const theirs = byVerse.get(`${mand}.${s}.${v[0]}`);
        if (!theirs) throw new Error(`no annotation for ${mand}.${s}.${v[0]}`);
        const ours = cleanPada(v[3] || []);
        const al = align(ours, theirs.map((x) => x.form));
        const row = theirs.map((x, k) => { if (al[k]) kept++; return [al[k] ?? x.form, x.lem, x.gram]; });
        tokens += row.length; versesN++;
        (w[s] ||= {})[v[0]] = row;
      }
    }
    fs.writeFileSync(path.join(out, `w${mand}.json`), JSON.stringify(w));
  }
  fs.writeFileSync(path.join(out, 'wl.json'), JSON.stringify({ v: 1, lemmas, grams }));
  console.log(`rv words: ${versesN} verses, ${tokens} words (${kept} keep our padapāṭha spelling, ${tokens - kept} use the annotation's), ${lemmas.length} lemmas, ${grams.length} grammar strings`);
  return { verses: versesN, tokens, kept };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.argv[2]) { console.error('usage: node scripts/build-rv-words.mjs <vedaweb_zurich.xlsx> [web/data]'); process.exit(1); }
  buildRvWords(process.argv[2], process.argv[3]);
}
