# Favicon variants

Each folder holds a complete favicon: `favicon.svg` (the source), plus
`favicon.ico` (16/32/48px) and `apple-touch-icon.png` (180px), both Chrome
renders of the SVG. Install one with `sh _notes/scripts/favicon.sh <name>`.

- `l` -- "L" in Abril Fatface, the masthead title face.
- `salawat` -- salawat calligraphy with "wa alihi", traced from a reference
  image; the design matches the U+FDFA glyph in Apple's system fonts.
- `salla-amiri` -- U+FDFA from Amiri (no "wa alihi").
- `allah` -- U+FDF2 from Amiri.
- `allah-disc` -- Allah in cream on an ink disc (round, not the rounded
  square), as large as fits with a 4-unit margin. Drawn from the original
  vector (allahwriting.zip); provenance unknown.

All use the skin's `$ink-33` with `$paper-99` letters, hard-coded since a
favicon can't read the site's CSS. If you edit an SVG, re-render its .ico
and .png.
