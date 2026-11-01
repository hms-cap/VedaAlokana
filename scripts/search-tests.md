# search-tests.json

Queries for the multi-script search work, each with the result a chanter would expect first.
Expected links were checked against `web/data` (every sūkta, text, container, verse and
facet key exists). Kannada queries are produced by `web/lipi.js` from Devanagari taken from the
app's own data, so they are the converter's canonical spelling, not hand-typed variants.

| Field | Meaning |
| --- | --- |
| `q` | The query as typed |
| `script` | `en` (Roman, no diacritics), `kn`, `deva`, or `any` for references |
| `phase` | First phase that should pass it: 0 works today, 1–3 as in the plan, 4 fuzzy / English words |
| `kind` | ref, name, alias, spelling, facet, facet2, concept, opening, midtext, sandhi, translation |
| `top` | Link expected as the first result. A trailing `*` accepts any link that starts with it |
| `in5` | Links that must also appear in the top five |
| `unsure` | `true` where the right answer is debatable and Hemanth should confirm |
| `note` | Why the test exists |

When comparing links, ignore the order of `?` parameters (`devata=indra&chandas=tristup`
and `chandas=tristup&devata=indra` are the same).

## Ranking rule these tests assume

When the query is the opening words of a named mantra (tryambakam yajamahe, tat savitur
vareṇyaṃ, gaṇānāṃ tvā), the **verse is the first result** and the named sūkta follows it.
Queries that are a sūkta's name (agni suktam, purusha suktam) put the sūkta first.

## Running them

```
node scripts/test-search.mjs                  # rates by script, phase and kind; fails if a phase-0 query fails
node scripts/test-search.mjs --phase 1        # also require every phase-1 query to be top-1
node scripts/test-search.mjs --verbose        # list every query that does not pass yet
node scripts/test-search.mjs --check-baseline # fail if a query that passed in scripts/search-baseline.json now fails
node scripts/test-search.mjs --write-baseline # record the current results (do this at the end of each step)
node scripts/test-search.mjs --min-top1 0.85 --min-top5 0.95   # the release gate
```

Top-1 means the expected link is the first result. Top-5 means it is within the first five and every
`in5` link is too. The runner calls `web/search.js` with the Ṛgveda open, as the app does on first load,
and gives the same links as the running app (checked on 118 queries).
