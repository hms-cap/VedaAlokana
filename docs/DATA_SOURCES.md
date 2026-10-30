# Data sources, licences and gaps

## Sources used

| Source | What we take | Licence |
|---|---|---|
| [VedaWeb](https://vedaweb.uni-koeln.de/) TEI data, University of Cologne ([mirror used](https://github.com/031323/vedaweb-data)) | Ṛgveda: Devanagari with svaras (Eichler), Aufrecht's transliteration, Padapāṭha, Griffith's translation | CC BY-NC-SA 4.0 per source (see the `teiHeader` of `vedaweb_corpus.tei`) |
| [WSC 2023 Anukramaṇī dataset](https://github.com/mahesh-ak/WSC2023), Krishna et al. | Ṛgveda ṛṣi, devatā and chandas for every ṛk | Apache-2.0 |
| [DharmicData](https://github.com/bhavykhatri/DharmicData) | Atharvaveda (Śaunaka) and Vājasaneyi Mādhyandina text; Griffith's Sāmaveda | ODbL. Its AV and YV texts were taken from the [Vedic Heritage Portal](https://vedicheritage.gov.in/) (Ministry of Culture), which states no open licence |

Griffith's translations (1895, 1896) are in the public domain.

## Before a public launch

- **Non-commercial only.** The VedaWeb texts are NC-SA: no ads or paid tiers, keep attribution, share the derived JSON under CC BY-NC-SA 4.0.
- **Ask the Vedic Heritage Portal / IGNCA** for permission covering the AV and YV text (and audio, if wanted). Until then treat those Saṃhitās as provisional.
- GRETIL has further Vedic e-texts (Sāmaveda Kauthuma, Śāṅkhāyana Āraṇyaka, more Brāhmaṇas); its terms leave copyright with each contributor, so check per file.

## Known gaps

- Sāmaveda Sanskrit text: not yet in an open source we can use.
- Kṛṣṇa Yajurveda (Taittirīya, Maitrāyaṇī, Kāṭhaka): restricted downloads only (TITUS) or not digitised openly.
- Yajurveda ṛṣi/devatā/chandas: no open per-mantra index found.
- Atharvaveda: tags are per sūkta, from the header's main entry; verse-level exceptions in the header are dropped. Kāṇḍa 20 has no headers.
- Ṛgveda: 18 ṛks lack an Anukramaṇī entry in the dataset; minor spelling variants in metre names are merged in `scripts/build-data.mjs` (`CANON`).
- Mantra counts differ slightly from traditional totals (e.g. YV 1,966 vs 1,975) where the source splits verses differently.
- Āraṇyakas are not included; they are mostly prose, so ṛṣi/chandas browsing would not apply.
