# Plan: TL;DR sections on the main article pages

Status: **implemented.** Scaffolding is on all 8 article pages with
placeholder bullets; the summaries themselves are the author's to write.
This document decides *how* a TL;DR is carried, marked up, styled, and
ordered against the TOC. It deliberately writes **no summary prose** — that
is the author's own task.

## 0. Decisions (author, this session)

| Question | Decision |
| --- | --- |
| Who writes the summaries | **Not this task.** Scaffolding only, with visible dummy bullets as placeholders. Build it so it can be applied to any page. |
| Register / content spec | Deferred — the author will settle it. §2's table is a sketch, not an agreed spec. |
| Carrier | **Raw `<div class="tldr">` in the page body** (§4 option 1). |
| Label | **TL;DR**, as a `<span class="tldr__label">`, not a markdown heading. |
| Mobile TOC | **Route E** — collapse the inline TOC into a one-line disclosure below 64em, on every page **except `quran.md`**. |
| TOC templates | **Two, switchable per page.** `toc_mobile: expanded` in front matter opts out; everything else defaults to collapsed. |
| Visual treatment | **Prototype several and choose from screenshots** — including a variant that adds a hue, which is explicitly *not* ruled out. |
| Rollout | Prototypes on `sword.md` first, then roll out once a variant is chosen. |

## 1. Objective and acceptance criteria

Give each main article page a short, scannable TL;DR at the top that a reader
can absorb without reading the intro, and that is unmistakably **not** body
prose.

Done when:

- Every main page carries one TL;DR block in a single, repeatable form.
- The block is visually distinct from body prose, from the three evidence
  blockquotes (`.quote` / `.src` / `.gloss`), and from the intro paragraphs.
- It does not read as a fourth *evidence* type — see constraint C3.
- A phone reader reaches the gist without scrolling past a 13-item TOC.
- Both light and dark palettes are checked; contrast ratios recorded.
- No-JS and print behaviour are defined, not accidental.
- `bundle exec jekyll build` is clean and `_site/` is inspected.

**Scope (assumption, stated not blocked on):** "main pages inside `_pages`"
= the 8 top-level article pages — `quran.md`, `sword.md`, `jizya.md`,
`aisha.md`, `polygyny.md`, `punishments.md`, `ridda.md`,
`wadribuhunna.md`. Excluded: `about.markdown`, `404.html`, and the 17
sub-pages under `_pages/messenger/`. `messenger.md` is a top-level page but
has no `toc:` front matter and is structurally unlike the other seven — call
it in or out explicitly before implementing.

## 2. What the pages look like today

Every article opens the same way: title, then **2–5 untitled intro
paragraphs** that already do a summarising job, then `##` sections. Some
pages add a bolded `**Terms.**` paragraph (polygyny, ridda) and several open
their first section with `## The objection` (polygyny, ridda). `quran.md`
opens with an untagged blockquote instead of plain prose.

The intro is therefore the TL;DR's main competitor. `_notes/todos.md`
already anticipates this — "make it clearly separate from the intro" — and
the adjacent line points at the resolution: *"the points you would say to
someone in a convo… maybe in the tldr esp."*

**Proposed content spec (the one decision worth confirming before writing
any summaries):** the TL;DR differs from the intro in **register**, not just
in position.

| | Intro (stays as is) | TL;DR (new) |
| --- | --- | --- |
| Form | flowing paragraphs | 3–5 bullets |
| Length | 120–250 words | ≤ 25 words per bullet, ≤ 110 total |
| Voice | careful, qualified, footnoted | what you would say out loud in a conversation |
| Citations | yes | **none** — no footnote markers, no verse refs |
| Job | frame the question honestly | hand the reader the answers |

Ordering against what is already there: TL;DR → intro paragraphs →
`**Terms.**` → first `##`. The TL;DR goes *above* the intro; anything else
and it stops being a TL;DR.

## 3. The mobile ordering question

This is settled by the DOM, not by taste.

`_layouts/single.html` renders `<aside class="sidebar__right sticky">` as the
**first child of `<section class="page__content">`**, with all body markdown
after it. Below `64em` the theme gives `.sidebar__right` nothing but
`margin-bottom: 1em` — no positioning at all — so on a phone the reader
currently gets:

