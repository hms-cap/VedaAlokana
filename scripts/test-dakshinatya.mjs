// Tests web/dakshinatya.js (the Dākṣiṇātya pāṭha of the Ṛgveda).
//
// 1. Always: ṛks as printed in Karnataka recitation books (Gaṇapati, Hiraṇyagarbha, Puruṣa and
//    Devī sūktas), transcribed into Devanagari: dīrgha svarita, anusvāra for nasals inside a word,
//    avagraha at pāda junctions and the kampa.
//      node scripts/test-dakshinatya.mjs
// 2. With a path: the dīrgha-svarita rules against Dayananda Aithal's Saswara Rigveda (Format-1):
//      git clone --depth 1 https://github.com/daithal/saswara-rigveda
//      node scripts/test-dakshinatya.mjs saswara-rigveda
//    Compares every svarita mark (॑ vs ᳚) where the two texts have the same letters.
import fs from 'node:fs';
import path from 'node:path';
import { dirghaLine, dakshinatyaVerse } from '../web/dakshinatya.js';

const data = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'web', 'data', 'rv');
const BOOK = [
  ['8.81.1', ["आ तू न॑ इंद्र क्षु॒मंतं᳚ चि॒त्रं ग्रा॒भं सं गृ॑भाय","म॒हा॒ह॒स्ती दक्षि॑णेन"]],
  ['8.81.3', ["न॒हि त्वा᳚ शूर दे॒वा न मर्ता᳚सो॒ दित्सं᳚तम्","भी॒मं न गां वा॒रयं᳚ते"]],
  ['8.81.4', ["एतो॒ न्विंद्रं॒ स्तवा॒मेशा᳚नं॒ वस्वः॑ स्व॒राज᳚म्","न राध॑सा मर्धिषन्नः"]],
  ['8.81.6', ["आ नो᳚ भर॒ दक्षि॑णेना॒ऽभि स॒व्येन॒ प्र मृ॑श","इंद्र॒ मा नो॒ वसो॒र्निर्भा᳚क्"]],
  ['8.81.9', ["स॒द्यो॒जुव॑स्ते॒ वाजा᳚ अ॒स्मभ्यं᳚ वि॒श्वश्चं᳚द्राः","वशै᳚श्च म॒क्षू ज॑रंते"]],
  ['10.112.9', ["नि षु सी᳚द गणपते ग॒णेषु॒ त्वामा᳚हु॒र्विप्र॑तमं कवी॒नाम्","न ऋ॒ते त्वत्क्रि॑यते॒ किं च॒नारे म॒हाम॒र्कं म॑घवञ्चि॒त्रम॑र्च"]],
  ['10.121.1', ["हि॒र॒ण्य॒ग॒र्भः सम॑वर्त॒ताग्रे᳚ भू॒तस्य॑ जा॒तः पति॒रेक॑ आसीत्","स दा᳚धार पृथि॒वीं द्यामु॒तेमां कस्मै᳚ दे॒वाय॑ ह॒विषा᳚ विधेम"]],
  ['10.121.7', ["आपो᳚ ह॒ यद्बृ॑ह॒तीर्विश्व॒माय॒न्गर्भं॒ दधा᳚ना ज॒नयं᳚तीर॒ग्निम्","ततो᳚ दे॒वानां॒ सम॑वर्त॒तासु॒रेकः॒ कस्मै᳚ दे॒वाय॑ ह॒विषा᳚ विधेम"]],
  ['10.121.9', ["मा नो᳚ हिंसीज्जनि॒ता यः पृ॑थि॒व्या यो वा॒ दिवं᳚ स॒त्यध᳚र्मा ज॒जान॑","यश्चा॒पश्चं॒द्रा बृ॑ह॒तीर्ज॒जान॒ कस्मै᳚ दे॒वाय॑ ह॒विषा᳚ विधेम"]],
  ['10.90.1', ["स॒हस्र॑शीर्षा॒ पुरु॑षः सहस्रा॒क्षः स॒हस्र॑पात्","स भूमिं᳚ वि॒श्वतो᳚ वृ॒त्वाऽत्य॑तिष्ठद्दशांगु॒लम्"]],
  ['10.90.3', ["ए॒तावा᳚नस्य महि॒माऽतो॒ ज्यायाँ᳚श्च॒ पूरु॑षः","पादो᳚ऽस्य॒ विश्वा᳚ भू॒तानि॑ त्रि॒पाद॑स्या॒मृतं᳚ दि॒वि"]],
  ['10.90.8', ["तस्मा᳚द्य॒ज्ञात्स᳚र्व॒हुतः॒ संभृ॑तं पृषदा॒ज्यम्","प॒शून्ताँश्च॑क्रे वाय॒व्या᳚नार॒ण्यान्ग्रा॒म्याश्च॒ ये"]],
  ['10.90.13', ["चं॒द्रमा॒ मन॑सो जा॒तश्चक्षोः॒ सूर्यो᳚ अजायत","मुखा॒दिंद्र॑श्चा॒ग्निश्च॑ प्रा॒णाद्वा॒युर॑जायत"]],
  ['10.125.6', ["अ॒हं रु॒द्राय॒ धनु॒रा त॑नोमि ब्रह्म॒द्विषे॒ शर॑वे॒ हंत॒वा उ॑","अ॒हं जना᳚य स॒मदं᳚ कृणोम्य॒हं द्यावा᳚पृथि॒वी आ वि॑वेश"]],
  ['10.125.7', ["अ॒हं सु॑वे पि॒तर॑मस्य मू॒र्धन्मम॒ योनि॑र॒प्स्व(अ॒)न्१॒॑तः स॑मु॒द्रे","ततो॒ वि ति॑ष्ठे॒ भुव॒नानु॒ विश्वो॒तामूं द्यां व॒र्ष्मणोप॑ स्पृशामि"]],
];
let bad = 0;
for (const [ref, want] of BOOK) {
  const [d1, d2, v] = ref.split('.').map(Number);
  const vs = JSON.parse(fs.readFileSync(path.join(data, `t${d1}.json`), 'utf8'))[d2].find((e) => e[0] === v);
  const got = dakshinatyaVerse(vs[1], vs[3]);
  got.forEach((l, i) => { if (l !== want[i]) { bad++; console.log(`${ref}\n  want ${want[i]}\n  got  ${l}`); } });
}
console.log(`book ṛks: ${BOOK.length - bad} of ${BOOK.length} as printed`);
if (bad) process.exit(1);

