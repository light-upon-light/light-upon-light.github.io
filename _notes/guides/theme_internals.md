# Theme internals

Two customisations big enough to have their own failure modes: the dark-mode
stylesheet and the mobile TOC drawer. Read the relevant half before changing
either. Everything else lives in `CLAUDE.md`.

## Dark mode

`assets/css/dark.scss` compiles **the whole theme a second time** with a dark
palette. `_includes/head/custom.html` links it last in `<head>` and switches it
on and off with the `<link media>` attribute — `main.css` (dirt skin) always
applies, `dark.css` loads second and wins when its media query matches.

**Custom properties cannot do this job.** A minimal-mistakes skin is a set of
*Sass* variables and the theme runs Sass colour functions over them — `mix()`,
`rgba()`, `yiq-contrasted()`. `mix(#fff, var(--x), 20%)` does not compile, so
the palette has to be resolved at build time. Compiling twice costs ~70 KB
minified (~10 KB gzipped) and covers every theme component, including ones the
site doesn't use yet.

Because both files come from the same partials, **every selector matches
exactly and source order decides the winner**. Three consequences:

- The `dark.css` link must stay the **last** stylesheet in the head. It is
  already after the `<style>` block in the same include, which is what lets it
  override the custom light-mode CSS there.
- Dark variants of this repo's own CSS belong **in `dark.scss`**, not behind a
  `prefers-color-scheme` block or an `html[data-theme]` selector somewhere else.
  One toggled stylesheet is what makes the no-JavaScript path come out right.
- Rules defined in `_includes/footer/custom.html` are an inline `<style>` inside
  `<body>`, so they come *after* `dark.css` and would win a tie. Their dark
  counterparts are prefixed with `body` (`body #floating-nav button`) to raise
  specificity. **Do not drop that prefix.**

The palette is hand-derived from dirt, not one of the theme's stock dark skins.
`dark.scss` lists the computed contrast ratios; re-check them by hand if any
value changes. Two of the choices are not free:

- `$primary-color` (`#6f5f48`) does two opposing jobs: it is the background
  *behind* white text (`.nav__title`, `.btn--primary`) and the default
  `blockquote` rule drawn *on* the page background. It is a compromise between
  them, and the blockquote rule is re-set after the import to decouple the two.
  `#toc-panel .nav__title` and `#toc-close` need no dark rule at all because of
  this — primary is dark in both modes, so white text still works.
- `$active-color` (the TOC scrollspy highlight) has to stay dark enough that
  `yiq-contrasted()` still picks white. The stock 80%-white value would paint a
  near-white pill on a dark page.

Dirt's base16 syntax colours are already a dark scheme, so they carry over
verbatim and code blocks look the same in both modes.

**Mode selection.** The `media` attribute ships as `(prefers-color-scheme: dark)`,
so a reader with JavaScript off still gets dark on a dark-preferring system. The
inline script in `head/custom.html` pins it to `all` / `not all` once there is an
explicit choice in `localStorage`, and mirrors the result onto
`documentElement.dataset.theme`, which picks the button's icon and label. It runs
in `<head>`, before the masthead is parsed, so the page never paints in the wrong
mode. Choosing the mode the system already prefers **clears** the stored value
rather than pinning it, so the site goes back to following the system.

`_includes/masthead.html` is a **fork of the theme's file**, verbatim for 4.28.0
apart from the `#theme-toggle` button. The theme has no hook inside the masthead.
If the `remote_theme` pin in `_config.yml` moves, diff this file against the new
release. GreedyNav measures the space left for nav links by subtracting the title
and the search toggle from the nav width and knows nothing about
`#theme-toggle`, so it thinks it has ~2.6rem more room than it does — harmless
while `_data/navigation.yml` holds one short link, worth revisiting if the nav
grows.

## The TOC drawer

`#toc-toggle` opens `#toc-panel`, a full-height panel sliding in from the right
edge. The panel is built at load from a **clone** of the theme's TOC and
appended to `<body>`; it is always mounted and always `position: fixed`, parked
off-screen behind `visibility: hidden`.