> breadcrumb → title → **the entire TOC, in flow** → intro → first section

For `sword.md` that is 13 rows. (`makeCollapsible` in `site.js` already ships
each h2's children collapsed, so the nested entries are not adding to it —
the 13 top-level rows alone are the screenful.) Any TL;DR written in body
markdown lands *below* that by default.

So "TL;DR before the TOC on mobile" is a **reorder**, and each route costs
something:

| Route | How | Cost |
| --- | --- | --- |
| **A. Flex/grid `order`** on `.page__content` below 64em | one media query | Flex and grid containers do not collapse margins between children. Every vertical gap on every mobile page changes at once. On CSS this hand-tuned, disqualifying. |
| **B. Fork `_layouts/single.html`** | move the aside below a new TL;DR hook | House precedent is explicitly against forking layouts — `styling.md` chose a CSS rule over forking `single.html` just to hide the TOC's redundant icon, because a layout is the heaviest thing to keep in sync across a theme bump. Reject. |
| **C. Move it in `site.js`** | precedented — `site.js` already clones `.sidebar__right .toc` for the drawer | No-JS readers get the other order; visible reflow after load; a second place where DOM order is decided. |
| **D. Hide the inline TOC on mobile**, rely on the drawer | one CSS rule | **Broken.** `#floating-nav` only gets `.is-visible` after the reader scrolls past a full viewport height (`site.js:495`). A reader at the top of the page would have no TOC at all, and no way to reach one without scrolling. Reject on this evidence. |
| **E. Shrink the TOC instead of moving the TL;DR** ⭐ | collapse the inline TOC on mobile into a closed one-line `<details>` | Needs a small markup/JS change to wrap the inline TOC, and a `<summary>` matching the existing `.quran-more` / `.yt-embed` disclosure idiom. |

**Recommendation: E.** Keep DOM order exactly as it is and make the TOC stop
occupying a screen. Mobile then reads:

> title → `On this page ▸` (one closed line) → **TL;DR** → intro → sections

Content before navigation, with no reorder and no layout fork. Desktop is
untouched: at ≥64em the TOC is already in the right gutter and the TL;DR is
simply the first thing in the column.

**Correction to an earlier draft of this plan:** route E is *not* free of a
JS dependency. A `<details>` element is native, but its open state is an
attribute, not something CSS can make viewport-dependent — so the wrapper is
built in `site.js` rather than by shadowing the theme's `_includes/toc.html`,
which could emit the element but not decide its state per breakpoint. Without
JavaScript no wrapper is built at all and the reader gets the fully expanded
TOC, i.e. today's behaviour. That is the right thing to degrade to, but it is
graceful degradation, not equivalence.

Two consequences, both handled in the implementation:

- **Pre-paint.** Left alone, the full TOC paints and then collapses when
  `site.js` runs, jumping every line below it. `site.scss` hides the TOC menu
  from first paint under `html.js:not(.toc-ready)[data-toc-mobile="collapsed"]`;
  `site.js` adds `.toc-ready` as its very first statement, before any DOM work
  that could throw. The `html.js` guard (set in the shadowed
  `_includes/head.html`, pre-paint) is what keeps a no-JS reader out of the
  rule — without it, route E would fail exactly the way route D does.
- **Print.** A closed `<details>` hides its content through the UA's own
  `::details-content` / `content-visibility` machinery, which a print
  stylesheet cannot reliably override. `site.js` opens the panel on
  `beforeprint` and restores it on `afterprint`; the print CSS only drops the
  summary.

If E is rejected, **C** is the fallback; A, B and D should stay rejected for
the reasons above.

## 4. Mechanism options for the block itself

| Option | Sketch | For | Against |
| --- | --- | --- | --- |
| **1. Body markdown + kramdown IAL** ⭐ | a `<div class="tldr" markdown="1">` at the top of the page body | Matches the house `.quote`/`.src`/`.gloss` pattern exactly; MD033 already permits `div`; zero Liquid; author edits it where they edit everything else | Order is DOM order, so it depends on §3 being resolved; the block is prose, not data |
| **2. Front-matter `tldr:` list + an include** | `tldr: ["…", "…"]` rendered by `_includes/tldr.html` | Structured; one template controls every page; could later feed `description` and the OG cards | New include to maintain; YAML is a poor place to write and proofread sentences; quoting traps with the site's typographic punctuation; scope creep toward the OG generator |
| **3. Theme `.notice--*`** | `<div class="notice--info" markdown="1">` | Zero new CSS | `_notices.scss` sets `margin: 2em 0 !important` and `font-size: … !important`, which will fight this repo's tuned spacing and its font-size toggle; its colours are `--mm-*`, not `--site-*`, so it will not sit with the site palette. Reject. |
| **4. Collapsible `<details>`** | the TL;DR itself collapsed | Compact | Wrong default: a summary the reader has to open is not a summary. Only sensible for the *TOC* (§3 route E), not for the TL;DR |

