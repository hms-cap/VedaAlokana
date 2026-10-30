// Parsers for the Brāhmaṇa, Āraṇyaka, Upaniṣad and extra Saṃhitā texts.
// Each source format gets one small reader; all of them emit units
// { d1, d2, v, deva: [lines], roman: [lines], label?, ctitle? }.

import fs from 'node:fs';
import path from 'node:path';
import { iastToDeva, devaToIast } from './translit.mjs';

const DN = '०१२३४५६७८९';
const num = (s) => Number(String(s).replace(/[०-९]/g, (d) => DN.indexOf(d)));

// ---------- GRETIL (romanised HTML) ----------
function gretilLines(file) {
  let t = fs.readFileSync(file, 'utf8');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n));
  return t.normalize('NFC').split('\n').map((l) => l.trim()).filter(Boolean);
}
// IAST line with GRETIL punctuation -> clean IAST and Devanagari
function cleanRoman(l) {
  return l.replace(/[%$&_]/g, ' ').replace(/\s*\/\/\s*/g, ' || ').replace(/\s*\/\s*/g, ' | ')
    .replace(/\s+/g, ' ').replace(/\s*\|\|\s*$/, ' ||').trim();
}
function romanToDeva(l) {
  return iastToDeva(l.replace(/\|\|/g, '॥').replace(/\|/g, '।'))
    .replace(/\s*॥\s*/g, ' ॥ ').replace(/\s*।\s*/g, ' । ').replace(/\s+/g, ' ').trim();
}
function romanUnit(lines) {
  const roman = lines.map(cleanRoman).filter((l) => l && l !== '||' && l !== '|');
  return { roman, deva: roman.map(romanToDeva) };
}

