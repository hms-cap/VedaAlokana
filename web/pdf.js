// PDF export without a library: the page is laid out in the browser with the app's own fonts, cut into
// A4 pages at block boundaries, drawn to a canvas through an SVG <foreignObject> (so the text is shaped by
// the browser exactly as on screen), and the page images are written into a PDF.
// exportPdf(stage, { title, progress }) → Blob. `stage` is a detached, already-cleaned element.

const PW = 794; const PH = 1123;           // A4 at 96 dpi, in CSS px
const MX = 54; const MY = 54;             // page margins
const SCALE = 2;                          // canvas pixels per CSS px
const CW = PW - 2 * MX; const CH = PH - 2 * MY - 14;   // content box (a little room left for the footer)

const LIGHT = { '--ground': '#fff', '--surface': '#fff', '--surface-2': '#f0f2ef', '--ink': '#15181A', '--muted': '#565C62', '--line': '#D2D6D1', '--line-soft': '#E9EBE8', '--indigo': '#2B3990', '--indigo-soft': '#E8EAF6', '--fire': '#C2410C' };
const VARS = ['--deva', '--deva-lh', '--roman', '--ui'];

let cssCache = null;
async function appCss(families) {
  if (!cssCache) cssCache = await (await fetch(new URL('styles.css', document.baseURI))).text();
  const faces = []; let rest = '';
  // split @font-face blocks from the rest
  rest = cssCache.replace(/@font-face\s*\{[^}]*\}/g, (m) => { faces.push(m); return ''; });
  const used = faces.filter((f) => { const fam = /font-family:\s*'([^']+)'/.exec(f)?.[1]; return fam && families.includes(fam); });
  const out = [];
  for (const f of used) {
    const m = /url\('([^']+)'\)/.exec(f); if (!m) continue;
    const buf = new Uint8Array(await (await fetch(new URL(m[1], new URL('styles.css', document.baseURI)))).arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    out.push(f.replace(m[0], `url('data:font/woff;base64,${btoa(s)}')`));
  }
  // print rules and the dark scheme do not apply to a page image
  rest = rest.replace(/@media print\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  return out.join('\n') + '\n' + rest;
}

const families = (v) => [...v.matchAll(/'([^']+)'|"([^"]+)"|([A-Za-z][A-Za-z ]+[A-Za-z])(?=,|$)/g)].map((m) => (m[1] || m[2] || m[3]).trim());

// leaves of the stage: blocks that fit a page, found by descending into any wrapper taller than one
function leaves(root) {
  const out = [];
  const walk = (el) => {
    for (const c of el.children) {
      const h = c.getBoundingClientRect().height;
      if (h > CH && c.children.length) walk(c); else out.push(c);
    }
  };
  walk(root);
  return out;
}

function paginate(stage) {
  const ls = leaves(stage);
  const pages = []; let cur = []; let start = null;
  ls.forEach((el, i) => {
    el.dataset.pl = String(i);
    const r = el.getBoundingClientRect();
    const cs = el.ownerDocument.defaultView.getComputedStyle(el);
    const top = r.top - parseFloat(cs.marginTop || 0); const bottom = r.bottom + parseFloat(cs.marginBottom || 0);
    if (start === null) start = top;
    if (cur.length && bottom - start > CH) { pages.push(cur); cur = []; start = top; }
    cur.push(i);
  });
  if (cur.length) pages.push(cur);
  return pages;
}

function pageSvg(stage, keep, css, vars, n, total, title, cls) {
  const c = stage.cloneNode(true);
  const k = new Set(keep.map(String));
  c.querySelectorAll('[data-pl]').forEach((el) => { if (!k.has(el.dataset.pl)) el.remove(); });
  // a wrapper left empty (a heading with no verse of its own left on this page) would only add space
  c.querySelectorAll('.verses, section, div').forEach((el) => { if (!el.children.length && !el.textContent.trim() && !el.dataset.pl) el.remove(); });
  c.style.cssText += `;width:${CW}px;margin:0;padding:0;background:#fff;color:#15181A;`;
  const inner = new XMLSerializer().serializeToString(c);
  const foot = `${esc(title)} · ${n} / ${total}`;
  const style = Object.entries(vars).map(([a, b]) => `${a}:${b}`).join(';');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}">
