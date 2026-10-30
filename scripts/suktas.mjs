// Well-known sūktas and mantras, for the Sūktas tab.
// Each entry points into the app's own data; `starts` is the expected opening
// (IAST, accents ignored) and the build fails if the text found there differs.
// Fields: [text, d1, d2, v (first verse, or null), name, deva, devatā, devatā deva, starts, kind?, within?]
// `within`: the sūkta begins partway into that section of the source, so its opening is looked for inside it.

const S = (veda, rows) => rows.map(([text, d1, d2, v, name, deva, devata, devataDeva, starts, kind, within]) => ({
  veda, text, d1, d2, v, name, deva, devata, devataDeva, starts, kind: kind || 'sūkta', within: !!within,
}));

export const SUKTAS = [
  ...S('rv', [
    ['rv', 1, 1, null, 'Agni Sūkta', 'अग्निसूक्तम्', 'Agni', 'अग्निः', 'agnim ile purohitam'],
    ['rv', 1, 50, null, 'Sūrya Sūkta', 'सूर्यसूक्तम्', 'Sūrya', 'सूर्यः', 'ud u tyam jatavedasam'],
    ['rv', 1, 89, null, 'Ā no bhadrāḥ', 'आ नो भद्राः', 'Viśvedevāḥ', 'विश्वेदेवाः', 'a no bhadrah kratavo'],
    ['rv', 1, 113, null, 'Uṣas Sūkta', 'उषस्सूक्तम्', 'Uṣas', 'उषाः', 'idam sreṣṭham jyotiṣam'],
    ['rv', 1, 154, null, 'Viṣṇu Sūkta', 'विष्णुसूक्तम्', 'Viṣṇu', 'विष्णुः', 'viṣṇor nu kam'],
    ['rv', 1, 164, null, 'Asya Vāmasya Sūkta', 'अस्य वामस्य सूक्तम्', 'Viśvedevāḥ', 'विश्वेदेवाः', 'asya vamasya'],
    ['rv', 2, 12, null, 'Indra Sūkta (sa janāsa indraḥ)', 'इन्द्रसूक्तम्', 'Indra', 'इन्द्रः', 'yo jata eva prathamo'],
    ['rv', 2, 33, null, 'Rudra Sūkta', 'रुद्रसूक्तम्', 'Rudra', 'रुद्रः', 'a te pitar marutam'],
    ['rv', 3, 62, 10, 'Gāyatrī Mantra', 'गायत्री मन्त्रः', 'Savitṛ', 'सविता', 'tat savitur vareṇyam', 'mantra'],
    ['rv', 5, 82, 5, 'Viśvāni deva', 'विश्वानि देव', 'Savitṛ', 'सविता', 'visvani deva savitar', 'mantra'],
    ['rv', 7, 59, 12, 'Mahāmṛtyuñjaya Mantra', 'महामृत्युञ्जयमन्त्रः', 'Rudra', 'रुद्रः', 'tryambakam yajamahe', 'mantra'],
    ['rv', 7, 86, null, 'Varuṇa Sūkta', 'वरुणसूक्तम्', 'Varuṇa', 'वरुणः', 'dhira tv asya'],
    ['rv', 10, 9, null, 'Āpo hi ṣṭhā', 'आपो हि ष्ठा', 'Āpaḥ', 'आपः', 'apo hi ṣṭha mayobhuvas'],
    ['rv', 10, 14, null, 'Yama Sūkta', 'यमसूक्तम्', 'Yama', 'यमः', 'pareyivamsam'],
    ['rv', 10, 34, null, 'Akṣa Sūkta (the gambler)', 'अक्षसूक्तम्', 'Akṣāḥ', 'अक्षाः', 'pravepa ma bṛhato'],
    ['rv', 10, 71, null, 'Jñāna Sūkta', 'ज्ञानसूक्तम्', 'Jñāna', 'ज्ञानम्', 'bṛhaspate prathamam vaco'],
    ['rv', 10, 75, null, 'Nadī Sūkta', 'नदीसूक्तम्', 'Nadyaḥ', 'नद्यः', 'pra su va apo'],
    ['rv', 10, 85, null, 'Vivāha Sūkta (Sūryā)', 'विवाहसूक्तम्', 'Sūryā', 'सूर्या', 'satyenottabhita bhumiḥ'],
    ['rv', 10, 90, null, 'Puruṣa Sūkta', 'पुरुषसूक्तम्', 'Puruṣa', 'पुरुषः', 'sahasrasirṣa puruṣaḥ'],
    ['rv', 10, 97, null, 'Oṣadhī Sūkta', 'ओषधीसूक्तम्', 'Oṣadhayaḥ', 'ओषधयः', 'ya oṣadhiḥ purva'],
    ['rv', 10, 117, null, 'Dāna Sūkta', 'दानसूक्तम्', 'Dāna', 'दानम्', 'na va u devaḥ kṣudham'],
    ['rv', 10, 121, null, 'Hiraṇyagarbha Sūkta', 'हिरण्यगर्भसूक्तम्', 'Prajāpati', 'प्रजापतिः', 'hiraṇyagarbhaḥ sam avartata'],
    ['rv', 10, 125, null, 'Devī Sūkta (Vāk Sūkta)', 'देवीसूक्तम्', 'Vāk', 'वाक्', 'aham rudrebhir vasubhis'],
    ['rv', 10, 127, null, 'Rātri Sūkta', 'रात्रिसूक्तम्', 'Rātri', 'रात्रिः', 'ratri vy akhyad'],
    ['rv', 10, 129, null, 'Nāsadīya Sūkta', 'नासदीयसूक्तम्', 'Creation', 'भाववृत्तम्', 'nasad asin no sad'],
    ['rv', 10, 146, null, 'Araṇyānī Sūkta', 'अरण्यानीसूक्तम्', 'Araṇyānī', 'अरण्यानी', 'araṇyany araṇyany'],
    ['rv', 10, 151, null, 'Śraddhā Sūkta', 'श्रद्धासूक्तम्', 'Śraddhā', 'श्रद्धा', 'sraddhayagniḥ sam idhyate'],
    ['rv', 10, 191, 2, 'Saṃjñāna Sūkta (saṃ gacchadhvam)', 'संज्ञानसूक्तम्', 'Saṃjñāna', 'संज्ञानम्', 'sam gachadhvam sam vadadhvam'],
  ]),
  ...S('syv', [
    ['yv', 1, 16, null, 'Rudrādhyāya (Śatarudrīya)', 'रुद्राध्यायः', 'Rudra', 'रुद्रः', 'namaste rudra manyava', 'adhyāya'],
    ['yv', 1, 22, 22, 'Ā brahman (prayer for the nation)', 'आ ब्रह्मन्', 'Rāṣṭra', 'राष्ट्रम्', 'a brahman brahmaṇo', 'mantra'],
    ['yv', 1, 31, null, 'Puruṣa Sūkta (Vājasaneyi)', 'पुरुषसूक्तम्', 'Puruṣa', 'पुरुषः', 'sahasrasirṣa puruṣaḥ', 'adhyāya'],
    ['yv', 1, 34, null, 'Śivasaṅkalpa Sūkta', 'शिवसङ्कल्पसूक्तम्', 'Manas', 'मनः', 'yajjagrato duramudaiti'],
    ['yv', 1, 36, 17, 'Śānti Mantra (dyauḥ śāntiḥ)', 'शान्तिमन्त्रः', 'Śānti', 'शान्तिः', 'dyau', 'mantra'],
    ['yv', 1, 40, null, 'Īśāvāsya', 'ईशावास्यम्', 'Ātman', 'आत्मा', 'isa vasyamida', 'adhyāya'],
  ]),
  ...S('kyv', [
    ['ts', 4, 5, null, 'Śrī Rudram (Namakam)', 'श्रीरुद्रम् (नमकम्)', 'Rudra', 'रुद्रः', 'namaste rudra manyava', 'prapāṭhaka'],
    ['ts', 4, 7, null, 'Camakam', 'चमकम्', 'Agni and Viṣṇu', 'अग्नाविष्णू', 'agnaviṣṇu sajoṣasema', 'prapāṭhaka'],
    ['ta', 1, 3, 32, 'Puruṣa Sūkta (Taittirīya)', 'पुरुषसूक्तम्', 'Puruṣa', 'पुरुषः', 'sahasrasirṣa puruṣaḥ'],
    ['ta', 1, 10, 11, 'Durgā Sūkta', 'दुर्गासूक्तम्', 'Durgā', 'दुर्गा', 'jatavedase sunavama', 'sūkta', true],
    ['ta', 1, 10, 54, 'Medhā Sūkta', 'मेधासूक्तम्', 'Medhā', 'मेधा', 'medha devi juṣamaṇa'],
    ['tu', 1, 1, 1, 'Śīkṣāvallī (śaṃ no mitraḥ)', 'शीक्षावल्ली', 'Śānti', 'शान्तिः', 'sanno mitra', 'vallī'],
  ]),
  ...S('sv', [
    ['svs', 1, 1, null, 'Āgneya Parva (agna ā yāhi)', 'आग्नेयं पर्व', 'Agni', 'अग्निः', 'agna a yahi vitaye', 'parva'],
    ['svs', 1, 12, 115, 'Aindra Parva (tad vo gāya)', 'ऐन्द्रं पर्व', 'Indra', 'इन्द्रः', 'tadvo gaya sute saca', 'parva'],
  ]),
  ...S('av', [
    ['av', 1, 1, null, 'Medhājanana Sūkta', 'मेधाजननसूक्तम्', 'Vācaspati', 'वाचस्पतिः', 'ye triṣaptaḥ pariyanti'],
    ['av', 3, 30, null, 'Sāṃmanasya Sūkta', 'सांमनस्यसूक्तम्', 'Concord', 'सांमनस्यम्', 'sahṛdayam sammanasyam'],
    ['av', 4, 16, null, 'Varuṇa Sūkta', 'वरुणसूक्तम्', 'Varuṇa', 'वरुणः', 'bṛhanneṣamadhiṣṭhata'],
    ['av', 10, 7, null, 'Skambha Sūkta', 'स्कम्भसूक्तम्', 'Skambha', 'स्कम्भः', 'kasminnaṅge tapo'],
    ['av', 11, 4, null, 'Prāṇa Sūkta', 'प्राणसूक्तम्', 'Prāṇa', 'प्राणः', 'praṇaya namo'],
    ['av', 11, 5, null, 'Brahmacarya Sūkta', 'ब्रह्मचर्यसूक्तम्', 'Brahmacārī', 'ब्रह्मचारी', 'brahmacariṣṇamscarati'],
    ['av', 11, 7, null, 'Ucchiṣṭa Sūkta', 'उच्छिष्टसूक्तम्', 'Ucchiṣṭa', 'उच्छिष्टः', 'ucchiṣṭe nama rupam'],
    ['av', 12, 1, null, 'Bhūmi Sūkta (Pṛthivī Sūkta)', 'भूमिसूक्तम्', 'Bhūmi', 'भूमिः', 'satyam bṛhadṛtamugram'],
    ['av', 13, 1, null, 'Rohita Sūkta', 'रोहितसूक्तम्', 'Rohita', 'रोहितः', 'udehi vajin'],
    ['av', 14, 1, null, 'Vivāha Sūkta', 'विवाहसूक्तम्', 'Sūryā', 'सूर्या', 'satyenottabhita bhumiḥ'],
    ['av', 19, 9, null, 'Śānti Sūkta', 'शान्तिसूक्तम्', 'Śānti', 'शान्तिः', 'santa dyauḥ santa pṛthivi'],
    ['av', 19, 53, null, 'Kāla Sūkta', 'कालसूक्तम्', 'Kāla', 'कालः', 'kalo asvo vahati'],
  ]),
];