**Recommendation: 1**, written as a `div` wrapper so it can hold a label line
plus a list:

```markdown
<div class="tldr" markdown="1">
**In short**

- …
- …
</div>
```

A bare list tagged `{: .tldr }` is simpler but gives nowhere to hang the
label and no wrapper to draw a panel on.

Keep option 2 on the shelf: if the OG cards or `description` ever want the
same sentences, front matter becomes the better home, and the include can be
added later without changing the visual design.

## 5. Visual treatment

The palette already carries a **semantic** three-colour system for evidence —
gold (revealed text), verdigris (author's commentary), taupe (source
apparatus). Adding a fourth accent hue would read as a fourth evidence type.

**So differentiate by form, not by colour.** Candidates, to be picked and
prototyped:

- Full-content-width panel — the evidence blockquotes are indented; this is
  not. The single strongest signal that it belongs to a different layer.
- Hairline rules above and below, and **no left rule at all** — the left rule
  *is* the evidence vocabulary; refusing it is legible in itself.
- Set in **Karla**, the UI/nav face, rather than the serif reading face — the
  same move `.toc` and `.nav__title` already make to say "this is not the
  article".
- A letterspaced small `In short` label instead of a real heading.
- A very light wash of an existing neutral — `--site-gloss-bg` is already a
  5% wash, so reuse the *technique*, not the hue.

If a background or rule colour is needed, prefer an existing
`--site-*`/`--mm-*` neutral. Only if nothing fits, add `--site-tldr-*` — and
then it must be defined in **all three** `:root` blocks in
`_sass/minimal-mistakes/skins/_dirt.scss` (light, `[data-theme="dark"]`, and
the `prefers-color-scheme` no-JS fallback), with the contrast ratio computed
by hand and recorded in the header comment, as the other `--site-*` values
are.

## 6. Constraints that will bite

- **C1 — the `:nth-child(2)` margin trap.** The theme has
  `.page__content :first-child, .page__content aside+:nth-child(2) { margin-top: 0em }`
  at (0,2,0). The TL;DR becomes exactly that second child, so its top margin
  is zeroed unless the rule is beaten. `site.scss` already documents and
  beats this same rule for headings with `!important`; the TL;DR needs the
  same treatment, for the same documented reason.
- **C2 — heading vs. no heading, and the TOC.** The misconception pages set
  `toc_levels: 2..3`, so an `## TL;DR` heading would appear as a TOC entry;
  `quran.md` sets no `toc_levels` (default 1..6) and would behave differently
  again. **Decision: no markdown heading.** Use a bolded or `<span>`-classed
  label inside the block. This keeps every page's TOC identical in behaviour
  and avoids a per-page `toc_levels` divergence.
- **C3 — palette semantics.** See §5. No fourth evidence hue.
- **C4 — MD033.** `.markdownlint.json` permits `div`, `span`, `details`,
  `summary`. Both the recommended `div` mechanism and the §3-E `details` TOC
  wrapper are already allowed; no config change needed.
- **C5 — `Edit` fails on lines containing Arabic.** Several pages carry
  Arabic near the top. Insert the block by anchoring on surrounding Latin
  text, or script the insertion, rather than by matching a line that may
  contain Arabic.
- **C6 — the font-size toggle.** `[data-font-size="large"] .page__content`
  rescales body text; blockquotes and `.quran-more` are pinned. Decide
  deliberately whether the TL;DR scales with the reader's choice (it should —
  it is reading content) and confirm it does not restack awkwardly at
  `large` on a narrow phone.
