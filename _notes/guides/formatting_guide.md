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
