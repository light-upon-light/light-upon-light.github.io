---
layout: none
# Shadows the theme's assets/js/lunr/lunr-store.js.
#
# The theme's version walks every page and emits the full text of the site
# into a JavaScript array -- 614 KB, regenerated on every build. Nothing
# loads it: `search: false` in _config.yml means scripts.html never includes
# the Lunr scripts at all, so it was 614 KB of the site's own prose
# published on every deploy for no reader.
#
# A local file of this path takes precedence over the remote theme's, so
# this empty store is what gets published instead. If search is ever turned
# back on, delete this file and the theme's own generator returns -- see the
# Search section of CLAUDE.md for the three settings that have to agree.
---
var store = [];
