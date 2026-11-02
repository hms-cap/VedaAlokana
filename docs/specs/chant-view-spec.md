# Chant View — Design Spec & Implementation Guide

Nov 2, 2026 · @Hemanth

## Purpose and scope

The chant view is a full-screen reading mode that sets a text the way a printed recitation book does: an invocation, a title, section headings, and the verses running on with their numbers. It is taken from Vedāvalokanam (1.23.x, a static vanilla-JS PWA) and is meant to be rebuilt in a Sanskrit kāvya browsing app that shows the same two scripts, Devanagari and Kannada.

What travels with it:

- **Two layouts** — a book page (default) and one verse at a time.
- **Reading controls** — text size, script switch, layout switch, close.
- **Script handling** — one Devanagari source, Kannada made from it by a fixed mapping; fonts tuned for the marks the text carries.
- **A model contract** — every page that can be chanted hands the view the same small data shape.
- **Navigation** — previous / next work, playlists across a list, close returns to where chanting started, the place is remembered.
- **Print and PDF** — a print layout, and a PDF made on the device with no library, shared as a file on phones.

Assumptions for the target app: texts are stored once in Devanagari; the unit of reading is a verse (śloka) inside a section (sarga, ucchvāsa, aṅka); the app is offline-capable and has no server. Vedic svara marks are not needed for most kāvya, but the font pipeline is kept so the same view can show svara-marked text if the app ever needs it.

Out of scope: audio, recitation timing, commentary panes inside the chant view (see *Adapting to kāvya*).

## Design spec

The view is a fixed, full-screen dialog on a warm paper ground, with one header row and the text below it. It covers the app's bars, so the reader sees only the text.

### Surface and colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | #FBF6EA | #17140F | ground of the whole view |
| `--paper-ink` | #1B1712 | #ECE4D3 | text, icons, borders (at 12–18% via `color-mix`) |
| `--paper-muted` | #6B6255 | #A99F8D | inactive controls, counts, references |
| `--vc` | per-collection colour | same | accent: the Chant button that opens the view |

Dark follows the system unless the app's theme is forced (`:root[data-theme="dark"]`). The view sets `position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column` and adds `story-open` to `body` to stop the page underneath from scrolling.

### Header row (`.ch-head`)

Left to right; it wraps on narrow phones.

1. **Close** ✕ — 44 px round button; also Esc and the system Back.
2. **Title** — the work's name, in the script chosen, one line, ellipsised.
3. **Layout** segmented control — *Page* (पुटम्) and *One at a time* (एकैकम्).
4. **Size** — A− / A+, 2 px steps, clamped 16–40 px; default 23 px on the page, +7 px in one-at-a-time.
5. **Script** — अ / ಅ, each label set in its own script's font.
6. **PDF** button, then **⋯** opening a small menu with *Print*.

Segmented controls sit on `--paper-ink` at 8%; the pressed button takes `--paper` with `--paper-ink` text; buttons are 34 px high, 10 px side padding. Every choice is saved in the app's preferences and applies to the next chant view too.

### Book page layout (default)

- A centred column, `max-width: 760px`, padding 18 px sides, bottom padding clears the safe area.
- Body font is the Indic font stack at `--chz` (the size setting), line height `--deva-lh × 1.06`.
- From the top: the invocation (centred, 0.82 em, 600), the title (centred, 1.12 em, 700), then for each part a heading (0.95 em, 700), a source line (0.74 em, 600) and an index line, then paragraphs.
- Verses run on inside a paragraph, each ending `। … ॥n॥`: lines are joined with `  ।  `, the verse number in the script's digits closes it. A paragraph holds `group` verses (5 for metrical collections, 1 otherwise).
- Paragraphs are left-aligned on phones and justified from 560 px wide up; `word-break: keep-all` and no hyphenation, so words are never split.
- At the end: Previous and Next cards (label + title of the neighbouring work), or `॥ इति ॥` when the list ends.

### One-at-a-time layout

