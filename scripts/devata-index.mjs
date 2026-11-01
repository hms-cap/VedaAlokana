// Entry points into the Ṛgveda by devatā, after the devatā table of the classification reference
// (Table 1A, "Suktas by Devata & Textual Classifications"). Each entry gives the devatā, its sphere,
// the facet key that opens all its hymns in the app, and the key hymns the table names.
//   [name, deva, sphere, facet key | '', 'where the table places them', [key hymns "mandala.sukta"]]
// Built into web/data/devata.json by scripts/build-devata.mjs (counts come from the Ṛgveda facets).
export const SPHERES = [
  ['dyu', 'Dyusthāna (celestial)', 'द्युस्थानाः'],
  ['ant', 'Antarikṣa (atmospheric)', 'अन्तरिक्षस्थानाः'],
  ['par', 'Pārthiva (terrestrial)', 'पार्थिवाः'],
  ['oth', 'Cosmological and single-hymn deities', 'अन्ये'],
];
export const DEVATAS = [
  ['Indra', 'इन्द्रः', 'ant', 'indra', 'Family Books (maṇḍalas 2–7), also 1, 8, 10; paired with Agni, Varuṇa, Viṣṇu, Soma', ['1.7', '1.32', '4.30', '2.12', '1.21']],
  ['Agni', 'अग्निः', 'par', 'agni', 'Opens every Family Book (2–7), plus maṇḍalas 1, 8 and 10', ['1.1', '2.1', '3.1', '4.1', '5.1', '6.1', '7.1']],
  ['Soma Pavamāna', 'पवमानः सोमः', 'par', 'pavamana-soma', 'The whole of maṇḍala 9, with a few hymns elsewhere (Soma–Rudra 6.74)', ['9.1', '6.74']],
  ['Viśvedevas', 'विश्वेदेवाः', 'oth', 'visvedeva', 'Maṇḍalas 1, 3, 5, 6, 7, 8 and 10', ['1.3', '1.89', '3.54', '5.41', '6.49', '7.34', '10.65']],
  ['Aśvins', 'अश्विनौ', 'dyu', 'asvinau', 'Maṇḍalas 1, 5, 7, 8 and 10', ['1.116', '5.73', '7.67', '10.39']],
  ['Varuṇa', 'वरुणः', 'dyu', 'varuna', 'Alone and with Mitra: Śunaḥśepa’s prayer, maṇḍala 5, Vasiṣṭha’s hymns', ['1.24', '1.25', '7.86', '7.87']],
  ['Maruts', 'मरुतः', 'ant', 'maruta', 'Maṇḍalas 1, 5, 7 and 8', ['1.37', '1.85', '5.52', '7.56']],
  ['Mitra', 'मित्रः', 'dyu', 'mitra', 'Mostly as Mitra–Varuṇa across maṇḍalas 1, 5, 6, 7 and 8; one solo hymn', ['3.59']],
  ['Uṣas', 'उषाः', 'dyu', 'usa', 'Maṇḍalas 1, 3, 4, 5, 6 and 7', ['1.48', '1.113', '3.61', '4.51', '5.80', '6.64', '7.75']],
  ['Vāyu / Vāta', 'वायुः', 'ant', 'vayu', 'Alone and as Indra–Vāyu in maṇḍalas 1, 4, 7 and 10', ['1.2', '4.46', '7.90', '10.168', '10.186']],
  ['Savitṛ', 'सविता', 'dyu', 'savita', 'Maṇḍalas 1, 2, 4 and 5; the Gāyatrī is in 3.62.10', ['1.35', '2.38', '4.53', '5.82', '3.62']],
  ['Ṛbhus', 'ऋभवः', 'ant', 'rbhava', 'Maṇḍalas 1, 3 and 4', ['1.20', '1.110', '1.111', '3.60', '4.33']],
  ['Pūṣan', 'पूषा', 'dyu', 'pusa', 'Concentrated in maṇḍala 6, with 1.42 and 10.26', ['6.53', '6.54', '1.42', '10.26']],
  ['Bṛhaspati (Brahmaṇaspati)', 'बृहस्पतिः', 'par', 'brhaspati', 'Maṇḍalas 1, 2, 4 and 10', ['1.40', '2.23', '4.50', '10.67', '10.68', '10.71']],
  ['Sūrya', 'सूर्यः', 'dyu', 'surya', 'Visible sun and all-seeing eye: 1.50, 1.115, 10.37; the wedding hymn 10.85', ['1.50', '1.115', '10.37', '10.85']],
  ['Dyaus and Pṛthivī', 'द्यावापृथिव्यौ', 'dyu', 'dyavaprthivyau', 'Six paired hymns and one solo hymn to Pṛthivī (5.84)', ['1.159', '1.185', '4.56', '6.70', '7.53', '5.84']],
  ['Āpaḥ (Waters)', 'आपः', 'ant', 'apa', 'Maṇḍala 7 and maṇḍala 10 (Āpo hi ṣṭhā)', ['7.47', '7.49', '10.9', '10.30']],
  ['Ādityas', 'आदित्याः', 'dyu', 'aditya', 'Maṇḍalas 1, 2, 8 and 10', ['1.41', '2.27', '8.18', '8.47', '10.63']],
  ['Viṣṇu', 'विष्णुः', 'dyu', 'visnu', 'Four solo hymns and two paired with Indra', ['1.154', '1.156', '7.99', '7.100', '1.155', '6.69']],
  ['Rudra', 'रुद्रः', 'ant', 'rudra', 'Three solo hymns and one with Soma', ['1.43', '1.114', '2.33', '6.74']],
  ['Dadhikrā', 'दधिक्राः', 'par', 'dadhikra', 'Maṇḍalas 4 and 7', ['4.38', '4.39', '4.40', '7.44']],
  ['Yama', 'यमः', 'dyu', 'yama', 'The funeral and dialogue cluster of maṇḍala 10', ['10.10', '10.14', '10.135', '10.154']],
  ['Sarasvatī', 'सरस्वती', 'par', 'sarasvati', 'Maṇḍalas 6 and 7', ['6.61', '7.95', '7.96']],
  ['Parjanya', 'पर्जन्यः', 'ant', 'parjanya', 'Maṇḍalas 5 and 7', ['5.83', '7.101', '7.102']],
  ['Vāc', 'वाक्', 'oth', '', 'Maṇḍala 10: 10.71, and the Devī Sūkta (Vāgāmbhṛṇīya) 10.125', ['10.71', '10.125']],
  ['Viśvakarmā', 'विश्वकर्मा', 'oth', 'visvakarma', 'Maṇḍala 10', ['10.81', '10.82']],
  ['Manyu', 'मन्युः', 'oth', 'manyu', 'Maṇḍala 10', ['10.83', '10.84']],
  ['Vāstoṣpati', 'वास्तोष्पतिः', 'par', 'vastospati', 'Maṇḍala 7', ['7.54', '7.55']],
  ['Cosmological and single-hymn deities', 'सृष्टिविद्या', 'oth', '', 'Puruṣa 10.90 · Nāsadīya 10.129 · Hiraṇyagarbha 10.121 · Nadī 10.75 · Rātri 10.127 · Araṇyānī 10.146 · Akṣa 10.34 · Dakṣiṇā 10.107', ['10.90', '10.129', '10.121', '10.75', '10.127', '10.146', '10.34', '10.107']],
];
