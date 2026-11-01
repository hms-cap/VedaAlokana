// Padapāṭha words, stored in IAST, shown in Devanagari (and Kannada, through the app's usual script switch).
// The data writes a compound break as "-" (puraḥ-hitam); the printed padapāṭha writes it as an avagraha (पुरःऽहितम्).
// A few source entries need a clean-up first (see cleanPada). No DOM.
import { iastToDeva } from './translit.js';

/**
 * Padapāṭha words of one verse, cleaned: source markup removed, and a pragṛhya word that the source ran
 * together with its split form ("dravatpāṇī itidravat-pāṇī") split into the two words the book prints.
 */
export function cleanPada(words) {
  const out = [];
  for (const raw of words) {
    const w = raw.replace(/&lt;[^]*?&gt;/g, '').replace(/\([^)]*\)/g, '').trim(); // "<b>(ṛV_10,92)yajñasya" → "yajñasya"
    if (!/[a-zāīūṛḷṃḥṅñṇṭḍśṣ]/i.test(w) || w === 'N/A') continue;
    const m = w.match(/^(\S+ iti)(\S.*)$/); // "X iti" + "X-split"
    if (m) out.push(m[1], m[2]); else out.push(w);
  }
  return out;
}

/** Cleaned padapāṭha words in Devanagari, compound breaks as ऽ. */
export const padaDeva = (words) => cleanPada(words).map((w) => iastToDeva(w.replace(/-/g, 'ऽ')));
