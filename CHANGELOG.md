# Changelog

Versions follow [semantic versioning](https://semver.org). The version lives in `web/version.js`; the same notes appear in the app under Settings → About.

## 1.15.0 — 2026-10-31
- **Pañcāṅga card folds.** On Home it shows its first three lines — date and place, māsa · pakṣa · tithi, and saṃvatsara · ṛtu · ayana · vāra. Tap those lines, or the button under them, to open the tithi, nakṣatra, yoga, karaṇa and sun cards; tap again to fold. The card remembers how you left it (folded at first).

## 1.14.1 — 2026-10-31
- Check for updates no longer reports "latest version" when it couldn't reach the server; it says it couldn't check.
- The Pages workflow now publishes the whole repository, same as the branch build, so the app at `/web/` is always present whichever deployment finishes last.
- `web/version.js` had stayed at 1.12.1 through 1.13.0 and 1.14.0, so installed copies weren't offered those updates.

## 1.14.0 — 2026-10-31
- **Daily mantra cards.** Today's mantra on Home is a set of up to five cards, swiped (or tapped, or stepped with the dots) in a loop: **the mantra** with its reference and tags; **its meaning**; **words and grammar** — two or three key words with their sense and form (gerundives, optatives, Vedic endings, compounds); **ṛṣi · devatā · chandas**, each with a short note; and **use and significance** — where it is recited (sandhyāvandana, pūjā, homa, saṃskāras) and why it matters. Notes are in English, and in Kannada when the script is Kannada. 365 mantras from the Ṛgveda, Yajurveda, Sāmaveda, Atharvaveda and the Upaniṣads, one for each day of the year; **↻** shows another set at random and **Today's** returns. The text of each mantra comes from the app's own data, so svaras and the pāṭha switch apply. `scripts/build-daily.mjs` builds them from `scripts/daily/` into `web/data/daily/`, in files of 50.

## 1.13.0 — 2026-10-31
- **Options bar.** A row of icons under the top bar holds every setting that applies to the page, one tap each: script (अ/ಅ), menus (En), theme, and — where they apply — pāṭha (ई᳚ / ई॑), padapāṭha, IAST, ṛṣi · devatā · chandas, translation, Sāyaṇa bhāṣya, text size (new, 85–175 %), save to My list and Chant view. Highlighted icons are on. **⋯** opens a panel with the same options named and grouped (Everywhere · This page · Reading), with svara marks and the Devanagari font; Back closes it. The page keeps the verse you were reading when an option redraws it. On phones the bar slides away while reading down and returns on scrolling up. It replaces the script and theme buttons in the top bar, the reader's switch row and toggle buttons, and the Save and Chant buttons on pages.
- **My sūktas tab** in the bottom bar (`#/my`): My list · Recent · Frequent, reorder, Chant my list. It takes the place of the Search tab; search stays in the top bar. The My sūktas section on Home and the list chips on the Sūktas tab are gone; old `#/suktas?list=…` links open the tab.

## 1.12.1 — 2026-10-31
- About link moved from the foot of the start page to the top, as a small info icon.

## 1.12.0 — 2026-10-31
- **Navigation, as in an app.** Back (the arrow, the browser or the phone) returns to the view you came from, at the place you were reading; with no earlier view it goes up to the parent. Moving to the next or previous verse, section or sūkta — by arrow, swipe, key or switch — replaces the view rather than adding a back step. Sheets, pickers and the chant view close on Back. The Library and Sūktas tabs remember where you were; tapping the current tab again returns to its top. Sūkta pages get breadcrumbs (Sūktas › Veda › sūkta); Continue reading covers sūkta pages; Search keeps its query when you come back.
- **My sūktas.** ☆ saves a whole sūkta to *My list*. Home and the Sūktas tab show My list · Recent (last 20) · Frequent (visits counted with a 14-day half-life). My list can be reordered and chanted straight through, with next/previous between its sūktas. Settings: clear recent, stop keeping history, export or import the list (`my-suktas.json`).
- **Chant view as a book page.** Running text with ॥n॥ after each ṛk, a paragraph every five ṛks in the metrical Vedas, the invocation ॥ ॐ श्रीगुरुभ्यो नमः हरिः ॐ ॥, the title, the source (ऋ. १०,९०) and, for the Ṛgveda, an anukramaṇī line (pratīka, number of ṛks, ṛṣi, devatā, chandas); each part of a gathered sūkta has its own heading. A−/A+, Devanagari/Kannada, a paper page, screen kept awake, Back returns to the verse reached. The one-at-a-time view remains as an option. Chant is on reader sections, sūkta pages and My list.

## 1.11.0 — 2026-10-31
- Seven more, from Dayananda Aithal's Saswara Ṛgveda: **Gaṇeśa Atharvaśīrṣa** (under the Atharvaveda), **Medhā Sūkta** and **Pavamāna Pariśiṣṭam** (Ṛgveda Khila), **Pañcarudra Sūkta** (52 ṛks), **Navagraha Mantras** with their adhidevatās and pratyadhidevatās, **Vedapārāyaṇa Ārambha Mantras** and **Sandhyā Ṛk Mantras**. Their Ṛgveda ṛks are shown from the app's own Ṛgveda (so the pāṭha switch applies) with a link to each ṛk; the rest as printed there. `scripts/aithal-source.mjs` extracts them into `scripts/sources/aithal.json`.

## 1.10.0 — 2026-10-31
- **Śrī Sūkta** under the Ṛgveda, in two pāṭhas with a switch: the **South Indian pāṭha** (15 ṛks and the phalaśruti, with svaras as in Dayananda Aithal's Saswara Ṛgveda; dīrgha svarita in the Dākṣiṇātya pāṭha, one stroke in the Antarjāla pāṭha) and the **Khila pāṭha** (Ṛgveda Khila 2.6 in Scheftelowitz's edition, 29 verses and his alternatives, from GRETIL). In the South Indian text the words that read differently in the Khila are marked, and the Khila's reading is given under the verse (प्र॒बोधि॑नीम् / प्रमोदिनीम्, कु॒ले / गृहे, पक्वाम् …). The two texts are matched verse by verse and compared letter by letter in `scripts/build-suktas.mjs`; `scripts/sri-sukta-source.mjs` extracts them into `scripts/sources/sri-sukta.json`.

## 1.9.0 — 2026-10-31
- **113 sūktas, mantras and śānti pāṭhas** (was 54), as gathered in recitation books such as the Sasvara Vedamantrāḥ: Ṛgveda 50, Śukla Yajurveda 13, Kṛṣṇa Yajurveda 24, Sāmaveda 3, Atharvaveda 23. New among them: Gaṇapati Sūkta (RV 8.81 + 10.112.9–10, as in the Kannada book), Navagraha Sūkta, Manyu, Pitṛ, Viśvakarma, Bhāgya, Svasti, Vāstu, Rakṣoghna, Dhruva, Aghamarṣaṇa; Nārāyaṇa Sūkta, Mantrapuṣpam, Durgā (cut to its own verses), Medhā, Trisuparṇa, Pañcabrahma, Mṛttikā, Bhū Sūkta, Nakṣatra Sūkta, Uttaranārāyaṇa, the Aruṇa Praśna; Tad eva and Śivasaṅkalpa; the Brahma, Madhu, Śālā, Medhā and Abhaya sūktas of the Atharvaveda; and a śānti mantra for each Veda.
- Each sūkta opens on a page of its own (`#/s/…`), put together from all its parts, even when they lie in different places or start and end inside a section of the source; Copy takes the whole sūkta. The page follows the chosen script and pāṭha.
- Home: below the Veda tiles, a button for each Veda shows that Veda's sūktas; the Sūktas tab filters with the same buttons.
- `scripts/suktas.mjs` lists them by reference or by their opening and closing words; `scripts/build-suktas.mjs` finds each in the data and stops on any it cannot find.

## 1.8.0 — 2026-10-31
- Kannada anudātta, checked over every accented syllable of all the Vedas (about 306,000): after a candrabindu with a long vowel or reph (ಲೋಁ॒ ವೀಁ॒ ಲ್ಲೋಁ॒, common in the Taittirīya texts) the bar sat at the end of the letter; svara marks now move in front of ಁ as they do in front of ಂ and ಃ. No bar is now more than a third of a letter off its letter, except under the Taittirīya ಗ್ಂ, where it stays under ಗ್ಂ as Devanagari keeps it under ꣳ.
- Dākṣiṇātya pāṭha in the Atharvaveda and the Vājasaneyi Saṃhitā: nasals before a stop of their class are written as anusvāra (इंद्र, य॑न्ति → यं॑ति). Neither has a padapāṭha here, so word-final nasals are converted too, and avagraha at pāda junctions (which needs word boundaries) is not added. The Taittirīya Saṃhitā, Brāhmaṇa, Āraṇyaka and Upaniṣad are left as they are: they already print the Taittirīya pāṭha, with its own nasals (शन्नो, तन्तन्मे) and avagrahas (माऽघशꣳसो).

## 1.7.3 — 2026-10-31
- Kannada: every anudātta now sits under its letter. Where a letter is fused with its vowel sign (ಜಾ ಪು ಪೂ ವೋ ಜೊ …) the bar used to sit under the middle of the whole glyph, i.e. under the vowel sign; and after a visarga (ತೀಃ॒ ನೋಃ॒ ರ್ಯಃ॒) it stopped at the length mark or the reph, half under the next letter. `scripts/make-fonts.py` now anchors the bar under the letter itself and lets svara marks move in front of ಃ as they already did in front of ಂ; letters and bar depth are unchanged.

## 1.7.2 — 2026-10-31
- The single-stroke pāṭha is renamed again, to **Antarjāla pāṭha** (अन्तर्जालपाठः): the text as the online source (VedaWeb) gives it. Your choice of pāṭha is kept.

## 1.7.1 — 2026-10-31
- The single-stroke pāṭha of the Ṛgveda is renamed **Sāmānya pāṭha** (previously Śṛṅgeri style): it is the common printed text, not a tradition of its own. Your choice of pāṭha is kept.

## 1.7.0 — 2026-10-31
- **Dākṣiṇātya pāṭha** (formerly Kāñcī · Mādhva) is now the default for the Ṛgveda, and follows Karnataka recitation books in three more ways: a class nasal inside a word is written as anusvāra (इंद्र, क्षु॒मंतं᳚; a word-final nasal keeps its letter, म॑घवञ्चि॒त्रम्); an avagraha marks the a swallowed where two pādas run together (दक्षि॑णेना॒ऽभि, वृ॒त्वाऽत्य॑तिष्ठत्, महि॒माऽतो॒); and a kampa is written र॒प्स्व(अ॒)न्१॒॑तः, the numeral keeping its anudātta. Word boundaries come from aligning each ṛk with its padapāṭha. `web/dirgha.js` is now `web/dakshinatya.js`; `node scripts/test-dakshinatya.mjs` checks it against printed Gaṇapati, Hiraṇyagarbha, Puruṣa and Devī sūktas.
- Saved settings move to the new default once; the single-stroke style stays one tap away in the reader and in Settings.

## 1.6.0 — 2026-10-31
- Install instructions for Android, iPhone/iPad and computers (Settings → About), with a one-tap Install button where the browser offers one (Chrome and Edge). iOS has no one-tap install, so it gets the three-step Safari guide.

## 1.5.0 — 2026-10-31
- Renamed from Vedālokana to Vedāvalokanam. Storage keys and cache names are unchanged, so settings, reading place and downloaded texts carry over.

## 1.4.1 — 2026-10-31
- Check for updates: falls back to a plain request, then to the service worker itself, when the first request is refused, and shows the reason (HTTP status or network error) on failure.

## 1.4.0 — 2026-10-31
- Every anudātta sits at one depth under the line. The stock fonts hang the bar from each letter's own bottom, so it stepped up and down along a line; `scripts/make-fonts.py` now anchors it at a fixed depth (deeper only under the rare letter that reaches below it).
- Shobhika (IIT Bombay, OFL) as a second Devanagari font, with Bold (heavier) or Standard svara marks: Settings → Devanagari font.

## 1.3.0 — 2026-10-31
- Ṛgveda svara style, in the reader and in Settings: **Śṛṅgeri** (every svarita with one stroke ॑, as printed) or **Kāñcī · Mādhva** (dīrgha svarita ᳚ on heavy syllables, and the kampa written as रा॒यो॒३॑(ओ॒)वनिः). The second is generated by rule (`web/dirgha.js`) and matches Dayananda Aithal's Saswara Rigveda on 99.99% of svarita marks (`node scripts/test-dirgha.mjs`).

## 1.2.1 — 2026-10-31
- Fix: Check for updates always said "latest" because the service worker's version check went through the HTTP cache. It now asks the server for the published version directly, downloads the update and offers a restart. The service worker is registered with `updateViaCache: 'none'`, so installed copies also pick up new versions on their next visit.

## 1.2.0 — 2026-10-31
- One-tap icons at the top of each sūkta to show or hide ṛṣi · devatā · chandas, the translation and the Sāyaṇa bhāṣya (replacing the three switch rows below the title).
- Reader buttons take the colour of their Veda.

## 1.1.0 — 2026-10-31
- Menus and labels follow the reading script: tab bar, Veda and level names, ṛṣi · devatā · chandas, pañcāṅga labels, references (ऋ. १०.९०) and numbers appear in Sanskrit, in Devanagari or Kannada.
- An **En** button beside the अ/ಅ switch in the top bar, and Settings → Menus and labels, switch back to English menus.

## 1.0.0 — 2026-10-31
- Install Vedāvalokanam as an app; it opens and works without a connection (service worker, web app manifest, icons).
- Download each Veda, and the Sāyaṇa bhāṣya, for offline reading from Settings → Offline.
- All fonts are bundled (IBM Plex Sans, Gentium Book Plus, stock Noto Serif subsets), so offline looks the same as online.
- About page with the version, data build date, what's new and an update check.

## 0.9.0 — 2026-10-31
- New Home: local pañcāṅga, today's mantra, continue chanting, Veda tiles with their own icons and an āśrama-at-dawn background.
- Each Veda's page opens on a wheel of its maṇḍalas, kāṇḍas or adhyāyas, with its most addressed devatās.
- Chant view: one mantra at a time, full screen, with swipe and tap to move on.
- Light, dark or match-device theme, and higher-contrast buttons.

## 0.8.0 — 2026-10-31
- Sāyaṇa's bhāṣya for the whole Ṛgveda, beside each ṛk.
- Swipe between sūktas and sections; the tab bar stays within reach in the reader.
- Ṛṣi, devatā and chandas at the top and only where they change, with a switch to hide them.
- Chant-friendly reading by default: the script alone, no translation.
- Anudātta marks clear subscript consonants; stray "?" marks from the sources removed.

## 0.5.0 — 2026-10-30
- Brāhmaṇas, Āraṇyakas, Upaniṣads and the Kṛṣṇa Yajurveda.
- Kannada script with svara marks, switched in one tap; bolder svara marks.
- Famous sūktas, and app-style navigation across the levels of each Veda.

## 0.1.0 — 2026-10-30
- First release: the four Saṃhitās with svara marks, browsable by ṛṣi, devatā and chandas.
