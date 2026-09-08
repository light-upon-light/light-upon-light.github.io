# Styling

Where the CSS and JS live, and the parts of them with their own failure modes.
**Dark mode, the TOC drawer, and the scrollspy have theirs documented
separately — read `theme_internals.md` before changing any of those.** The
evidence-blockquote taxonomy is `formatting_guide.md`.

## Where things live

Custom CSS lives in `assets/css/site.scss` (front matter, even empty, is what
makes Jekyll run it through Sass) and custom JS in `assets/js/site.js`, linked
from `_includes/head/custom.html` and `site.footer_scripts` in `_config.yml`
respectively — moved out of inline `<style>`/`<script>` blocks so they're
cacheable instead of repeated on every page. The two `custom.html` includes
(`head/` and `footer/`) now hold only markup, the pre-paint theme/font-size
bootstrap scripts (must run before first paint, so they stay inline), and the
`quran_section` breadcrumb's own Liquid-templated `<style>`/`<script>`.
`site.js` is the only entry in `footer_scripts` — the theme's jQuery bundle
(`main.min.js`: jQuery + fitvids + magnific-popup + throttle-debounce +
smooth-scroll + greedy-navigation + gumshoe) was dropped (P1-5, audit) since
this site's own JS was already vanilla. `site.js` carries its own scrollspy
(a line-for-line Gumshoe port — see `theme_internals.md` for the `parseInt`
truncation gotcha that a naive port misses) and a small nav-link-overflow
stand-in for GreedyNav; ordering *within* `site.js` is what's load-bearing
now, not `footer_scripts` order — see the header comment in `site.js`.

`.tldr` is the summary card at the top of every article — a full-width
bordered panel in a verdigris tint, deliberately refusing the left rule
that marks the three evidence blockquotes. Markup is `formatting_guide.md`;
its `--site-tldr-*` values and their contrast ratios are in `_dirt.scss`.

`.toc` is restyled plain at both widths — no box, no filled title bar, no
per-entry dividers, just a muted uppercase label over a hairline. The box
removal is scoped to `.page__content .toc` on purpose: the drawer clone's
`.toc` **is** `#toc-panel`'s opaque surface. See `theme_internals.md`.

Arabic uses `.quran-arabic`, citation labels `.ayah-ref`. Amiri is loaded from
Google Fonts so the ayah marker encloses its digits regardless of what the
reader has installed. The theme sets `blockquote { font-style: italic }`, and
Arabic has no true italic — browsers synthesise a slant that mangles the joins,
so `.quran-arabic` cancels it with `font-style: normal`.

## Glossary term hovers

`_data/glossary.yml` holds one entry per recurring Arabic term (`label`,
`short`, `match[]`). A page opts in with a `glossary:` front-matter list and
`{% include glossary-key.html %}` below its intro; the include renders the
`.glossary-key` `<dl>` (styled like `blockquote.gloss`) and a page-scoped
`<script type="application/json" id="glossary-data">`. The last IIFE in
`site.js` reads that JSON, wraps every later prose occurrence of a term in
`<span class="gloss-term">` (skipping links, headings, code, and
`.quran-arabic`), and drives one shared `#gloss-tip` on hover / focus / tap /
Esc. No JS → no wrapper and no tip; the `<dl>` is the fallback, so it must
always carry the full definition. New palette entries — `--site-glossterm-underline`,
`--site-glosstip-bg`, `--site-glosstip-text`, `--site-glosstip-border` — in both
`_dirt.scss` blocks (bare `:root` and `@mixin site-dark-palette`). Editing a
definition in the YAML changes the key block and every hover at once.

## The `--site-*` palette

This repo's own colours — the evidence blockquotes, the floating nav, the
breadcrumb — are **deliberately not the skin's**: its own `--site-*`
properties, defined in the same three `:root` blocks as the skin's `--mm-*`
ones in `_sass/minimal-mistakes/skins/_dirt.scss` (see `theme_internals.md`).
`.src` sets `color`, never `opacity`, because opacity fades any link inside
the block along with the text; at `--site-src-text`'s light value (`#6f6152`)
it clears WCAG AA for small text at 5.4:1. Re-check the contrast ratios by
hand if either palette changes.

Skin colours (`--mm-*`) and this repo's own (`--site-*`) are both custom
properties defined in `_sass/minimal-mistakes/skins/_dirt.scss`; `custom.html`
consumes them with `var()` rather than hardcoding hex. That path is inside
the theme gem otherwise (`remote_theme` never vendors it locally) except for
this one shadowed skin file, so `_dirt.scss` is the only place to `Read` or
`Grep` the palette. Changing `minimal_mistakes_skin` means updating both the
`--mm-*` values (from a built `main.css`) and the `--site-*` ones by hand, in
both palettes.

## The floating nav

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

## Specificity and `!important`

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
