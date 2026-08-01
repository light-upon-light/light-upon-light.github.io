# CLAUDE.md

Jekyll site (GitHub Pages) using the `minimal-mistakes` theme via `remote_theme`.
Pages live in `_pages/`, build with `bundle exec jekyll build`, output is flat
(`_site/quran.html`, not `_site/quran/index.html`).

`_pages/drafts/` is intentionally untracked. Don't commit it.

## Qur'an citations

**Never write Qur'anic Arabic from memory.** Fetch it:

- Primary: `https://api.alquran.cloud/v1/ayah/<surah>:<ayah>/quran-uthmani`
- Cross-check: `https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=<s>:<a>`
- Arabic surah names come from the same response (`data.surah.name`).

Existing citations follow these conventions — match them:

| Case | Form |
|---|---|
| Whole verse | `﴿…verse… ۝٤٨﴾` + surah name in the trailing label |
| Contiguous verses | one bracketed unit, a marker after each verse, one surah name |
| Partial quotation | `﴿…fragment…﴾` + `[سُورَةُ النِّسَاءِ: ١٩]`, **no** marker |

The end-of-ayah marker (U+06DD + Arabic-Indic digits) goes *inside* the quoted
text where the verse ends — never in the citation label, and never after a
fragment, because no verse ends there.

### The bracket trap

`U+FD3E` is named "ORNATE **LEFT** PARENTHESIS" but is category `Pe` (**close**).
`U+FD3F` is named "RIGHT" but is `Ps` (**open**). They do not bidi-mirror. So in
logical order the **opening** bracket is `U+FD3F`. Emit both by codepoint rather
than pasting glyphs.

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

## Styling

Custom CSS lives in `_includes/head/custom.html` (the theme's override point).
Arabic uses `.quran-arabic`, citation labels `.ayah-ref`. Amiri is loaded from
Google Fonts so the ayah marker encloses its digits regardless of what the
reader has installed.

The theme sets `blockquote { font-style: italic }`. Arabic has no true italic,
so browsers synthesise an oblique slant that mangles the joins — `.quran-arabic`
cancels it with `font-style: normal`.
