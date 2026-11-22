// Navigation inside an Appendix book: a sticky top bar and a bottom bar with Home, Library, the Pūjā Kalpa
// list (on its pages), Contents (a sheet built from the book's headings, with the current section marked) and Top.
// Hidden in print. Loaded by every page in web/appendix/.
(function () {
  const main = document.querySelector('main');
  if (!main) return;
  const kalpa = /\/kalpa-[^/]*\.html$/.test(location.pathname);
  const ICON = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    lib: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
    kalpa: '<path d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    toc: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    top: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  };
  const svg = (k) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

  const css = document.createElement('style');
  css.textContent = `
.topnav { position: sticky; top: 0; z-index: 50; background: #EFE9E1; padding-bottom: 8px; }
.bn { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; display: flex; justify-content: center; background: var(--paper, #fff);
  border-top: 1px solid var(--rule, #DCC7A8); padding: 4px max(8px, env(safe-area-inset-right, 0px)) calc(4px + env(safe-area-inset-bottom, 0px)) max(8px, env(safe-area-inset-left, 0px)); }
.bn-in { display: flex; width: 100%; max-width: 560px; justify-content: space-around; }
.bn a, .bn button { flex: 1; min-width: 56px; min-height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  border: 0; background: transparent; color: var(--soft, #5E5248); font: 600 12px var(--kn, sans-serif); text-decoration: none; cursor: pointer; border-radius: 10px; }
.bn a:hover, .bn button:hover { color: var(--maroon, #7C2D12); background: var(--wash, #FBF6EE); }
.bn a:focus-visible, .bn button:focus-visible, .bs a:focus-visible, .bs-x:focus-visible { outline: 2px solid var(--saffron, #B45309); outline-offset: 2px; }
.bn [aria-expanded="true"] { color: var(--maroon, #7C2D12); }
body { padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)); }
.bs-bg { position: fixed; inset: 0; z-index: 70; background: rgba(31, 26, 22, .35); }
.bs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 71; max-height: 78vh; display: flex; flex-direction: column; background: var(--paper, #fff);
  border-radius: 16px 16px 0 0; box-shadow: 0 -4px 20px rgba(60, 40, 20, .18); max-width: 640px; margin: 0 auto; }
.bs-h { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px 6px 18px; border-bottom: 1px solid var(--line, #E9DFD0);
  font: 700 16px var(--kn, sans-serif); color: var(--maroon, #7C2D12); }
.bs-x { width: 44px; height: 44px; border: 0; background: transparent; font-size: 22px; color: var(--ink, #1F1A16); cursor: pointer; border-radius: 10px; }
.bs ol { list-style: none; margin: 0; padding: 6px 8px calc(12px + env(safe-area-inset-bottom, 0px)); overflow: auto; }
.bs li a { display: block; padding: 9px 12px; border-radius: 8px; color: var(--ink, #1F1A16); text-decoration: none; font: 15px/1.45 var(--kn, sans-serif); }
.bs li.l1 a { font-weight: 700; color: var(--maroon, #7C2D12); margin-top: 6px; }
.bs li.l2 a { padding-left: 26px; }
.bs li a[aria-current="true"] { background: var(--wash, #FBF6EE); box-shadow: inset 3px 0 0 var(--saffron, #B45309); }
.bs li a:hover { background: var(--wash, #FBF6EE); }
h1[id], h2[id], h3[id] { scroll-margin-top: 64px; }
@media print { .bn, .bs, .bs-bg { display: none !important; } body { padding-bottom: 0; } .topnav { position: static; } }
`;
  document.head.appendChild(css);

  // headings → contents
  const heads = [...main.querySelectorAll('h1, h2')].filter((h) => h.textContent.trim());
  heads.forEach((h, i) => { if (!h.id) h.id = 'sec-' + (i + 1); });
  const label = (h) => h.textContent.replace(/^[:\s]+|[:\s]+$/g, '').replace(/\s+/g, ' ');

  const bar = document.createElement('nav');
  bar.className = 'bn'; bar.setAttribute('aria-label', 'ಪುಸ್ತಕ ಸಂಚಾರ');
  bar.innerHTML = `<div class="bn-in">
<a href="../">${svg('home')}<span>ಮುಖಪುಟ</span></a>
<a href="../#/library">${svg('lib')}<span>ಗ್ರಂಥಾಲಯ</span></a>
${kalpa ? `<a href="puja-kalpa.html">${svg('kalpa')}<span>ಪೂಜಾ ಕಲ್ಪ</span></a>` : ''}
${heads.length > 1 ? `<button type="button" id="bnToc" aria-expanded="false" aria-controls="bnSheet">${svg('toc')}<span>ಪರಿವಿಡಿ</span></button>` : ''}
<button type="button" id="bnTop">${svg('top')}<span>ಮೇಲೆ</span></button></div>`;
  document.body.appendChild(bar);
  document.getElementById('bnTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const tocBtn = document.getElementById('bnToc');
  if (!tocBtn) return;
  let sheet = null, bg = null;
  function current() {
    let cur = heads[0];
    for (const h of heads) { if (h.getBoundingClientRect().top < 120) cur = h; else break; }
    return cur;
  }
  function close() {
    if (!sheet) return;
    sheet.remove(); bg.remove(); sheet = bg = null;
    tocBtn.setAttribute('aria-expanded', 'false'); tocBtn.focus();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open() {
    bg = document.createElement('div'); bg.className = 'bs-bg'; bg.addEventListener('click', close);
    sheet = document.createElement('div'); sheet.className = 'bs'; sheet.id = 'bnSheet';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'ಪರಿವಿಡಿ');
    const head = document.createElement('div'); head.className = 'bs-h'; head.append('ಪರಿವಿಡಿ');
    const x = document.createElement('button'); x.type = 'button'; x.className = 'bs-x'; x.textContent = '✕'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', close);
    head.appendChild(x);
    const ol = document.createElement('ol'); const cur = current(); let curA = null;
    heads.forEach((h) => {
      if (h.closest('[hidden]')) return;
      const li = document.createElement('li'); li.className = h.tagName === 'H1' ? 'l1' : 'l2';
      const a = document.createElement('a'); a.href = '#' + h.id; a.textContent = label(h);
      if (h === cur) { a.setAttribute('aria-current', 'true'); curA = a; }
      a.addEventListener('click', (e) => { e.preventDefault(); close(); h.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', '#' + h.id); });
      li.appendChild(a); ol.appendChild(li);
    });
    sheet.append(head, ol);
    document.body.append(bg, sheet);
    tocBtn.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey);
    (curA || x).focus();
    if (curA) curA.scrollIntoView({ block: 'center' });
  }
  tocBtn.addEventListener('click', () => (sheet ? close() : open()));
})();
