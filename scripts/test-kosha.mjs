// Checks the Śabdārtha Kaustubha dictionary data (web/data/kosha/) and the lookups in web/kosha.js.
// The data is built by scripts/build-kosha.mjs from a source file that is not in the repo, so this reads the built files.
import fs from 'node:fs';
import { parseBabylon, cleanSa, readErrata, correctRecs } from './build-kosha.mjs';
import { looseKey } from '../web/search-key.js';
import { koshaRows, lookup, shardOf, matchKeys, neighbours, wordOfDay, anotherWord, dayNumber } from '../web/kosha.js';

const dir = new URL('../web/data/kosha/', import.meta.url).pathname;
let bad = 0;
const check = (ok, msg) => { if (!ok) { bad++; console.log('FAIL', msg); } };

// the parser, on a made-up sample
const sample = `#bookname=x\n\nअग्नि\nअग्नि<br><br><b>पदविभागः - </b>पुंलिङ्गः<br><b>कन्नडार्थः - </b>ಬೆಂಕಿ<br><b>व्युत्पत्तिः - </b>अङ्गति ।<br><br>अग्नि<br><br><b>कन्नडार्थः - </b>ಅಗ್ನಿದೇವತೆ<br><br>\n\nअर्द|गतौ|याचने\nअर्द<br><br><b>कन्नडार्थः - </b>ಹೋಗು<br><br>\n\nअर्द|हिंसायाम्\nअर्द<br><br><b>कन्नडार्थः - </b>ಕೊಲ್ಲು<br><br>\n`;
const recs = parseBabylon(sample);
check(recs.size === 2, 'sample has 2 headwords');
const ag = recs.get('अग्नि');
check(ag.senses.length === 2 && ag.senses[0][1] === 'ಬೆಂಕಿ' && ag.senses[0][3] === 'अङ्गति ।' && ag.senses[1].length === 2, 'sense fields');
check(recs.get('अर्द').senses.length === 2 && [...recs.get('अर्द').alts].join() === 'गतौ,याचने,हिंसायाम्', 'senses and variants merge by headword');

