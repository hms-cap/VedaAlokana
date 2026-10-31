// Dīrgha-svarita marking of the Ṛgveda, as in South Indian (Karnataka) recitation books.
//
// The edition on screen (VedaWeb, after Aufrecht) writes every svarita with one stroke ॑.
// Many South Indian books instead write a svarita on a heavy syllable with the double
// stroke ᳚ (dīrgha svarita), and write a kampa (independent svarita before an udātta)
// as the numeral with svarita followed by the elided vowel in brackets: रा॒यो॒३॑(ओ॒)वनिः.
//
// The rules below reproduce Dayananda Aithal's "Saswara Rigveda Samhita"
// (github.com/daithal/saswara-rigveda), whose dīrgha svaritas were also added by rule:
// checked against all 10,552 ṛks, they agree on 99.99% of the ~73,000 svarita marks.
// The remaining differences are wording variants between the two source texts.
//
// A svarita becomes ᳚ when its syllable is heavy:
//   · a long vowel (ā ī ū ṝ e ai o au), or anusvāra / candrabindu;
//   · followed by a nasal + consonant (सु᳚न्व॒तः, स॒त्यम᳚ङ्गिरः), or l + consonant (क᳚ल्पयाति);
//   · followed by r, v, y + a sonorant (वृ॒क्तब᳚र्हिषः, नि᳚र्म॒हान्), or h + a nasal (ब्र᳚ह्मणस्पते);
//     across a word boundary only r/v + a sonorant (गवा॒मप᳚ व्र॒जम्);
//   · ending in -म् (विज᳚म्);
// and it stays ॑ before a visarga, before other clusters (र॒यिम॑श्नवत्, व॑क्षति), before a final
// -त्/-न्, and on a long vowel + न् at the end of a half-verse (धा॒रय॑न्, पाशा॑न्).

const MARKS = /[॒॑᳚]/;
const LONG = 'ाीूॄेैोौआईऊॠएऐओऔ';
const isCons = (c) => c >= 'क' && c <= 'ह';
const NAS = /[ङञणनम]/;
const SON = /[यरलवमनणङञह]/;
const VOWEL_OF = { 'ा': 'आ', 'ि': 'इ', 'ी': 'ई', 'ु': 'उ', 'ू': 'ऊ', 'ृ': 'ऋ', 'े': 'ए', 'ै': 'ऐ', 'ो': 'ओ', 'ौ': 'औ' };

// ३॒॑ऽ / १॒॑ → ३॑(ओ॒): the numeral keeps the svarita; the vowel it stands for follows, with anudātta.
function kampa(line) {
  return line.replace(/([^\s॒॑])(॒?)([१३])॒॑ऽ?/g, (m, last, an, num) => {
    const v = VOWEL_OF[last] || (isCons(last) ? 'अ' : last);
    return `${last}${an}${num}॑(${v}॒)`;
  });
}

function heavyMarks(line) {
  const ch = [...line];
  const out = [...ch];
  for (let i = 0; i < ch.length; i++) {
    if (ch[i] !== '॑') continue;
    let j = i - 1; let mods = '';
    while (j >= 0 && /[॒॑ंःँ]/.test(ch[j])) { mods += ch[j]; j--; }
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

// One half-verse (a line of the Saṃhitā text) in the dīrgha-svarita style.
export function dirghaLine(line) { return heavyMarks(kampa(line)); }
