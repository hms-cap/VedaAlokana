// Dākṣiṇātya pāṭha of the Ṛgveda: the text as South Indian (Karnataka) recitation books print it.
//
// The edition on screen (VedaWeb, after Aufrecht) is rewritten by rule in four ways:
//
// 1. Dīrgha svarita. A svarita on a heavy syllable is written with the double stroke ᳚.
//    The rules reproduce Dayananda Aithal's "Saswara Rigveda Samhita"
//    (github.com/daithal/saswara-rigveda), whose dīrgha svaritas were also added by rule:
//    checked against all 10,552 ṛks, they agree on 99.99% of the ~73,000 svarita marks.
//    A svarita becomes ᳚ when its syllable is heavy:
//      · a long vowel (ā ī ū ṝ e ai o au), or anusvāra / candrabindu;
//      · followed by a nasal + consonant (सु᳚न्व॒तः, स॒त्यम᳚ङ्गिरः), or l + consonant (क᳚ल्पयाति);
//      · followed by r, v, y + a sonorant (वृ॒क्तब᳚र्हिषः, नि᳚र्म॒हान्), or h + a nasal (ब्र᳚ह्मणस्पते);
//        across a word boundary only r/v + a sonorant (गवा॒मप᳚ व्र॒जम्);
//      · ending in -म् (विज᳚म्);
//    and it stays ॑ before a visarga, before other clusters (र॒यिम॑श्नवत्, व॑क्षति), before a final
//    -त्/-न्, and on a long vowel + न् at the end of a half-verse (धा॒रय॑न्, पाशा॑न्).
//
// 2. Kampa. The vowel of the kampa syllable follows it in brackets, then the rest of the
//    syllable, then the numeral with anudātta and svarita: र॒प्स्व१॒॑न्तः → र॒प्स्व(अ॒)न्१॒॑तः,
//    रा॒यो॒३॒॑ऽवनिः → रा॒यो॒(ओ॒)३॒॑ऽवनिः, शू॒ष्यं१॒॑ → शू॒ष्य(अं॒)१॒॑.
//
// 3. Class nasals as anusvāra inside a word: क्षु॒मन्तं॑ → क्षु॒मंतं॑, दशाङ्गु॒लम् → दशांगु॒लम्.
//    A nasal at the end of a word keeps its letter (म॑घवञ्चि॒त्रम् = maghavan citram).
//
// 4. Avagraha where two pādas run together: a word ending in a or ā has swallowed the a that
//    begins the next pāda: दक्षि॑णेना॒भि → दक्षि॑णेना॒ऽभि (dakṣiṇena | abhi), वृ॒त्वाऽत्य॑तिष्ठत्,
//    महि॒माऽतो॒. Inside a pāda the merge is left as it is: सम॑वर्त॒ताग्रे᳚, यदन्ने᳚नाति॒रोह॑ति.
//
// 3 and 4 need the word boundaries, which come from the padapāṭha (aligned letter by letter).
// Checked against the Śrī Gaṇapati, Hiraṇyagarbha, Puruṣa and Devī sūktas as printed in
// Karnataka books: node scripts/test-dakshinatya.mjs.

const MARKS = /[॒॑᳚]/;
const LONG = 'ाीूॄेैोौआईऊॠएऐओऔ';
const isCons = (c) => c >= 'क' && c <= 'ह' || c === 'ळ';
const NAS = /[ङञणनम]/;
const SON = /[यरलवमनणङञह]/;
const VOWEL_OF = { 'ा': 'आ', 'ि': 'इ', 'ी': 'ई', 'ु': 'उ', 'ू': 'ऊ', 'ृ': 'ऋ', 'े': 'ए', 'ै': 'ऐ', 'ो': 'ओ', 'ौ': 'औ' };

// ---------- 2. kampa ----------
// र॒प्स्व१॒॑न्तः → र॒प्स्व(अ॒)न्१॒॑तः: the numeral moves after the syllable's closing consonant.
function kampa(line) {
  return line.replace(/([^\s॒॑ंँ])(॒?)([ंँ]?)(॒?)([१३])॒?॑(ऽ?)(\S*)/g, (m, last, an1, nas, an2, num, ava, rest) => {
    const v = VOWEL_OF[last] || (isCons(last) ? 'अ' : last);
    // the closing consonant: the first of a following cluster, or a word-final consonant.
    // An anusvāra goes inside the brackets (अं॒): after a bracket it would have no letter to sit on.
    let coda = '';
    if (!nas && !ava && isCons(rest[0]) && rest[1] === '्' && (isCons(rest[2]) || rest.length === 2)) coda = rest.slice(0, 2);
    return `${last}${an1}${an2}(${v}${nas}॒)${coda}${num}॒॑${ava}${rest.slice(coda.length)}`;
  });
}

