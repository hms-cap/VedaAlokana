# Cologne Digital Sanskrit Lexicon data

Files in this folder are extracted from dictionaries of the Cologne Digital Sanskrit Lexicon
(https://www.sanskrit-lexicon.uni-koeln.de/) and are licensed separately from the rest of this
repository, under the terms the source states:

> Copyright © 2014 The Sanskrit Library and Thomas Malten. All rights reserved other than those
> granted under the Creative Commons Attribution Non-Commercial Share Alike license
> (https://creativecommons.org/licenses/by-nc-sa/3.0/). Permission is granted to build upon this
> work non-commercially, as long as credit is explicitly acknowledged exactly as described herein,
> and derivative work is distributed under the same license.

(The Cologne source repository, sanskrit-lexicon/csl-orig, now carries a CC BY-SA 4.0 licence file;
the stricter terms above, from the dictionary's own header, are the ones followed here.)

`rv/capeller.json`: for each Ṛgveda lemma (index into `../rv/wl.json`), the first sense of its entry in
Carl Cappeller, *A Sanskrit-English Dictionary, based upon the St. Petersburg Lexicons* (Strassburg:
Trübner, 1891), XML edition by Jim Funderburk and Thomas Malten (Sanskrit Library / CDSL, 2014).
Taken from the indic-dict StarDict text (indic-dict/stardict-sanskrit) by `scripts/build-rv-dict.mjs`;
the sense is shortened (verb forms, prefixed verbs and long tails cut).
