# Theme internals

Four customisations big enough to have their own failure modes: dark mode,
the mobile TOC drawer, the mobile TOC disclosure (a separate thing from the
drawer, and the one with the worst failure mode), and the
scrollspy/nav-link-overflow pair that replaced two of the theme's jQuery
plugins. Read the relevant section before changing any of them. The rest of
the CSS/JS layout is `styling.md`; `CLAUDE.md` routes to both.

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
  background *behind* white text (`.btn--primary`) and the default
  `blockquote` rule drawn *on* the page background.
  `--site-blockquote-border-default` decouples the two — see its comment in
  `_dirt.scss` and its consumer in `_includes/head/custom.html`. `#toc-close`
  needs no dark rule at all because of this — primary is dark in both modes,
  so white text still works. `.nav__title` used to be on that list; the plain
  TOC below took its fill away, so it is now `--site-src-text` on whatever
  ground it sits on and varies with the palette like everything else.
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

That trim is an explicit override, not a deletion: the theme's reset puts a
bare `transition: 0.2s` — all properties — on `b, i, strong, em, blockquote,
p, q, span, figure, img, h1, h2, header, input, a, tr, td, …`, and a
`data-theme` change is a genuine property change on every one of them that
reads a redefined custom property. `head/custom.html` answers it with
`html :is(b, i, strong, …) { transition: none }`, keeping a *named* colour
transition only for the interactive subset so real hover/focus feedback
survives. `html.theme-swap` then suppresses that surviving transition for the
instant of the swap. Nothing broader is needed: a `data-theme` write resolves
in the same task, so there is no multi-frame window for a page-wide guard
class to paper over.

**Why a view transition at all.** Redefining ~41 custom properties on `:root`
invalidates every element on the page. The style recalc happens in one go, but
without help a browser can spread the resulting *paint* across several frames
— which used to tear the masthead, icons and colours arriving a frame or two
apart, reading as buttons juddering sideways even though nothing moved. Those
frames now happen behind a frozen snapshot, and the two snapshots cross-fade
over 260ms set on `::view-transition-old/new(root)`.

**Never give the toggle buttons a `view-transition-name`.** `root` is the
only participant in the cross-fade; a named element gets its old and new
geometry interpolated, which is exactly how the apparent sideways drift in
`#font-size-toggle` came back the one time this was tried.

Two gates fall back to an instant swap instead of a transition: no View
Transitions API, and `prefers-reduced-motion`.

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

Replacing both animations also drops the UA's
`-ua-mix-blend-mode-plus-lighter`. To check any of this, freeze it: `await
t.ready`, then set `currentTime` on the `::view-transition-*` animations from
`document.getAnimations()` and screenshot.

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
against the viewport corners. The plain-TOC rules in `site.scss` now zero the
title's radius anyway; the drawer-specific rule stays because it is the one
that says *why*, and it would still be needed if the plain restyle were
reverted.

**The drawer's opacity comes from `.toc`, not from `#toc-panel`.** The theme
puts `background-color: var(--mm-background-color)` and a border on `.toc`;
`#toc-panel` sets no background of its own. The plain-TOC restyle strips that
box — and is scoped to `.page__content .toc` for exactly this reason. A
`#toc-panel .toc` in that selector list leaves the drawer transparent over the
article, which is how it was caught.

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

## The mobile TOC disclosure

Separate from the drawer above, and easy to confuse with it. Below `64em` the
theme gives `.sidebar__right` no positioning at all — only `margin-bottom:
1em` — so the TOC is an in-flow block between the title and the first
paragraph: 13 rows on `/sword`, a screenful of navigation before any prose.
`site.js` wraps it in a `<details>` so a phone shows one line, expanded again
at `64em` where the sidebar is its own column.