// Units end with "|| AitUp_1,1.2 ||" or "// KaU_1.2 //"
function gretilSuffix(file, prefix, map) {
  const L = gretilLines(file);
  const re = new RegExp(`(?:\\|\\||//)\\s*${prefix}_([\\d.,]+)\\s*(?:\\|\\||//)`);
  const out = []; let buf = []; let started = false;
  for (const line of L) {
    const m = line.match(re);
    if (!m && !started) { buf.push(line); if (buf.length > 15) buf.shift(); continue; }
    if (!started) { started = true; const k = countOpeningLines(buf); buf = k ? buf.slice(-k) : []; }
    if (m) {
      const before = line.slice(0, m.index).trim();
      if (before) buf.push(before);
      const n = m[1].split(/[.,]/).map(Number);
      out.push({ ...map(n), ...romanUnit(buf) });
      buf = [];
    } else buf.push(line);
  }
  return out;
}
// For verse texts the first unit may span a couple of lines before its marker
function countOpeningLines(buf) {
  const keep = [];
  for (let i = buf.length - 1; i >= 0; i--) {
    if (/\.{4,}|#|\b(the|of|and|or|for|by|recension|version|input|text|gretil|list|encodings?|format|edition|copyright|http)\b/i.test(buf[i])) break;
    keep.unshift(buf[i]);
    if (keep.length >= 15) break;
  }
  return keep.length;
}

// Lines start with a reference: "(GBr_1,1.2a) …", "KB_1.1.1: …", "(PB 1.1.1) …"
function gretilPrefix(file, re, map) {
  const L = gretilLines(file);
  const out = []; let cur = null;
  for (const line of L) {
    const m = line.match(re);
    if (!m) { if (cur && !/^[-_*=]{5,}/.test(line)) cur.lines.push(line); continue; }
    const n = m.slice(1).filter((x) => x !== undefined).map(Number);
    const u = map(n);
    const key = `${u.d1}.${u.d2}.${u.v}`;
    // KB writes words joined by dots and ends some lines with a rite name in brackets
    const text = line.slice(m[0].length).replace(/\./g, ' ').replace(/\s*\([^()]*\)\s*$/, '').trim();
    if (!cur || cur.key !== key) { if (cur) out.push(cur); cur = { key, ...u, lines: [] }; }
    if (text) cur.lines.push(text);
  }
  if (cur) out.push(cur);
  return out.map(({ key, lines, ...u }) => ({ ...u, ...romanUnit(lines) }));
}

// A heading line opens each unit: "ŚĀ 2,1" or "1.1.1.[1]"
function gretilHeading(file, re, map) {
  const L = gretilLines(file);
  const out = []; let cur = null;
  for (const line of L) {
    const m = line.match(re);
    if (m) { if (cur) out.push(cur); cur = { ...map(m.slice(1).map(Number)), lines: [] }; continue; }
    if (cur && !/^[-_*=]{5,}|^iti .*(adhyāyaḥ|samāptaḥ)/.test(line)) cur.lines.push(line.replace(/\|\|\s*\d+\s*\|\|/g, '||'));
  }
  if (cur) out.push(cur);
  return out.map(({ lines, ...u }) => ({ ...u, ...romanUnit(lines) }));
}

// ---------- raw_etexts (Devanagari Markdown) ----------
function rawText(file) {
  return fs.readFileSync(file, 'utf8').normalize('NFC')
    .replace(/^\+\+\+[\s\S]*?\+\+\+/, '')
    .replace(/\[Updated:[^\]]*\]/g, '');
}
const END = /(?:॥|।।)\s*\[?\s*([०-९0-9]+)\s*\]?\s*(?:॥|।।)?|\[\s*([0-9]+)\s*\]/g;
// Split text into units at "॥ 3 ॥", "॥3॥", "॥ [3]" or "[3]" markers
function splitNumbered(text) {
  const units = []; let last = 0; let m;
  END.lastIndex = 0;
  while ((m = END.exec(text))) {
    const body = text.slice(last, m.index);
    units.push({ n: num(m[1] ?? m[2]), body });
    last = END.lastIndex;
  }
  const tail = text.slice(last).trim();
  if (tail.replace(/[\s॥।*#]/g, '').length > 20) units.push({ n: (units.at(-1)?.n || 0) + 1, body: tail });
  return units;
}
function devaLines(body) {
  return body.replace(/\*\*/g, '').replace(/\{\\म्\+\}/g, 'ं').replace(/\\/g, '')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l && !/^#|^\[|Source:|Download|^\*|^[-_=*]{3,}/.test(l) && l.replace(/[।॥\s*]/g, ''));
}
function devaUnit(body) {
  const deva = devaLines(body);
  return { deva, roman: deva.map(devaToIast), romanAuto: true };
}

// Files laid out as <dir>/<d1>/<d2>.md, units numbered inside
function rawDirs(dir, { d1Dirs = true } = {}) {
  const out = [];
  const d1s = d1Dirs ? fs.readdirSync(dir).filter((x) => /^\d+$/.test(x)).sort((a, b) => a - b) : [null];
  for (const name of d1s) {
    const d1 = name === null ? null : Number(name);
    const base = name === null ? dir : path.join(dir, name);
    const files = fs.readdirSync(base).filter((f) => /^\d+\.md$/.test(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    for (const f of files) {
      const d2 = parseInt(f, 10);
      for (const { n, body } of splitNumbered(rawText(path.join(base, f)))) {
        const u = devaUnit(body);
        if (u.deva.length) out.push({ d1: d1 ?? 1, d2, v: n, ...u });
      }
    }
  }
  return out;
}

// One unit per line (Taittirīya Āraṇyaka, Drāviḍa pāṭha files)
function rawLines(file, d1, d2) {
  return rawText(file).split('\n').map((l) => l.trim()).filter((l) => l.replace(/[।॥\s]/g, '').length > 3)
    .map((l, i) => ({ d1, d2, v: i + 1, ...devaUnit(l) }));
}

// Verse numbering that restarts marks a new section (Kena, Muṇḍaka)
function restartingSections(text, { boldOnly = false } = {}) {
  let t = text;
  if (boldOnly) t = [...t.matchAll(/\*\*([\s\S]+?)\*\*/g)].map((m) => m[1]).join('\n');
  const out = []; let sec = 1; let prev = 0;
  for (const { n, body } of splitNumbered(t)) {
    if (n <= prev) sec += 1;
    prev = n;
    const u = devaUnit(body.replace(/॥\s*अथ[^॥]*॥|ॐ[^।॥]*शान्तिः[^॥]*॥?/g, ''));
    if (u.deva.length) out.push({ d1: 1, d2: sec, v: n, ...u });
  }
  return out;
}

// Gopatha Brāhmaṇa: "(१,१.१अ) text" lines
function gopatha(file) {
  const out = []; let cur = null;
  for (const line of rawText(file).split('\n')) {
    const m = line.match(/^\(([०-९]+),([०-९]+)\.([०-९]+)[^)]*\)\s*(.*)$/);
    if (!m) continue;
    const [d1, d2, v] = [num(m[1]), num(m[2]), num(m[3])];
    if (!d1) continue;
    const key = `${d1}.${d2}.${v}`;
    if (!cur || cur.key !== key) { if (cur) out.push(cur); cur = { key, d1, d2, v, lines: [] }; }
    const txt = m[4].replace(/_/g, '').replace(/\s+/g, ' ').trim();
    if (txt) cur.lines.push(txt);
  }
  if (cur) out.push(cur);
  return out.map(({ key, lines, ...u }) => ({ ...u, deva: lines, roman: lines.map(devaToIast), romanAuto: true }));
}

// Jaiminīya Upaniṣad Brāhmaṇa: sentences end with a bare Devanagari numeral
function jub(dir) {
  const out = [];
  for (const d1 of fs.readdirSync(dir).filter((x) => /^\d+$/.test(x)).sort()) {
    for (const f of fs.readdirSync(path.join(dir, d1)).filter((x) => /^\d+\.md$/.test(x)).sort()) {
      const t = rawText(path.join(dir, d1, f)).replace(/^##.*$/gm, '').replace(/\s+/g, ' ');
      const re = /\s([०-९]+)\s/g; let last = 0; let m;
      while ((m = re.exec(t))) {
        const body = t.slice(last, m.index).trim();
        last = re.lastIndex - 1;
        if (body.length > 3) out.push({ d1: Number(d1), d2: parseInt(f, 10), v: num(m[1]), deva: [body], roman: [devaToIast(body)], romanAuto: true });
      }
    }
  }
  return out;
}

// Sāmaveda Kauthuma: Pūrvārcika numbered straight through, then the
// Uttarārcika with numbering that restarts for each sūkta. Digits inside a
// verse are svara marks, so a "॥ n ॥" only ends a verse when n continues
// the count or restarts it at 1.
function samaKauthuma(file) {
  const t = rawText(file).replace(/\[धा\.[^\]]*\]/g, '');
  const re = /॥\s*([0-9]+)\s*॥?/g;
  const out = []; let last = 0; let prev = 0; let ar = 1; let group = 0; let m;
  while ((m = re.exec(t))) {
    const n = Number(m[1]);
    const ok = n === prev + 1 || (n === 1 && prev >= 1);
    if (!ok) continue;
    if (n === 1 && prev > 100) ar = 2;
    if (ar === 2 && n === 1) group += 1;
    const body = t.slice(last, m.index);
    last = re.lastIndex; prev = n;
    const u = devaUnit(body);
    if (!u.deva.length) continue;
    if (ar === 1) {
      const d2 = Math.ceil(n / 10); const lo = (d2 - 1) * 10 + 1;
      out.push({ d1: 1, d2, v: n, label: `1.${n}`, ctitle: `${lo}–${lo + 9}`, ...u });
    } else out.push({ d1: 2, d2: group, v: n, label: `2.${group}.${n}`, ctitle: `Sūkta ${group}`, ...u });
  }
  return out;
}

// ---------- the catalogue of extra texts ----------
export function extraTexts({ raw, gretil }) {
  const R = (p) => path.join(raw, p);
  const G = (p) => path.join(gretil, 'gretil.sub.uni-goettingen.de/gretil/1_sanskr/1_veda', p);
  const T = (n) => ({ d1: 1, d2: n[0], v: n[1] });           // a.b
  const T3 = (n) => (n.length === 2 ? { d1: n[0], d2: 1, v: n[1] } : { d1: n[0], d2: n[1], v: n[2] }); // a,b.c or a,b
  const T1 = (n) => ({ d1: 1, d2: 1, v: n[0] });             // n
  const gr = 'gretil'; const rw = 'raw';

  return [
    // Ṛgveda
    { id: 'ab', veda: 'rv', layer: 'brahmana', name: 'Aitareya Brāhmaṇa', deva: 'ऐतरेय ब्राह्मण', levels: ['Pañcikā', 'Adhyāya', 'Khaṇḍa'], src: rw,
      units: () => rawDirs(R('vedaH/Rg/shakala/aitareya-brAhmaNam')) },
    { id: 'kb', veda: 'rv', layer: 'brahmana', name: 'Kauṣītaki Brāhmaṇa', deva: 'कौषीतकि ब्राह्मण', levels: ['', 'Adhyāya', 'Khaṇḍa'], src: gr,
      units: () => gretilPrefix(G('2_bra/kausibru.htm'), /^KB_(\d+)\.(\d+)\.(\d+):?/, (n) => ({ d1: 1, d2: n[0], v: n[1] })) },
    { id: 'aa', veda: 'rv', layer: 'aranyaka', name: 'Aitareya Āraṇyaka', deva: 'ऐतरेय आरण्यक', levels: ['Āraṇyaka', 'Adhyāya', 'Khaṇḍa'], src: rw,
      units: () => rawDirs(R('vedaH/Rg/shakala/AraNyakam')) },
    { id: 'sa', veda: 'rv', layer: 'aranyaka', name: 'Śāṅkhāyana Āraṇyaka', deva: 'शाङ्खायन आरण्यक', levels: ['', 'Adhyāya', 'Khaṇḍa'], src: gr,
      note: 'Adhyāyas 3–6 have no section references in the GRETIL source and are not included yet.',
      units: () => gretilHeading(G('3_ara/sankharu.htm'), /^ŚĀ (\d+),(\d+)$/, (n) => ({ d1: 1, d2: n[0], v: n[1] })) },
    { id: 'aiu', veda: 'rv', layer: 'upanishad', name: 'Aitareya Upaniṣad', deva: 'ऐतरेय उपनिषद्', levels: ['Adhyāya', 'Khaṇḍa', 'Mantra'], src: gr,
      units: () => gretilSuffix(G('4_upa/aitup__u.htm'), 'AitUp', T3) },

    // Śukla Yajurveda
    { id: 'sb', veda: 'syv', layer: 'brahmana', name: 'Śatapatha Brāhmaṇa', deva: 'शतपथ ब्राह्मण', levels: ['Kāṇḍa', 'Brāhmaṇa', 'Kaṇḍikā'], src: gr, refFmt: 'label',
      note: 'Kāṇḍa 12 is missing from the GRETIL source.',
      units: () => {
        const out = [];
        const files = fs.readdirSync(G('2_bra/satapath')).filter((f) => /^sb_\d+_u\.htm$/.test(f)).sort();
        for (const f of files) {
          const seq = new Map();
          for (const u of gretilHeading(G(`2_bra/satapath/${f}`), /^(\d+)\.(\d+)\.(\d+)\.\[(\d+)\]$/, (n) => ({ k: n[0], a: n[1], b: n[2], v: n[3] }))) {
            const key = `${u.a}.${u.b}`;
            if (!seq.has(key)) seq.set(key, seq.size + 1);
            out.push({ d1: u.k, d2: seq.get(key), v: u.v, ctitle: `${u.k}.${key}`, label: `${u.k}.${key}.${u.v}`, deva: u.deva, roman: u.roman });
          }
        }
        return out;
      } },
    { id: 'isu', veda: 'syv', layer: 'upanishad', name: 'Īśa Upaniṣad', deva: 'ईश उपनिषद्', levels: ['', '', 'Mantra'], src: gr,
      units: () => gretilSuffix(G('4_upa/isup___u.htm'), 'IsUp', T1) },
    { id: 'bu', veda: 'syv', layer: 'upanishad', name: 'Bṛhadāraṇyaka Upaniṣad', deva: 'बृहदारण्यक उपनिषद्', levels: ['Adhyāya', 'Brāhmaṇa', 'Kaṇḍikā'], src: gr,
      note: 'Also the Āraṇyaka of the Śukla Yajurveda (Śatapatha Brāhmaṇa 14.4–9).',
      units: () => gretilSuffix(G('4_upa/brup___u.htm'), 'BrhUp', T3) },

    // Kṛṣṇa Yajurveda (Taittirīya)
    { id: 'ts', veda: 'kyv', layer: 'samhita', name: 'Taittirīya Saṃhitā', deva: 'तैत्तिरीय संहिता', levels: ['Kāṇḍa', 'Prapāṭhaka', 'Pañcāśat'], src: rw, shakha: 'Taittirīya', svara: true,
      units: () => rawDirs(R('vedaH/yajur/taittirIya/mUlam/saMhitA')) },
    { id: 'tb', veda: 'kyv', layer: 'brahmana', name: 'Taittirīya Brāhmaṇa', deva: 'तैत्तिरीय ब्राह्मण', levels: ['Kāṇḍa', 'Prapāṭhaka', 'Pañcāśat'], src: rw, svara: true,
      units: () => rawDirs(R('vedaH/yajur/taittirIya/mUlam/brAhmaNam')) },
    { id: 'ta', veda: 'kyv', layer: 'aranyaka', name: 'Taittirīya Āraṇyaka', deva: 'तैत्तिरीय आरण्यक', levels: ['', 'Prapāṭhaka', 'Section'], src: rw, svara: true,
      note: 'Drāviḍa pāṭha, numbered as in the source files; prapāṭhakas 5 and 6 are not in the source.',
      units: () => [1, 2, 3, 4, 7, 8, 9, 10].flatMap((p) => rawLines(R(`vedaH/yajur/taittirIya/mUlam/AraNyakam_drAviDam/${p}.md`), 1, p)) },
    { id: 'tu', veda: 'kyv', layer: 'upanishad', name: 'Taittirīya Upaniṣad', deva: 'तैत्तिरीय उपनिषद्', levels: ['', '', 'Section'], src: rw, svara: true,
      note: 'Taken from the Taittirīya Āraṇyaka source (Śīkṣā, Brahmānanda and Bhṛgu vallīs), one section per line.',
      units: () => rawLines(R('vedaH/yajur/taittirIya/mUlam/AraNyakam_drAviDam/9.md'), 1, 1) },
    { id: 'kathu', veda: 'kyv', layer: 'upanishad', name: 'Kaṭha Upaniṣad', deva: 'कठ उपनिषद्', levels: ['', 'Vallī', 'Mantra'], src: gr,
      units: () => gretilSuffix(G('4_upa/kathop_u.htm'), 'KaU', T) },
    { id: 'svu', veda: 'kyv', layer: 'upanishad', name: 'Śvetāśvatara Upaniṣad', deva: 'श्वेताश्वतर उपनिषद्', levels: ['', 'Adhyāya', 'Mantra'], src: gr,
      units: () => gretilSuffix(G('4_upa/svetu_au.htm'), 'SvetUp', T) },

    // Sāmaveda
    { id: 'svs', veda: 'sv', layer: 'samhita', name: 'Sāmaveda Saṃhitā', deva: 'सामवेद संहिता', levels: ['Ārcika', 'Verses', 'Verse'], src: rw, shakha: 'Kauthuma', refFmt: 'label',
      groupNames: { 1: 'Pūrvārcika', 2: 'Uttarārcika' },
      note: 'Pūrvārcika verses are numbered straight through and shown ten at a time; Uttarārcika verses are numbered within each sūkta. Digits inside verses are the Sāmaveda’s own svara notation. Where the source skips a number, two verses can appear as one.',
      units: () => samaKauthuma(R('vedaH/sAma/kauthumam/saMhitA_full_visvara.md')) },
    { id: 'pb', veda: 'sv', layer: 'brahmana', name: 'Pañcaviṃśa Brāhmaṇa', deva: 'पञ्चविंश ब्राह्मण', levels: ['Adhyāya', 'Khaṇḍa', 'Mantra'], src: gr,
      note: 'Also called the Tāṇḍya Mahābrāhmaṇa.',
      units: () => ['pncvbr1u.htm', 'pncvbr2u.htm'].flatMap((f) => gretilPrefix(G(`2_bra/${f}`), /^\(PB (\d+)\.(\d+)\.(\d+)\)/, (n) => ({ d1: n[0], d2: n[1], v: n[2] }))) },
    { id: 'jub', veda: 'sv', layer: 'aranyaka', name: 'Jaiminīya Upaniṣad Brāhmaṇa', deva: 'जैमिनीय उपनिषद् ब्राह्मण', levels: ['Adhyāya', 'Anuvāka', 'Section'], src: rw,
      note: 'Also known as the Talavakāra Āraṇyaka; the Kena Upaniṣad is part of it.',
      units: () => jub(R('vedaH/sAma/jaiminIyam/brAhmaNam/jaiminiya-upaniShad-brAhmaNam')) },
    { id: 'chu', veda: 'sv', layer: 'upanishad', name: 'Chāndogya Upaniṣad', deva: 'छान्दोग्य उपनिषद्', levels: ['Prapāṭhaka', 'Khaṇḍa', 'Mantra'], src: gr,
      units: () => gretilSuffix(G('4_upa/chup___u.htm'), 'ChUp', T3) },
    { id: 'keu', veda: 'sv', layer: 'upanishad', name: 'Kena Upaniṣad', deva: 'केन उपनिषद्', levels: ['', 'Khaṇḍa', 'Mantra'], src: rw,
      units: () => restartingSections(rawText(R('mixed/ebhAratI-sampat/upaniShadaH/upaniShadasambaddhapustakAni/kenopaniShat.md'))) },

    // Atharvaveda
    { id: 'gb', veda: 'av', layer: 'brahmana', name: 'Gopatha Brāhmaṇa', deva: 'गोपथ ब्राह्मण', levels: ['Bhāga', 'Prapāṭhaka', 'Kaṇḍikā'], src: rw,
      groupNames: { 1: 'Pūrvabhāga', 2: 'Uttarabhāga' },
      units: () => gopatha(R('vedaH/atharva/shaunaka/gopatha-brAhmaNam.md')) },
    { id: 'mu', veda: 'av', layer: 'upanishad', name: 'Muṇḍaka Upaniṣad', deva: 'मुण्डक उपनिषद्', levels: ['', 'Khaṇḍa', 'Mantra'], src: rw,
      note: 'Mūla text taken from an edition with commentary; khaṇḍas 1–6 are Muṇḍakas 1.1 to 3.2.',
      units: () => restartingSections(rawText(R('mixed/ebhAratI-sampat/upaniShadaH/dashopaniShadaH/muNDakopaniShad.md')), { boldOnly: true }) },
    { id: 'mau', veda: 'av', layer: 'upanishad', name: 'Māṇḍūkya Upaniṣad', deva: 'माण्डूक्य उपनिषद्', levels: ['', '', 'Mantra'], src: gr,
      units: () => gretilSuffix(G('4_upa/mandup_u.htm'), 'MandUp', T1) },
    { id: 'pru', veda: 'av', layer: 'upanishad', name: 'Praśna Upaniṣad', deva: 'प्रश्न उपनिषद्', levels: ['', 'Praśna', 'Mantra'], src: gr,
      units: () => gretilSuffix(G('4_upa/prasup_u.htm'), 'PrUp', T) },
  ];
}
