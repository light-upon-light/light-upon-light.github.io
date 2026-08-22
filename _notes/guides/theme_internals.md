# Theme internals

Two customisations big enough to have their own failure modes: dark mode and
the mobile TOC drawer. Read the relevant half before changing either.
Everything else lives in `CLAUDE.md`.

## Dark mode

One stylesheet, palette in CSS custom properties, `data-theme` on `<html>` as
the single source of truth. `_sass/minimal-mistakes/skins/_dirt.scss` defines
three `:root` blocks — light (the bare block), explicit dark
(`:root[data-theme="dark"]`), and the no-JS/no-choice system fallback
(`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {`) —
each setting the same ~41 `--mm-*`/`--site-*` properties. Every theme
component and every piece of this repo's own CSS reads one of those
properties, so a `data-theme` change repaints the whole page from one
attribute write. This replaced compiling the theme twice into a second
stylesheet (`assets/css/dark.css`, toggled by a `<link media>` attribute) —
the reasoning below is for anyone diffing against that history, not a
description of what exists now.

**Why this took two passes.** A minimal-mistakes skin is a set of *Sass*
variables, and the theme runs Sass colour functions over them — `mix()`,
`rgba()`, `yiq-contrasted()`. `mix(#fff, var(--x), 20%)` does not compile, so
turning the skin into custom properties (the previous commit) needed a
precomputed fallback property for every one of those call sites, guarded by
`@if type-of(...) == color`. This commit only had to add the *values* for a
second palette behind that plumbing — extracted from the last build of
`dark.css` by matching each consuming selector against `main.css`, not
recomputed by hand, since Sass still can't run those functions on a `var()`
to check them.

The palette is hand-derived from dirt, not one of the theme's stock dark
skins. `_dirt.scss`'s dark block carries the computed WCAG contrast ratios in
its header comment; re-check them by hand if any value changes. Two of the
choices are not free:

- `--mm-primary-color` (`#6f5f48` dark) does two opposing jobs: it is the
  background *behind* white text (`.nav__title`, `.btn--primary`) and the
  default `blockquote` rule drawn *on* the page background.
  `--site-blockquote-border-default` decouples the two — see its comment in
  `_dirt.scss` and its consumer in `_includes/head/custom.html`. `#toc-panel
  .nav__title` and `#toc-close` need no dark rule at all because of this —
  primary is dark in both modes, so white text still works.
- `--mm-active-color` (the TOC scrollspy highlight) has to stay dark enough
  that `yiq-contrasted()` still picks `--mm-active-color-contrast: #fff`. The
  stock 80%-white value would paint a near-white pill on a dark page.

Dirt's base16 syntax colours are already a dark scheme, so they carry over
verbatim (still literal hex, not custom properties — see the comment in
`_dirt.scss`) and code blocks look the same in both modes.

This repo's own palette — the evidence blockquotes, the floating nav, the
breadcrumb, and the dozen or so other rules hardcoded in `head/custom.html`
and `footer/custom.html` — is `--site-*` properties in the same three
`_dirt.scss` blocks, consumed directly by those rules. A few reuse an
existing `--mm-*` property instead of getting their own, where the dirt skin
already happens to carry the right value (e.g. the TOC active-row highlight
reuses `--mm-active-color`/`-contrast`, the same properties the theme's own
`.toc .active a` reads).

**Mode selection.** The inline script in `head/custom.html` reads
`localStorage`, resolves against `matchMedia("(prefers-color-scheme: dark)")`
when there is no stored choice, and writes the result onto
`documentElement.dataset.theme` — which is also what CSS keys off, so setting
it *is* the mode switch, not a hint to some other mechanism. It runs in
`<head>`, before the masthead is parsed, so the page never paints in the
wrong mode. Choosing the mode the system already prefers **clears** the
stored value rather than pinning it, so the site goes back to following the
system.

A `data-theme` write is a defined style-change event the browser resolves
synchronously — unlike the old media-attribute stylesheet swap, which could
defer recognising its own change by a task or more (measured on iOS: still
the old palette two frames after the swap). That deferral is what the old
design's `waitForPalette()` polling, the `color-scheme`-as-sentinel checks,
and the `.theme-switching` transition guard all existed to survive. None of
it is needed now: the toggle's `document.startViewTransition()` callback is
synchronous, and the only remaining transition-suppression is
`html.theme-swap`, scoped to the four selectors (`a`, `.btn`, `form button`,
`input[type="submit"]`) that still carry a CSS transition after the theme's
`transition: all 0.2s` reset was trimmed — see the comments above it in
`head/custom.html` for why even those would otherwise race the cross-fade.

