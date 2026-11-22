// Devatā editor for the pūjā books: type a name in Roman, IAST, Devanagari or Kannada, review the
// Kannada, and edit the case forms, an optional dhyāna śloka and an optional list of names.
// Reuses the app's own transliteration (../translit.js, ../lipi.js). My devatās are saved on this device.
import { iastToDeva, devaToIast } from '../translit.js';
import { toKnda } from '../lipi.js';

const SAVE_KEY = 'vedalokana.devatas';
const FORMS = [
  ['acc', 'Dhyāna line', '… ಧ್ಯಾಯಾಮಿ'], ['dat', 'Namaskāra', '… ನಮಃ'],
  ['prit', 'Saṅkalpa', '… ಪ್ರೀತ್ಯರ್ಥಂ'], ['end', 'Closing', '… ಪ್ರೀಯತಾಂ'],
];
const blank = () => ({ id: '', scheme: 'roman', name: '', g: 'm', f: { acc: { t: '', m: 0 }, dat: { t: '', m: 0 }, prit: { t: '', m: 0 }, end: { t: '', m: 0 } }, dh: '', names: '', off: [] });

// ---- transliteration helpers --------------------------------------------------------------
const ROMAN = [['R^i', 'ṛ'], ['RRi', 'ṝ'], ['~n', 'ñ'], ['chh', 'ch'], ['ch', 'c'], ['Sh', 'ṣ'], ['sh', 'ś'], ['Th', 'ṭh'], ['Dh', 'ḍh'],
  ['aa', 'ā'], ['ii', 'ī'], ['ee', 'ī'], ['uu', 'ū'], ['oo', 'ū'], ['A', 'ā'], ['I', 'ī'], ['U', 'ū'], ['T', 'ṭ'], ['D', 'ḍ'], ['N', 'ṇ'], ['M', 'ṃ'], ['H', 'ḥ'], ['L', 'ḷ'], ['w', 'v']];
export function romanToIast(s) {
  let out = '', i = 0;
  while (i < s.length) {
    const m = ROMAN.find(([r]) => s.startsWith(r, i));
    if (m) { out += m[1]; i += m[0].length; } else { out += s[i].toLowerCase(); i += 1; }
  }
  return out.replace(/n(?=(kh|k|gh|g))/g, 'ṅ').replace(/n(?=(ch|c|jh|j))/g, 'ñ').replace(/n(?=(ṭh|ṭ|ḍh|ḍ))/g, 'ṇ');
}
const HAS_KN = /[ಀ-೿]/, HAS_DE = /[ऀ-ॿ]/, HAS_DIA = /[āīūṛṝḷṅñṭḍṇśṣṃḥ]/i;
function knToDeva(s) {
  return Array.from(s).map((ch) => {
    const c = ch.codePointAt(0);
    return (c >= 0xC81 && c <= 0xCE3) || (c >= 0xCE6 && c <= 0xCEF) ? String.fromCodePoint(c - 0x380) : ch;
  }).join('');
}
const NAS = /ಙ್(?=[ಕಖಗಘ])|ಞ್(?=[ಚಛಜಝ])|ಣ್(?=[ಟಠಡಢ])|ನ್(?=[ತಥದಧ])|ಮ್(?=[ಪಫಬಭ])/g;
const kn = (deva) => toKnda(deva).replace(NAS, 'ಂ').replace(/ಮ್(?=[\s।॥]|$)/g, 'ಂ');
function auto(t) {                       // any script, or casual Roman / IAST → Devanagari
  if (HAS_KN.test(t)) return knToDeva(t);
  if (HAS_DE.test(t)) return t;
  return iastToDeva(HAS_DIA.test(t) ? t : romanToIast(t));
}
function nameDeva(raw) {
  const n = raw.name.trim();
  if (!n) return '';
  if (raw.scheme === 'kn') return knToDeva(n);
  if (raw.scheme === 'deva') return n;
  if (raw.scheme === 'iast') return iastToDeva(n);
  return iastToDeva(romanToIast(n));
}
function derive(stem, g) {                // IAST forms from an a-stem (m) or ā-stem (f) name
  const none = { acc: '', dat: '', prit: '', end: '' };
  if (!stem) return none;
  if (g === 'm' && stem.endsWith('a')) {
    const b = stem.slice(0, -1);
    return { acc: `śrī ${stem}ṃ`, dat: `śrī ${b}āya`, prit: `śrī ${stem}prītyarthaṃ`, end: `bhagavān sarvātmakaḥ śrī ${b}aḥ prīyatāṃ` };
  }
  if (g === 'f' && stem.endsWith('ā')) {
    const b = stem.slice(0, -1);
    return { acc: `śrī ${stem}ṃ`, dat: `śrī ${b}āyai`, prit: `śrī ${stem}prītyarthaṃ`, end: `bhagavatī sarvātmikā śrī ${stem} prīyatāṃ` };
  }
  return none;
}
const lines = (t) => t.split('\n').map((s) => s.trim()).filter(Boolean);

