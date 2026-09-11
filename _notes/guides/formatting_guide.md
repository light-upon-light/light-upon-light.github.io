# Formatting guide

Markdown and kramdown mechanics for pages in `_pages/`. Prose voice is
`writing_style_guide.md`; Qur'an and hadith citation forms are
`citations_guide.md`.

## Evidence blockquotes

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

The `--site-*` properties behind those colours are defined in
`_sass/minimal-mistakes/skins/_dirt.scss` — see `styling.md`.

## The TL;DR block

Every article page opens with one, above the intro paragraphs:

```markdown
<details class="tldr" markdown="1">
<summary><span class="tldr__label">TL;DR</span></summary>

- ...
</details>
```

It is **collapsed by default** on every page: the summaries run to several
paragraphs and pushed the article's own opening below the fold. `markdown="1"`
on the tag is required, as it is for `.quran-more` — without it kramdown
treats the block as opaque raw HTML and never parses the prose inside.

An always-open variant is still supported end to end, in case a page ever
wants one — same class on a plain `<div>`, label as a bare `<span>`:

```markdown
<div class="tldr" markdown="1">
<span class="tldr__label">TL;DR</span>

- ...
</div>
```

That form keeps the fading hairline below the card, and `site.js` moves the
mobile TOC disclosure to sit below it (see `theme_internals.md`). No page
uses it at present.

Deliberately **not** a markdown heading: `toc_levels: 2..3` on the
misconception pages and no `toc_levels` on `quran.md` mean an `## TL;DR`
would enter some TOCs and not others. The `<span>` keeps every page's TOC
identical.

On the seven misconception pages a real `## Introduction` follows the card,
above the intro paragraphs, so the prose does not hang unheaded under the
mobile TOC disclosure and the sticky TOC opens on the introduction rather
than mid-argument. It is left unnumbered on `wadribuhunna.md`, whose other
headings are numbered. `quran.md` has no such heading; its collapsed card
already sits above a real `##`.

It is not a fourth evidence type. `.quote`/`.src`/`.gloss` are a semantic
*left-rule* system; the TL;DR, open, is a full-content-width card with a border, no
left rule and no indent — a different layer of the page, not another kind of
quotation. Its colours are a cool slate-ink wash, a hue clear of `.gloss`'s
teal and the page's warm accents so it never reads as one of them; palette
and contrast ratios are in `_dirt.scss`. The
label is a full-size titled bar; the card's prose is the reading serif, and
a fading hairline below the card separates it from the article's intro.

On `quran.md` the card sits *below* the intro note rather than above it.
Because a collapsed card is one line with nothing to read past, `site.js`
leaves the mobile TOC disclosure at the top of the content — its move-below
branch anchors on `div.tldr`, which no page now has. The collapsed card
carries no fading hairline either: a real `##` heading follows it everywhere,
so it needs no divider of its own. `details.tldr` in `site.scss` adds the
"Show"/"Hide" toggle word, the collapsed/open spacing, and the closed-state pill
on top of the base `.tldr` rules, which apply to a `<details>` and a `<div>` alike.
Closed, the card is a small pill (`TL;DR | Show`) centred in the column; opened,
it becomes the full-width card — a full-width box holding two words read as an
empty input.

Every page currently carries placeholder bullets.

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

## Key-terms block

Every article that leans on recurring Arabic terms sets a `glossary:` list in
its front matter (keys from `_data/glossary.yml`, in display order) and drops
`{% include glossary-key.html %}` on its own line below the opening one or two
paragraphs, before the first `##`. It replaces the old hand-written
`**Terms used below:**` / `*Terms:*` paragraphs. Definitions are edited only in
`_data/glossary.yml` — never inline — since the same string feeds both the
visible list and the hover gloss `site.js` wraps around later occurrences (see
`styling.md`). The include's raw `<dl>`/`<script>` live in a `.html` file, so
MD033 does not apply; the `.md` only ever holds the Liquid tag. The list is
a native `<details>` collapsed by default ("Key terms" is the `<summary>`); no
JS, and the `<dl>` still shows for readers whose browser ignores `<details>`.

## markdownlint

`.markdownlint.json` is configured around the Arabic-quotation pattern, not
by default:

- **MD033** (inline HTML) permits only `div` and `span`. A new inline element
  means updating the config, not quietly failing the lint.
- **MD013** (line length) is off.
- **MD027** (multiple spaces after blockquote symbol) and **MD028** (blank
  line inside blockquote) are off. The bare `>` line and the kramdown IAL tag
  sitting directly under a blockquote look like violations but are the
  intended markup.
