# Citing the Qur'an and hadith

Read this before quoting a verse or citing a hadith. Both corpora are on disk;
neither may be written from memory. For footnotes, references, and the
blockquote taxonomy, see `formatting_guide.md`.

## Qur'an citations

**Never write Qur'anic Arabic from memory.** It's on disk, split one file per
surah so a lookup only ever touches a few KB — read or grep it rather than
fetching:

- `_notes/data/quran_arabic/<NNN>.json` — the complete Uthmani text, `NNN` the
  3-digit surah number (e.g. `002.json` for al-Baqarah), each file
  `{"quran": [{chapter, verse, text}]}`. 114 files, 6,236 verses total.
- `_notes/data/quran_clear/<NNN>.json` — Dr. Mustafa Khattab, *The Clear Quran*,
  same per-surah layout. No terminal punctuation; existing citations carry
  one, so add the full stop when quoting.
- `_notes/data/quran_saheeh/<NNN>.json` — Saheeh International, same per-surah
  layout.
- `_notes/data/quran_surah_names.json` — one file, not split (14 KB) — Arabic and
  English surah names/counts as `{"surahs": [{number, name_ar, name_en,
  name_translation_en, ayahs}]}`, for citation labels.
- Cross-check only if a verse looks suspect:
  `https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=<s>:<a>`.

To pull a specific verse or range, `Grep` for `"chapter":<s>,"verse":<a>` with
`-o` (only-matching) against the relevant `<NNN>.json` — this returns just the
matched substring, not the surrounding file. Don't `Read` a whole surah file
when only a few verses are needed; do use `Read` when quoting most or all of a
short surah, since the per-surah split already keeps that small.

**Choosing between the two English translations:** for any given verse, read
both and quote whichever reads more powerfully and accurately to an
English-only, non-Muslim reader — the one that lands as clear, direct (and
most importantly best represents the intended Arabic meaning) rather than the
one that's more literal or more devotionally worded. Don't default to always
using the same translation; pick per-quotation. Attribute whichever one is
quoted (see the markup below).

Existing citations follow these conventions — match them:

| Case | Form |
| --- | --- |
| Whole verse | `﴿…verse… ۝٤٨﴾` + surah name in the trailing label |
| Contiguous verses | one bracketed unit, a marker after each verse, one surah name |
| Partial quotation | `﴿…fragment…﴾` + `[سُورَةُ النِّسَاءِ: ١٩]`, **no** marker |

The end-of-ayah marker (U+06DD + Arabic-Indic digits) goes *inside* the quoted
text where the verse ends — never in the citation label, and never after a
fragment, because no verse ends there.

### The markup

A quotation is one blockquote: the English, its attribution, a bare `>` line,
then the Arabic in a `div`.

```markdown
> "…translation…" (**Sūrat al-Nisāʾ 4:34**), Dr. Mustafa Khattab, *The Clear Quran*
>
> <div dir="rtl" lang="ar" class="quran-arabic">…Arabic…<span class="ayah-ref">…label…</span></div>
```

`dir="rtl"` and `lang="ar"` are load-bearing. Without `dir`, the div inherits
the page's LTR paragraph direction from `<body dir="ltr">`, and the ornate
brackets and the trailing `.ayah-ref` span — all bidi-neutral — get ordered as
though the line were English. `lang` drives font selection and tells assistive
technology what it is reading. Both are easy to drop when copying an existing
block.

MD033 permits only `div` and `span`, and MD013/MD027/MD028 are off, precisely
because of this pattern — see `formatting_guide.md`. A new inline element means
updating `.markdownlint.json`, not quietly failing the lint.

### The bracket trap

`U+FD3E` is named "ORNATE **LEFT** PARENTHESIS" but is category `Pe` (**close**).
`U+FD3F` is named "RIGHT" but is `Ps` (**open**). They do not bidi-mirror. So in
logical order the **opening** bracket is `U+FD3F`. Emit both by codepoint rather
than pasting glyphs.

## Hadith citations

**Never write a hadith number from memory.** `sunnah.com` returns 403 to
WebFetch and its API needs a key requested by hand, so a reference cannot be
checked online from here. The corpus is on disk instead, numbered exactly as
sunnah.com numbers it — 36,512 hadith across the six canonical collections,
Malik, and three "forties", English and Arabic:

- `_notes/data/hadith/en/<collection>.jsonl` — `{"n", "b", "h", "g", "en"}`
- `_notes/data/hadith/ar/<collection>.jsonl` — `{"n", "ar"}`

One hadith per line. `Grep` for `^\{"n": <number>,` to check a reference, or
grep the `en` files for a distinctive phrase to find one whose number is
unknown. Roughly one record in eight is too long for the Grep tool, which
reports `[Omitted long matching line]`; read those with the `uv run python`
one-liner in `_notes/data/hadith/README.md`.

**Check `g` before citing anything outside Bukhari and Muslim.** It carries the
authenticity grading and is empty for those two by design, since inclusion is
itself the grading. A report graded `Daif` is weak and cannot be presented as
evidence without saying so.

Musnad Ahmad, al-Darimi, Riyad as-Salihin, and al-Adab al-Mufrad are **not**
covered, and existing pages cite Ahmad. Give collection, narrator, and content
without a number rather than reconstructing one. `_notes/data/hadith/README.md` has
the provenance, the verification performed, and why the larger
`AhmedBaset/hadith-json` dataset is unusable here.
## Editing Arabic text

The `Edit` tool fails on lines containing Arabic — bidi reordering means the text
you read back isn't in logical order, so `old_string` won't match. Either anchor
the edit on surrounding Latin text, or transform the file with a script.

To verify Arabic wasn't corrupted: strip waqf marks (`U+06D6`–`U+06ED`), ornate
parens and whitespace, normalise to NFC, then substring-check against the API
text. NFC matters — the APIs return shadda before the vowel, files end up with
the canonical order reversed. They're equivalent; don't "fix" it.

`U+06DD` is category `Cf`. Culture-sensitive string comparison treats it as
ignorable, so `"[foo".StartsWith("۝")` returns **true**. Use ordinal
comparison when testing for it.
