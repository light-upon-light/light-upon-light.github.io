# Hadith corpus

36,512 hadith across ten collections, English and Arabic, so a footnote reading
*Sahih al-Bukhari* 5134 can be checked here without a network call.

**`n` is the sunnah.com number for every collection except Sahih Muslim.**
Muslim's `n` is a sequential 1–7563 numbering; its sunnah.com reference number
is in `s`. Muslim `n` 2490 is Umm 'Atiyya's mutton
report; sunnah.com's Muslim 2490 (Hassan ibn Thabit's satire) is `n` 6395,
`s` `"2490"`.

`sunnah.com` returns **403 to WebFetch** and its API needs a key requested by
hand through a GitHub issue. This corpus exists because there is otherwise no
way to verify a hadith reference from this repo.

## Layout

```
_notes/data/hadith/en/<collection>.jsonl   {"n", "b", "h", "g", "en"}
_notes/data/hadith/ar/<collection>.jsonl   {"n", "ar"}
_notes/data/hadith/en/muslim.jsonl         {"n", "s", "b", "h", "g", "en"}
_notes/data/hadith/ar/muslim.jsonl         {"n", "s", "ar"}
```

One hadith per line, so a line-oriented search returns exactly one record.

| Field | Meaning |
| --- | --- |
| `n` | upstream hadith number: sunnah.com's number except for Muslim. Sub-numbered entries appear as decimals (`402.2`) |
| `s` | Muslim only: sunnah.com reference as a string — `"2490"`, `"1422b"`. `null` for 344 records upstream gives no reference: the 92 introduction records and 252 in-body records with `b` = `h` = 0 |
| `b`, `h` | in-book reference: book `b`, hadith `h` within it — sunnah.com's `/<collection>/<b>/<h>` |
| `g` | authenticity gradings, in the collection's own apparatus |
| `en`, `ar` | text, whitespace-collapsed to a single line |

| Collection | File | Hadith | Highest `n` | sunnah.com number |
| --- | --- | --- | --- | --- |
| Sahih al-Bukhari | `bukhari` | 7,589 | 7563 | `n` |
| Sahih Muslim | `muslim` | 7,563 | 7563 | **`s`** (highest 3033) |
| Sunan Abi Dawud | `abudawud` | 5,274 | 5274 | `n` |
| Sunan an-Nasa'i | `nasai` | 5,765 | 5758 | `n` |
| Sunan Ibn Majah | `ibnmajah` | 4,343 | 4341 | `n` |
| Jami' at-Tirmidhi | `tirmidhi` | 3,998 | 3956 | `n` |
| Muwatta Malik | `malik` | 1,858 | 1858 | `b`/`h` — see below |
| Forty Hadith of an-Nawawi | `nawawi` | 42 | — | `n` |
| Forty Hadith Qudsi | `qudsi` | 40 | — | `n` |
| Forty Hadith of Shah Waliullah | `dehlawi` | 40 | — | `n` |

**Muslim `null` records are uncitable by sunnah.com number from here.** They
include reports sunnah.com shows as one merged entry — `n` 4521–4522 are
sunnah.com's "1731a, b" (`/muslim/32/3`) — and no record carries 2971 or 2972.
Do not infer a number from the neighbouring `s` values.

**Malik is cited by book and hadith** (`/malik/21/9`). Whether `n` matches
sunnah.com's global "Arabic reference" is unverified, and one mirror conflicts
(it gives 986 for Book 21, Hadith 25, where `n` is 983).

**`g` is empty for Bukhari and Muslim by design** — inclusion in either *is* the
grading. It is populated for Abu Dawud (5,274), Ibn Majah (4,341), and Tirmidhi
(3,954), where authenticity varies and the grade decides whether a report can
carry weight. Check it before citing anything from a Sunan collection; `Daif`
means the report is weak and must not be presented as evidence without saying
so.

## Looking a hadith up

`Grep` for `^\{"n": <number>,` against the relevant file — or, for Muslim,
`"s": "<number>[a-z]?",`. It works for content searches and short records, and
gradings come back inline with the text:

```
Grep  pattern: ^\{"n": 3045,          path: _notes/data/hadith/en/abudawud.jsonl
Grep  pattern: "s": "1422[a-z]?",     path: _notes/data/hadith/en/muslim.jsonl
```

**The Grep tool omits long matching lines**, which hits roughly one record in
eight. When it reports `[Omitted long matching line]`, retrieve the record
directly instead (for Muslim, match `['s']=='2490'`):

```bash
uv run python -c "import json;print(json.dumps(next(json.loads(l) for l in open('_notes/data/hadith/ar/bukhari.jsonl',encoding='utf-8') if json.loads(l)['n']==5134),ensure_ascii=False))"
```

Searching by content is the way to *find* a hadith whose number is unknown —
grep the `en` files for a distinctive phrase, then read `n` (Muslim: `s`) off
the match.

**Existing `_pages/` Muslim citations mix both systems.** A Muslim number above
3033 is necessarily the sequential `n`; below that, check the cited content
against both `n` and `s` before trusting it.

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
records**. Muslim's `s` comes from upstream `arabicnumber`, which the original
reshape dropped; `_notes/scripts/hadith/add_muslim_sunnah_ref.py` adds it,
mapping sub-numbers `.01`–`.26` to sunnah.com's letters `a`–`z`. In the other
nine editions `arabicnumber` equals `hadithnumber` on every record, so they get
no `s`.

Verified against sunnah.com by web search (sunnah.com itself returns 403),
September 2026:

- **Muslim `s`:** 2490 (`n` 6395, 44/225), 8a (`n` 93, 1/1), 1422a–d (`n`
  3479–3482, 16/81–84; 1422b is "six … nine"), 1066g (`n` 2468, 12/205), 1744a–b
  (`n` 4547–4548, 32/28–29), 1731a, b at 32/3 (`n` 4521–4522, `s` null).
- **Other collections' `n`:** Bukhari 6018 (78/49); Abu Dawud 3045; Nasa'i 1,
  plus the book titles of 3175, 4059, 4064, 4721, 4990; Ibn Majah 1984 (9/140);
  Tirmidhi 1987; Nawawi 18; Qudsi 1; Shah Waliullah 3.

The original build checked Bukhari against the `_pages/aisha.md` citations —
5134 (married at six, consummated at nine), 3894 (engaged at six, Bani
al-Harith), 5228 ("I know when you are pleased with me"), 6130 (the dolls) —
and compared collection maxima with sunnah.com's. That check could not catch
the Muslim problem, whose sequential maximum happens to equal Bukhari's.

`_notes` is excluded in `_config.yml`, so none of this is served or indexed.
