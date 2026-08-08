# CLAUDE.md

Jekyll site (GitHub Pages) using the `minimal-mistakes` theme via `remote_theme`,
pinned to 4.28.0. Pages live in `_pages/`. Build with
`bundle exec jekyll build`.

## Writing style, formatting and analytical approach guide

Make sure to refer to `_notes/guides/writing_style_guide.md` and `_notes/guides/formatting_guide`
whenever you come to write anything, and to `_notes/guides/methodolody_guide.md` for the analytical approach.

## What gets published

GitHub Pages builds from `main`, so pushing is publishing. There is no CI, no
staging, and no tests — a local build and a look at `_site/` is the only check
there is.

**Commit to `main`. Never push.** Because the push is the publish, that step is
the author's alone — never run `git push`, and don't offer to. Work goes
straight onto `main`: no feature branches, no PRs. A branch cannot reach Pages,
so it only adds a merge for someone else to do.

The `github-pages` gem bundles `jekyll-optional-front-matter`, so **every
markdown file the build can see becomes a page**, front matter or not, and lands
in `sitemap.xml`. `include: [_pages]` publishes everything under `_pages/`
regardless of any `published:` flag.

## URLs

The article pages set `permalink: /quran` with no trailing slash, so they build
flat (`_site/quran.html`, not `_site/quran/index.html`). Link to them the same
way — `/quran`, not `/quran/`, which 404s on GitHub Pages. `about.markdown` uses
`/about/` and does build to a directory; the asymmetry is deliberate.

## Site description

Two strings in `_config.yml`, each with one job — don't reintroduce a third:

- `description` — the SEO string. The theme feeds it to `<meta name="description">`
  and `og:description`. Plain, no ﷺ, since it renders in search snippets.
- `blurb` — the prose sentence. The homepage and the about page render
  `{{ site.blurb }}`; nothing hardcodes it.

## Search

Lunr, the theme's default provider. Three settings in `_config.yml` have to
agree, and getting one wrong fails **silently** — the overlay opens, the input
accepts typing, and every query reports "0 Result(s) found".

- `search: true` puts the magnifier in the masthead.
- `lunr.search_within_pages: true` is **load-bearing here**. The theme's
  `assets/js/lunr/lunr-store.js` walks `site.collections`. There are no posts
  and no collections, so without this flag the generated store is literally
  `var store = []` and nothing is searchable.
- `search_full_content: true` indexes whole articles. Without it the store
  holds `truncatewords: 50`, so only each article's opening paragraph is
  findable — a search for anything past the intro returns nothing. The results
  list re-truncates to 20 words when rendering, so full content costs page
  weight (~140 KB store) but does not affect the UI.

`index.html` sets `search: false`. Its feature-row cards repeat each article's
teaser verbatim, so indexing it puts the homepage alongside the real article in
almost every result.

Two artefacts of the theme's template that are **not** corruption:

- The store opens `var store = [,{` — a leading elision, because the empty
  collections loop still emits the separating comma. `lunr-store.js` iterates
  with `for...in`, which skips holes, so all entries index correctly. Anything
  new that reads the store must not use an index-based loop.
- Page entries carry an `absolute_url`, unlike collection entries, so result
  links point at `light-upon-light.github.io` even when serving `_site`
  locally. Correct in production; expected when testing.

Lunr strips English stop words from both index and query, so `about`, `is`,
`the` and friends match nothing. That is the library working, not a bug.

To verify, serve `_site` and drive the real page over CDP: assert `store.length`,
that `typeof idx === 'object'`, then set `input#search`'s value, dispatch a
`keyup`, and read `#results`. Querying a word that appears only deep in an
article (`consummation`, `preservation`) is what actually proves
`search_full_content` is live.

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

`.markdownlint.json` permits only `div` and `span` under MD033 (and turns off
MD013 line length) precisely because of this pattern. A new inline element means
updating that config, not quietly failing the lint.