export function compute(raw) {
  const deva = nameDeva(raw);
  const iast = devaToIast(deva).replace(/^śrī?\s+/, '');
  const stem = deva ? kn(deva.replace(/^श्री?\s+/, '')) : '';
  const d = derive(iast, raw.g);
  const forms = {};
  for (const [k] of FORMS) {
    const f = raw.f[k]; const t = f.m ? f.t : d[k];
    forms[k] = { t, kn: t ? kn(auto(t)) : '' };
  }
  const dl = lines(raw.dh).map((l) => kn(auto(l)));
  const dh = dl.map((l, i) => (/[।॥]$/.test(l) ? l : l + (i === dl.length - 1 ? ' ॥' : ' ।'))).join('\n');
  const names = lines(raw.names).map((l) => ({ src: l, kn: kn(auto(l)) }));
  names.forEach((n) => { n.on = !raw.off.includes(n.src); });
  return { iast, deva: deva.replace(/^श्री?\s+/, ''), name: stem ? 'ಶ್ರೀ ' + stem : '', forms, dh, names };
}
export const result = (raw) => {
  const c = compute(raw);
  return { raw, name: c.name, acc: c.forms.acc.kn, dat: c.forms.dat.kn, prit: c.forms.prit.kn, end: c.forms.end.kn, dh: c.dh, names: c.names.filter((n) => n.on).map((n) => n.kn) };
};

// ---- saved devatās -------------------------------------------------------------------------
const loadSaved = () => { try { const a = JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const storeSaved = (a) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(a)); } catch (e) {} };

