# Changelog

Versions follow [semantic versioning](https://semver.org). The version lives in `web/version.js`; the same notes appear in the app under Settings → About.

## 1.2.1 — 2026-10-31
- Fix: Check for updates always said "latest" because the service worker's version check went through the HTTP cache. It now asks the server for the published version directly, downloads the update and offers a restart. The service worker is registered with `updateViaCache: 'none'`, so installed copies also pick up new versions on their next visit.

## 1.2.0 — 2026-10-31
- One-tap icons at the top of each sūkta to show or hide ṛṣi · devatā · chandas, the translation and the Sāyaṇa bhāṣya (replacing the three switch rows below the title).
- Reader buttons take the colour of their Veda.

## 1.1.0 — 2026-10-31
- Menus and labels follow the reading script: tab bar, Veda and level names, ṛṣi · devatā · chandas, pañcāṅga labels, references (ऋ. १०.९०) and numbers appear in Sanskrit, in Devanagari or Kannada.
- An **En** button beside the अ/ಅ switch in the top bar, and Settings → Menus and labels, switch back to English menus.

## 1.0.0 — 2026-10-31
- Install Vedālokana as an app; it opens and works without a connection (service worker, web app manifest, icons).
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