// the built data
const man = JSON.parse(fs.readFileSync(dir + 'shards.json', 'utf8'));
const data = { manifest: async () => man, shard: async (f) => JSON.parse(fs.readFileSync(`${dir}${f}.json`, 'utf8')) };
const keys = fs.readFileSync(dir + 'keys.tsv', 'utf8').split('\n').map((l) => l.split('\t'));
check(man.count > 45000, `headword count ${man.count}`);
check(man.shards.every((s, i) => !i || man.shards[i - 1][0] < s[0]), 'shards sorted by first headword');
check(keys.every((k, i) => !i || keys[i - 1].join('\t') <= k.join('\t')), 'keys sorted');
let heads = 0; let senses = 0; let noKannada = 0; let prev = '';
for (const [first, file, n] of man.shards) {
  const es = await data.shard(file);
  check(es.length === n && es[0][0] === first, `${file} matches the manifest`);
  for (const [h, alts, ss] of es) {
    heads++; senses += ss.length;
    check(h > prev || !prev, `sorted: ${prev} / ${h}`); prev = h;
    check(Array.isArray(alts) && ss.length > 0, `${h} has senses`);
    if (!ss.some((s) => s[1])) noKannada++;
  }
  if (bad > 20) break;
}
check(heads === man.count, `${heads} headwords in shards, manifest says ${man.count}`);
// the source itself leaves the meaning out of about 1.5% of the headwords (a derivation only)
check(noKannada / heads < 0.03, `${noKannada} headwords without a Kannada meaning`);
// letters: each starts at its first headword, counts add up (apart from headwords that do not start with a letter)
{
  const ls = man.letters; let total = 0; let all = [];
  for (const f of man.shards) all = all.concat((await data.shard(f[1])).map((e) => e[0]));
  for (const [ch, n, first] of ls) {
    const run = all.filter((h) => [...h][0] === ch);
    check(run.length === n && run[0] === first, `letter ${ch}: ${n} words from ${first}`);
    total += n;
  }
  check(ls.length >= 40 && total <= man.count && man.count - total < 20, `letters cover ${total} of ${man.count} headwords`);
  check(ls.every((l, i) => !i || ls[i - 1][2] < l[2]), 'letters are in order');
}
// corrections: the clean-ups on made-up text, and the reviewed errata in the built data
check(cleanSa('अम्लिी') === 'अम्ली' && cleanSa('नलिनेी') === 'नलिनी', 'two vowel signs: the last one stays');
check(cleanSa('कालान्ुसारिन्') === 'कालानुसारिन्', 'virama before a vowel sign is dropped');
check(cleanSa('विशुद्धोsपि') === 'विशुद्धोऽपि', 'Latin s between Devanagari letters is the avagraha');
check(cleanSa('तीक्ष्णं\u200Dपत्रं') === 'तीक्ष्णं पत्रं' && cleanSa('उद् +\u200D णम') === 'उद् + णम', 'a joiner standing for a space');
check(cleanSa('माघ० १४-१८') === 'माघ॰ १४-१८' && cleanSa('१० ५०') === '१० ५०', 'zero as the abbreviation sign; digits stay');
{
  const er = readErrata();
  const all = man.shards.flatMap((s) => JSON.parse(fs.readFileSync(`${dir}${s[1]}.json`, 'utf8')));
  const byHead = new Map(all.map((e) => [e[0], e]));
  for (const [wrong, right] of er.head) {
    check(byHead.has(right) && !byHead.has(wrong), `errata: ${wrong} → ${right}`);
    check(matchKeys(keys, looseKey(wrong)).exact.includes(right), `errata: searching ${wrong} finds ${right}`);
    check(!byHead.get(right)?.[1].includes(wrong), `errata: ${wrong} is not shown on the page`);
  }
  const text = all.map((e) => JSON.stringify(e)).join('\n');
  for (const [wrong] of er.text) check(!text.includes(wrong), `errata text gone: ${wrong}`);
  // guards: the encoding slips do not come back (Sanskrit fields; field 1 is the Kannada meaning)
  const sa = all.flatMap((e) => [e[0], ...e[1], ...e[2].flatMap((x) => x.filter((v, i) => i !== 1))]).filter(Boolean);
  const guard = (re, what) => { const hit = sa.filter((v) => re.test(v)); check(!hit.length, `${what}: ${hit.slice(0, 3).join(' | ')}`); };
  guard(/[\u093E-\u094C][\u093E-\u094C]/, 'two vowel signs in a row');
  guard(/\u094D[\u093E-\u094C]/, 'virama before a vowel sign');
  guard(/[\u0905-\u0939\u093E-\u094C\u0902\u0903]\u0966(?![\u0966-\u096F])/, 'zero used as the abbreviation sign');
  guard(/[\u0900-\u097F][sS](?=[\u0900-\u097F])/, 'Latin s for the avagraha');
  // merging records whose corrected headwords meet keeps every sense
  const m2 = correctRecs(new Map([['अम्लिी', { h: 'अम्लिी', alts: new Set(), senses: [['a']] }], ['अम्ली', { h: 'अम्ली', alts: new Set(), senses: [['b']] }]]), { head: new Map(), text: [] });
  check(m2.size === 1 && m2.get('अम्ली').senses.length === 2 && m2.get('अम्ली').old.has('अम्लिी'), 'corrected headwords merge');
}
console.log(`${heads} headwords, ${senses} senses, ${man.shards.length} shards`);

// every headword is found by its shard
for (const h of ['अग्नि', 'इन्द्र', 'रुद्र', 'उषस्', 'अश्व', 'सोम']) {
  const e = await lookup(data, h);
  check(e && e[0] === h && e[2].some((s) => s[1]), `lookup ${h}`);
}
check((await lookup(data, 'zzzz')) === null, 'a word that is not there gives null');
check(shardOf(man, 'अ') === man.shards[0][1] || shardOf(man, 'अ') !== undefined, 'shardOf');