Below `64em` it also **moves the whole `<aside>` to sit after the `.tldr`
card**, so the article opens with its summary and offers navigation only once
the reader has the gist. The aside moves, not just the `<details>`: at `64em`
`.sidebar__right` is what carries the sticky sidebar positioning, so it has to
go back to being `.page__content`'s first child there, and a comment node
marks that spot. Both branches are idempotent, so `sync()` can call the
placement on every breakpoint change without inspecting the current DOM. A
page with no `.tldr` never gets the marker and never moves. The theme's
`.page__content aside+:nth-child(2) { margin-top: 0 }` does not follow the
aside — once moved, the element after it is the third child.

Four things here are load-bearing:

- **The wrapper goes OUTSIDE `.toc`.** The drawer clone copies
  `sourceToc.className` and `sourceToc.innerHTML` verbatim; a `<details>`
  added *within* `.toc` would be cloned into the drawer, where a collapsed
  TOC is exactly wrong.
- **It is built in JS, not markup.** Shadowing the theme's
  `_includes/toc.html` could emit the element but not decide its open state
  per breakpoint, and open state is an attribute, not something CSS reaches.
  With no JavaScript no wrapper is built and the reader gets the fully
  expanded TOC — the right thing to degrade to.
- **`html.toc-ready` gates a pre-paint rule, and a failure is dangerous.**
  site.scss hides the TOC menu from first paint under
  `html.js:not(.toc-ready)[data-toc-mobile="collapsed"]`, so the full list
  never paints and then collapses. If `site.js` failed to add `.toc-ready`,
  the mobile TOC would stay hidden with **no TOC reachable at all**:
  `#floating-nav`, and therefore the drawer, only becomes visible after a
  full viewport of scroll. So the class is added as the block's first
  statement, before any DOM work, and the block is deliberately independent
  of the floating-nav IIFE, which returns early when `#floating-nav` is
  absent. The `html.js` half of the selector (set in the shadowed
  `_includes/head.html`) is what keeps a no-JS reader out of the rule.
- **Print is JS too.** A closed `<details>` hides its content through the
  UA's own `::details-content` / `content-visibility` machinery, which a
  print stylesheet cannot reliably override. `site.js` opens the panel on
  `beforeprint` and restores it on `afterprint`; the print CSS only drops the
  summary.

Two templates, switched per page: `toc_mobile: expanded` in front matter opts
out of collapsing (`quran.md` only — its TOC is the page's own structure
rather than an aside to a linear argument), everything else defaults to
collapsed. The value is written onto `<html>` as `data-toc-mobile` by
`_includes/head/custom.html`, pre-paint alongside the theme and font-size
bootstraps, because CSS keys off it too.

The summary is styled as a hairline and a muted label — the `.quran-more` /
`.yt-embed` idiom. The desktop TOC title is now the same thing: the theme's
solid `--mm-primary-color` bar and the 1px divider under every entry are both
gone, at both widths, and `.toc` has no box at all inside `.page__content`.
The filled bar was the loudest thing above the article, the dividers made an
eight-item list read as a spreadsheet, and inside the disclosure the box's own
top border landed a pixel below the summary's underline, so the widget opened
showing two parallel lines.

`toc_label` is defaulted to `ON THIS PAGE` in `_config.yml`'s `pages` scope
rather than repeated in front matter; a page can still override it there. The
disclosure summary **reads** its label from the rendered `.nav__title` instead
of carrying a second hardcoded copy, so an override reaches both.

## Scrollspy and nav-link overflow (P1-5)

`assets/js/main.min.js` (jQuery + fitvids + magnific-popup +
throttle-debounce + smooth-scroll + greedy-navigation + gumshoe, 124 KB /
42.7 KB gzipped) is gone. This site's own JS was already vanilla; jQuery was
there only to run that bundle. `assets/js/site.js` is now the only entry in
`footer_scripts`, and carries its own replacements for the two plugins that
were actually load-bearing (Gumshoe, GreedyNav). fitvids, magnific-popup and
throttle-debounce were dead code — no static `<iframe>`/`<video>`, no
`.image-popup` target anywhere in the built site, and `_main.js` never even
called throttle-debounce. SmoothScroll became plain CSS: `scroll-behavior:
smooth` (gated on `prefers-reduced-motion`) plus `scroll-padding-top: 20px`
in `site.scss`, the same 20px the scrollspy below uses as its own offset —
keep the two numbers equal, or a reader's jump target and the TOC's
highlight disagree on arrival.