The bare `>` line and the kramdown IAL tag sitting directly under a blockquote
(no blank line, so it's a lazy continuation) both look like linter violations —
MD028 (blank line inside blockquote) and MD027 (multiple spaces after
blockquote symbol) — but are the intended markup. Both are disabled in
`.markdownlint.json`.

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

## Source citations

Inline citations are plain markdown links with a kramdown inline attribute
list, not kramdown's `[^N]` footnote syntax. That syntax silently discards
structure: kramdown collects every footnote definition into one flat,
auto-ordered `<ol>` at the very end of the page regardless of where the
`[^N]:` lines or any headings around them sit in the source.

```markdown
...claim text[6](#ref-6){: .footnote}[19](#ref-19){: .footnote}
```

```markdown
1. <span id="ref-1"></span>Source citation text.
2. <span id="ref-2"></span>Next source.
```

The whole list is wrapped in `<div class="footnotes" markdown="1">...</div>`,
opened right after the section heading (`## Notes` / `## References`) so any
`###` sub-headings grouping the sources stay attached to their entries
instead of floating disconnected above an auto-generated list. `.footnote`
and `.footnotes` are the theme's own classes — reusing them gets light/dark
colors for free instead of needing new palette entries.

Two traps, both verified against the site's actual `kramdown`+`GFM`
converter rather than assumed:

- Kramdown-GFM does not reliably attach an IAL to an individual `<li>` — the
  anchor has to be an inline `<span id="ref-N"></span>` at the start of the
  item's text instead.
- A markdown list restarts numbering at 1 every time a heading interrupts it.
  To continue a running count across a heading, add `{: start="N"}` on its
  own line touching the group's *last* item with **no blank line** in
  between — a blank line there makes kramdown attach the IAL to whatever
  follows (e.g. the next heading) instead of the list.

Numbers are assigned sequentially by physical position of the `[^N]:` /
list-item source, not preserved from any prior footnote label — so an
out-of-order label doesn't leak into the rendered numbering.

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
reader has installed. The theme sets `blockquote { font-style: italic }`, and
Arabic has no true italic — browsers synthesise a slant that mangles the joins,
so `.quran-arabic` cancels it with `font-style: normal`.

Blockquotes carrying evidence come in three kinds, each with its own rule
colour: **revealed text** (`{: .quote }`, gold `#a8792a`), a **source-led**
block (`{: .src }`, taupe `#a1937c` with sepia `#6f6152` text), and the
author's **commentary** (`{: .gloss }`, verdigris `#2e6b63` with a 5% wash).
The tag is a kramdown inline attribute list on the line directly after the
block — plain markdown, so MD033 stays as it is. Tag a quotation anywhere;
`.src` and `.gloss` only appear indented under a bullet. A blockquote holding
only a link stays untagged and keeps the theme's dark rule.

That palette is **deliberately not the skin's**. `.src` sets `color`, never
`opacity`, because opacity fades any link inside the block along with the text;
at `#6f6152` it clears WCAG AA for small text at 5.4:1. Every colour here has a
dark counterpart in `assets/css/dark.scss` — re-check both by hand if the skin
changes.

Anything that needs to be *in* `<body>` goes in `_includes/footer/custom.html`,
the theme's other hook. `#floating-nav` lives there — markup, style, and script
together — holding `#toc-toggle` above `#back-to-top`. Both appear once the
reader is one viewport down and are hidden at `64em` and up, where the theme's
sticky TOC sidebar is already on screen.

Skin colours are hardcoded from `_sass/minimal-mistakes/skins/_dirt.scss` — the
theme exposes its palette as Sass variables, not CSS custom properties, so an
include cannot read them. That path is inside the theme gem, not this repo
(`remote_theme` never vendors it locally), so it isn't something to `Read` or
`Grep` here — it's cited for provenance only. Changing `minimal_mistakes_skin`
means updating the hardcoded values by hand, in both palettes.

**Dark mode and the TOC drawer have their own failure modes. Read
`_notes/guides/theme_internals.md` before changing either.**
