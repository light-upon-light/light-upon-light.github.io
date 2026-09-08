# CLAUDE.md

Jekyll site (GitHub Pages) using the `minimal-mistakes` theme via `remote_theme`,
pinned to 4.28.0. Pages live in `_pages/`. Build with `bundle exec jekyll build`.
There is no CI and no tests — a local build and a look at `_site/` is the only
check there is.

## Rules that apply before you'd think to look anything up

- **Commit to `main`. Never push.** Pushing is publishing, and that is the
  author's call alone — don't run `git push`, and don't offer to. No feature
  branches, no PRs; a branch cannot reach Pages.
- **Never run `find /`, or any unscoped `find`, from Bash.** Git Bash's root
  walks the 459 GB SSD and a 200 GB Google Drive mount that hydrates cloud
  files as it is enumerated; the scan never finishes, and the tool's timeout
  leaves `find.exe` orphaned pegging a core. Use `Glob`/`Grep`, or scope
  `find` to a directory known to be local and bounded. Resolve the theme with
  `bundle show minimal-mistakes-jekyll`, not by searching the filesystem.
- **Stop any `jekyll serve` when done.** Abandoned instances squat ports
  (4000-4002, 4444, 8888) and keep filesystem watchers alive.
- **Never write Qur'anic Arabic, or a hadith number, from memory.** Both
  corpora are on disk under `_notes/data/` — see the citations guide.
- **`Edit` fails on lines containing Arabic** (bidi reordering means
  `old_string` won't match). Anchor on surrounding Latin text, or script it.
- **Search is off** (`search: false`). There is no magnifier, no index, and
  nothing reads a store; don't reason about the site as though there were.

## Read before you do

| Before you… | Read |
| --- | --- |
| write any prose for a page | `_notes/guides/writing_style_guide.md` |
| make an argument or handle a source | `_notes/guides/methodolody_guide.md` |
| quote a verse or cite a hadith | `_notes/guides/citations_guide.md` |
| add footnotes, references, or an evidence blockquote | `_notes/guides/formatting_guide.md` |
| touch CSS or JS | `_notes/guides/styling.md` |
| touch dark mode, the TOC drawer, or the scrollspy | `_notes/guides/theme_internals.md` |
| change a permalink, or reason about what gets published | `_notes/guides/publishing.md` |
| turn search back on | `_notes/guides/search.md` |

Two things worth knowing without opening a file: article pages set
`permalink: /quran` with **no trailing slash**, so link to them that way —
`/quran/` 404s. And `jekyll-optional-front-matter` means every markdown file
the build can see becomes a page; `_notes/` and `CLAUDE.md` are excluded in
`_config.yml`, which is why guides live there.

## Link-preview (Open Graph) cards

Every article page sets `header.og_image` to a committed 1200×630 PNG in
`assets/images/og/`; `_config.yml`'s `og_image` is the fallback
(`og/default.png`). The theme's `_includes/seo.html` emits `og:image` from
`page.header.og_image` (falling back to `site.og_image`) — no Twitter-card
tags, since `site.twitter.username` is unset. Regenerate the cards with
`python _notes/scripts/og/gen.py [slug ...]` (needs Chrome; edit the `CARDS`
list there when a title or section label changes), then commit the PNGs.
