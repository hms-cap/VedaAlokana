// Anusvāra and visarga in their two usual printed forms (Settings → Anusvāra and visarga).
//
// joinForms(line): the joined form, by rule, on any text:
//   · an anusvāra inside a word becomes the nasal of the next consonant's class, written with it
//     as a conjunct:  सं॑कल्प → स॑ङ्कल्प,  शं॒तनु → श॒न्तनु,  सं॒मा → स॒म्मा;  before य / व / ल the
//     nasalised semivowel the Taittirīya books print:  सं॒वत्स॒र → स॒व्ँवत्स॒र.
//     Before श ष स ह र the anusvāra stays (there is no nasal of their class).
//   · a visarga before श ष स joins it, across the space too:  नमः॑ श॒र्वाय → नम॑श्श॒र्वाय.
//   Svara marks stay on their syllable: they move in front of the nasal or sibilant.
//
// The separate form of the Taittirīya Saṃhitā is not made here: it needs the padapāṭha to tell a
// joined word end from a nasal that belongs to the word (पञ्च), so it comes as data
// (scripts/build-ts-sep.mjs, web/data/gpl/) and is applied when the text is loaded.

export const SEP = ' ';   // the space between words that were joined (a breakable space other than ' ')

const NASAL_OF = { क: 'ङ', ख: 'ङ', ग: 'ङ', घ: 'ङ', च: 'ञ', छ: 'ञ', ज: 'ञ', झ: 'ञ', ट: 'ण', ठ: 'ण', ड: 'ण', ढ: 'ण', त: 'न', थ: 'न', द: 'न', ध: 'न', न: 'न', प: 'म', फ: 'म', ब: 'म', भ: 'म', म: 'म' };

export function joinForms(line) {
  return line
    // anusvāra + marks + class consonant (inside a word): marks + nasal + virama
    .replace(/ं([॒॑᳚]*)([कखगघचछजझटठडढतथदधनपफबभम])/g, (m, marks, c) => `${marks}${NASAL_OF[c]}्${c}`)
    // anusvāra + marks + य / व / ल (inside a word): marks + semivowel + virama + candrabindu
    .replace(/ं([॒॑᳚]*)([यवल])/g, '$1$2्ँ$2')
    // visarga + marks (+ a space) + श / ष / स: marks + sibilant + virama
    .replace(/ः([॒॑᳚]*)[  ]?([शषस])/g, '$1$2्$2');
}
