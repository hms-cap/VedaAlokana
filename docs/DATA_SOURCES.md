# Data sources, licences and gaps

## Sources used

| Source | What we take | Licence |
|---|---|---|
| [VedaWeb](https://vedaweb.uni-koeln.de/) TEI data, University of Cologne ([mirror used](https://github.com/031323/vedaweb-data)) | Ṛgveda: Devanagari with svaras (Eichler), Aufrecht's transliteration, Padapāṭha, Griffith's translation | CC BY-NC-SA 4.0 per source (see the `teiHeader` of `vedaweb_corpus.tei`) |
| [WSC 2023 Anukramaṇī dataset](https://github.com/mahesh-ak/WSC2023), Krishna et al. | Ṛgveda ṛṣi, devatā and chandas for every ṛk | Apache-2.0 |
| [DharmicData](https://github.com/bhavykhatri/DharmicData) | Atharvaveda (Śaunaka) and Vājasaneyi Mādhyandina text; Griffith's Sāmaveda | ODbL. Its AV and YV texts were taken from the [Vedic Heritage Portal](https://vedicheritage.gov.in/) (Ministry of Culture), which states no open licence |
| [sanskrit/raw_etexts](https://github.com/sanskrit/raw_etexts) | Taittirīya Saṃhitā, Brāhmaṇa, Āraṇyaka and Upaniṣad; Aitareya Brāhmaṇa and Āraṇyaka; Sāmaveda Kauthuma Saṃhitā; Jaiminīya Upaniṣad Brāhmaṇa; Gopatha Brāhmaṇa; Kena and Muṇḍaka Upaniṣads | No licence stated; texts collected from public e-text sites (sanskritdocuments.org, eBharati Sampat and others) |
| [Sanskrit Wikisource](https://sa.wikisource.org) via [Project Vyasa](https://github.com/project-vyasa/sa.wikisource.org) (`gh-pages`, `rigveda/rigveda.vyview`) | Sāyaṇa's Ṛgveda bhāṣya, per ṛk (10,545 of 10,552 ṛks) | CC BY-SA 4.0 — credit the Wikisource volunteers; the bhāṣya files (`web/data/rv/s*.json`) stay under CC BY-SA |
| [GRETIL mirror](https://github.com/sanskrit/gretil-mirror) | Kauṣītaki, Śatapatha and Pañcaviṃśa Brāhmaṇas; Śāṅkhāyana Āraṇyaka; Aitareya, Īśa, Bṛhadāraṇyaka, Kaṭha, Śvetāśvatara, Chāndogya, Māṇḍūkya and Praśna Upaniṣads | "For reference purposes only; copyright as for source file" — research and teaching use |

Griffith's translations (1895, 1896) are in the public domain.

## Kannada script

Kannada is produced in the browser from the Devanagari by `web/lipi.js`; it is not taken from a printed Kannada edition.

- Letters, vowel signs, virama, anusvāra, visarga, avagraha and digits map one-to-one (the two scripts share the ISCII layout).
- Svara marks (॒ anudātta, ॑ svarita, ᳚ double svarita) and the dandas are shared by both scripts and are kept exactly where the source puts them.
- Vedic signs with no Kannada glyph are written as Kannada Vedic books write them: ꣳ and ᳪ (the "gum" anusvāra) as **ಗ್ಂ**, ꣵ (the doubled form after a short vowel) as **ಗ್ಗ್ಂ**, jihvāmūlīya ᳵ as **ೱ** and upadhmānīya ᳶ as **ೲ**, ॐ as **ಓಂ**. Some websites write ಗ್‍ಮ್ instead of ಗ್ಂ.
- Fonts: Noto Serif Devanagari and Noto Serif Kannada (SIL OFL), self-hosted in `web/fonts/` as subsets that keep the Vedic marks and all positioning tables. `scripts/make-fonts.py` builds them and redraws the svara marks heavier — svarita ॑ and double svarita ᳚ about twice as thick and a quarter taller, anudātta ॒ about twice as thick — across every positional variant, so placement is unchanged. Settings › Svara marks › Standard switches back to the stock fonts. In a side-by-side test of Tiro Kannada, Noto Serif Kannada and Noto Sans Kannada on clusters with subscript consonants and arkavattu (ಯ॒ಜ್ಞ, ಊರ್ಜ॒, ಶ್ರೇಷ್ಠ॑, ಸೂರ್ಯ॑, ಕರ್ಮ॑ಣ), only the Noto fonts kept every mark on the correct syllable; Tiro dropped the mark on ಊರ್ಜ॒ and ಶ್ರೇಷ್ಠ॑.
- Anudātta clearance: the font build lowers the anudātta bar (110 font units in both scripts) so it clears subscript consonants (ottakshara) and the ು/ೂ, ु/ू hooks of the previous letter, keeps the Devanagari bar at its original width, and extends Noto Serif Kannada's own rule for deep subscripts (ಕ್ಷ, ಜ್ಞ, ಛ …) so the lowest bar is also used when another subscript follows (ಙ್ಕ್ಷ್ವ॒, ನ್ಕ್ಷ್ಮ॒). `scripts/audit-marks.mjs` checks this on every accented word of the data: in Kannada every anudātta keeps at least 0.1em from the letters above it except two words where the ಕ್ಷ subscript of the previous syllable reaches under the next bar.
- Line height: the same audit measures the tallest svarita and deepest anudātta (Kannada 1.15em + 0.93em, Devanagari 0.93em + 0.91em). The reader uses line heights of 2.4 (Kannada) and 2.15 (Devanagari), which leaves about 0.3em between the marks of adjacent lines.
- Fallbacks: if the stylesheet cannot load the svara fonts, the app loads them itself, and the Kannada font stack ends with Devanagari fonts that supply only the shared svara marks, so marks never show as boxes or "?".
- Editors' query marks in the sources ("(?)", "[?]", ".?.", "??") are removed during the build; doubtful letters given in parentheses are kept, and two Śatapatha words where a "?" replaced a letter are restored.
- `node scripts/test-lipi.mjs` checks known words and converts every line of the data, reporting any character that is not valid Kannada or a shared mark.

GRETIL texts are romanised, so their Devanagari and Kannada are converted and carry no svara marks.

## Before a public launch

- **Non-commercial only.** The VedaWeb texts are NC-SA: no ads or paid tiers, keep attribution, share the derived JSON under CC BY-NC-SA 4.0.
- **Ask the Vedic Heritage Portal / IGNCA** for permission covering the AV and YV text (and audio, if wanted). Until then treat those Saṃhitās as provisional.
- GRETIL has further Vedic e-texts (Sāmaveda Kauthuma, Śāṅkhāyana Āraṇyaka, more Brāhmaṇas); its terms leave copyright with each contributor, so check per file.

## Sāyaṇa bhāṣya

`scripts/sayana.mjs` reads the Project Vyasa package of Sanskrit Wikisource (an SQLite file with zstd-compressed blocks; needs Node 22.5+ for `node:sqlite` and `zlib.zstdDecompressSync`) and matches each Wikisource ṛk to ours by its saṃhitā text. The bhāṣya is written in files of 20 sūktas (`s{maṇḍala}-{n}.json`) and fetched only when a reader turns it on. Words of the mantra quoted in the bhāṣya (pratīkas, marked “ in the source) are shown in bold.

- RV 1.65 is printed in Wikisource as five double ṛks; each bhāṣya is attached to the first ṛk of its pair.
- Seven ṛks have no bhāṣya in the source.
- No open digital Sāyaṇa bhāṣya was found for the other Saṃhitās (the Wikisource Taittirīya, Sāmaveda and Atharvaveda texts carry none).
- H. H. Wilson's English translation (which follows Sāyaṇa) is public domain but only available as scans on archive.org; it is not included yet.

## Known gaps

- Sāmaveda Kauthuma: the source's numbering skips in places, so a few verses appear merged; its digits inside verses are svara notation.
- Taittirīya Saṃhitā and Brāhmaṇa are divided by pañcāśat (the source's numbering), not anuvāka. The Taittirīya Āraṇyaka follows the Drāviḍa pāṭha files as numbered in the source; prapāṭhakas 5–6 are missing.
- Śatapatha Brāhmaṇa kāṇḍa 12 and Śāṅkhāyana Āraṇyaka adhyāyas 3–6 are missing from the GRETIL source.
- Not found openly yet: Maitrāyaṇī and Kāṭhaka Brāhmaṇa/Āraṇyaka material in a parseable form, Kauṣītaki and Maitrī Upaniṣads.
- Yajurveda ṛṣi/devatā/chandas: no open per-mantra index found.
- Atharvaveda: tags are per sūkta, from the header's main entry; verse-level exceptions in the header are dropped. Kāṇḍa 20 has no headers.
- Ṛgveda: 18 ṛks lack an Anukramaṇī entry in the dataset; minor spelling variants in metre names are merged in `scripts/build-data.mjs` (`CANON`).
- Source debris removed during the build: ITRANS letters left in Devanagari (`j`/`k` for the "gum" anusvāra, `H` for visarga), backticks for avagraha, editorial notes in brackets, file headers. Two isolated typos remain (one each in the Śatapatha Brāhmaṇa and Taittirīya Āraṇyaka).
- Mantra counts differ slightly from traditional totals (e.g. YV 1,966 vs 1,975) where the source splits verses differently.
- The Atharvaveda has no Āraṇyaka; the Śukla Yajurveda's Āraṇyaka is the Bṛhadāraṇyaka, listed under Upaniṣads.


## Dākṣiṇātya pāṭha of the Ṛgveda

Not a separate text: `web/dakshinatya.js` rewrites the VedaWeb Ṛgveda by rule (dīrgha svarita, anusvāra for nasals inside a word, avagraha at pāda junctions, kampa). The dīrgha-svarita rules were checked against Dayananda Aithal's *Saswara Rigveda Samhita* (https://github.com/daithal/saswara-rigveda, no licence stated, so none of its text is included here); the others against printed Karnataka editions of four sūktas. Known limits: where the two texts differ in wording (166 ṛks) the marks follow our text; pāda junctions are found from syllable counts, so a ṛk with an irregular pāda can gain or miss an avagraha; a kampa on an anusvāra syllable is written शू॒ष्य(अं॒)१॒॑, since an anusvāra after the bracket would have no letter to sit on; pauses inside a half-verse, word splits such as इद्‌ दे॒वेषु and the commas some books print at vowel hiatus are not reproduced.


## Sūktas from Aithal's Saswara Ṛgveda

Gaṇeśa Atharvaśīrṣa, Medhā Sūkta (Khila), Pavamāna Pariśiṣṭam, Pañcarudra Sūkta, Navagraha Mantras, Vedapārāyaṇa Ārambha Mantras and Sandhyā Ṛk Mantras come from `VisheshaSuktas/` of https://github.com/daithal/saswara-rigveda (Devanagari Format-1), extracted by `scripts/aithal-source.mjs` into `scripts/sources/aithal.json`. No licence is stated; used with credit, on the project owner's decision. A ṛk he labels with its Ṛgveda place is shown from the app's own Ṛgveda; the rest are printed as he publishes them.

## Śrī Sūkta

Not part of any text above; kept in `scripts/sources/sri-sukta.json` and shown as a sūkta with two pāṭhas.

- South Indian pāṭha (15 ṛks and phalaśruti, with svaras): Dayananda Aithal, *Saswara Rigveda Samhita*, `VisheshaSuktas/shrI-sUkta(Devanagari)-F1.html` (https://github.com/daithal/saswara-rigveda). No licence is stated there; it is used with credit, on the project owner's decision, and printed as published (its dīrgha svaritas and spellings kept).
- Khila pāṭha: Ṛgveda Khila 2.6 after J. Scheftelowitz, *Die Apokryphen des Ṛgveda* (Breslau 1906), GRETIL input by Muneo Tokunaga (1995), via sanskrit/raw_etexts. Unaccented, words divided as in the edition.
- The marked variants are found by program (verse matching and letter-level comparison); one-letter differences that sandhi explains are not marked.
