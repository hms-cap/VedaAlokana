// Checks the standalone Dictionary app (web/kosha/): its files, manifest, icons and service-worker file list.
import fs from 'node:fs';
import path from 'node:path';
let bad = 0;
const check = (ok, msg) => { if (!ok) { bad++; console.error('FAIL', msg); } };
const web = new URL('../web/', import.meta.url).pathname;
const kdir = path.join(web, 'kosha');
const exists = (p) => fs.existsSync(p);

const man = JSON.parse(fs.readFileSync(path.join(kdir, 'manifest.webmanifest'), 'utf8'));
check(man.scope === './' && man.start_url.startsWith('./') && man.display === 'standalone', 'manifest scope, start_url and display');
for (const i of man.icons) check(exists(path.join(kdir, i.src)), `manifest icon ${i.src}`);
check(man.icons.some((i) => i.sizes === '192x192') && man.icons.some((i) => i.sizes === '512x512'), 'manifest has 192 and 512 icons');

const html = fs.readFileSync(path.join(kdir, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  const u = m[1]; if (/^(https?:|\/)/.test(u) || u === '../') continue;
  check(exists(path.join(kdir, u)), `index.html refers to ${u}`);
}
const sw = fs.readFileSync(path.join(kdir, 'sw.js'), 'utf8');
const list = sw.match(/SHELL_FILES = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map((x) => x.slice(1, -1));
for (const f of list) if (f !== './') check(exists(path.join(kdir, f)), `service worker lists ${f}`);
for (const f of ['app.js', 'kosha.css', 'version.js', 'index.html', '../kosha-ui.js', '../kosha.js', '../translit.js', '../search-key.js', '../common.js', '../styles.css']) check(list.includes(f), `service worker stores ${f}`);
// every module the app imports (and they import) is stored for offline use
const seen = new Set();
const walk = (file) => {
  if (seen.has(file)) return; seen.add(file);
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/from '(\.[^']+)'/g)) walk(path.resolve(path.dirname(file), m[1]));
};
walk(path.join(kdir, 'app.js'));
for (const f of seen) { const rel = path.relative(kdir, f); check(list.includes(rel), `module ${rel} is in the service worker list`); }
// versions are separate files, and the main service worker leaves kosha/ alone
check(/KOSHA_APP\s*=\s*\{\s*version:\s*'\d+\.\d+\.\d+'/.test(fs.readFileSync(path.join(kdir, 'version.js'), 'utf8')), 'kosha/version.js has a version');
check(/startsWith\('kosha\/'\)/.test(fs.readFileSync(path.join(web, 'sw.js'), 'utf8')), 'main service worker skips kosha/');
check(/kosha-ui\.js/.test(fs.readFileSync(path.join(web, 'sw.js'), 'utf8')), 'main service worker stores kosha-ui.js');
check(JSON.parse(fs.readFileSync(path.join(web, 'data/offline.json'), 'utf8')).packs.some((p) => p.id === 'kosha'), 'offline index has the kosha pack');
if (bad) process.exit(1);
console.log(`all standalone-app checks passed (${list.length} shell files, ${seen.size} modules)`);