// ---------- 1. dīrgha svarita ----------
function heavyMarks(line) {
  const ch = [...line];
  const out = [...ch];
  for (let i = 0; i < ch.length; i++) {
    if (ch[i] !== '॑') continue;
    let j = i - 1; let mods = '';
    while (j >= 0 && /[॒॑ंःँ]/.test(ch[j])) { mods += ch[j]; j--; }
    if (/[०-९]/.test(ch[j])) continue;               // a kampa numeral keeps its stroke
    let heavy = LONG.includes(ch[j]) || /[ंँ]/.test(mods);
    const visarga = mods.includes('ः');
    let k = i + 1;
    while (k < ch.length && MARKS.test(ch[k])) k++;
    let sp = false;
    while (k < ch.length && ch[k] === ' ') { k++; sp = true; }
    if (!heavy && !visarga && isCons(ch[k]) && ch[k + 1] === '्') {
      const c1 = ch[k];
      let e = k + 2;
      while (e < ch.length && MARKS.test(ch[e])) e++;
      const c2 = ch[e] || '';
      const final = !sp && (e >= ch.length || c2 === ' ');
      if (final) heavy = c1 === 'म';
      else if (NAS.test(c1)) heavy = true;
      else if ((sp ? /[रव]/ : /[रवयल]/).test(c1) && SON.test(c2)) heavy = true;
      else if (!sp && c1 === 'ह' && NAS.test(c2)) heavy = true;
      else if (c1 === 'र' && c2 === 'ऋ') heavy = true;
      else if (!sp && c1 === 'ल') heavy = true;
    }
    // a long vowel + न् at the end of the half-verse keeps the single stroke
    { let n = i + 1; while (n < ch.length && MARKS.test(ch[n])) n++;
      if (ch[n] === 'न' && ch[n + 1] === '्' && n + 2 >= ch.length) heavy = false; }
    if (heavy) out[i] = '᳚';
  }
  return out.join('');
}

// One half-verse with dīrgha svaritas and the kampa (rules 1 and 2). Kept for the test against Aithal.
export function dirghaLine(line) { return heavyMarks(kampa(line)); }

// ---------- aligning the saṃhitā with the padapāṭha ----------
const CONS_IAST = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ṅ', 'च': 'c', 'छ': 'ch', 'ज': 'j', 'झ': 'jh', 'ञ': 'ñ',
  'ट': 'ṭ', 'ठ': 'ṭh', 'ड': 'ḍ', 'ढ': 'ḍh', 'ण': 'ṇ', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'ś', 'ष': 'ṣ', 'स': 's', 'ह': 'h', 'ळ': 'ḷ',
};
const VOW_IAST = {
  'अ': 'a', 'आ': 'ā', 'इ': 'i', 'ई': 'ī', 'उ': 'u', 'ऊ': 'ū', 'ऋ': 'ṛ', 'ॠ': 'ṝ', 'ऌ': 'ḷ', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū', 'ृ': 'ṛ', 'ॄ': 'ṝ', 'ॢ': 'ḷ', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};
const SIGNS = /[ािीुूृॄॢेैोौ]/;
const SKIP = /[॒॑᳚]/;

// Saṃhitā lines → phoneme tokens, each remembering where it came from: [token, line, index].
function devaTokens(lines) {
  const out = [];
  lines.forEach((line, li) => {
    const ch = [...line];
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i];
      if (CONS_IAST[c]) {
        out.push([CONS_IAST[c], li, i]);
        let k = i + 1; while (k < ch.length && SKIP.test(ch[k])) k++;
        if (ch[k] !== '्' && !SIGNS.test(ch[k] || '')) out.push(['a', li, i]);
      } else if (VOW_IAST[c]) out.push([VOW_IAST[c], li, i]);
      else if (c === 'ं' || c === 'ँ') out.push(['ṃ', li, i]);
      else if (c === 'ः') out.push(['ḥ', li, i]);
      else if (c === 'ऽ') out.push(['a', li, i, 1]);   // an elided a: aligns, but is no syllable
    }
  });
  return out;
}

const UNITS = ['ai', 'au', 'kh', 'gh', 'ch', 'jh', 'ṭh', 'ḍh', 'th', 'dh', 'ph', 'bh'];
// Padapāṭha words (IAST, compounds joined by -) → tokens, and the index of each word's last token.
function padaTokens(words) {
  const toks = []; const ends = new Set();
  for (const w of words) {
    const s = w.toLowerCase().normalize('NFC').replace(/[^a-zāīūṛṝḷḹṅñṭḍṇśṣṃḥ]/g, '');
    let i = 0;
    while (i < s.length) {
      const u = UNITS.find((x) => s.startsWith(x, i)) || s[i];
      toks.push(u); i += u.length;
    }
    if (toks.length) ends.add(toks.length - 1);
  }
  return { toks, ends };
}