- **C7 — print.** `#floating-nav` and `#toc-panel` are already hidden in
  `@media print`. The TL;DR should print; a §3-E collapsed TOC should be
  forced open or hidden in print rather than printing as a dead one-liner.
- **C8 — cascade discipline.** `site.scss` is emitted after `main.css`, so
  overrides win on source order; only add `!important` where a `(0,2,0)`
  theme rule genuinely outranks the selector (C1), and say why in a comment,
  as the rest of the file does.

## 7. Affected files

| File | Change |
| --- | --- |
| `_pages/{quran,sword,jizya,aisha,polygyny,punishments,ridda,wadribuhunna}.md` | insert one `<div class="tldr">` block above the intro |
| `assets/css/site.scss` | `.tldr` panel rules; C1 margin override; print rule; §3-E mobile TOC disclosure styling |
| `assets/js/site.js` | §3-E only: wrap the inline TOC in a closed `<details>` below 64em |
| `_sass/minimal-mistakes/skins/_dirt.scss` | only if §5 needs new `--site-tldr-*` values — then all three `:root` blocks |
| `_notes/guides/formatting_guide.md` | document `.tldr` alongside the evidence-blockquote taxonomy |
| `_notes/guides/writing_style_guide.md` | the §2 register spec (bullet count, word ceiling, no citations) |
| `_notes/guides/styling.md` | one line on `.tldr` and, if E lands, the mobile TOC disclosure |
| `_notes/guides/theme_internals.md` | §3-E only: the mobile TOC now collapses; record the `#floating-nav` visibility interaction (route D) so nobody re-proposes hiding the inline TOC |
| `CLAUDE.md` | only if a new rule emerges that a future session must know before looking anything up |
| `_notes/todos.md` | tick off the two TL;DR lines |

## 8. Implementation steps

1. Confirm the §2 register spec and the `messenger.md` scope question.
2. Prototype `.tldr` on **one** page — `sword.md`, which has the shortest
   intro and the longest TOC, so it stresses both problems — in `site.scss`.
   No new palette entries in this pass.
3. Build, inspect `_site/sword.html`, and check in the Browser pane at the
   mobile preset and at desktop, in both light and dark.
4. Implement §3-E (collapsed mobile TOC), re-check the same four views, plus
   no-JS and print.
5. Only if step 3 shows the form-only treatment is too quiet, add
   `--site-tldr-*` to all three `:root` blocks with hand-checked contrast.
6. Roll the block out to the remaining pages with placeholder text — writing
   the summaries is a separate task — respecting C5.
7. Update the guides in §7.
8. Full build; inspect `_site/`; commit to `main`. Do not push.

## 9. Risks and rollback

- **Redundancy with the intro** is the biggest risk, and it is a *content*
  risk, not a CSS one. Mitigated by the §2 register split; if the first
  page's TL;DR reads like a shorter intro, stop and revise the spec rather
  than rolling out eight of them.
- **§3-E changes a familiar interaction** — mobile readers who currently see
  the full TOC will find it closed. Mitigation: the disclosure line stays in
  the same place, uses the site's existing `.quran-more` affordance, and one
  tap restores the old view.
- **Palette drift**: adding `--site-tldr-*` triplicates maintenance. Step 5
  is deliberately last and conditional.
- **Rollback** is per-step and cheap: each step is one commit, and the markup
  is additive — deleting the `div`s and the `.tldr` rules in `site.scss`
  restores the current pages exactly.

## 10. Verification strategy

- `bundle exec jekyll build`, then read the generated `_site/*.html` for the
  8 pages — confirm the block's DOM position relative to
  `aside.sidebar__right`.
- Browser pane: mobile preset and desktop, light and dark, on `sword.md` and
  `quran.md` (the two structurally different openings).
- Check the font-size toggle in both states (C6).
- Check with JS disabled and in print preview (C7, §3-E).
- Record contrast ratios by hand if any new colour lands.
- **Stop any `jekyll serve` when done** — abandoned instances squat ports.

## 11. What was built

- `assets/js/site.js` — **Mobile TOC disclosure** IIFE, placed before the
  floating-nav block and deliberately independent of it (that block returns
  early when `#floating-nav` is absent, which would otherwise strand
  `.toc-ready` unset). Wraps `.toc` **outside** the element the drawer clone
  copies. `beforeprint`/`afterprint` open and restore the panel.