**Never give the toggle buttons a `view-transition-name`.** `root` is the
only participant in the cross-fade; a named element gets its old and new
geometry interpolated, which is exactly how the apparent sideways drift in
`#font-size-toggle` came back the one time this was tried.

**A dissolve, not the browser's default cross-fade.** The UA default fades
both snapshots at once under `mix-blend-mode: plus-lighter`, which *adds* the
two layers — right for two near-identical frames, wrong for two different
palettes, since a pixel can land brighter than it is in either one (hairlines
showed it worst: anti-aliased coverage differs between a 1px light rule and a
0.8px dark one, and the sum blew out to white crossing into dark mode). So
`::view-transition-old(root)` holds still and opaque as the base while
`::view-transition-new(root)` fades in on top with normal blending —
monotonic per pixel, total alpha stays 1 throughout, and the mid-transition
overshoot can't come back.

## The TOC drawer

`#toc-toggle` opens `#toc-panel`, a real `<dialog>` opened with `showModal()`,
sliding in from the right edge. The panel is built at load from a **clone** of
the theme's TOC and appended to `<body>`; `<dialog>` is `display: none` at rest
(the UA default), not mounted-but-hidden the way the old plain-`<div>` version
was.

Converting it from a hand-built div + `#toc-backdrop` pair to a real `<dialog>`
(audit P1-6) replaced four things the old version had to fake or got wrong:

- **No focus trap.** `showModal()` supplies one natively — Tab cannot reach the
  masthead or the article behind the panel.
- **Background not inert.** `showModal()` marks everything outside the dialog
  inert and sets the dialog's accessible semantics — never add `role="dialog"`
  or `aria-modal` by hand; they come for free and a hand-added one can conflict.
- **Scroll lock was touch-only.** `touch-action: none` on the backdrop stopped
  a touch drag but did nothing for a mouse wheel or arrow keys. The dialog's
  focus trap handles keyboard scrolling (focus can't reach anything a key
  could scroll), but wheel input doesn't depend on focus and isn't reliably
  absorbed by `::backdrop` across engines, so `blockWheel()` in site.js still
  explicitly `preventDefault()`s a `wheel` event unless its target is inside
  `.toc__menu`. `touch-action: none` on `::backdrop` (below) still covers the
  touch case.
- **A `setTimeout` duplicated the CSS transition duration.** The old close
  path waited a hardcoded 250ms — guessed to match the transition — before
  unmounting `#toc-backdrop`; changing one and not the other would
  desynchronise them. `transition-behavior: allow-discrete` on `display` and
  `overlay` (in the `#toc-panel` CSS) replaces that: calling `panel.close()`
  removes `[open]` immediately, but allow-discrete holds the dialog in the top
  layer for exactly as long as the `transform` transition it's paired with
  actually takes, so there's nothing left to keep in sync by hand.

`showModal()`/`close()` still don't give a scroll-position-preserving open —
that part is unrelated to any of the above and is why the clone stays (next
paragraph), and `panel.showModal()` itself doesn't skip the same
`focus({ preventScroll: true })` call the old code needed, since its own
default focus move isn't guaranteed to be scroll-safe either.

**Do not reposition the real `.sidebar__right` instead.** Repositioning it with
`position: fixed` would pull it out of the document flow — it's a tall block
near the top of the article, on `/quran` roughly a thousand pixels — so
everything below it would jump up by its full height the moment the drawer
opened, to a reader scrolled well past it. A second reason used to apply too:
the theme's `animation: intro` on `#main` creates a stacking context, and
inside it no `z-index` could lift a plain fixed panel above a body-level
backdrop. That reason is gone now that the panel is a `<dialog>` — top-layer
rendering ignores ancestor stacking contexts entirely — but the layout-jump
reason doesn't depend on how the panel itself is rendered, so cloning stays
either way.