// ---- UI ------------------------------------------------------------------------------------
const CSS = `
.de-ov{position:fixed;inset:0;z-index:1000;background:var(--wash,#F5F6F4);color:var(--ink,#15181A);display:flex;flex-direction:column;font:16px/1.5 var(--ui,Inter,system-ui,sans-serif)}
.de-ov *{box-sizing:border-box}
.de-ov button,.de-ov input,.de-ov textarea{font:inherit}
.de-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:56px;padding:0 12px;background:var(--paper,#fff);border-bottom:1px solid var(--rule,#D2D6D1)}
.de-ov p,.de-ov label{text-align:left}
.de-t{font-size:16px;font-weight:700;text-align:center;line-height:1.25}
.de-t small{display:block;font-weight:400;font-size:13px;color:var(--soft,#565C62)}
.de-x{width:44px;height:44px;border:0;background:transparent;color:inherit;font-size:22px;cursor:pointer}
.de-body{flex:1;overflow:auto;padding:16px}
.de-grid{max-width:1180px;margin:0 auto;display:grid;gap:20px;grid-template-columns:minmax(0,1fr)}
@media(min-width:900px){.de-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}.de-right{position:sticky;top:0}}
.de-left,.de-right{display:flex;flex-direction:column;gap:16px}
.de-card{background:var(--paper,#fff);border:1px solid var(--rule,#D2D6D1);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px}
.de-h{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--soft,#565C62);margin:0}
.de-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.de-chip{min-height:36px;padding:0 14px;border-radius:18px;border:1.5px solid var(--rule,#D2D6D1);background:var(--paper,#fff);color:inherit;font-weight:600;font-size:14px;cursor:pointer}
.de-chip[aria-pressed=true]{background:var(--maroon,#7C2D12);border-color:var(--maroon,#7C2D12);color:#fff}
.de-chip.dash{border-style:dashed;background:transparent}
.de-sc .de-chip{min-height:32px;padding:0 12px;font-size:13px}
.de-sc .de-chip[aria-pressed=true]{background:#15181A;border-color:#15181A}
.de-in{width:100%;min-height:44px;padding:8px 12px;border:1.5px solid var(--rule,#D2D6D1);border-radius:10px;background:var(--paper,#fff);color:inherit}
.de-in.hot{border-color:#2B3990}.de-in.ed{border-color:#B43C0B}
.de-ov :focus-visible{outline:2px solid #2B3990;outline-offset:2px}
.de-hint{font-size:12.5px;color:var(--soft,#565C62);margin:0}
.de-kn{font-family:var(--kn,'Noto Sans Kannada',sans-serif);font-size:18px;line-height:1.7;background:var(--wash,#F5F6F4);border-radius:8px;padding:6px 10px;min-height:2.4em;white-space:pre-line}
.de-rev{background:var(--wash,#FBF6EE);border:1px solid var(--rule,#DCC7A8)}
.de-big{font-family:var(--kn,'Noto Sans Kannada',sans-serif);font-size:28px;font-weight:700;line-height:1.5;color:var(--maroon,#7C2D12);min-height:1.5em}
.de-gen{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.de-gen .de-chip{border-radius:10px;min-height:48px;padding:4px 6px;font-size:13px;line-height:1.3}
.de-fl{display:flex;justify-content:space-between;gap:8px;font-size:13px}
.de-fl b{font-weight:600}.de-fl i{font-style:normal;color:var(--soft,#565C62)}
.de-st{font-weight:600;color:#0F5F7A}.de-st.ed{color:#B43C0B}
.de-lk{border:0;background:transparent;color:#2B3990;font-weight:600;font-size:13px;text-decoration:underline;cursor:pointer;padding:0}
.de-nl{list-style:none;margin:0;padding:0;display:grid;gap:2px;max-height:260px;overflow:auto}
.de-nl label{display:flex;align-items:center;gap:10px;min-height:40px;font-family:var(--kn,'Noto Sans Kannada',sans-serif);font-size:16px}
.de-nl input{width:20px;height:20px;accent-color:var(--maroon,#7C2D12);flex:none}
.de-nl .off{color:var(--soft,#565C62);text-decoration:line-through}
.de-mk{background:#FBE3C8;color:var(--maroon,#7C2D12);padding:0 3px;border-radius:3px}
.de-prev{font-family:var(--kn,'Noto Sans Kannada',sans-serif);font-size:15.5px;line-height:1.9}
.de-foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--paper,#fff);border-top:1px solid var(--rule,#D2D6D1)}
.de-foot label{display:flex;align-items:center;gap:10px;min-height:44px;font-size:14px}
.de-foot input{width:20px;height:20px;accent-color:var(--maroon,#7C2D12)}
.de-btn{height:46px;padding:0 22px;border-radius:23px;border:1.5px solid var(--rule,#D2D6D1);background:var(--paper,#fff);color:inherit;font-weight:600;cursor:pointer}
.de-btn.go{background:var(--maroon,#7C2D12);border-color:var(--maroon,#7C2D12);color:#fff}
.de-btn[disabled]{opacity:.45;cursor:not-allowed}
`;