<foreignObject x="0" y="0" width="${PW}" height="${PH}"><div xmlns="http://www.w3.org/1999/xhtml" class="pdf-root ${esc(cls)}" style="${esc(style)};width:${PW}px;height:${PH}px;background:#fff;color:#15181A;font:16px/1.5 var(--ui);overflow:hidden;position:relative">
<style><![CDATA[${css}]]></style>
<div style="position:absolute;left:${MX}px;top:${MY}px;width:${CW}px;height:${CH}px;overflow:hidden">${inner}</div>
<div style="position:absolute;left:${MX}px;right:${MX}px;bottom:26px;text-align:center;font:11px/1.2 var(--ui);color:#8a9096">${foot}</div>
</div></foreignObject></svg>`;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function rasterise(svg) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = PW * SCALE; cv.height = PH * SCALE;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(img, 0, 0, cv.width, cv.height);
  const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.88));
  return { w: cv.width, h: cv.height, data: new Uint8Array(await blob.arrayBuffer()) };
}

// ---- the PDF file: one JPEG per A4 page
function writePdf(pages, title) {
  const enc = new TextEncoder(); const chunks = []; const offs = []; let len = 0;
  const put = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
  const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); put(body); put('\nendobj\n'); };
  const N = pages.length;
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  // objects: 1 catalog, 2 pages, 3 info, then per page: image, content, page
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pages.map((_, i) => `${6 + 3 * i} 0 R`).join(' ');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${N} >>`);
  const hex = [...title].map((ch) => ch.codePointAt(0)).flatMap((c) => (c > 0xffff ? [0xd800 + ((c - 0x10000) >> 10), 0xdc00 + ((c - 0x10000) & 0x3ff)] : [c])).map((u) => u.toString(16).padStart(4, '0')).join('');
  obj(3, `<< /Title <FEFF${hex}> /Producer (Vedavalokanam) >>`);
  pages.forEach((p, i) => {
    const im = 4 + 3 * i;
    offs[im] = len; put(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.data.length} >>\nstream\n`); put(p.data); put('\nendstream\nendobj\n');
    const cs = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
    obj(im + 1, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    obj(im + 2, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${im + 1} 0 R >>`);
  });
  const total = 4 + 3 * N;
  const xref = len;
  put(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let n = 1; n < total; n++) put(`${String(offs[n]).padStart(10, '0')} 00000 n \n`);
  put(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}

export async function exportPdf(stage, { title = 'Vedāvalokanam', progress = () => {} } = {}) {
  const body = document.body;
  const cs = getComputedStyle(body);
  const vars = { ...LIGHT };
  for (const v of VARS) vars[v] = cs.getPropertyValue(v).trim();
  const fams = [...new Set(VARS.flatMap((v) => families(vars[v] || '')))];
  const css = await appCss(fams);
  // laid out in a page-sized frame, so viewport units and wrapping come out as they will in the image
  const fr = document.createElement('iframe');
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = `position:fixed;left:-20000px;top:0;width:${PW}px;height:${PH}px;border:0;visibility:hidden`;
  document.body.append(fr);
  try {
    const d = fr.contentDocument;
    d.open();
    d.write(`<!doctype html><html lang="sa"><head><meta charset="utf-8"><style>${css}</style></head><body class="${body.className}" style="margin:0;background:#fff"><div id="w" style="width:${CW}px"></div></body></html>`);
    d.close();
    Object.entries(vars).forEach(([k, v]) => d.documentElement.style.setProperty(k, v));
    const w = d.getElementById('w');
    w.append(d.importNode(stage, true));
    const st = w.firstElementChild;
    await d.fonts.ready;
    await Promise.all([...d.fonts].map((f) => f.load().catch(() => {})));
    const pages = paginate(st);
    const out = [];
    for (let i = 0; i < pages.length; i++) {
      progress(i + 1, pages.length);
      out.push(await rasterise(pageSvg(st, pages[i], css, vars, i + 1, pages.length, title, body.className)));
      await new Promise((r) => setTimeout(r, 0));
    }
    return writePdf(out, title);
  } finally { fr.remove(); }
}
