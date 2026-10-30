// Minimal Devanagari <-> IAST transliteration for Vedic names and text.
// Svara marks (udātta/anudātta/svarita) are dropped when going to IAST.

const VOWELS = [
  ['ai', 'ऐ', 'ै'], ['au', 'औ', 'ौ'], ['ā', 'आ', 'ा'], ['ī', 'ई', 'ी'], ['ū', 'ऊ', 'ू'],
  ['ṝ', 'ॠ', 'ॄ'], ['ṛ', 'ऋ', 'ृ'], ['ḹ', 'ॡ', 'ॣ'], ['ḷ', 'ऌ', 'ॢ'],
  ['a', 'अ', ''], ['i', 'इ', 'ि'], ['u', 'उ', 'ु'], ['e', 'ए', 'े'], ['o', 'ओ', 'ो'],
];
const CONSONANTS = [
  ['kh', 'ख'], ['gh', 'घ'], ['ch', 'छ'], ['jh', 'झ'], ['ṭh', 'ठ'], ['ḍh', 'ढ'], ['ḷh', 'ळ्ह'],
  ['th', 'थ'], ['dh', 'ध'], ['ph', 'फ'], ['bh', 'भ'],
  ['k', 'क'], ['g', 'ग'], ['ṅ', 'ङ'], ['c', 'च'], ['j', 'ज'], ['ñ', 'ञ'],
  ['ṭ', 'ट'], ['ḍ', 'ड'], ['ṇ', 'ण'], ['t', 'त'], ['d', 'द'], ['n', 'न'],
  ['p', 'प'], ['b', 'ब'], ['m', 'म'], ['y', 'य'], ['r', 'र'], ['l', 'ल'], ['v', 'व'],
  ['ś', 'श'], ['ṣ', 'ष'], ['s', 'स'], ['h', 'ह'], ['ḻ', 'ळ'],
];
const VIRAMA = '्';
const DIGITS = '०१२३४५६७८९';

const SVARA = /[॒॑᳚᳐-᳿꣠-ꣿ॓॔]/g;

/** Normalise ISO-15919 / accented IAST to plain IAST. */
export function isoToIast(s) {
  return s.normalize('NFD')
    .replace(/r̥̄/g, 'ṝ').replace(/r̥/g, 'ṛ')
    .replace(/l̥̄/g, 'ḹ').replace(/l̥/g, 'ḷ')
    .replace(/ṁ/g, 'ṃ')
    .normalize('NFC');
}

/** Strip pitch accents (acute/grave) from romanised text. */
export function stripRomanAccents(s) {
  // Only drop acute/grave sitting on a vowel (ś = s + U+0301 must survive).
  return s.normalize('NFD')
    .replace(/([aeiouAEIOU]|[rlRL][̣̥])([̣̥̄]*)[̀́]/g, '$1$2')
    .normalize('NFC');
}

export function iastToDeva(input) {
  const s = stripRomanAccents(isoToIast(input)).toLowerCase();
  let out = '';
  let i = 0;
  let pendingConsonant = false;
  const match = (list) => list.find(([r]) => s.startsWith(r, i));
  while (i < s.length) {
    const c = match(CONSONANTS);
    if (c) {
      if (pendingConsonant) out += VIRAMA;
      out += c[1];
      pendingConsonant = true;
      i += c[0].length;
      continue;
    }
    const v = match(VOWELS);
    if (v) {
      out += pendingConsonant ? v[2] : v[1];
      pendingConsonant = false;
      i += v[0].length;
      continue;
    }
    if (pendingConsonant) { out += VIRAMA; pendingConsonant = false; }
    const ch = s[i];
    if (ch === 'ṃ' || ch === 'ṁ') out += 'ं';
    else if (ch === 'ḥ') out += 'ः';
    else if (ch === "'" || ch === '’') out += 'ऽ';
    else if (ch >= '0' && ch <= '9') out += DIGITS[+ch];
    else out += ch;
    i += 1;
  }
  if (pendingConsonant) out += VIRAMA;
  return out;
}

const D_VOWEL = Object.fromEntries(VOWELS.map(([r, ind]) => [ind, r]));
const D_SIGN = Object.fromEntries(VOWELS.filter(([, , m]) => m).map(([r, , m]) => [m, r]));
const D_CONS = Object.fromEntries(CONSONANTS.filter(([, d]) => d.length === 1).map(([r, d]) => [d, r]));
D_CONS['ळ'] = 'ḷ';

export function devaToIast(input) {
  const s = input.normalize('NFC').replace(SVARA, '').replace(/ᳵ|ᳶ/g, '');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (D_CONS[ch]) {
      out += D_CONS[ch];
      if (next === VIRAMA) { i++; continue; }
      if (next === '़') { i++; }
      const n2 = s[i + 1];
      if (D_SIGN[n2] !== undefined) { out += D_SIGN[n2]; i++; } else out += 'a';
      continue;
    }
    if (D_VOWEL[ch]) { out += D_VOWEL[ch]; continue; }
    if (ch === 'ं' || ch === 'ᳪ') { out += 'ṃ'; continue; }
    if (ch === 'ँ') { out += 'm̐'; continue; }
    if (ch === 'ः') { out += 'ḥ'; continue; }
    if (ch === 'ऽ') { out += "'"; continue; }
    if (ch === '।') { out += '|'; continue; }
    if (ch === '॥') { out += '||'; continue; }
    const d = DIGITS.indexOf(ch);
    if (d >= 0) { out += String(d); continue; }
    out += ch;
  }
  return out;
}

/** Fold a name to a cross-Saṃhitā key: agniḥ, Agni, अग्निः -> "agni". */
export function nameKey(iast) {
  return stripRomanAccents(isoToIast(iast)).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ').trim().split(/\s+/)
    .map((w) => w.replace(/h$/, '')).join('-');
}