- One verse, its lines as separate lines, centred vertically, at `--chz + 7 px`, line height `--deva-lh`.
- Its reference under it in the muted colour.
- Footer: ‹ 56 px round button, a count `n / N` (tabular figures, in the script's digits when the interface is in Sanskrit), › button. After the last verse the Previous / Next cards appear.
- Each change fades in from 8 px below over 200 ms, skipped when the user asks for reduced motion.

### Gestures and keys

| Input | Book page | One at a time |
| --- | --- | --- |
| Swipe left / right (≥ 70 px, mostly sideways, not on the header) | next / previous work | next / previous verse |
| →, Space, PageDown | browser scroll | next verse |
| ←, PageUp | browser scroll | previous verse |
| Esc | close | close |

### Accessibility

- The view is `role="dialog" aria-modal="true"` with `aria-label="Chant view, <title>"`; focus moves to ✕ on open.
- Every icon button has an `aria-label`; segmented buttons carry `aria-pressed`.
- The one-at-a-time body is `aria-live="polite"`, so a screen reader reads each new verse.
- Text carries `lang="sa"` (Devanagari) or `lang="sa-Knda"` (Kannada), so readers and fonts pick the right language.
- While open, the screen is kept on with the Wake Lock API where available.

## Script and fonts

Text is stored and processed only in Devanagari; Kannada is produced at display time by a fixed code-point offset, and each script gets its own bundled font stack. This keeps one copy of every text, one search index and one set of rules.

### Devanagari → Kannada (`lipi.js`, \~45 lines)

- Both scripts follow the ISCII layout, so letters, vowel signs, virama, anusvāra, visarga, avagraha and digits map by adding `0x380` (U+0901–094D, U+0960–0963, U+0966–096F → U+0C81…).
- Code points that are unassigned in Kannada (U+0C84, 0C8D, 0C91, 0CA9, 0CB4, 0CC5, 0CC9, 0CCE–0CD4) keep the Devanagari character.
- Signs Kannada fonts lack are rewritten as Kannada books write them: ꣳ / ᳪ → ಗ್ಂ, ꣵ → ಗ್ಗ್ಂ, jihvāmūlīya ᳵ → ೱ, upadhmānīya ᳶ → ೲ, ॐ → ಓಂ, ॰ → `.`
- Shared characters pass through unchanged: daṇḍas । ॥, svara marks (U+0951, U+0952, U+1CDA).

For kāvya the same map works; add any further signs the corpus uses (e.g. ऄ, ॲ, nukta letters) to the special table and test them in both fonts.

### Where the conversion runs

| Content | How it is converted | Why |
| --- | --- | --- |
| Anything inserted into the live page | a `MutationObserver` on `body` converts text inside every `[lang="sa"]` element, then sets `lang="sa-Knda"` | pages need no per-view code |
| Chant view text | same observer (the view is in the page) | — |
| Print document and PDF stage | converted **explicitly** with `inLipi()` while the HTML is built | the PDF is laid out in a hidden iframe the observer never sees; relying on it printed Devanagari |
| Copy to clipboard, file names, PDF title | `inLipi()` / `toKnda()` on the string | not in the DOM |

Rule for the new app: never rely on the page observer for anything that leaves the page. Build exported text with an explicit `inLipi(text)` = `prefs.lipi === 'knda' ? toKnda(text) : text`.

Digits: numbers shown in Sanskrit are first written in Devanagari digits (`dg()`), then the map turns them into Kannada digits. Verse numbers therefore follow the script automatically.

### Font stacks

All fonts are bundled as WOFF files (no font server), set with `font-display: swap`, and chosen through one CSS variable, `--deva`, that every Indic text uses.

| Body class | `--deva` | `--deva-lh` |
| --- | --- | --- |
| (default) | 'Vedalokana Devanagari', 'Noto Serif Devanagari', serif | 2.15 |
| `.f-shobhika` | 'Vedalokana Shobhika', 'Vedalokana Devanagari', serif | 2.15 |
| `.svara-std` | 'Noto Serif Devanagari', serif | 2.15 |
| `.kn` | 'Vedalokana Kannada', 'Noto Serif Kannada', 'Noto Sans Kannada', 'Vedalokana Devanagari', 'Noto Serif Devanagari', serif | 2.4 |

The Devanagari fonts at the end of the Kannada stack only supply shared marks if a Kannada font without them loads, so nothing shows as a box. Kannada needs the taller line height because its vowel signs and subscript consonants stack deeper.

### Building the fonts (`scripts/make-fonts.py`, fontTools)

- Sources: Noto Serif Devanagari, Noto Serif Kannada, Shobhika (all SIL OFL); variable fonts are instanced at regular weight.
- `*-Vedic.woff` redraws the svara marks to read at body size (svarita and double svarita about twice as thick, a quarter taller; anudātta bar twice as thick); `*-Std.woff` keeps the stock marks.
- In both, every anudātta is placed at one depth under the line, instead of stepping with each letter.
- Interface (IBM Plex Sans) and IAST (Gentium Book Plus) fonts are subset to Latin + IAST.

A kāvya app without svara marks can ship the stock Noto Serif Devanagari / Kannada (and optionally Shobhika) and skip the redraw step; keep the `--deva` variable and the body-class switch so the rest of this spec applies unchanged.

### Pitfalls found in practice

- A print stylesheet that names its own font (or an undefined variable) falls back to a system font; always print with `var(--deva)`.
- Viewport units (`clamp(…, 2.6vw, …)`) resolve differently inside an SVG image than on screen; lay the PDF out in a frame of the page's own width (see *Print and PDF export*).
- The script switch must re-render the open view, not just change a class: the text itself changes.

## Data model

The view knows nothing about where a text comes from: every page that can be chanted builds one plain object, the **chant model**, and calls `openChant(model, startIndex)`. Adding chant to a new kind of page means writing one function that returns this object.

```js
// the chant model
{
  title: 'रघुवंशम् — प्रथमः सर्गः',  // Devanagari; converted for display
  collection: 'raghu',              // picks the accent colour --vc
  parts: [{
    title: 'प्रथमः सर्गः',          // optional heading (Devanagari)
    src: '(रघुवंशम् १)',            // optional source line
    anu: '',                        // optional index line (metre, speaker…)
    group: 1,                       // verses per paragraph on the book page
    verses: [{ n: 1, lines: ['वागर्थाविव संपृक्तौ', 'वागर्थप्रतिपत्तये'], label: 'Raghu 1.1' }],
  }],
  prev: { href: '#/…', label: '…' },   // neighbouring work, or absent
  next: { href: '#/…', label: '…' },
  onPlace(i) {},                    // called as the reader moves; save the place
  onClose(i) {},                    // called on close with the last place
}
```

| Field | Rule |
| --- | --- |
| `parts` | one per section shown with a heading; a work in one piece has one part with no title |
| `verses[].n` | the number printed after the verse; runs on across parts unless the tradition restarts it per section |
| `verses[].lines` | the lines as the page shows them, in Devanagari, with any reading variants already applied; no trailing daṇḍas or numbers |
| `verses[].label` | reference shown in one-at-a-time view |
| `group` | 5 for collections printed in groups of five, else 1 |
| `onPlace(i)` | `i` = index into all verses of all parts (flattened); the view also calls it while the book page scrolls |

### Building a verse for the book page

```js
function bookVerse(lines, n) {
  const clean = lines
    .map((l) => l.replace(/\s*\(\s*[0-9०-९]+\s*\)\s*$/, '')        // a source count "(6)"
                 .replace(/[\s।॥]*[0-9०-९]*[\s।॥]*$/, '')  // trailing daṇḍas / numbers
                 .trim())
    .filter(Boolean);
  return `${clean.join(' । ')} ॥${dg(n)}॥`;
}
```

The no-break space before each daṇḍa keeps it from starting a line.

### Rules learned from the source data

- **Source units are not verses.** Some e-texts are cut into fixed-size chunks (the Taittirīya texts in \~50-word units). Showing those as numbered verses was wrong. Group the chunks of one natural section (anuvāka there; sarga, ucchvāsa or prose paragraph in kāvya) into one verse block with one number and a heading: in the build, a part flagged `merge` makes the view join consecutive units of that part into one block.
- **Strip the source's own counters** such as `(6)` or `- । 64 ।` at the end of units before display, print and PDF.
- **Cut works where they end, not where a file ends.** A start phrase and an end phrase (matched spelling-insensitively: accents, nasal variants, visarga and doubled consonants folded) locate a work inside a larger text and record where it starts and ends inside a unit (`a` / `b` = \[line, word\]).
- **Different recensions are separate texts.** When a work exists in two pāṭhas, keep each with its own note rather than mixing them; the view shows whichever the page chose.

### Preferences the view reads and writes

| Key | Values | Default |
| --- | --- | --- |
| `lipi` | `deva` \| `knda` | `deva` |
| `chantLayout` | `book` \| `one` | `book` |
| `chantSize` | 16–40 (px) | 23 |
| `dfont`, `svara` | font choice, svara-mark style | Noto, Vedic |

All live in one JSON object in `localStorage` (`<app>.prefs`), read with try/catch so a blocked storage still renders.

## Navigation and history

The chant view is an overlay with its own history entry, it can move on to the next work without closing, and ✕ always returns to the screen chanting started from, however far the reader moved on.

### Ways in

| Entry point | Opens at |
| --- | --- |
| Chant button on a work's page | the verse in view on that page (or the first) |
| Chant button on a list (all works, a group heading, a filtered list, a saved list) | the first verse of the first work; the list becomes the playlist |
| ▶ on one row of a list | the first verse of that work, inside the list's playlist |
| Setting "open works in chant view" | every work opened from a list goes straight to chant |

### State kept by the app

```js
let chantResume = null; // verse index to reopen chant at on the next page drawn (next / previous work)
let chantOrigin = null; // { hash, h }: the route and history depth chant was started from
let chantKeep = false;  // the view being opened continues one already running (don't reset origin)
let navH = 0;           // history depth, stored as `h` in every history.state
```

- **Opening** pushes one history entry (`overlayOpen`), so the system Back closes the view. If not continuing, it records `chantOrigin = { hash: location.hash, h: navH }`.
- **Next / Previous** inside the view: tear the view down, set `chantResume = 0`, and navigate to the neighbour with `replace`. The neighbour page, once drawn, sees `chantResume !== null`, sets `chantKeep = true` and reopens chant at that index. Moving work to work therefore adds no Back steps.
- **Close (✕ / Esc)**: depth = `navH − chantOrigin.h`. If depth > 1, go back that many steps in one `history.go(−depth)` (ignoring the intermediate popstate); with in-memory routing, navigate to `chantOrigin.hash`; otherwise just pop the overlay entry.
- **System Back** while open: closes the view and lands on the page beneath (the work last chanted).

```
List or work page --Chant--> Chant view (pushes one history entry)
Chant view --Next / Previous (replace)--> Neighbour work page --page drawn: reopen chant at chantResume--> Chant view
Chant view --✕ / Esc: history.go(−depth)--> List or work page
```

Moving to a neighbour replaces the history entry, so ✕ needs only one jump back to the origin.

### Playlists

A list that starts chanting saves its items in `sessionStorage` (`<app>.play` = `{ name, nameSa, back, items: [{ href, label }] }`) and opens works with `?play=1`. A page opened with that flag takes previous / next from the playlist instead of its natural neighbours, so the reader stays inside the list (a filtered search, a devatā's hymns, a saved list). A list bar on the work's page shows the position in the list.

### Remembering the place

`onPlace(i)` fires as the reader moves (verse change in one-at-a-time; on scroll in the book page, the first verse whose bottom is below the header). The app stores `{ route, verse }` as "last read" for a Continue card on Home, and `onClose(i)` scrolls the page beneath to that verse.

### Screen and session

- Request a screen wake lock on open; release it in teardown.
- Remove the key listener and the view element in one `teardown()` used by every exit path (close, Back, next / previous).

## Print and PDF export

PDF is one tap and needs no print dialog; Print sits in the ⋯ menu. Both use the same clean document built from the chant model, in the chosen script and font. On pages other than the chant view, the same PDF button exports the page's content without its controls.

### The chant document

`chantDoc()` builds a detached `div.pdf-doc` from the model: invocation, title, and for each part its heading, source and index lines and paragraphs of `bookVerse()` strings. Every string goes through `inLipi()` and the root gets `lang="sa"` or `"sa-Knda"`.

```css
.pdf-doc { font-family: var(--deva); font-size: 15pt; line-height: calc(var(--deva-lh) * .9); color: #000; }
.pdf-doc .pd-inv { text-align: center; font-weight: 600; font-size: 11pt; }
.pdf-doc h1 { text-align: center; font-weight: 700; font-size: 20pt; margin: 0 0 14pt; }
.pdf-doc h2 { text-align: center; font-weight: 700; font-size: 15pt; margin: 16pt 0 2pt; break-after: avoid; }
.pdf-doc p  { margin: 0 0 8pt; text-align: justify; orphans: 3; widows: 3; }
```

### Print

1. Append the document as `#printDoc` (hidden on screen) and add `body.printing`.
2. In `@media print`: `body.printing > *:not(#printDoc) { display: none }`; white ground; `@page { margin: 16mm 14mm }`.
3. Set `document.title` to the work's title (browsers use it as the file name in "Save as PDF"), call `window.print()` after 60 ms, restore the title.
4. On `afterprint`, remove the document and the class.

For ordinary pages a general print stylesheet hides the top bar, option bar, rail, tab bar, sheets and toasts, so `window.print()` prints only the content.

### PDF without a library (`pdf.js`, \~180 lines)

Indic text cannot be written as PDF text without a shaping engine (HarfBuzz), so the export draws each page as an image with the browser's own text shaping, then writes the images into a PDF by hand. The price: text in the PDF is not selectable or searchable, and links are not live.

1. **Collect the CSS.** Fetch the app's stylesheet; keep the `@font-face` rules whose family appears in the current `--deva`, `--roman` or `--ui` values and inline each font as a base64 `data:` URL; drop `@media print` blocks.
2. **Lay out in a page-wide frame.** Create a hidden `<iframe>` exactly A4 wide (794 × 1123 CSS px at 96 dpi), write the CSS and the body's classes into it, set the current CSS variables (fonts, line height) plus light-theme colours on its root, and import the stage into a content box of 794 − 2 × 54 px. Wait for `document.fonts.ready` and load every face. Laying out here makes viewport units and line wrapping match the final image.
3. **Paginate at block edges.** Walk the stage: any child taller than one page is descended into, other children are leaves. Accumulate leaves (including their margins) until the next would overflow the content height (1123 − 2 × 54 − 14 px); start a new page there. Tag leaves with `data-pl` indexes.
4. **Draw each page.** Clone the stage, remove leaves not on this page, serialise with `XMLSerializer`, and wrap in `<svg><foreignObject>` with the CSS inside `<style><![CDATA[…]]></style>`, the margins, and a footer `title · n / N`. Load it as a `data:image/svg+xml` image, draw it on a canvas at 2× on white, export JPEG at quality 0.88.
5. **Write the PDF.** Objects: catalog, pages, info (title as UTF-16BE hex so Devanagari / Kannada titles survive), then per page an image XObject (`/DCTDecode`, the JPEG bytes as is), a content stream `q 595.28 0 0 841.89 0 0 cm /Im0 Do Q`, and a page with an A4 MediaBox; then the xref table and trailer. Yield to the event loop between pages and show "page n of N".

The stage for an ordinary page is a clone of its main article with `button, input, select, nav, audio, .actions, .list-bar, [data-nopdf]` removed; its title is the page's `h1`.

### Delivering the file

- **Phones** (`pointer: coarse` and `navigator.canShare({ files })`): `navigator.share({ files: [new File([blob], name, { type: 'application/pdf' })] })` with **no** `title`, `text` or `url`, so the share sheet offers the PDF alone. A blob link or extra fields made Android show a "blob" entry beside the PDF.
- If the share is refused with `NotAllowedError` (the original tap expired during rendering), show a toast with **Share PDF** and **Save** buttons, each a fresh tap.
- **Computers**: download through an `<a download>` on an object URL, revoked after 20 s.
- File name: the title with diacritics folded and anything but word characters, Devanagari and Kannada replaced by `-`, plus `.pdf`.
- Busy state: the button gets `aria-busy` and ignores further taps until done; failures say "Could not make the PDF — try Print and choose Save as PDF".

If selectable text matters more than exact rendering, offer Print → "Save as PDF" as the alternative: the browser then embeds the real fonts and text.

## Adapting to kāvya

Keep the view, the model contract, the script layer and the export unchanged; change only how a page builds its model and a few labels. The table maps each Vedic-specific piece to its kāvya counterpart.

| In Vedāvalokanam | In a kāvya app |
| --- | --- |
| sūkta / anuvāka (one work) | sarga, ucchvāsa, aṅka, śataka, or a named stotra |
| part with heading (anuvāka, devatā section) | a sarga within a mahākāvya chanted whole; a scene within an aṅka |
| `group` 5 for metrical texts | `group` 1 (one śloka a paragraph) by default; 2 or 4 for short-metre runs (anuṣṭubh) if wanted |
| index line: pratika, number of ṛks, ṛṣi, devatā, chandas | metre of the sarga (or of the verse when it changes), poet; omit when unknown |
| source line `(तै.सं. ४,५)` | `(रघुवंशम् १)`, or edition + page |
| invocation `॥ ॐ श्रीगुरुभ्यो नमः हरिः ॐ ॥` | a setting: off, the same line, or श्रीगणेशाय नमः etc. |
| svara marks, Vedic fonts | not needed; ship stock fonts unless Vedic quotations appear |
| chunk merge (`merge` parts) | prose (gadya) in ucchvāsas: merge source units into paragraphs, number per paragraph or not at all |
| playlist from a devatā / search list | playlist from a poet, a metre, a rasa, a saved anthology |
| `॥ इति ॥` at the end | the colophon line of the sarga (`इति श्रीकालिदासकृतौ रघुवंशे … प्रथमः सर्गः`) when the edition has one |

### Things kāvya adds

- **Verse layout.** A śloka has two half-verses (ardha) of two pādas each. Store `lines` as the two halves; in one-at-a-time view, optionally break each half at the pāda boundary for long metres (śārdūlavikrīḍita, sragdharā) so a line never wraps mid-word on a phone.
- **Prose and mixed texts.** Dramas mix prose, verse and stage directions. Give each verse block a `kind` (`verse`, `prose`, `direction`, `speaker`) and style them in the book page: speaker name in bold before the line; directions in parentheses and the muted colour; prose paragraphs justified without a number.
- **Prākṛt passages.** Shown as in the edition with the chāyā (Sanskrit rendering) under it in the muted colour, if the app has it. The script map handles Prākṛt the same way.
- **Verse numbers** restart in each sarga; the source line carries the sarga number.

### What to leave out of the chant view

Commentaries (ṭīkās), word-by-word splits, translations and notes belong on the work's normal page; the chant view stays a clean reading text. Its ⋯ menu can link back to "Open with commentary" for the verse in view.

## Implementation checklist, tests and limits

Build it in this order; each step is usable on its own.

### Checklist

- [ ] Bundle fonts (Noto Serif Devanagari, Noto Serif Kannada, optionally Shobhika) as WOFF; define `--deva` / `--deva-lh` and the body classes `.kn`, `.f-shobhika`.
- [ ] Port `lipi.js` (`toKnda`) and add `inLipi()`, `dg()`; add the `[lang="sa"]` MutationObserver.
- [ ] Store `lipi`, `chantLayout`, `chantSize` in the prefs object.
- [ ] Write `openChant(model, start)`: header, book page, one-at-a-time, size / layout / script controls, swipes, keys, wake lock, `teardown()`.
- [ ] Add the overlay history entry and the `chantOrigin` / `chantResume` / `chantKeep` / `navH` logic; check ✕ after moving through three works.
- [ ] Write a model builder for each chantable page (a sarga page, a stotra, a saved list).
- [ ] Add Chant buttons: work page, list top, group heading, per row; playlists with `?play=1`.
- [ ] Add `chantDoc()`, Print in ⋯, the print stylesheet.
- [ ] Port `pdf.js`; PDF button in the chant header and on every page; phone share as file only.
- [ ] Add `pdf.js` and the fonts to the service worker's app-shell cache so export works offline.

### Test plan

| Check | How | Pass |
| --- | --- | --- |
| Script switch | open chant, switch अ ↔ ಅ | text, numbers and title change; place kept |
| Kannada export | set Kannada, Print and PDF | both in Kannada with the Kannada font (this broke once) |
| Font match | `pdffonts` on a Print → Save as PDF; look at the exported pages | the bundled faces, no fallback serif |
| Close returns | open chant from a list, Next twice, ✕ | back on the list, scrolled as before |
| Back button | same, press system Back | lands on the last work, chant closed |
| Pagination | export the longest sarga | no verse cut across pages; footer `n / N` |
| Phone share | Android Chrome and iOS Safari | share sheet shows one PDF named after the work |
| Offline | airplane mode, export | works |
| Narrow screen | 360 px wide | header wraps, no horizontal scroll, words never split |
| Reduced motion | OS setting on | no fade between verses |

Automate the first five with Playwright against a local server: stub `window.print` to capture `#printDoc`'s text, catch the download event for the PDF, and render page 1 with `pdftoppm` to look at it.

### Known limits

- PDF text is an image: not selectable, searchable or screen-readable; links are dead. Print → Save as PDF is the text alternative.
- `foreignObject` rasterising works in Chromium and Firefox; older Safari taints the canvas, so the export falls back to the error toast suggesting Print.
- A very long work makes a large file (about 0.4 MB a page at 2× JPEG); lower the scale or quality for long exports if needed.
- CSS rules keyed on `body.…` do not match inside the SVG page; set what they decide through CSS variables on the frame root, as the export does for fonts and colours.
- The Kannada mapping is mechanical: it does not apply Kannada spelling conventions beyond the special signs listed.
