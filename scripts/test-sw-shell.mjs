// Every module the app imports must be in the service worker's SHELL_FILES, or the installed app fails to start offline.
import { readFileSync, readdirSync } from 'node:fs';
const sw = readFileSync('web/sw.js', 'utf8');
const shell = new Set([...sw.slice(sw.indexOf('SHELL_FILES'), sw.indexOf('];', sw.indexOf('SHELL_FILES'))).matchAll(/'([^']+)'/g)].map((m) => m[1]));
const bad = [];
const seen = new Set();
const walk = (f) => {
  if (seen.has(f)) return; seen.add(f);
  if (!shell.has(f)) bad.push(f);
  const src = readFileSync(`web/${f}`, 'utf8');
  for (const m of src.matchAll(/(?:from|import\()\s*['"]\.\/([\w.-]+\.js)['"]/g)) walk(m[1]);
};
walk('app.js');
if (bad.length) { console.error(`not in sw.js SHELL_FILES: ${bad.join(', ')}`); process.exit(1); }
console.log(`ok (${seen.size} modules reachable from app.js are all precached)`);
