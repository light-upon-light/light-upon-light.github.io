# CLAUDE.md

Jekyll site (GitHub Pages) using the `minimal-mistakes` theme via `remote_theme`,
pinned to 4.28.0. Pages live in `_pages/`. Build with
`bundle exec jekyll build`.

## What gets published

GitHub Pages builds from `main`, so pushing is publishing. There is no CI, no
staging, and no tests — a local build and a look at `_site/` is the only check
there is.

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

Blockquotes carrying evidence come in three kinds, each with its own rule
colour: **revealed text** (`{: .quote }`, gold `#a8792a`), a **source-led**
block (`{: .src }`, taupe `#a1937c` with sepia `#6f6152` text), and the
author's **commentary** (`{: .gloss }`, verdigris `#2e6b63` with a 5% wash).
The tag is a kramdown inline attribute list on the line directly after the
block — plain markdown, so MD033 stays as it is. Tag a quotation anywhere;
`.src` and `.gloss` only appear indented under a bullet. A blockquote holding
only a link, or a prose aside, stays untagged and keeps the theme's dark rule.
`_notes/islamic_apologetics_style_guide.md` has the full convention.

Unlike the button colours below, that palette is **deliberately not the skin's**
— it is chosen to sit beside dirt's warm accents on `#f3f3f3` without borrowing
the link colour. `.src` sets `color`, never `opacity`, because opacity fades any
link inside the block along with the text; at `#6f6152` it clears WCAG AA for
small text at 5.4:1. Re-check these by hand if the skin changes.

Anything that needs to be *in* `<body>` goes in `_includes/footer/custom.html`,
the theme's other hook (`_layouts/default.html` includes it just inside the
footer). `#floating-nav` lives there — markup, style, and script together,
since it is self-contained. It holds two stacked buttons, `#toc-toggle` above
`#back-to-top`, both revealed once the reader is one viewport down.

All of it is hidden at `64em` and up, where the theme's sticky TOC sidebar is
already on screen. Below that the TOC collapses inline to the top of the
article, so the buttons are the only way back to it.

Skin colours are hardcoded from `_sass/minimal-mistakes/skins/_dirt.scss` — the
theme exposes its palette as Sass variables, not CSS custom properties, so an
include cannot read them. Changing `minimal_mistakes_skin` means updating them
by hand.

### The TOC drawer

`#toc-toggle` opens `#toc-panel`, a full-height panel sliding in from the right
edge. The panel is built at load from a **clone** of the theme's TOC and
appended to `<body>`; it is always mounted and always `position: fixed`, parked
off-screen behind `visibility: hidden`.

**Do not "improve" this by repositioning the real `.sidebar__right`.** Two
independent things break, and both were shipped and reverted:

- Going `position: fixed` pulls that node out of the document flow. It is a
  tall block near the top of the article — on `/quran` roughly a thousand
  pixels — so everything below it jumps up by its full height. A reader
  scrolled halfway down watches the page cut to a different section.
- The theme puts `animation: intro` on `#main`, and an element with an
  animation in effect is a stacking context. From inside it no `z-index` can
  lift the panel above a body-level backdrop, so the backdrop paints *over*
  the panel, greying it out and swallowing every tap. Raising `z-index` looks
  like the fix and is not one.

Cloning sidesteps both: the article is never touched, and the panel is already
a child of `<body>`. The theme's `.toc` / `.toc__menu` rules are unscoped, so
the clone is styled for free. Keep the clone's ids unique — only the clone's
root gets one (`toc-drawer`).

**The clone is a bare `<nav>` wrapping a `<div class="toc">`.** That looks
fussy and both halves are load-bearing — moving the class onto the `nav`, or
dropping the `nav` for a `div`, each breaks something different:

- **It must be a `<nav>`.** `_base.scss` scopes the list reset to `nav`:
  `li { list-style: none }`, `a { text-decoration: none }`, `ul { margin: 0;
  padding: 0 }`, plus two spacing rules. Any other element and the menu comes
  back with bullets, underlines and the browser's default indent.
- **The `<nav>` must not match `nav.toc a`.** The theme drives its scrollspy
  with `new Gumshoe("nav.toc a")`, and Gumshoe resolves duplicate links to the
  *last* match in document order. A cloned `<nav class="toc">` therefore
  steals the highlight from the real TOC and keeps it even at desktop width,
  where the panel is `display: none` and the sticky sidebar is the only TOC on
  screen — the visible one silently stops marking anything.

Holding `toc` on the inner div satisfies both, since the theme's `.toc` rules
never mention the element they sit on. The wrapper then needs
`#toc-panel > nav { display: flex; flex: 1 1 auto; min-height: 0 }` to pass
the panel's height through, or the menu has nothing to scroll within.
`syncActive()` copies the current `li.active` onto the clone by matching
`href` when the panel opens, so both highlight. Once per open is enough: the
backdrop blocks scrolling, so the section cannot change while the panel is up.

Check this at *both* widths, and compare the clone's computed styles against
the real TOC — `textDecorationLine`, `listStyleType`, the nested `ul` padding
and the link indent should match exactly. The desktop breakage is invisible
from a phone viewport, and vice versa.

**The scroll lock cannot be the theme's `overflow--hidden`.** `overflow: hidden`
on `<body>` establishes a block formatting context, and reflowing the theme's
layout under it shortens the page by ~1400px — the same visible lurch, from a
different cause. `touch-action: none` on the backdrop swallows pan gestures
instead, with `overscroll-behavior: contain` on `.toc__menu` so a flick past
the end of the list does not chain into the article. Neither touches layout.
Focus moves with `preventScroll: true` for the same reason.

Width is `min(86vw, 21rem)` — the `vw` term guarantees a strip of backdrop
survives on the left, so there is always somewhere to tap to dismiss. Running
flush to the top and right edges means the theme's `.toc` border radius and
`.nav__title` corner rounding both have to be zeroed, or they show as notches
against the viewport corners.

Making `.nav__title` a flex container to centre the close `×` drops the
whitespace between the theme's icon and its label; `gap` puts it back.

Pages without a TOC (home, about) have no `.sidebar__right` at all. The script
detects that, builds no panel, and sets `.no-toc`, which hides `#toc-toggle`
and leaves `#back-to-top` alone.

The regression test for all of this is three numbers — `scrollY`,
`documentElement.scrollHeight`, and the `getBoundingClientRect().top` of a
heading — sampled before opening, while open, and after closing. All three must
be identical across the three samples. Then `document.elementFromPoint` over
the panel must return a TOC `<a>`, not `#toc-backdrop`.

Headless Chrome is poor at verifying this: it will not composite scrolled
regions (screenshots come out blank), `--virtual-time-budget` freezes the CSS
transition clock so opacity and transform read their *start* values, and the
window cannot go narrower than a ~504px viewport. Force the end state directly
— add `is-visible`, click the toggle, disable transitions — and assert on
`getBoundingClientRect` and class lists instead of pixels.

The theme sets `blockquote { font-style: italic }`. Arabic has no true italic,
so browsers synthesise an oblique slant that mangles the joins — `.quran-arabic`
cancels it with `font-style: normal`.