**The scrollspy is a line-for-line port of gumshoejs v5.1.1's algorithm**
(MIT, Chris Ferdinandi), not an IntersectionObserver approximation. Verified
by diffing against the theme's own Gumshoe: scroll `/quran.html` and
`/aisha.html` in fixed-size steps, recording `nav.toc li.active a[href]` and
the last `gumshoeActivate` `detail.link.href` at each step, on both builds.
At 400px and 100px step granularity the two sequences are identical.

Two non-obvious fidelity bugs turned up during that diffing, both fixed in
`site.js` — anyone re-deriving this port from Gumshoe's source will hit them
again:

- **`scroll-behavior: smooth` silently retargets `behavior: "auto"`.**
  `"auto"` means "defer to the CSS `scroll-behavior` of the scrolling box" —
  it does NOT mean instant, once that CSS property is set to `smooth`. The
  theme's own `scrollTocToContent` (ported from `_main.js`, keeps the sticky
  sidebar TOC scrolled to the active entry) passed `behavior: "auto"`
  because before this change "auto" WAS instant. `site.js` now passes
  `behavior: "instant"` explicitly there, to keep that call instant
  regardless of the new CSS. Anything else added later that wants an
  unconditionally-instant scroll must do the same — "auto" is no longer safe
  to assume is instant anywhere on this site.
- **Gumshoe's activation test truncates, it doesn't compare the raw float.**
  `isInView` is `parseInt(bounds.top, 10) <= offset`, not
  `bounds.top <= offset`. A `scroll-padding-top: 20px` anchor landing can
  settle at a sub-pixel value like `20.125` — past the offset once
  truncated, but NOT by a bare `<= 20` float comparison. This is exactly the
  #next-section button landing one heading short of where it should:
  clicking it should always leave the *destination* heading active, and a
  raw float comparison missed it by a hair on that landing spot specifically
  (caught by testing `#next-section` itself, not by the scroll sweep, which
  samples every 100px and stepped past the exact boundary both times).
  `site.js`'s `topInView`/`bottomInView` both truncate with `parseInt` to
  match.

**GreedyNav is not fully inert with the single link `_data/navigation.yml`
holds**, contrary to `masthead.html`'s own comment (accurate about GreedyNav
undercounting the two appearance-toggle buttons' width, wrong about the
consequence). Removing GreedyNav outright and shipping nothing produces real
breakage at narrow widths: `.visible-links` is `flex: 1` with
`justify-content: flex-end`, so when the single link doesn't fit, it
overflows past the container's START edge — behind the site title, not
off the end — which is why `scrollWidth > clientWidth` does NOT detect it
(that check only sees end-edge overflow). Confirmed at 375px: the link
rendered ~135px into the title's own box.

The fix is a ~30-line stand-in in `site.js`, not a GreedyNav port: since
there's only ever one link, the question is binary (fits / doesn't fit), not
GreedyNav's incremental per-item measurement. It compares the link's own
natural `offsetWidth` (unaffected by the parent's `overflow: hidden`, which
only clips paint, not layout) against `.visible-links.clientWidth`, and on
overflow moves the link into `.hidden-links` and reveals
`.greedy-nav__toggle` — the same two elements and the same `.hidden` class
GreedyNav itself used, so the theme's own CSS still drives the dropdown's
appearance. Re-runs on `resize`. Verified at 375px (hamburger, no overlap,
dropdown opens/closes), 768px and 1280px (inline, no hamburger) — all three
match the theme's own GreedyNav output at the same widths.