**Do not reposition the real `.sidebar__right` instead.** Two independent things
break:

- Going `position: fixed` pulls that node out of the document flow. It is a tall
  block near the top of the article — on `/quran` roughly a thousand pixels — so
  everything below it jumps up by its full height.
- The theme puts `animation: intro` on `#main`, and an element with an animation
  in effect is a stacking context. From inside it no `z-index` can lift the panel
  above a body-level backdrop, so the backdrop paints *over* the panel, greying
  it out and swallowing every tap.

Cloning sidesteps both: the article is never touched, and the panel is already a
child of `<body>`. The theme's `.toc` / `.toc__menu` rules are unscoped, so the
clone is styled for free. Only the clone's root gets an id (`toc-drawer`).

**The clone is a bare `<nav>` wrapping a `<div class="toc">`.** Both halves are
load-bearing:

- **It must be a `<nav>`.** `_base.scss` scopes the list reset to `nav`:
  `li { list-style: none }`, `a { text-decoration: none }`, `ul { margin: 0;
  padding: 0 }`, plus two spacing rules. Any other element and the menu comes
  back with bullets, underlines and the browser's default indent.
- **The `<nav>` must not match `nav.toc a`.** The theme drives its scrollspy
  with `new Gumshoe("nav.toc a")`, and Gumshoe resolves duplicate links to the
  *last* match in document order. A cloned `<nav class="toc">` therefore steals
  the highlight from the real TOC and keeps it even at desktop width, where the
  panel is `display: none` and the sticky sidebar is the only TOC on screen.

Holding `toc` on the inner div satisfies both, since the theme's `.toc` rules
never mention the element they sit on. The wrapper then needs
`#toc-panel > nav { display: flex; flex: 1 1 auto; min-height: 0 }` to pass the
panel's height through, or the menu has nothing to scroll within. `syncActive()`
copies the current `li.active` onto the clone by matching `href` when the panel
opens. Once per open is enough: the backdrop blocks scrolling, so the section
cannot change while the panel is up.

**The scroll lock cannot be the theme's `overflow--hidden`.** `overflow: hidden`
on `<body>` establishes a block formatting context, and reflowing the theme's
layout under it shortens the page by ~1400px — the same visible lurch, from a
different cause. `touch-action: none` on the backdrop swallows pan gestures
instead, with `overscroll-behavior: contain` on `.toc__menu` so a flick past the
end of the list does not chain into the article. Neither touches layout. Focus
moves with `preventScroll: true` for the same reason.

Width is `min(86vw, 21rem)` — the `vw` term guarantees a strip of backdrop
survives on the left, so there is always somewhere to tap to dismiss. Running
flush to the top and right edges means the theme's `.toc` border radius and
`.nav__title` corner rounding both have to be zeroed, or they show as notches
against the viewport corners.

Pages without a TOC (home, about) have no `.sidebar__right` at all. The script
detects that, builds no panel, and sets `.no-toc`, which hides `#toc-toggle` and
leaves `#back-to-top` alone.

### Verifying it

Check at *both* widths, and compare the clone's computed styles against the real
TOC — `textDecorationLine`, `listStyleType`, the nested `ul` padding and the link
indent should match exactly. The desktop breakage is invisible from a phone
viewport, and vice versa.

The regression test is three numbers — `scrollY`,
`documentElement.scrollHeight`, and the `getBoundingClientRect().top` of a
heading — sampled before opening, while open, and after closing. All three must
be identical across the three samples. Then `document.elementFromPoint` over the
panel must return a TOC `<a>`, not `#toc-backdrop`.

Headless Chrome is poor at verifying this: it will not composite scrolled regions
(screenshots come out blank), `--virtual-time-budget` freezes the CSS transition
clock so opacity and transform read their *start* values, and the window cannot
go narrower than a ~504px viewport. Force the end state directly — add
`is-visible`, click the toggle, disable transitions — and assert on
`getBoundingClientRect` and class lists instead of pixels.