export function openEditor({ initial, showNames = true, vidhana = 'ಪುರುಷಸೂಕ್ತವಿಧಾನೇನ', onUse, onCancel }) {
  let raw = Object.assign(blank(), JSON.parse(JSON.stringify(initial || {})));
  raw.f = Object.assign(blank().f, raw.f);
  let saved = loadSaved();
  const opener = document.activeElement;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const ov = document.createElement('div'); ov.className = 'de-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Edit devatā');
  const prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (text, cls, fn, lang) => { const b = el('button', cls, text); b.type = 'button'; if (lang) b.lang = lang; b.addEventListener('click', fn); return b; };
  const card = (title) => { const c = el('section', 'de-card'); if (title) c.appendChild(el('h3', 'de-h', title)); return c; };

  // bar
  const bar = el('div', 'de-bar');
  const x = btn('✕', 'de-x', () => close(true)); x.setAttribute('aria-label', 'Close');
  const ttl = el('div', 'de-t', 'Edit devatā'); ttl.setAttribute('role', 'heading'); ttl.setAttribute('aria-level', '2'); ttl.appendChild(el('small', '', 'ದೇವತೆ ತಿದ್ದಿ')); ttl.lastChild.lang = 'kn';
  const done = btn('Done', 'de-btn go', () => use()); done.style.height = '40px';
  bar.append(x, ttl, done);

  const body = el('div', 'de-body'); const grid = el('div', 'de-grid'); const left = el('div', 'de-left'), right = el('div', 'de-right');
  grid.append(left, right); body.appendChild(grid);

  // 1 my devatās
  const mine = card('Devatā'); const mineRow = el('div', 'de-row'); mine.append(mineRow);
  function paintMine() {
    mineRow.textContent = '';
    saved.forEach((s) => {
      const c = compute(s);
      const b = btn(c.name || '—', 'de-chip', () => { raw = Object.assign(blank(), JSON.parse(JSON.stringify(s))); syncInputs(); render(); }, 'kn');
      b.setAttribute('aria-pressed', String(s.id && s.id === raw.id)); mineRow.appendChild(b);
    });
    mineRow.appendChild(btn('+ New', 'de-chip dash', () => { raw = blank(); syncInputs(); render(); }));
    if (raw.id) mineRow.appendChild(btn('Delete this one', 'de-lk', () => { saved = saved.filter((s) => s.id !== raw.id); storeSaved(saved); raw.id = ''; paintMine(); }));
  }
  left.appendChild(mine);

  // 2 name
  const nameC = card('Name'); const lab = el('label', '', 'Type in any script'); lab.style.fontWeight = '600';
  const sc = el('div', 'de-row de-sc'); sc.setAttribute('role', 'group'); sc.setAttribute('aria-label', 'Input script');
  const SCH = [['roman', 'Roman', ''], ['iast', 'IAST', ''], ['deva', 'देवनागरी', 'sa'], ['kn', 'ಕನ್ನಡ', 'kn']];
  const schBtns = SCH.map(([k, t, l]) => { const b = btn(t, 'de-chip', () => { raw.scheme = k; render(); }, l); sc.appendChild(b); return [k, b]; });
  const nameIn = el('input', 'de-in hot'); nameIn.id = 'de-name'; lab.htmlFor = 'de-name'; nameIn.autocomplete = 'off'; nameIn.autocapitalize = 'none'; nameIn.spellcheck = false;
  nameIn.addEventListener('input', () => { raw.name = nameIn.value; render(); });
  const nameHint = el('p', 'de-hint', 'Roman: aa = ā, sh = ś, Sh = ṣ, T D N = ṭ ḍ ṇ, ~n = ñ, M = ṃ, H = ḥ, R^i = ṛ. Give the name without the ending (venkateshwara, lalitaa).');
  nameC.append(lab, sc, nameIn, nameHint); left.appendChild(nameC);

  // 3 endings
  const gC = card('Endings'); const gen = el('div', 'de-gen');
  const GEN = [['m', 'Masculine', 'ends in a'], ['f', 'Feminine', 'ends in ā'], ['o', 'Other', 'write the forms']];
  const genBtns = GEN.map(([k, t, s]) => { const b = btn('', 'de-chip', () => { raw.g = k; render(); }); b.append(t, document.createElement('br'), s); gen.appendChild(b); return [k, b]; });
  const gHint = el('p', 'de-hint', ''); gC.append(gen, gHint); left.appendChild(gC);

  // 4 forms
  const fC = card('Forms used in the pūjā'); const fRows = {};
  FORMS.forEach(([k, t, hint]) => {
    const w = el('div', ''); w.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    const head = el('div', 'de-fl'); const l = el('label'); l.htmlFor = 'de-f-' + k; const b1 = el('b', '', t + ' '); const i1 = el('i', '', hint); i1.lang = 'kn'; l.append(b1, i1);
    const stw = el('span'); const st = el('span', 'de-st', 'auto'); const rs = btn('reset', 'de-lk', () => { raw.f[k] = { t: '', m: 0 }; syncInputs(); render(); }); rs.hidden = true; stw.append(st, document.createTextNode(' '), rs);
    head.append(l, stw);
    const inp = el('input', 'de-in'); inp.id = 'de-f-' + k; inp.autocomplete = 'off'; inp.autocapitalize = 'none'; inp.spellcheck = false;
    inp.addEventListener('input', () => { raw.f[k] = { t: inp.value, m: inp.value ? 1 : 0 }; render(); });
    const kd = el('div', 'de-kn'); kd.lang = 'kn';
    w.append(head, inp, kd); fC.appendChild(w); fRows[k] = { inp, kd, st, rs };
  });
  fC.appendChild(el('p', 'de-hint', 'Filled in from the name; type in any script to change a form. Other endings (Viṣṇu, Lakṣmī…): write the forms yourself.'));
  left.appendChild(fC);

  // 5 dhyāna
  const dC = card('Dhyāna śloka (optional)'); const dl = el('label', '', 'One pāda per line'); dl.htmlFor = 'de-dh'; dl.className = 'de-hint';
  const dh = el('textarea', 'de-in'); dh.id = 'de-dh'; dh.rows = 3; dh.spellcheck = false; dh.addEventListener('input', () => { raw.dh = dh.value; render(); });
  const dk = el('div', 'de-kn'); dk.lang = 'kn'; dC.append(dl, dh, dk); left.appendChild(dC);

  // 6 names
  let nl, nOn, nOff, nCount, nTa;
  if (showNames) {
    const nC = card('Names for nāma pūjā (optional)');
    const nlab = el('label', 'de-hint', 'One name per line, in the dative (sumukhāya). Each is read “ಓಂ … ನಮಃ”. Left empty, nāma pūjā is skipped.'); nlab.htmlFor = 'de-names';
    nTa = el('textarea', 'de-in'); nTa.id = 'de-names'; nTa.rows = 3; nTa.spellcheck = false; nTa.addEventListener('input', () => { raw.names = nTa.value; render(); });
    const ctl = el('div', 'de-row');
    nOn = btn('Select all', 'de-chip', () => { raw.off = []; render(); }); nOff = btn('Unselect all', 'de-chip', () => { raw.off = lines(raw.names); render(); }); nCount = el('span', 'de-hint', '');
    ctl.append(nOn, nOff, nCount); nl = el('ul', 'de-nl'); nC.append(nlab, nTa, ctl, nl); left.appendChild(nC);
  }

  // right: review
  const rev = card(); rev.classList.add('de-rev'); rev.appendChild(el('h3', 'de-h', 'Review · what will be printed'));
  const big = el('div', 'de-big'); big.lang = 'kn';
  const alts = el('div', 'de-row'); const idl = el('div', 'de-row'); idl.style.cssText = 'gap:20px;font-size:16px'; const sIast = el('span'), sDeva = el('span'); sDeva.lang = 'sa'; idl.append(sIast, sDeva);
  const altHint = el('span', 'de-hint', ''); const altBtn = btn('', 'de-chip', () => {}, 'kn'); alts.append(altHint, altBtn);
  rev.append(big, idl, alts);
  const prC = card('In your pūjā'); const prev = el('div', 'de-prev'); prev.lang = 'kn'; prC.appendChild(prev);
  right.append(rev, prC);

  // footer
  const foot = el('div', 'de-foot');
  const saveL = el('label'); const saveCb = el('input'); saveCb.type = 'checkbox'; saveCb.checked = true; saveL.append(saveCb, document.createTextNode('Save to My devatās on this device'));
  const fb = el('div', 'de-row'); const cancel = btn('Cancel', 'de-btn', () => close(true)); const go = btn('Use for this pūjā', 'de-btn go', () => use()); fb.append(cancel, go);
  foot.append(saveL, fb);

  ov.append(bar, body, foot); document.body.appendChild(ov);

  function syncInputs() {
    nameIn.value = raw.name; dh.value = raw.dh; if (nTa) nTa.value = raw.names;
    for (const [k] of FORMS) fRows[k].inp.value = '';
  }
  const mark = (s) => { const m = el('mark', 'de-mk', s); return m; };
  function render() {
    const c = compute(raw);
    schBtns.forEach(([k, b]) => b.setAttribute('aria-pressed', String(raw.scheme === k)));
    genBtns.forEach(([k, b]) => b.setAttribute('aria-pressed', String(raw.g === k)));
    nameHint.hidden = raw.scheme !== 'roman';
    big.textContent = c.name || '—'; sIast.textContent = c.iast ? 'śrī ' + c.iast : ''; sDeva.textContent = c.deva ? 'श्री ' + c.deva : '';
    // ś / ṣ alternative when typing Roman
    const alt = raw.scheme === 'roman' ? (raw.name.includes('sh') ? raw.name.replace(/sh/g, 'Sh') : raw.name.includes('Sh') ? raw.name.replace(/Sh/g, 'sh') : '') : '';
    alts.hidden = !alt;
    if (alt) {
      const a = compute(Object.assign({}, raw, { name: alt })); altHint.textContent = raw.name.includes('Sh') ? '“Sh” is ṣ. Switch to' : '“sh” is ś. Switch to';
      altBtn.textContent = a.name.replace(/^ಶ್ರೀ /, ''); altBtn.onclick = () => { raw.name = alt; syncName(); render(); };
    }
    gHint.hidden = !(raw.name.trim() && raw.g !== 'o' && !derive(c.iast, raw.g).acc);
    gHint.textContent = raw.g === 'm' ? 'The name does not end in “a”: choose Other and write the forms.' : 'The name does not end in “ā”: choose Other and write the forms.';
    for (const [k] of FORMS) {
      const r = fRows[k], f = raw.f[k];
      if (document.activeElement !== r.inp) r.inp.value = f.m ? f.t : c.forms[k].t;
      r.inp.classList.toggle('ed', !!f.m); r.st.textContent = f.m ? 'edited' : 'auto'; r.st.classList.toggle('ed', !!f.m); r.rs.hidden = !f.m;
      r.kd.textContent = c.forms[k].kn;
    }
    dk.textContent = c.dh; dk.hidden = !c.dh;
    if (nl) {
      nl.textContent = '';
      c.names.forEach((n) => {
        const li = el('li'); const l = el('label'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = n.on;
        cb.addEventListener('change', () => { raw.off = cb.checked ? raw.off.filter((s) => s !== n.src) : raw.off.concat(n.src); render(); });
        l.append(cb, el('span', n.on ? '' : 'off', 'ಓಂ ' + n.kn + ' ನಮಃ')); li.appendChild(l); nl.appendChild(li);
      });
      const on = c.names.filter((n) => n.on).length; nCount.textContent = c.names.length ? `${on} of ${c.names.length} selected` : '';
      nOn.hidden = nOff.hidden = !c.names.length;
    }
    prev.textContent = '';
    prev.append('… ಸಿದ್ಧ್ಯರ್ಥಂ ', mark(c.forms.prit.kn || '…'), ` ${vidhana} ಧ್ಯಾನಾವಾಹನಾದಿ ಷೋಡಶೋಪಚಾರ ಪೂಜಾಂ ಕರಿಷ್ಯೇ ॥`, document.createElement('br'), mark(c.forms.acc.kn || '…'), ' ಧ್ಯಾಯಾಮಿ ॥  ', mark(c.forms.dat.kn || '…'), ' ನಮಃ');
    const ok = !!c.forms.acc.kn && !!c.forms.dat.kn; go.disabled = done.disabled = !ok;
    paintMine();
  }
  function syncName() { nameIn.value = raw.name; }

  function close(cancelled) {
    document.removeEventListener('keydown', onKey); ov.remove(); style.remove(); document.body.style.overflow = prevOverflow;
    if (opener && opener.focus) opener.focus();
    if (cancelled && onCancel) onCancel();
  }
  function use() {
    if (go.disabled) return;
    if (saveCb.checked) {
      if (!raw.id) raw.id = 'd' + Date.now().toString(36);
      const i = saved.findIndex((s) => s.id === raw.id); const copy = JSON.parse(JSON.stringify(raw));
      if (i >= 0) saved[i] = copy; else saved.push(copy);
      storeSaved(saved);
    }
    const res = result(JSON.parse(JSON.stringify(raw)));
    close(false); if (onUse) onUse(res);
  }
  function onKey(e) { if (e.key === 'Escape') close(true); }
  document.addEventListener('keydown', onKey);
  syncInputs(); render(); nameIn.focus();
}
