# Home, Versioning, Navigation & Verse of the Day — Design Spec

Nov 2, 2026 · @Hemanth

## Purpose and scope

This spec describes four parts of Vedāvalokanam (1.23.x) for reuse in a Sanskrit kāvya browsing app that shows Devanagari and Kannada: the Home page, the verse-of-the-day card set with its shareable picture, app-wide navigation and history, and versioning with offline updates. It complements the *Chant View — Design Spec & Implementation Guide*, which covers the reading mode, script conversion, fonts and PDF export; those are referred to here, not repeated.

The source app is a static, framework-free PWA: hash routes, ES modules, pre-built JSON data, a service worker, and state in `localStorage` / `sessionStorage`. The target app is assumed to be the same kind of app. Where the Vedic app says *mantra*, *sūkta* or *Veda*, read *śloka*, *sarga / work* and *collection*.

## Home page

Home is one scrolling column that answers three questions in order: what is today (pañcāṅga), what should I read now (verse of the day, continue), and where can I go (my list, collections, library). It is drawn by `viewHome()` at route `#/` and works offline once the app is installed.

### Sections, top to bottom

| # | Section | Content | Tap does |
| --- | --- | --- | --- |
| 1 | Pañcāṅga strip | date; māsa · pakṣa · tithi in large type; saṃvatsara · ṛtu · ayana · vāra; place chip | place chip asks for location; the strip expands to tithi, nakṣatra, yoga, karaṇa with end times, sunrise / sunset |
| 2 | Verse of the day | card set (see next section) | swipe or dots change card; → opens the verse in the reader |
| 3 | Continue | progress ring (verses read / total), "Continue chanting", the work's name and place | opens the work at the saved verse (`?v=n`) |
| 4 | My list button | star, "My sūktas", count | opens the My tab |
| 5 | Collections (Sūktas) | heading with "All 152"; one button per collection with icon, name, count | toggles a row of chips for that collection's works, in place; tap again to close |
| 6 | The Vedas | tiles with icon, name, number of verses | opens that collection's page |
| 7 | Footer | one line on sources | — |

All text that has a Sanskrit form is written through `T(en, sa)`: the interface language switch shows either the English label or its Sanskrit equivalent (in the chosen script).

### Behaviour rules

- The pañcāṅga is computed on the device (`panchanga.js`, no server) for the saved place; with no place saved it guesses from the time zone (Bengaluru for Asia/Kolkata) and marks the guess. The expanded / collapsed state is remembered.
- "Continue" appears only when a last place exists. Reading pages and the chant view write it as `{ href, where, whereSa, v, of }` to `localStorage` whenever the place changes.
- The open collection's chips are kept for the visit only (a module variable), so Home looks the same after returning from a work.
- Returning to Home with Back restores its scroll position (see *App navigation*); a fresh visit starts at the top and on today's verse.
- An optional decorative scene (an āśrama SVG) sits behind the top of the page, faded in dark mode.

### Layout

| Width | Layout |
| --- | --- |
| < 900 px (phone, tablet portrait) | one column, 16 px gutters; fixed bottom tab bar (4 tabs); the left rail becomes a slide-in drawer (min(320 px, 86vw)); collection tiles scroll sideways |
| ≥ 900 px | sticky left rail (264 px) listing collections and texts; no bottom bar; Home becomes a two-column grid (pañcāṅga + verse of the day side by side at 5 : 6), full-width rows for Continue, chips and tiles; tiles in a 5-column grid |

Home has no options bar actions of its own beyond the global ones (script, menu language, theme), plus translation / commentary toggles that apply to the verse of the day.

## Verse of the day

Each day shows one verse as a loop of up to seven cards, the same verse for everyone on that calendar day, chosen from a curated set of 365 with notes written in both English and Kannada. It can be swapped for another, saved, opened in the reader, or shared as one tall picture.

### Authoring and build

