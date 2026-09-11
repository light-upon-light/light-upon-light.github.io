# Publishing and URLs

How this site gets built, published, and linked. The hard rules
(**commit to `main`, never push**) are repeated in `CLAUDE.md`; the reasoning
is here.

## What gets published

GitHub Pages builds from `main`, so pushing is publishing. There is no CI, no
staging, and no tests — a local build and a look at `_site/` is the only check
there is.

**Commit to `main`. Never push.** Because the push is the publish, that step is
the author's alone — never run `git push`, and don't offer to. Work goes
straight onto `main`: no feature branches, no PRs. A branch cannot reach Pages,
so it only adds a merge for someone else to do.

The `github-pages` gem bundles `jekyll-optional-front-matter`, so **every
markdown file the build can see becomes a page**, front matter or not, and lands
in `sitemap.xml`. `include: [_pages]` publishes everything under `_pages/`
regardless of any `published:` flag.

**Caching.** Pages serves assets with a 4-hour `max-age` but HTML with 10
minutes, so an unversioned asset URL leaves new markup styled by the old
stylesheet for hours after a deploy. `site.css` is linked with
`?v={{ site.time | date: '%s' }}` (`_includes/head/custom.html`) so each build
busts it; so is `main.css` (`_includes/head.html`), which carries the `--site-*`
palette from `_dirt.scss`. `site.js` gets the same `?v=` from `_includes/scripts.html`, which
shadows the theme's copy (4.28.0) for that one change — re-diff it against the
theme when `remote_theme` is bumped.

## URLs

The article pages set `permalink: /quran` with no trailing slash, so they build
flat (`_site/quran.html`, not `_site/quran/index.html`). Link to them the same
way — `/quran`, not `/quran/`, which 404s on GitHub Pages. `about.markdown` uses
`/about/` and does build to a directory; the asymmetry is deliberate.

Sub-directories of `_pages/` are published too: `_pages/messenger/*.md` carry
`permalink: /messenger/<slug>` and build to `_site/messenger/<slug>.html`,
alongside `_site/messenger.html` for `/messenger` itself. Nothing in
`_config.yml` needs to name the sub-directory.

## Site description

Two strings in `_config.yml`, each with one job — don't reintroduce a third:

- `description` — the SEO string. The theme feeds it to `<meta name="description">`
  and `og:description`. Plain, no ﷺ, since it renders in search snippets.
- `blurb` — the prose sentence. The homepage and the about page render
  `{{ site.blurb }}`; nothing hardcodes it.

## Dates

Two front-matter keys, both optional, both rendered in the page footer:

- `date` — the publish date. Also feeds `itemprop="datePublished"` and
  `article:published_time`.
- `last_modified_at` — the date of the last substantive revision. Set it by
  hand when a page changes materially; leave it off until then. Feeds
  `itemprop="dateModified"` and `article:modified_time`.

The theme prints only one of the two, labelled "Updated:" either way — so
every page announced its publish date as an update.
`_includes/page__date.html` shadows the theme's include of that name (same
mechanism as `breadcrumbs.html`) and labels them separately, showing
"Updated:" only when `last_modified_at` differs from `date`. Labels are
literals in that file; a local `_data/ui-text.yml` would replace the theme's
whole copy rather than merge one key.

Only `messenger.md` and `_pages/messenger/*.md` currently carry
`last_modified_at`; the rest show a publish date alone, which is correct.
