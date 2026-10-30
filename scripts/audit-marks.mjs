// Measures how the svara marks sit in the app's fonts, over every word of the data.
//
//   python3 scripts/make-fonts.py <google-fonts> web/fonts --audit /tmp/afonts
//   node scripts/audit-marks.mjs /tmp/afonts [web/data]
//
// Needs Playwright (Chromium). For Devanagari and Kannada it renders each
// distinct word that carries an anudātta twice, with fonts that shape and
// position identically but draw only the anudātta (*-anu.ttf) or only the rest
// (*-rest.ttf). The gap between the two inks is the true clearance between the
// bar and the letters above it (subscript consonants included). It also
// measures the ink above and below the baseline of every word with the
// web fonts, which sets the line height the reader needs so that one line's
// anudātta never meets the next line's svarita.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { toKnda } from '../web/lipi.js';

const [afonts, dataDir = 'web/data'] = process.argv.slice(2);
if (!afonts) { console.error('usage: node scripts/audit-marks.mjs <audit-font dir> [web/data]'); process.exit(1); }
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }

const catalog = JSON.parse(fs.readFileSync(path.join(dataDir, 'catalog.json'), 'utf8'));
const words = new Set();
for (const id of fs.readdirSync(dataDir).filter((d) => fs.statSync(path.join(dataDir, d)).isDirectory())) {
  for (const f of fs.readdirSync(path.join(dataDir, id))) {
    if (!/^t\d+\.json$/.test(f)) continue;
    const t = JSON.parse(fs.readFileSync(path.join(dataDir, id, f), 'utf8'));
    for (const verses of Object.values(t)) for (const v of verses) for (const line of v[1] || []) {
      for (const w of line.split(/\s+/)) if (w) words.add(w);
    }
  }
}
const deva = [...words];
const scripts = {
  Devanagari: { words: deva, web: 'web/fonts/NotoSerifDevanagari-Vedic.woff' },
  Kannada: { words: [...new Set(deva.map(toKnda))], web: 'web/fonts/NotoSerifKannada-Vedic.woff' },
};
const b64 = (p) => fs.readFileSync(p).toString('base64');

const browser = await playwright.chromium.launch();
const page = await browser.newPage();
const report = {};
for (const [script, s] of Object.entries(scripts)) {
  const r = await page.evaluate(async ({ words, fonts }) => {
    const load = async (name, data) => {
      const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const f = new FontFace(name, bin.buffer); await f.load(); document.fonts.add(f);
    };
    await load('Web', fonts.web); await load('Anu', fonts.anu); await load('Rest', fonts.rest);
    const PX = 60, H = PX * 3, BASE = PX * 1.6;
    const cv = new OffscreenCanvas(10, H), cx = cv.getContext('2d', { willReadFrequently: true });
    const ink = (font, text, w) => {
      cv.width = w; cx.clearRect(0, 0, w, H); cx.font = `${PX}px ${font}`; cx.fillStyle = '#000';
      cx.fillText(text, 4, BASE);
      const d = cx.getImageData(0, 0, w, H).data, on = new Uint8Array(w * H);
      for (let i = 0; i < on.length; i++) on[i] = d[i * 4 + 3] > 90 ? 1 : 0;
      return on;
    };
    const gaps = [], hist = {};
    let asc = [], desc = [];
    cx.font = `${PX}px Web`;
    for (const t of words) { const m = cx.measureText(t); asc.push([m.actualBoundingBoxAscent / PX, t]); desc.push([m.actualBoundingBoxDescent / PX, t]); }
    for (const t of words) {
      if (!t.includes('॒')) continue;
      cx.font = `${PX}px Web`;
      const w = Math.ceil(cx.measureText(t).width) + 12;
      const a = ink('Anu', t, w), rest = ink('Rest', t, w);
      let worst = Infinity;
      for (let x = 0; x < w; x++) {
        let top = -1, bot = -1;
        for (let y = 0; y < H; y++) if (a[y * w + x]) { if (top < 0) top = y; bot = y; }
        if (top < 0) continue;
        // lowest ink of the letters above the bar, in this column and its neighbours
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= w) continue;
          let above = -1, inside = false;
          for (let y = 0; y <= bot; y++) if (rest[y * w + xx]) { if (y >= top) inside = true; else above = y; }
          const g = inside ? -1 : above < 0 ? Infinity : top - above - 1;
          if (g < worst) worst = g;
        }
      }
      if (worst === Infinity) continue;
      const em = worst / PX;
      gaps.push([em, t]);
      const k = worst < 0 ? 'overlap' : em < 0.03 ? '<0.03em' : em < 0.06 ? '<0.06em' : em < 0.1 ? '<0.10em' : 'ok';
      hist[k] = (hist[k] || 0) + 1;
    }
    gaps.sort((p, q) => p[0] - q[0]); asc.sort((p, q) => q[0] - p[0]); desc.sort((p, q) => q[0] - p[0]);
    const pct = (arr, p) => arr[Math.floor(arr.length * (1 - p))]?.[0];
    return {
      words: words.length, withAnudatta: gaps.length, hist,
      tightest: gaps.slice(0, 30).map(([g, t]) => `${t} ${g.toFixed(3)}`),
      ascentMax: asc.slice(0, 5).map(([g, t]) => `${t} ${g.toFixed(2)}`), ascentP999: pct(asc, 0.999),
      descentMax: desc.slice(0, 5).map(([g, t]) => `${t} ${g.toFixed(2)}`), descentP999: pct(desc, 0.999),
    };
  }, { words: s.words, fonts: { web: b64(s.web), anu: b64(path.join(afonts, `${script}-anu.ttf`)), rest: b64(path.join(afonts, `${script}-rest.ttf`)) } });
  report[script] = r;
  console.log(`\n${script}: ${r.words} words, ${r.withAnudatta} with anudātta`, JSON.stringify(r.hist));
  console.log('  tightest:', r.tightest.slice(0, 15).join(' | '));
  console.log('  ink above baseline (em): max', r.ascentMax.join(' | '), '; 99.9%', r.ascentP999.toFixed(2));
  console.log('  ink below baseline (em): max', r.descentMax.join(' | '), '; 99.9%', r.descentP999.toFixed(2));
}
await browser.close();
