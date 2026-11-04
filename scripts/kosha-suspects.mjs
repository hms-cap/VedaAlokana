#!/usr/bin/env node
// Lists headwords of the Śabdārtha Kaustubha that may be misspelt, for a person to review (it changes nothing).
//   node scripts/kosha-suspects.mjs > suspects.tsv
// Confirmed ones go into scripts/kosha-errata.tsv, with the evidence. Checks:
//   repha: "Xत्रि"-type spellings where "र्Xि" is what the entry's own text, or the rest of the dictionary, mostly has
//          (the digital text often has र्ति typed as त्रि: अष्टमूत्रिधर for अष्टमूर्तिधर)
// Most hits are correct words (त्रि, अत्रि, गोमूत्रिका, वज्रिन्), so nothing here is applied automatically.
import fs from 'node:fs';
const dir = new URL('../web/data/kosha/', import.meta.url).pathname;
const man = JSON.parse(fs.readFileSync(dir + 'shards.json', 'utf8'));
const all = man.shards.flatMap((s) => JSON.parse(fs.readFileSync(`${dir}${s[1]}.json`, 'utf8')));
const corpus = all.map((e) => [e[0], ...e[2].flatMap((s) => s.filter((v, i) => i !== 1 && v))].join('\n')).join('\n');
const count = (s) => { let n = 0; let i = 0; while ((i = corpus.indexOf(s, i)) !== -1) { n++; i += s.length; } return n; };
const done = new Set(fs.readFileSync(new URL('./kosha-errata.tsv', import.meta.url), 'utf8').split('\n').map((l) => l.split('\t')[2]).filter(Boolean));
console.log('headword\tsuggested\twhy');
for (const e of all) {
  if (done.has(e[0])) continue;
  const own = JSON.stringify(e[2]);
  for (const m of e[0].matchAll(/([ऀ-ॿ]{0,2})([क-ह])्रि/g)) {
    const bad = m[0]; const good = `${m[1]}र्${m[2]}ि`;
    const fixed = e[0].replace(bad, good);
    const inOwn = m[1].length > 0 && own.includes(fixed.slice(1));
    const nb = count(bad); const ng = count(good);
    if (inOwn || (ng >= 3 && ng >= nb * 2)) console.log(`${e[0]}\t${fixed}\t${inOwn ? 'its own entry has ' + good : ''}${inOwn ? '; ' : ''}dictionary: ${bad} ×${nb}, ${good} ×${ng}`);
  }
}
