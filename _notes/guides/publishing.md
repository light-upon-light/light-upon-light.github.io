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