- Cards are written by hand in `scripts/daily/*.mjs`. Each names its verse **by place** (`'rv 3.62.10'`), or inside a long section by its first and last words (`from` / `to`, matched without accents), or as verse *n* of a work given in versions (`'sk <id> <n>'`).
- Each card holds bilingual notes as `[English, Kannada]` pairs: `m` meaning, `w` words and grammar (`[word, en, kn]`), `u` use and significance, and optionally `d` / `r` / `c` (devatā, ṛṣi, chandas as `[key, IAST, Devanagari]`). Vedāvalokanam fills `d` / `r` / `c` from the Ṛgveda index when a card leaves them out.
- `scripts/build-daily.mjs` resolves each card against the built texts (so the lines carry the app's own svara and spelling), and fails the build if a place or phrase is not found.
- Output: `data/daily/index.json` = `{ n: 365, chunk: 50, gloss }` and chunks `data/daily/c0.json … c7.json` (50 cards each). `gloss` holds one bilingual note per ṛṣi, devatā and chandas key, shared by all cards.
- The chunks are their own offline download, and part of "Download all"; without them Home shows a built-in fallback (the Gāyatrī) so the card is never empty.

### Choosing today's verse

```js
const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); // local day number
const k = (day * 7919) % ix.n;            // a prime stride walks all 365 before repeating
const card = (await json(`data/daily/c${Math.floor(k / ix.chunk)}.json`))[k % ix.chunk];
```

The local day (not UTC) makes the verse change at the user's midnight. Multiplying by a prime coprime to `n` spreads neighbouring days across the set, so consecutive days rarely come from the same text. Only one 50-card chunk is fetched.

### The cards

| # | Card | Shown when | Content |
| --- | --- | --- | --- |
| 1 | Verse | always | the lines in the chosen script (large), reference in saffron, devatā · ṛṣi · chandas |
| 2 | Meaning | the card has `m` | one paragraph, English or Kannada by script |
| 3 | Translation | translation toggle on and the verse has one | a published translation of that verse |
| 4 | Words and grammar | `w` present | definition list: word (Sanskrit) → note |
| 5 | Ṛṣi · devatā · chandas | `m` and any of `d` / `r` / `c` | each with its gloss note |
| 6 | Commentary | commentary toggle on and available | first passage of the commentary, up to \~460 characters |
| 7 | Use and significance | `u` present | one paragraph |

Notes are in English when the script is Devanagari and in Kannada when the script is Kannada: the script switch doubles as the notes-language switch.

### Interaction

- The header reads "Today's mantra · *\<card name>*"; dots below select a card; a swipe (> 40 px sideways) or a plain tap moves to the next card, looping; ← / → keys work when focused. Cards slide 40 px with a 240 ms ease, or appear at once under reduced motion.
- **Another** (shuffle icon) picks a random different index and redraws; the header becomes "Another mantra" and a **Today's** button returns. The pick lives in a module variable, so Back to Home keeps it, while a fresh Home shows today's again.
- **☆ Save** adds it to My list. A verse that is a whole work is saved as that work; a single verse is saved as its own entry with a stable id `dm-<text>-<ref>`, so it lists and opens like any work.
- **→ Open** goes to the verse in the reader (`#/v/<text>/c/<d1>/<d2>?v=<n>`), which scrolls to and highlights it.
- Accessibility: the section is `aria-roledescription="carousel"`, each card a `group` with `aria-roledescription="slide"` and "i / n"; hidden cards are `aria-hidden`; the visible area is `aria-live="polite"`; dots are a tablist.

### Shareable picture

**Share** draws all cards into one tall PNG (1080 px wide) on a canvas and hands it to the share sheet as a file (or downloads it on computers).

1. `dailyPlain(m)` turns the cards into plain data in the current script and notes language.
2. Wait for the Indic font faces needed by the sample text (`document.fonts.load`).
3. Add today's short pañcāṅga for the saved place as a tinted panel at the top.
4. Measure pass: run the painter with `draw = false` to get the card's height; size the canvas; draw pass.
5. Layout: deep-indigo gradient ground (#1B2358 → #2F3C9C); app mark and name; "Today's mantra"; one ivory card (#FFFBF2, 30 px corners, gold border #C9A24B) holding every section with a thin rule between; section labels in indigo caps (24 px, 700); verse lines as large as fit (32–50 px) on one line each; wrapping by measuring words; footer tagline.
6. `canvas.toBlob('image/png')` → `navigator.share({ files: [file] })`; on `AbortError` do nothing, otherwise fall back to a download and a toast.

The canvas uses the same font stack as the page (`--deva`), so the picture keeps the user's script and font choice.

## App navigation

Navigation behaves like a native app: Back always goes to the previous view, moves inside a view do not add Back steps, overlays close on Back, every tab remembers where you were, and scroll positions come back.

### Routes

Hash routes, so the app works from any static host and any sub-path. A memory router (set `window.VEDA_MEMORY_ROUTER`) is available for hosts where path-like hashes can't be used.

| Route | View | Tab |
| --- | --- | --- |
| `#/` | Home | Home |
| `#/library` | all collections and texts | Library |
| `#/veda/<id>[/<layer>]` | a collection's page | Library |
| `#/v/<text>` · `/g/<n>` · `/f/<facet>` · `/find` | a text: contents, groups, facet lists, find | Library |
| `#/v/<text>/c/<d1>/<d2>?v=<n>` | reader at a section, scrolled to verse n | Library |
| `#/suktas?veda=&q=&list=` | works list, filtered | Library |
| `#/s/<id>[?play=1&from=my]` | a work (sūkta) page | — / My |
| `#/devatas[/<key>]` | entry points by devatā | — |
| `#/my` | My list, recent, frequent | My |
| `#/search?q=` | search | Search |
| `#/settings[?s=offline]` · `#/about` | settings, downloads, about and updates | — |

`route()` parses the hash, clears the page, draws the view, then the rail, the breadcrumb bar and the options bar; on failure it shows "Not downloaded yet" (offline) or "Couldn't load this page".

### Chrome

| Element | Contents | Notes |
| --- | --- | --- |
| Top bar | Back ‹ (when there is a parent), brand, offline icon (to downloads), About icon, page title, search box | title shows only once the brand is hidden by Back on phones |
| Options bar | global: script अ/ಅ, menu language, theme; page: text options, size, save ☆, chant; Export PDF; ⋯ all options | slides away while reading down, returns on scroll up |
| Breadcrumb bar | collection › text › group › section; each crumb opens a sheet listing its siblings | scrolled to the end |
| Bottom tab bar (< 900 px) | Home, Library, Search, My (with a count badge) | hides on scroll down; each tab returns to its last route |
| Reader bar | previous / next section in the reader | swipes and ← → do the same |
| Rail (≥ 900 px; drawer on phones) | collections and texts | — |

### History model

Every history entry carries `{ k, i, h }` in `history.state`: `k` a key for its saved scroll, `i` its depth in this visit, `h` its depth including overlays.

- **New view** (`location.hash = …`): one new entry; `navArrive()` gives it a key and depth.
- **Move within a view** (next section, filter, tab inside a page, next work in a playlist): links marked `data-r` and `go(href, { replace: true })` **replace** the entry, so Back leaves the view in one step.
- **Overlay** (sheet, options panel, chant view): `overlayOpen()` pushes an entry with the same address and `ov: 1`; the phone's Back fires `popstate`, which calls the overlay's close. Closing by its own button calls `overlayDone()`, which pops that entry (ignoring the resulting `popstate`).
- **Back button in the top bar**: calls `history.back()` when there is an earlier view in this visit; on the first entry (a shared link, a reload) it goes to the parent page instead, replacing the entry, so it never leaves the app.
- **Scroll restore**: scroll positions are saved per key to `sessionStorage` (debounced 400 ms). Returning to an entry restores its scroll after `document.fonts.ready` and a frame, so the layout is final. A route with `?v=n` scrolls to that verse instead.
- **Tabs**: the last route in Library, Works and My is kept in `sessionStorage`; tapping a tab goes there, tapping the current tab goes to its root, or scrolls to the top if already there.
- **Preference changes** (script, size) keep the reader's place by anchoring to the verse at the top and restoring its offset after the redraw.

The chant view adds origin tracking on top of this (✕ returns to where chanting started); see the chant view spec.

## Versioning and updates

One file holds the version; changing it is the whole release mechanism: the service worker sees a new file, caches the new app shell under a new name, and the open app offers a reload. Texts are cached separately and survive every update.

### Where the version lives

| File | Holds | Updated when |
| --- | --- | --- |
| `web/version.js` | `self.VEDALOKANA = { version: '1.23.2', released: '2026-11-02' }` — loaded by `index.html` and imported by `sw.js` | every release |
| `CHANGES` in `app.js` | `[version, date, [notes for users…]]`, newest first; shown in Settings → About as "What's new" | every release, plain language, no file names |
| `CHANGELOG.md` | the same release with developer detail | every release |
| `README.md` | "Current version" line | every release |

Semantic versioning: patch for fixes (1.23.1 → 1.23.2), minor for new features (1.22 → 1.23), major for breaking changes to stored data or URLs. User-facing notes say what changed for the reader ("Print and PDF of the chant view now come out in the script you chose").

### Service worker (`sw.js`)

| Cache | Name | Holds | Strategy |
| --- | --- | --- | --- |
| App shell | `<app>-shell-<version>` | HTML, JS modules, CSS, fonts, icons, manifest | cache first; installed whole on `install` with `cache: 'reload'` |
| Data | `<app>-data` (no version) | every JSON / TSV text, the catalogue, works list, search indexes | stale-while-revalidate: serve the copy at once, refresh in the background when online |

- `install`: add all shell files, pre-load the core data (catalogue, works list, search names), then `skipWaiting()`.
- `activate`: delete shell caches of other versions, `clients.claim()`.
- Navigations are answered with the cached `index.html`.
- Requests with `?fresh` bypass the worker (used by the update check).
- A `message` of `'version'` is answered with the worker's version.
- Register with `{ updateViaCache: 'none' }` so the browser looks past the HTTP cache for `sw.js` and its imported `version.js`.

### Update prompt and manual check

- On `controllerchange` (a new worker took over while the page was open, and there was a controller before), show a persistent toast: "A new version is ready. **Reload**".
- Settings → About → **Check for updates**: fetch `version.js?fresh=<now>` with `cache: 'no-store'` (then two simpler fallbacks for strict hosts), parse the version, compare numerically (`newer(a, b)` on a.b.c). If newer, call `registration.update()`, follow the installing worker's `statechange`, and turn the button into "Restart to use 1.x.y". Messages cover offline, server unreachable, already latest and failed install.
- About also shows the state: "Installed · Ready to work offline", "Getting ready for offline use…", or why offline use is unavailable (not https).

### Offline downloads

- `data/offline.json` lists download packs (per collection, the daily cards, search indexes) with their files and sizes.
- Settings → Offline shows each pack with stored / not stored, a size, and **Download all**; the offline icon in the top bar opens this section.
- Reading anything also stores it; starred works are fetched in the background when saved.
- "Download when online" queues a route that failed offline and fetches it on the next `online` event.

### Release procedure

1. Make the change; run the data build and the test suite (`scripts/test-all.mjs`; the search-index freshness check runs in a pre-commit hook and CI).
2. Bump `version.js` (and `released`), add the `CHANGES` entry, the `CHANGELOG.md` entry and the README line.
3. Add any new shell file (a new module, a font) to `SHELL_FILES` in `sw.js`, or it will not work offline.
4. Commit, push; GitHub Pages deploys; open clients get the reload toast.

## Adapting to kāvya, checklist and tests

The structure carries over as is; the content of Home and of the daily cards changes.

### What changes for kāvya

| Vedāvalokanam | Kāvya app |
| --- | --- |
| Today's mantra | Today's śloka (सुभाषितम् / अद्यतनश्लोकः) |
| cards: mantra, meaning, translation, words, ṛṣi · devatā · chandas, bhāṣya, use | cards: śloka, meaning, anvaya (prose order), words and grammar, metre (with its scheme) and poet, alaṅkāra / rasa, commentary excerpt (Mallinātha etc.), context in the story |
| gloss per ṛṣi / devatā / chandas | gloss per poet, metre, alaṅkāra |
| collections = Vedas; works = sūktas | collections = mahākāvyas, nāṭakas, śatakas, stotras; works = sargas, aṅkas |
| Veda tiles with verse counts | collection tiles with verse counts, by genre |
| "Continue chanting" | "Continue reading" |
| Pañcāṅga strip | keep (readers of stotras use it), or make it a setting |

Keep the 365-card set, the prime-stride daily choice, bilingual English / Kannada notes tied to the script switch, and the shareable picture with the app's brand colours swapped in.

### Implementation checklist

- [ ] `version.js`, `CHANGES`, `CHANGELOG.md`, release procedure from day one.
- [ ] Service worker with versioned shell cache and unversioned data cache; reload toast; Check for updates.
- [ ] Router, `navArrive` / `go` / `data-r` replace links / overlay entries / scroll restore / tab memory.
- [ ] Top bar, options bar, breadcrumb bar, bottom tab bar, rail; 900 px breakpoint.
- [ ] Home sections in order; last-place record written by reader and chant view.
- [ ] Daily card authoring format, build script that validates every card against the texts, chunked output, offline pack, fallback card.
- [ ] Card carousel with swipe, tap, dots, keys, Another / Today's, Save, Open; accessibility roles.
- [ ] Share picture: measure pass, draw pass, fonts loaded first, file-only share.

### Test plan

| Check | How | Pass |
| --- | --- | --- |
| Daily changes at local midnight | set the device clock to 23:59 and 00:01 | different verses, same for every device in that time zone |
| No repeat for a year | compute `k` for 365 consecutive days | all distinct |
| Card build | break one card's phrase | build fails naming the card |
| Offline Home | install, go offline, reload | Home with today's card (or the fallback) and pañcāṅga |
| Kannada notes | switch to ಅ | lines in Kannada, notes in Kannada, picture in Kannada |
| Back stack | Home → collection → work → next work → Back | returns to the collection in one step, at its old scroll |
| Overlay Back | open a sheet, press phone Back | sheet closes, page stays |
| Shared link | open a deep link in a new tab, press ‹ | goes to the parent page, not out of the app |
| Update | publish a new version with the app open | reload toast appears; after reload About shows the new version; downloaded texts still present |
| Check for updates | About → button, offline and online | correct message in each case |