// Global alignment (Needleman–Wunsch): for each pada token, the saṃhitā token it lines up with (or -1).
function align(a, b) {
  const n = a.length; const m = b.length; const W = m + 1;
  const sc = new Int32Array((n + 1) * W);
  for (let i = 1; i <= n; i++) sc[i * W] = -i;
  for (let j = 1; j <= m; j++) sc[j] = -j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const d = sc[(i - 1) * W + j - 1] + (a[i - 1] === b[j - 1] ? 2 : -1);
    sc[i * W + j] = Math.max(d, sc[(i - 1) * W + j] - 1, sc[i * W + j - 1] - 1);
  }
  const of = new Int32Array(m).fill(-1);
  let i = n; let j = m;
  while (i > 0 && j > 0) {
    const s = sc[i * W + j];
    if (s === sc[(i - 1) * W + j - 1] + (a[i - 1] === b[j - 1] ? 2 : -1)) { of[j - 1] = i - 1; i--; j--; } else if (s === sc[(i - 1) * W + j] - 1) i--; else j--;
  }
  return of;
}

const VOWEL_TOK = /^(a|ā|i|ī|u|ū|ṛ|ṝ|ḷ|e|ai|o|au)$/;
// Does the merged vowel at token k close a pāda? Count the syllables of its half-verse with the
// hiatus restored (one more than written) and see whether the merge falls where the metre
// divides the line: 8 | 8 (gāyatrī, anuṣṭubh), 11 | 11 (triṣṭubh), 12 | 12 (jagatī), 8 | 12 or 12 | 8.
function padaBoundary(dt, k) {
  const li = dt[k][1];
  let before = 0; let total = 0;
  dt.forEach((t, x) => {
    if (t[1] !== li || t[3] || !VOWEL_TOK.test(t[0])) return;
    total++; if (x <= k) before++;
  });
  const T = total + 1; const p = before;   // p: syllables of the first pāda, the merged one included
  if (p <= 0 || p >= T) return false;
  return (T === 16 && p === 8) || (T === 22 && p === 11) || (T === 24 && p === 12) || (T === 20 && (p === 8 || p === 12));
}

const CLASS = { 'ङ': /[कखगघ]/, 'ञ': /[चछजझ]/, 'ण': /[टठडढ]/, 'न': /[तथदध]/, 'म': /[पफबभ]/ };

// ---------- the whole ṛk ----------
// lines: the half-verses in Devanagari; pada: the padapāṭha words (IAST). Without pada, rules 3
// and 4 fall back to: every class nasal before a stop of its class, and no added avagraha.
export function dakshinatyaVerse(lines, pada) {
  const keepNasal = lines.map(() => new Set());
  const avagraha = lines.map(() => new Set());
  if (pada && pada.length) {
    const dt = devaTokens(lines);
    const { toks, ends } = padaTokens(pada);
    const of = align(dt.map((t) => t[0]), toks);
    for (let j = 0; j < toks.length; j++) {
      if (!ends.has(j) || j + 1 >= toks.length) continue;
      // a nasal at the end of a word stays a letter
      const s = of[j];
      if (s >= 0 && /[ṅñṇnm]/.test(dt[s][0])) keepNasal[dt[s][1]].add(dt[s][2]);
      // a/ā + a → ā across a pāda boundary: mark the swallowed a with an avagraha
      if ((toks[j] === 'ā' || toks[j] === 'a') && toks[j + 1] === 'a') {
        const k = of[j] >= 0 ? of[j] : of[j + 1];
        if (k >= 0 && dt[k][0] === 'ā' && padaBoundary(dt, k)) avagraha[dt[k][1]].add(dt[k][2]);
      }
    }
  }
  return lines.map((line, li) => {
    const ch = [...line];
    let out = '';
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i];
      // 3. class nasal + virama + stop of its class → anusvāra on the syllable before
      if (CLASS[c] && ch[i + 1] === '्' && CLASS[c].test(ch[i + 2] || '') && !keepNasal[li].has(i)) {
        let p = out.length; while (p > 0 && SKIP.test(out[p - 1])) p--;
        const prev = out[p - 1];
        if (prev && /[अ-हळािीुूृॄॢेैोौ]/.test(prev)) {   // after a letter or vowel sign, not a numeral or cluster
          out = `${out.slice(0, p)}ं${out.slice(p)}`; i++; continue;
        }
      }
      out += c;
      // 4. avagraha after the merged ā and its marks
      if (avagraha[li].has(i)) {
        let k = i + 1; while (k < ch.length && SKIP.test(ch[k])) out += ch[k++];
        if (k < ch.length && ch[k] !== ' ' && ch[k] !== 'ऽ') out += 'ऽ';
        i = k - 1;
      }
    }
    return heavyMarks(kampa(out));
  });
}
