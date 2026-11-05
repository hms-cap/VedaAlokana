// The grammar line of a Ṛgveda word (web/data/rv/wl.json, English: "present active participle nominative singular masculine
// local particle") in Pāṇinian terms. A fixed table: the 1,383 strings are built from about fifty English words. No DOM.
// Where Pāṇini has no single name (injunctive, pluperfect, the aorist and future participles) the closest description is given.

const CASE = { nominative: 'प्रथमा', accusative: 'द्वितीया', instrumental: 'तृतीया', dative: 'चतुर्थी', ablative: 'पञ्चमी', genitive: 'षष्ठी', locative: 'सप्तमी', vocative: 'सम्बोधनम्' };
const NUM = { singular: 'एकवचनम्', dual: 'द्विवचनम्', plural: 'बहुवचनम्' };
const GEN = { masculine: 'पुंलिङ्गम्', feminine: 'स्त्रीलिङ्गम्', neuter: 'नपुंसकलिङ्गम्' };
const PERSON = { '1st': 'उत्तमपुरुषः', '2nd': 'मध्यमपुरुषः', '3rd': 'प्रथमपुरुषः' };
const VOICE = { active: 'परस्मैपदम्', middle: 'आत्मनेपदम्', passive: 'कर्मणि' };
const DERIV = { causative: 'णिजन्तः', desiderative: 'सन्नन्तः', intensive: 'यङन्तः', denominative: 'नामधातुः' };
const DEGREE = { comparative: 'तरप् / ईयसुन्', superlative: 'तमप् / इष्ठन्' };
const TENSE = { present: 'लट्', imperfect: 'लङ्', aorist: 'लुङ्', perfect: 'लिट्', future: 'लृट्', pluperfect: 'लिट् (लङ्-रूपम्)' };
// the tense whose stem a non-indicative mood is made from, when it is not the present
const STEM = { imperfect: 'लङ्', aorist: 'लुङ्', perfect: 'लिट्', future: 'लृट्', pluperfect: 'लिट्' };
const MOOD = { imperative: 'लोट्', optative: 'विधिलिङ्', precative: 'आशीर्लिङ्', subjunctive: 'लेट्', conditional: 'लृङ्' };
const PHRASES = [['participle in -ta', 'PTA'], ['participle in -na', 'PNA'], ['local particle', 'LP'], ['si-imperative', 'SIIMP']];
const WORDS = new Set(['person', 'indicative', 'injunctive', 'participle', 'infinitive', 'gerundive', 'absolutive', 'or', 'PTA', 'PNA', 'LP', 'SIIMP',
  ...Object.keys({ ...CASE, ...NUM, ...GEN, ...PERSON, ...VOICE, ...DERIV, ...DEGREE, ...TENSE, ...MOOD })]);

// a participle by voice and tense
function participle(voice, tense) {
  const note = { aorist: ' (लुङ्-प्रकृतिः)', future: ' (लृट्-प्रकृतिः)' }[tense] || '';
  if (voice === 'passive') return tense === 'future' ? 'कृत्यप्रत्ययान्तम्' : 'शानच् (कर्मणि)';
  if (tense === 'perfect') return voice === 'middle' ? 'कानच्' : 'क्वसु';
  return (voice === 'middle' ? 'शानच्' : 'शतृ') + note;
}

/** The grammar line in Sanskrit, or null when a word is not known (the sheet then shows the English alone). */
export function gramSa(english) {
  let s = ` ${String(english).trim()} `;
  if (!s.trim()) return null;
  for (const [p, k] of PHRASES) s = s.replace(p, k);
  const toks = s.trim().split(/\s+/);
  if (toks.some((t) => !WORDS.has(t))) return null;
  const has = (t) => toks.includes(t);
  const pick = (m) => toks.filter((t) => m[t]);
  const moods = toks.filter((t) => t === 'indicative' || t === 'injunctive' || t === 'SIIMP' || MOOD[t]);
  const tenses = pick(TENSE);
  const voice = pick(VOICE)[0];
  const parts = [];
  const der = pick(DERIV)[0]; if (der) parts.push(DERIV[der]);
  // what kind of form: a participle, an infinitive, a finite verb
  if (has('PTA')) parts.push('क्त (निष्ठा)');
  else if (has('PNA')) parts.push('क्त (न-निष्ठा)');
  else if (has('participle')) parts.push([...new Set((tenses.length ? tenses : ['']).map((t) => participle(voice, t)))].join(' / '));
  else if (has('gerundive')) parts.push('कृत्यप्रत्ययान्तम्');
  else if (has('absolutive')) parts.push('क्त्वा / ल्यप्');
  else if (has('infinitive')) parts.push(`तुमर्थः${tenses.length && tenses[0] !== 'present' ? ` (${STEM[tenses[0]] || TENSE[tenses[0]]}-प्रकृतिः)` : ''}`);
  else if (moods.length || tenses.length) {
    const out = [];
    for (const m of moods.length ? moods : ['indicative']) {
      for (const t of tenses.length ? tenses : ['']) {
        if (m === 'indicative') out.push(t ? TENSE[t] : '');
        else if (m === 'injunctive') out.push(`${t === 'aorist' ? 'लुङ्' : t === 'perfect' ? 'लिट्' : 'लङ्'} (अडागमरहितम्)`);
        else if (m === 'SIIMP') out.push('लोट् (सि)');
        else out.push(MOOD[m] + (STEM[t] ? ` (${STEM[t]}-प्रकृतिः)` : ''));
      }
    }
    const u = [...new Set(out.filter(Boolean))];
    if (u.length) parts.push(u.join(' / '));
  }
  if (voice && !has('participle') && !has('PTA') && !has('PNA')) parts.push(VOICE[voice]);
  const person = toks.find((t) => PERSON[t]); // "3rd person": the word is "3rd", the token before "person"
  if (person) parts.push(PERSON[person]);
  const deg = pick(DEGREE)[0]; if (deg) parts.push(DEGREE[deg]);
  const cases = pick(CASE).map((t) => CASE[t]); if (cases.length) parts.push(cases.join(' / '));
  const num = pick(NUM)[0]; if (num) parts.push(NUM[num]);
  const gens = pick(GEN).map((t) => GEN[t]); if (gens.length) parts.push(gens.join(' / '));
  if (has('LP')) parts.push('उपसर्गः');
  return parts.length ? parts.join(' · ') : null;
}
