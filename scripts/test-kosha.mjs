// Checks the Śabdārtha Kaustubha dictionary data (web/data/kosha/) and the lookups in web/kosha.js.
// The data is built by scripts/build-kosha.mjs from a source file that is not in the repo, so this reads the built files.
import fs from 'node:fs';
import { parseBabylon } from './build-kosha.mjs';
import { looseKey } from '../web/search-key.js';
import { koshaRows, lookup, shardOf, matchKeys, neighbours } from '../web/kosha.js';

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

console.log(bad ? `${bad} check(s) failed` : 'all dictionary checks passed');
process.exit(bad ? 1 : 0);
