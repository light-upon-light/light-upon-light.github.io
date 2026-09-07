# Search — currently OFF

Nothing in this file describes the site as it stands. Read it only when
turning search back on, or when something claims the site has search.

**`search: false` in `_config.yml`.** There is no magnifier in the masthead, no
`#search` input, no index, and nothing on the page reads a store. Everything
below describes what would apply *if it were turned back on*.

`assets/js/lunr/lunr-store.js` is shadowed by an empty local file for the same
reason: the theme's generator emits the full text of every article into a
614 KB store on every build, and with search off nothing ever loaded it.
Turning search back on means deleting that shadow as well as flipping the
three settings.

Lunr, the theme's default provider. Three settings in `_config.yml` have to
agree, and getting one wrong fails **silently** — the overlay opens, the input
accepts typing, and every query reports "0 Result(s) found".

- `search: true` puts the magnifier in the masthead.
- `lunr.search_within_pages: true` is **load-bearing here**. The theme's
  `assets/js/lunr/lunr-store.js` walks `site.collections`. There are no posts
  and no collections, so without this flag the generated store is literally
  `var store = []` and nothing is searchable.
- `search_full_content: true` indexes whole articles. Without it the store
  holds `truncatewords: 50`, so only each article's opening paragraph is
  findable — a search for anything past the intro returns nothing. The results
  list re-truncates to 20 words when rendering, so full content costs page
  weight (~140 KB store) but does not affect the UI.

`index.html` sets `search: false`. Its feature-row cards repeat each article's
teaser verbatim, so indexing it puts the homepage alongside the real article in
almost every result.

Two artefacts of the theme's template that are **not** corruption:

- The store opens `var store = [,{` — a leading elision, because the empty
  collections loop still emits the separating comma. `lunr-store.js` iterates
  with `for...in`, which skips holes, so all entries index correctly. Anything
  new that reads the store must not use an index-based loop.
- Page entries carry an `absolute_url`, unlike collection entries, so result
  links point at `light-upon-light.github.io` even when serving `_site`
  locally. Correct in production; expected when testing.

Lunr strips English stop words from both index and query, so `about`, `is`,
`the` and friends match nothing. That is the library working, not a bug.

To verify, serve `_site` and drive the real page over CDP: assert `store.length`,
that `typeof idx === 'object'`, then set `input#search`'s value, dispatch a
`keyup`, and read `#results`. Querying a word that appears only deep in an
article (`consummation`, `preservation`) is what actually proves
`search_full_content` is live.
