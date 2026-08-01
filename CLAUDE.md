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

Indented blockquotes under a claim come in three kinds, styled so the reader
can tell them apart: a **quotation** (untagged, theme default), a
**source-led** block (`{: .src }`), and the author's **commentary**
(`{: .gloss }`). The tag is a kramdown inline attribute list on the line
directly after the block — plain markdown, so MD033 stays as it is. Blocks
holding only a link, and blockquotes at the top level of a page, stay
untagged. `_notes/islamic_apologetics_style_guide.md` has the full convention.

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

`#toc-toggle` repositions the theme's own `.sidebar__right` into a full-height
panel sliding in from the right edge, rather than cloning it, so the theme's
`.toc` / `.toc__menu` rules and its scrollspy `.active` highlighting keep
working on the real node. This is safe because below `$large` the theme gives
that node nothing but `margin-bottom`, and no ancestor is transformed, so
`position: fixed` behaves.

Its width is `min(86vw, 21rem)` — the `vw` term guarantees a strip of backdrop
survives on the left, so there is always somewhere to tap to dismiss. Running
flush to the top and right edges means the theme's `.toc` border radius and
`.nav__title` corner rounding both have to be zeroed, or they show as notches
against the viewport edge.

**The drawer must be reparented to `<body>` while open.** The theme puts
`animation: intro` on `#main`, and an element with an animation in effect is a
stacking context — so `z-index` on anything inside `#main` cannot beat the
body-level backdrop, no matter how large. Left in place the backdrop paints
*over* the sheet, greying it out and swallowing every tap, which looks like a
dead drawer. The original parent and next sibling are captured once at load,
never per-open, so repeated toggles cannot lose the origin. Verify this with
`document.elementFromPoint` over the sheet: it must return a TOC `<a>`, not
`#toc-backdrop`. Raising `z-index` is not a fix and will look like one.

Two body classes, not one: `toc-active` mounts the sheet off-screen and
`toc-open` slides it in. The split is what lets the *close* animate — the node
has to stay `fixed` until the transition ends, so `toc-active` is removed on a
timer. Opening forces a reflow between the two, or there is no starting point
to transition from. Scroll-locking reuses the theme's own `overflow--hidden`.

The close `×` is injected by script into the theme's TOC `<header>`, so it must
be `display: none` by default — otherwise it shows up in the inline TOC too.
Making `.nav__title` a flex container to centre it drops the whitespace between
the theme's icon and its label; `gap` puts it back.

Pages without a TOC (home, about) have no `.sidebar__right` at all. The script
detects that and sets `.no-toc`, which hides `#toc-toggle` and leaves
`#back-to-top` alone.

Headless Chrome is poor at verifying this: it will not composite scrolled
regions (screenshots come out blank), `--virtual-time-budget` freezes the CSS
transition clock so opacity and transform read their *start* values, and the
window cannot go narrower than a ~504px viewport. Force the end state directly
— add `is-visible`, click the toggle, disable transitions — and assert on
`getBoundingClientRect` and class lists instead of pixels.

The theme sets `blockquote { font-style: italic }`. Arabic has no true italic,
so browsers synthesise an oblique slant that mangles the joins — `.quran-arabic`
cancels it with `font-style: normal`.