Cloning sidesteps the remaining problem: the article is never touched, and the
panel is already a child of `<body>`. The theme's `.toc` / `.toc__menu` rules
are unscoped, so the clone is styled for free. Only the clone's root gets an id
(`toc-drawer`).

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
different cause. `touch-action: none` on `#toc-panel::backdrop` (the browser's
own generated backdrop box, styled directly — see the note above) swallows pan
gestures instead, with `overscroll-behavior: contain` on `.toc__menu` so a
flick past the end of the list does not chain into the article. `blockWheel()`
in site.js covers the mouse wheel, which touch-action doesn't. None of this
touches layout. Focus moves with `preventScroll: true` for the same reason.

Width is `min(86vw, 21rem)` — the `vw` term guarantees a strip of backdrop
survives on the left, so there is always somewhere to tap to dismiss. Running
flush to the top and right edges means the theme's `.toc` border radius and
`.nav__title` corner rounding both have to be zeroed, or they show as notches
against the viewport corners.

Pages without a TOC (home, about) have no `.sidebar__right` at all. The script
detects that, builds no panel, and sets `.no-toc`, which hides `#toc-toggle` and
leaves `#back-to-top` alone.

### Collapsing

`makeCollapsible()` runs on the real sidebar TOC *before* the clone is taken, so
both copies get the same collapsed markup. It decorates two levels — the h2
items and the h3 items inside them — wrapping each heading's `<a>` in a
`.toc__heading-row` beside a chevron button. An item with no sub-list gets
neither, and keeps the theme's plain `<a>`; that looks the same, because
`.toc__menu a` already carries the row's `border-bottom`.

**Collapsing is the `hidden` attribute, not CSS.** The hiding comes from the UA
stylesheet's `[hidden] { display: none }`, which never appears in
`document.styleSheets` — so a probe that enumerates stylesheet rules will not
find it and will misattribute the hiding to whatever rule it does find. Read
`ul.hidden`.

`expandActiveSection()` walks up from the `<li>` Gumshoe marked to the top of
`.toc__menu`, opens every ancestor in that chain, collapses their siblings at
each level, and collapses everything below where the chain ran out — without
that last step, arriving at an h2 reopens it with whichever h3 group was last
expanded. Gumshoe runs `nested: false`, so it activates the h4 itself and never
its h3 group; the chain walk is what supplies the ancestors. Do not switch to
keying off the h3 being active — a bare `### Group` immediately followed by
`#### Sub` has almost no scroll height and is rarely activated.

Only `sourceToc` is passed to it, and the clone is built once from `innerHTML`,
so the drawer keeps whatever state existed at load: its sub-lists stay collapsed
until tapped. That matches the existing h2 behaviour and is not a bug.

### Verifying it

Check at *both* widths, and compare the clone's computed styles against the real
TOC — `textDecorationLine`, `listStyleType`, the nested `ul` padding and the link
indent should match exactly. The desktop breakage is invisible from a phone
viewport, and vice versa.

The regression test is three numbers — `scrollY`,
`documentElement.scrollHeight`, and the `getBoundingClientRect().top` of a
heading — sampled before opening, while open, and after closing. All three must
be identical across the three samples. Then `document.elementFromPoint` over the
panel must return a TOC `<a>`, not the dialog's `::backdrop` (there's nothing to
name in a DOM query any more — `::backdrop` is generated, not an element — but
the same failure mode is worth checking for: a click landing on the backdrop
instead of the content underneath it).

Also worth checking now that the panel is a `<dialog>`: Tab cannot walk focus
out to the masthead or article while it's open (the focus trap), and a `wheel`
event dispatched at `document` while it's open comes back `defaultPrevented`
unless its target is inside `.toc__menu` (the scroll lock — see `blockWheel()`
in site.js).

For the collapsing specifically, don't scroll-test — dispatch the event and read
the DOM, which needs no layout:

```js
link.closest("li").dispatchEvent(
  new CustomEvent("gumshoeActivate", { bubbles: true, detail: { link: link } }));
```

Then assert `li.classList.contains("is-collapsed")`, `ul.hidden`, and the
toggle's `aria-expanded` on the chain *and* on a sibling that should have shut.

Headless Chrome is poor at verifying this: it will not composite scrolled regions
(screenshots come out blank), `--virtual-time-budget` freezes the CSS transition
clock so opacity and transform read their *start* values, and the window cannot
go narrower than a ~504px viewport. Force the end state directly — add
`is-visible`, click the toggle, disable transitions — and assert on
`getBoundingClientRect` and class lists instead of pixels.
