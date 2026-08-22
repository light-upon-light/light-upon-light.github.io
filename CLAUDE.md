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
colour: **revealed text** (`{: .quote }`, `--site-quote-gold`), a
**source-led** block (`{: .src }`, `--site-src-border` rule with
`--site-src-text` text), and the author's **commentary** (`{: .gloss }`,
`--site-gloss-border` with a 5% wash, `--site-gloss-bg`). The tag is a
kramdown inline attribute list on the line directly after the block — plain
markdown, so MD033 stays as it is. Tag a quotation anywhere; `.src` and
`.gloss` only appear indented under a bullet. A blockquote holding only a
link stays untagged and keeps `--site-blockquote-border-default`, decoupled
from `--mm-primary-color` because that variable does two opposing jobs (see
its comment in `_dirt.scss`).

That palette is **deliberately not the skin's** — its own `--site-*`
properties, defined in the same three `:root` blocks as the skin's `--mm-*`
ones in `_sass/minimal-mistakes/skins/_dirt.scss` (see Dark mode below).
`.src` sets `color`, never `opacity`, because opacity fades any link inside
the block along with the text; at `--site-src-text`'s light value (`#6f6152`)
it clears WCAG AA for small text at 5.4:1. Re-check the contrast ratios by
hand if either palette changes.

Anything that needs to be *in* `<body>` goes in `_includes/footer/custom.html`,
the theme's other hook. `#floating-nav` lives there — markup, style, and script
together — as two clusters in one column: navigation (`#prev-section`,
`#next-section`, `#toc-toggle`, `#back-to-top`), then, after a wider gap, the
appearance pair (`#floating-font-size-toggle`, `#floating-theme-toggle`). Only
the drawer pieces are hidden at `64em` and up, where the theme's sticky TOC
sidebar is already on screen; the rest stays.

The appearance pair duplicates the masthead's two controls, which have scrolled
away by the time `#floating-nav` appears. **Two copies, one state**: IDs differ,
classes (`.font-size-toggle`, `.theme-toggle`) are shared. The scripts in
`head/custom.html` bind and sync `aria-pressed`/`aria-label`/`title` with
`querySelectorAll` over the class — an `getElementById` there silently leaves
the other copy describing the old state. CSS splits the same way: the icon swap
is class-scoped so it covers both, while layout and colour stay ID-scoped, since
the masthead copies sit transparent on the page ground and the floating ones on
a dark translucent disc. The **no-JS hide has to name all four IDs**, not the
shared class: every one of these buttons gets its `display` from an ID-scoped
rule, so a class-scoped `html:not(.js) .theme-toggle` at `(0,2,1)` loses to
`#theme-toggle` at `(1,0,0)` and to `#floating-nav button` at `(1,0,1)`. It did
lose, silently, for as long as the rule existed — a reader without JavaScript
got both controls in both places, and clicking them did nothing. The floating "large text is on"
state uses a plain `#d4a04a` constant in *both* palettes for that reason — it
always wants the lifted gold that reads on a dark ground, so it isn't one of
the `--site-*` properties that vary by mode.

Redefining ~41 custom properties on `:root` invalidates every element on the
page, so a plain `data-theme` write recalculates the whole document's style in
one go — and without help, a browser can spread that recalc's *paint* across
several frames, which used to tear the masthead (icons and colours arriving a
frame or two apart reads as the buttons juddering sideways, even though
nothing moved). The toggle wraps the swap in `document.startViewTransition()`:
those frames happen behind a frozen snapshot, and the two snapshots cross-fade
(260ms, set on `::view-transition-old/new(root)`) instead.

It is a **dissolve, not the browser's cross-fade**. The default fades both
snapshots at once under `mix-blend-mode: plus-lighter`, which *adds* the two
layers — right for two near-identical images, wrong for two palettes, because a
pixel can land brighter than it is in either. Hairlines showed it worst: a
heading's border is 1px light and 0.8px dark, so the anti-aliased coverage
differs and the sum blew out to white going into dark mode. So
`::view-transition-old(root)` gets `animation: none` and holds still as an
opaque base while `::view-transition-new(root)` fades in on top with normal
blending — monotonic per pixel, and total alpha stays 1, so the dip
`plus-lighter` exists to prevent cannot come back. Replacing the animations also
drops the UA's `-ua-mix-blend-mode-plus-lighter`. To check this kind of thing,
freeze it: `await t.ready`, then set `currentTime` on the `::view-transition-*`
animations from `document.getAnimations()` and screenshot.

`root` is the only participant. **Never give the toggles a
`view-transition-name`** — a named element gets its geometry interpolated, which
is precisely how the apparent sideways drift comes back. Two gates fall back to
an instant swap instead: no View Transitions API, and `prefers-reduced-motion`.

The theme's reset puts a bare `transition: 0.2s` — all properties — on `b, i,
strong, em, blockquote, p, q, span, figure, img, h1, h2, header, input, a, tr,
td, …`. A `data-theme` change is a genuine property change on every element
that reads one of the custom properties it redefines, so — unlike the old
second-stylesheet design, where a transition could never even start — this
transition *would* run, racing the view-transition cross-fade and arriving
late. `custom.html` overrides that rule directly with `html :is(b, i, strong,
…) { transition: none }` (the interactive subset — `a`, `.btn`, `form button`,
`input[type="submit"]` — keeps a named colour transition for real hover/focus
feedback), and a narrow, synchronous `html.theme-swap` guard suppresses that
one surviving transition for the instant of the swap only, so it can't run its
own animation on top of the snapshot. Nothing broader is needed: a
`data-theme` write resolves in the same task, so there is no multi-frame
window for a page-wide guard class to paper over.

`custom.html`'s `<style>` block is emitted *after* `main.css`'s `<link>`, so
an override only needs to match the theme's specificity, not beat it with
`!important` — source order already does that. Three `!important`s remain
there, none of them about dark mode: two beat `.page__content :first-child {
margin-top: 0em }`, a theme rule at `(0,2,0)` that outranks the lower-
specificity overrides on heading/blockquote top margin; the third outranks
that same sibling rule's own `!important` from within this file. Every other
`!important` — a second-stylesheet-only rule beating one `dark.css` used to
re-declare after this block — was removed once that stylesheet was, checked
against the compiled `main.css`, not assumed.

Skin colours (`--mm-*`) and this repo's own (`--site-*`) are both custom
properties defined in `_sass/minimal-mistakes/skins/_dirt.scss`; `custom.html`
consumes them with `var()` rather than hardcoding hex. That path is inside
the theme gem otherwise (`remote_theme` never vendors it locally) except for
this one shadowed skin file, so `_dirt.scss` is the only place to `Read` or
`Grep` the palette. Changing `minimal_mistakes_skin` means updating both the
`--mm-*` values (from a built `main.css`) and the `--site-*` ones by hand, in
both palettes.

**Dark mode and the TOC drawer have their own failure modes. Read
`_notes/guides/theme_internals.md` before changing either.**
