# Data sources, licences and gaps

## Sources used

| Source | What we take | Licence |
|---|---|---|
| [VedaWeb](https://vedaweb.uni-koeln.de/) TEI data, University of Cologne ([mirror used](https://github.com/031323/vedaweb-data)) | Ṛgveda: Devanagari with svaras (Eichler), Aufrecht's transliteration, Padapāṭha, Griffith's translation | CC BY-NC-SA 4.0 per source (see the `teiHeader` of `vedaweb_corpus.tei`) |
| [WSC 2023 Anukramaṇī dataset](https://github.com/mahesh-ak/WSC2023), Krishna et al. | Ṛgveda ṛṣi, devatā and chandas for every ṛk | Apache-2.0 |
| [DharmicData](https://github.com/bhavykhatri/DharmicData) | Atharvaveda (Śaunaka) and Vājasaneyi Mādhyandina text; Griffith's Sāmaveda | ODbL. Its AV and YV texts were taken from the [Vedic Heritage Portal](https://vedicheritage.gov.in/) (Ministry of Culture), which states no open licence |
| [sanskrit/raw_etexts](https://github.com/sanskrit/raw_etexts) | Taittirīya Saṃhitā, Brāhmaṇa, Āraṇyaka and Upaniṣad; Aitareya Brāhmaṇa and Āraṇyaka; Sāmaveda Kauthuma Saṃhitā; Jaiminīya Upaniṣad Brāhmaṇa; Gopatha Brāhmaṇa; Kena and Muṇḍaka Upaniṣads | No licence stated; texts collected from public e-text sites (sanskritdocuments.org, eBharati Sampat and others) |
| [GRETIL mirror](https://github.com/sanskrit/gretil-mirror) | Kauṣītaki, Śatapatha and Pañcaviṃśa Brāhmaṇas; Śāṅkhāyana Āraṇyaka; Aitareya, Īśa, Bṛhadāraṇyaka, Kaṭha, Śvetāśvatara, Chāndogya, Māṇḍūkya and Praśna Upaniṣads | "For reference purposes only; copyright as for source file" — research and teaching use |

Griffith's translations (1895, 1896) are in the public domain.

## Kannada script

Kannada is produced in the browser from the Devanagari by `web/lipi.js`; it is not taken from a printed Kannada edition.

- Letters, vowel signs, virama, anusvāra, visarga, avagraha and digits map one-to-one (the two scripts share the ISCII layout).
- Svara marks (॒ anudātta, ॑ svarita, ᳚ double svarita) and the dandas are shared by both scripts and are kept exactly where the source puts them.
- Vedic signs with no Kannada glyph are written as Kannada Vedic books write them: ꣳ and ᳪ (the "gum" anusvāra) as **ಗ್ಂ**, ꣵ (the doubled form after a short vowel) as **ಗ್ಗ್ಂ**, jihvāmūlīya ᳵ as **ೱ** and upadhmānīya ᳶ as **ೲ**, ॐ as **ಓಂ**. Some websites write ಗ್‍ಮ್ instead of ಗ್ಂ.
- Fonts: Noto Serif Devanagari and Noto Serif Kannada (SIL OFL), self-hosted in `web/fonts/` as subsets that keep the Vedic marks and all positioning tables. `scripts/make-fonts.py` builds them and redraws the svara marks heavier — svarita ॑ and double svarita ᳚ about twice as thick and a quarter taller, anudātta ॒ about twice as thick — across every positional variant, so placement is unchanged. Settings › Svara marks › Standard switches back to the stock fonts. In a side-by-side test of Tiro Kannada, Noto Serif Kannada and Noto Sans Kannada on clusters with subscript consonants and arkavattu (ಯ॒ಜ್ಞ, ಊರ್ಜ॒, ಶ್ರೇಷ್ಠ॑, ಸೂರ್ಯ॑, ಕರ್ಮ॑ಣ), only the Noto fonts kept every mark on the correct syllable; Tiro dropped the mark on ಊರ್ಜ॒ and ಶ್ರೇಷ್ಠ॑.
- `node scripts/test-lipi.mjs` checks known words and converts every line of the data, reporting any character that is not valid Kannada or a shared mark.

GRETIL texts are romanised, so their Devanagari and Kannada are converted and carry no svara marks.

## Before a public launch

- **Non-commercial only.** The VedaWeb texts are NC-SA: no ads or paid tiers, keep attribution, share the derived JSON under CC BY-NC-SA 4.0.
- **Ask the Vedic Heritage Portal / IGNCA** for permission covering the AV and YV text (and audio, if wanted). Until then treat those Saṃhitās as provisional.
- GRETIL has further Vedic e-texts (Sāmaveda Kauthuma, Śāṅkhāyana Āraṇyaka, more Brāhmaṇas); its terms leave copyright with each contributor, so check per file.

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