const root = process.argv[2];
if (!root) process.exit(0);
const dir = path.join(root, 'Rigveda/SamhitaPatha/Devanagari/Mandala/Format1');
const theirs = {};
for (const f of fs.readdirSync(dir).filter((x) => /-T1\.html$/.test(x))) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const [, td] of s.matchAll(/<td class='VargaStyle\d'>([\s\S]*?)<\/td>/g)) {
    const num = td.match(/<span class='MantraNumbering'>\{[^}]*\}\{([\d.]+)\}/);
    if (!num) continue;
    theirs[num[1]] = td.replace(/<span class='(RishiDevChandas|MantraNumbering)'>[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  }
}
const norm = (s) => s.replace(/[‌‍]/g, '').replace(/[१३][॒॑᳚]*/g, '').replace(/र्ऋ/g, 'रृ').replace(/\([^)]*\)/g, '')
  .replace(/[|,०-९॥ऽ]/g, ' ').replace(/\s+/g, '');
const marks = (s) => { const a = []; for (const c of norm(s)) { if (/[॒॑᳚]/.test(c)) { if (a.length) a[a.length - 1][1] += c; } else a.push([c, '']); } return a; };
let n = 0; let same = 0; let skipped = 0;
for (const f of fs.readdirSync(data).filter((x) => /^t\d+\.json$/.test(x))) {
  const d1 = f.match(/\d+/)[0];
  const t = JSON.parse(fs.readFileSync(path.join(data, f), 'utf8'));
  for (const [d2, vs] of Object.entries(t)) for (const v of vs) {
    const other = theirs[`${d1}.${d2}.${v[0]}`];
    if (!other) { skipped++; continue; }
    const a = marks(v[1].map(dirghaLine).join(' ')); const b = marks(other);
    if (a.length !== b.length || a.some((x, i) => x[0] !== b[i][0])) { skipped++; continue; }
    a.forEach((x, i) => {
      const p = x[1].replace('॒', ''); const q = b[i][1].replace('॒', '');
      if (/[॑᳚]/.test(p + q)) { n++; if (p === q) same++; }
    });
  }
}
console.log(`dīrgha svarita: ${same} of ${n} svarita marks agree (${(same / n * 100).toFixed(2)}%); ${skipped} ṛks with different wording skipped`);
if (same / n < 0.995) process.exit(1);
