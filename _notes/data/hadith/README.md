# Hadith corpus

36,512 hadith across ten collections, English and Arabic, **numbered exactly as
sunnah.com numbers them** — so a footnote reading *Sahih al-Bukhari* 5134 can be
checked here without a network call.

`sunnah.com` returns **403 to WebFetch** and its API needs a key requested by
hand through a GitHub issue. This corpus exists because there is otherwise no
way to verify a hadith reference from this repo.

## Layout

```
_notes/hadith/en/<collection>.jsonl   {"n", "b", "h", "g", "en"}
_notes/hadith/ar/<collection>.jsonl   {"n", "ar"}
```

One hadith per line, so a line-oriented search returns exactly one record.

| Field | Meaning |
| --- | --- |
| `n` | sunnah.com hadith number. Sub-numbered entries (`5134 a`, `b`) appear as `402.2` |
| `b`, `h` | in-book reference: book `b`, hadith `h` within it |
| `g` | authenticity gradings, in the collection's own apparatus |
| `en`, `ar` | text, whitespace-collapsed to a single line |

| Collection | File | Hadith | Highest `n` |
| --- | --- | --- | --- |
| Sahih al-Bukhari | `bukhari` | 7,589 | 7563 |
| Sahih Muslim | `muslim` | 7,563 | 7563 |
| Sunan Abi Dawud | `abudawud` | 5,274 | 5274 |
| Sunan an-Nasa'i | `nasai` | 5,765 | 5758 |
| Sunan Ibn Majah | `ibnmajah` | 4,343 | 4341 |
| Jami' at-Tirmidhi | `tirmidhi` | 3,998 | 3956 |
| Muwatta Malik | `malik` | 1,858 | 1858 |
| Forty Hadith of an-Nawawi | `nawawi` | 42 | — |
| Forty Hadith Qudsi | `qudsi` | 40 | — |
| Forty Hadith of Shah Waliullah | `dehlawi` | 40 | — |

**`g` is empty for Bukhari and Muslim by design** — inclusion in either *is* the
grading. It is populated for Abu Dawud (5,274), Ibn Majah (4,341), and Tirmidhi
(3,954), where authenticity varies and the grade decides whether a report can
carry weight. Check it before citing anything from a Sunan collection; `Daif`
means the report is weak and must not be presented as evidence without saying
so.

## Looking a hadith up

`Grep` for `^\{"n": <number>,` against the relevant file. It works for content
searches and short records, and gradings come back inline with the text:

```
Grep  pattern: ^\{"n": 3045,   path: _notes/hadith/en/abudawud.jsonl
```

**The Grep tool omits long matching lines**, which hits roughly one record in
eight. When it reports `[Omitted long matching line]`, retrieve the record
directly instead:

```bash
uv run python -c "import json;print(json.dumps(next(json.loads(l) for l in open('_notes/hadith/ar/bukhari.jsonl',encoding='utf-8') if json.loads(l)['n']==5134),ensure_ascii=False))"
```

Searching by content is the way to *find* a hadith whose number is unknown —
grep the `en` files for a distinctive phrase, then read `n` off the match.

## Not covered

Musnad Ahmad, Sunan al-Darimi, Riyad as-Salihin, al-Adab al-Mufrad, Shama'il
Muhammadiyya, Mishkat al-Masabih, Bulugh al-Maram. Existing pages cite Musnad
Ahmad, so this gap is live. **Cite collection, narrator, and content without a
number rather than reconstructing one from memory.**

`AhmedBaset/hadith-json` covers 17 books including these, but numbers Bukhari
sequentially 1–7277 — its `5134` is a hadith about a slave girl's earnings, not
the Aisha report sunnah.com numbers 5134. It is not interchangeable with the
citations already in `_pages/`, and mixing the two would silently corrupt every
footnote.

## Provenance

Built from [`fawazahmed0/hadith-api`](https://github.com/fawazahmed0/hadith-api)
(Unlicense), `eng-*` and `ara-*` editions at tag `@1`, served from jsDelivr:

```bash
curl -sL "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari.min.json"
```

Each edition's `hadiths[]` was reshaped into the two line-oriented files above,
matching English to Arabic on `hadithnumber` — **0 unmatched across all 36,512
records**.

Numbering was checked against citations already in `_pages/aisha.md`: Bukhari
5134 (married at six, consummated at nine), 3894 (engaged at six, Bani
al-Harith), 5228 ("I know when you are pleased with me"), and 6130 (the dolls)
all land on the expected report, and the collection maxima match sunnah.com's.

`_notes` is excluded in `_config.yml`, so none of this is served or indexed.