// typed in any script, the same words are found, whole-key matches first
for (const q of ['agni', 'अग्नि', 'ಅಗ್ನಿ', 'Agni']) {
  const rows = koshaRows(keys, looseKey(q));
  check(rows[0]?.score === 1100 && rows[0].label === 'agni', `"${q}" → agni first`);
  check(rows.slice(1).every((r) => r.score < 1100), `"${q}": prefix rows below exact`);
}
check(koshaRows(keys, 'a').length === 0, 'one letter: no rows');
check(koshaRows(keys, 'ag').every((r) => r.score === 1100) , 'two letters: exact only');
check(matchKeys(keys, 'agni', { prefixLimit: 3 }).prefix.length <= 3, 'prefix limit');
check(koshaRows(keys, 'qqqqqq').length === 0, 'no match, no rows');

// neighbours: inside a shard, across every shard boundary, and at both ends of the dictionary
const walk = [];
for (const [, file] of man.shards) for (const e of await data.shard(file)) walk.push(e[0]);
for (let i = 1; i < man.shards.length; i++) {
  const lastOfPrev = (await data.shard(man.shards[i - 1][1])).at(-1)[0];
  const n = await neighbours(data, man.shards[i][0]);
  check(n.prev === lastOfPrev, `previous word at the start of shard ${i}: ${n.prev} (want ${lastOfPrev})`);
  const m2 = await neighbours(data, lastOfPrev);
  check(m2.next === man.shards[i][0], `next word at the end of shard ${i - 1}: ${m2.next}`);
}
const mid = walk[Math.floor(walk.length / 2)];
check((await neighbours(data, mid)).prev === walk[Math.floor(walk.length / 2) - 1] && (await neighbours(data, mid)).next === walk[Math.floor(walk.length / 2) + 1], 'neighbours inside a shard');
check((await neighbours(data, walk[0])).prev === null && (await neighbours(data, walk.at(-1))).next === null, 'no neighbour past the ends');

// word of the day: a pool of documented words, each really in the dictionary and matching its first sense
const wotd = JSON.parse(fs.readFileSync(dir + 'wotd.json', 'utf8')).words;
check(wotd.length >= 1000 && new Set(wotd.map((w) => w[0])).size === wotd.length, `word-of-the-day pool: ${wotd.length} distinct words`);
for (const w of wotd.filter((_, i) => i % 40 === 0)) {
  const e = await lookup(data, w[0]);
  check(e && e[2][0][1] === w[2] && w.slice(2).every(Boolean), `${w[0]}: card matches the entry`);
}
check(dayNumber(new Date(2026, 10, 4)) - dayNumber(new Date(2026, 10, 3)) === 1, 'dayNumber counts local days');
check(wordOfDay(wotd, 100)[0] === wotd[100][0] && wordOfDay(wotd, wotd.length + 5)[0] === wotd[5][0] && wordOfDay(wotd, -1)[0] === wotd.at(-1)[0], 'wordOfDay walks the list and wraps');
check(new Set(Array.from({ length: wotd.length }, (_, i) => wordOfDay(wotd, i)[0])).size === wotd.length, 'a different word every day until the list repeats');
let k = 0; // a fixed sequence of random numbers that first lands on the shown word
const seq = () => (k++ % 2 ? 0.5 : 0);
check(anotherWord(wotd, wotd[0][0], seq)[0] !== wotd[0][0] && anotherWord(wotd, wotd[3][0])[0] !== wotd[3][0], 'another word is never the one shown');

// the offline pack lists every dictionary file, so "Download for offline" stores all of it
const pack = JSON.parse(fs.readFileSync(dir + '../offline.json', 'utf8')).packs.find((p) => p.id === 'kosha');
const onDisk = fs.readdirSync(dir).map((f) => `data/kosha/${f}`).sort();
check(pack && JSON.stringify([...pack.files].sort()) === JSON.stringify(onDisk), 'offline pack lists every file in data/kosha');
check(pack && pack.files.includes('data/kosha/keys.tsv') && pack.files.includes('data/kosha/wotd.json') && pack.files.includes('data/kosha/shards.json'), 'offline pack has keys, word list and pool');

console.log(bad ? `${bad} check(s) failed` : 'all dictionary checks passed');
process.exit(bad ? 1 : 0);