- `_includes/head/custom.html` — pre-paint `data-toc-mobile` from
  `page.toc_mobile | default: "collapsed"`.
- `assets/css/site.scss` — pre-paint guard, `.toc-disclosure` (hairline
  summary, hidden at ≥64em and in print, theme `.nav__title` suppressed on
  mobile so the label does not double), and `.tldr`.
- `_sass/minimal-mistakes/skins/_dirt.scss` — `--site-tldr-fill/-line/-label`
  in the light `:root` and the `site-dark-palette` mixin (two places, not
  three: the mixin feeds both the explicit-dark selector and the no-JS
  system fallback), with contrast ratios in the comments.
- All 8 `_pages/*.md` — one `.tldr` block with placeholder bullets.
  `quran.md` also carries `toc_mobile: expanded`.
- Guides updated: `formatting_guide.md`, `styling.md`, `theme_internals.md`
  (a new **mobile TOC disclosure** section), and `CLAUDE.md`'s routing row.

**Chosen:** the hairline TOC summary, and the bordered card in parchment —
the skin's own cream family rather than a fourth hue. The slate first
prototyped, and plum and indigo alternatives, were rejected.

### Verification performed

- `bundle exec jekyll build` clean; `_site/` inspected. All 8 pages emit
  exactly one `.tldr`; no prototype classes or the `?toc=plain` hook survive
  in the built CSS/JS.
- Browser at 390px and 1280px, light and dark: the mobile TOC is one line,
  the card sits directly beneath it above the intro, the desktop sidebar TOC
  is unchanged and expanded, and `quran.md` keeps its full mobile TOC.
- **C1 was real and the first fix was wrong.** `.page__content .tldr` at
  (0,2,0) does *not* tie with `.page__content aside+:nth-child(2)`: that
  selector is (0,2,1), because `:nth-child()` weighs as a class. A
  `getComputedStyle` read returned `marginTop: 0px`; `!important` (the same
  answer `.page__content blockquote` already uses) fixed it, re-measured at
  21.76px. **Read the computed value — do not reason about this one.**
- Font-size toggle: the card inherits `.page__content`'s size in both states.
- No-JS is guaranteed by the `html.js` half of the pre-paint selector rather
  than by a runtime test `[unverified]`.

### Not done

- The summary text itself, and the register spec behind it — the author's.
- `messenger.md` and the 17 `_pages/messenger/` sub-pages were left out; the
  scaffolding applies to any page unchanged if that is revisited.

## Assumptions & Sources

- `aside.sidebar__right` is the first child of `section.page__content`, with
  body markdown after it `[from code: _site/sword.html:538-543]`.
- Below 64em `.sidebar__right` carries only `margin-bottom: 1em`; all
  positioning sits inside `@media (min-width: 64em)` / `(min-width: 80em)`
  `[from code: _site/assets/css/main.css]`.
- `#floating-nav` — and therefore the TOC drawer — is hidden on mobile until
  the reader scrolls past a full viewport height
  `[from code: assets/js/site.js:493-504]`.
- `.page__content :first-child, .page__content aside+:nth-child(2) { margin-top: 0em }`
  exists at (0,2,0) and is already worked around for headings
  `[from code: assets/css/site.scss:838-849]`.
- `toc_levels: 2..3` on the 7 misconception pages; absent on `quran.md`
  `[from code: _pages/*.md front matter]`.
- MD033 permits `div`, `span`, `details`, `summary`
  `[from code: .markdownlint.json]`.
- `.quote`/`.src`/`.gloss` are a semantic three-colour system defined across
  three `:root` blocks in `_dirt.scss`
  `[from code: assets/css/site.scss:540-565; _notes/guides/formatting_guide.md]`.
- House precedent against forking `_layouts/single.html`
  `[from code: _notes/guides/styling.md]`.
- `_notices.scss` uses `!important` on margin and font-size
  `[from code: _sass/minimal-mistakes/_notices.scss:14-18]`.
- The author's intent for TL;DR content — "points you would say to someone in
  a convo", "clearly separate from the intro" `[from code: _notes/todos.md:6-7]`.
- Flex and grid containers do not collapse margins between children —
  standard CSS behaviour, not re-verified against a spec here `[unverified]`.
- Whether `messenger.md` is in scope `[unverified]`.
