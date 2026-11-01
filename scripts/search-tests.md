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
