# Palette, 15 Sep

Reference pages from the colour-standardisation work (commit `8b63291` put
every colour in `_sass/minimal-mistakes/skins/_dirt.scss`).

- `1-palette.html`: every colour on the site, light and dark, with contrast
  against the page ground and the built-CSS selectors that use it.
- `2-consolidation-proposal.html`: proposal to rebuild the palette from 28
  base colours: base set, every property before/after (OKLab ΔE), contrast
  re-check, and five decisions needing sign-off. **Not applied.**

Both pages are generated, so regenerate instead of hand-editing. Values are
read from `_dirt.scss`, so the pages go stale when it changes.

```bash
bundle exec jekyll build
uv run python _notes/designs/palette-sep15/scripts/gen.py
uv run python _notes/designs/palette-sep15/scripts/propose.py
uv run python _notes/designs/palette-sep15/scripts/render_proposal.py
```

`gen.py` reads `_site/assets/css` for "Used by", so build first. `gen.py` and
`propose.py` assert that every palette property is listed; when one is added
or renamed they fail, naming it, until its description or mapping is added.
`analyze.py` prints the raw near-duplicate report the proposal was built from.
`template.html` is the shared page shell and stylesheet.
