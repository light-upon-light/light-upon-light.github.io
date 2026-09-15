/* Base colours. Every palette property below references one of these, so a
   colour is changed in one place and every use follows. Named by family and
   OKLab lightness x100 (paper 99 → night 22), so the name says where a step
   sits. The picks and before/after contrast behind this set are in
   _notes/designs/palette-sep15/. */
$paper-99: #fdfcf9;
$paper-96: {{PAPER96}};
$sand-92: #ebe3d1;
$sand-90: #e9dcbe;
$bone-90: #e6ded2;
$bone-84: #d3cbba;
$umber-78: #c3b4a0;
$umber-74: #b8ab97;
$umber-67: #a1937c;
$umber-60: #8a7d68;
{{UMBER54}}$umber-50: #6f6152;
$umber-38: #4a4238;
$ink-33: {{INK33}};
$night-29: #2e2923;
$night-25: #26221c;
$night-22: #1c1a17;

$gold-tint: #dcc8a4;
$gold: #a8792a;
$gold-bright: #d4a04a;
$gold-shade: #785d31;
$sienna: #8a5320;
$sienna-deep: #6e3f14;
$wheat: #d9b483;
$wheat-pale: #e8cea3;
$verdigris: #2e6b63;
$verdigris-bright: #4fa89c;

$white: #fff;
$black: #000;

/* Custom properties are raw tokens to Sass, so base colours go in through
   interpolation; mix() and rgba() then run on the literal colour, which
   is what lets the theme's darken/alpha stand-ins be computed here instead
   of hand-copied from a build. Contrast, recomputed for this palette (WCAG 2,
   composited over each mode's page ground):

{{CONTRAST}}

   Re-run _notes/designs/palette-sep15/scripts/emit_sass.py after changing
   a base or a mapping and update this table. */

/* Light palette. A mixin, like the dark one, so the print block at the
   bottom of this file re-applies it instead of carrying a hand-copy. */
@mixin site-light-palette {
  --mm-background-color: #{$paper-96};
  --mm-text-color: #{$ink-33};
  --mm-muted-text-color: {{MUTED}};
  --mm-primary-color: #{$ink-33};
  --mm-border-color: #{$sand-90};
  --mm-footer-background-color: #{$sand-90};
  --mm-link-color: #{$sienna};
  --mm-link-color-hover: #{$sienna-deep};
  --mm-link-color-visited: #{$umber-50};
  --mm-masthead-link-color: #{$ink-33};
  --mm-masthead-link-color-hover: #{$ink-33};
  --mm-navicon-link-color-hover: #{$sand-90};
  --mm-focus-color: #{$ink-33};
  --mm-active-color: #{$gold-tint}; // TOC scrollspy highlight, a pale tint of the quote gold
  --mm-form-background-color: #{$paper-96};
  --mm-code-background-color: #{$paper-99};
  --mm-code-background-color-dark: #{$umber-78};

  /* The theme's Sass calls on these variables, which can't run on a var():
     mix(#000, x, N%) darkens for hover/borders; rgba() for shadows and
     disabled states. Consumed by _navigation, _page, _search, _tables,
     _utilities, _buttons, _notices, _forms and _mixins.scss. */
  --mm-border-color-h00025: #{mix(#000, $sand-90, 25%)};
  --mm-primary-color-h00025: #{mix(#000, $ink-33, 25%)};
  --mm-primary-color-hover: #{mix(#000, $ink-33, 20%)};
  --mm-primary-color-h00010: #{mix(#000, $ink-33, 10%)};
  --mm-primary-color-h00050: #{mix(#000, $ink-33, 50%)};
  --mm-primary-color-alpha-25: #{rgba($ink-33, 0.25)};
  --mm-text-color-alpha-06: #{rgba($ink-33, 0.06)};
  --mm-primary-color-alpha-70: #{rgba($ink-33, 0.7)};
  --mm-muted-text-color-alpha-50: {{MUTED50}};

  /* yiq-contrasted() picks, precomputed: text on accent fills, on a muted
     fill (pager hover), and on the TOC highlight. */
  --mm-on-accent: #{$white};
  --mm-muted-text-color-contrast: #{$white};
  --mm-active-color-contrast: #{$ink-33};

  /* mix($background-color, $notice-color, 80% / 90%) per notice variant.
     No page uses notices, so these stay as precomputed from dirt. */
  --mm-notice-bg-default: #e8e9ea;
  --mm-notice-bg-primary: #cdcdcd;
  --mm-notice-bg-info: #cee2e8;
  --mm-notice-bg-warning: #eddcc3;
  --mm-notice-bg-success: #cfe4cf;
  --mm-notice-bg-danger: #f2d5d5;
  --mm-code-notice-bg-default: #eee;
  --mm-code-notice-bg-primary: #e0e0e0;
  --mm-code-notice-bg-info: #e1eaed;
  --mm-code-notice-bg-warning: #f0e7db;
  --mm-code-notice-bg-success: #e1ebe1;
  --mm-code-notice-bg-danger: #f3e4e4;

  /* This repo's own palette: gold for revealed text, taupe/sepia for the
     apparatus, verdigris for the author's own commentary. */
  --site-quote-gold: #{$gold}; // blockquote.quote border, .num-roman/.num-alpha, #font-size-toggle[aria-pressed]
  --site-src-text: #{$umber-50}; // blockquote.src text, .yt-embed summary, breadcrumb current crumb, quran-return text
  --site-src-border: #{$umber-67}; // blockquote.src / .yt-embed / .quran-return border
  --site-gloss-border: #{$verdigris}; // blockquote.gloss border
  --site-gloss-bg: #{rgba($verdigris, 0.05)}; // blockquote.gloss background wash
  --site-glosskey-bg: #{$sand-92}; // .glossary-key parchment fill -- no rule, so it can't be mistaken for a .gloss panel
  --site-toctitle-bg: #{$gold-tint}; // .toc .nav__title / .toc-disclosure summary fill -- the same pale gold as --mm-active-color
  --site-toctitle-text: #{$umber-38};
  /* TL;DR card (.tldr) -- "gilt edge": lifted paper, a warm hairline
     border, a soft shadow, and a gold fade along the top edge (open card
     only). The full border (no left rule, no indent) is what keeps it from
     reading as a fourth evidence type. */
  --site-tldr-fill: #{$paper-99};
  --site-tldr-line: #{$sand-92};
  --site-tldr-label: #{$sienna};
  --site-tldr-edge: #{$gold}; // the top-edge gold fade; same gold as --site-quote-gold
  --site-tldr-shadow: #{rgba($umber-50, 0.12)};
  --site-breadcrumb-sep: #{$umber-78}; // quran-breadcrumb "›" separator
  --site-return-hover-bg: #{rgba($umber-67, 0.14)}; // quran-return hover background
  --site-floatnav-icon: #{$paper-96}; // #floating-nav button icon color
  --site-floatnav-bg: #{rgba($ink-33, 0.55)}; // #floating-nav button background
  --site-floatnav-border: #{$sand-90}; // #floating-nav button border
  --site-floatnav-shadow: #{rgba($black, 0.3)}; // #floating-nav button box-shadow
  --site-tocbackdrop-bg: #{rgba($ink-33, 0.5)}; // #toc-panel::backdrop

  /* Glossary term hovers (_includes/glossary-key.html + site.js). The tip is
     an inverted dark card here, like a UA tooltip; the underline is a muted
     taupe hairline (decorative, non-text). */
  --site-glossterm-underline: #{$umber-60};
  --site-glosstip-bg: #{$ink-33};
  --site-glosstip-text: #{$paper-96};
  --site-glosstip-border: #5c5445; // kept off the umber ramp by choice (palette decision 6A)

  /* $primary-color does two opposing jobs in the theme's own default
     blockquote rule (background behind white text elsewhere, but a rule
     drawn *on* the page background here) -- decoupled so the dark value can
     differ. */
  --site-blockquote-border-default: #{$ink-33};
}

:root {
  @include site-light-palette;

  /* Mode-invariant: colors that sit on a surface that is dark in *both*
     palettes, so they must not gain a dark-mode value. Defined only here --
     neither palette mixin touches them. */
  --site-poster-ground: #{$night-22};                // .yt-embed frame/poster fill
  --site-poster-scrim: #{rgba($black, 0.28)};        // .yt-embed__poster::after, tames bright thumbnails
  --site-poster-title-scrim: #{rgba($black, 0.75)};  // top of .yt-embed__poster-title's gradient
  --site-poster-text: #{$bone-90};                   // .yt-embed__poster-title
  --site-poster-disc: #{rgba($night-22, 0.72)};      // .yt-embed__poster-play disc
  --site-poster-disc-hover: #{rgba($night-22, 0.85)};
  --site-poster-disc-border: #{rgba($bone-90, 0.3)};
  --site-poster-play: #{$gold-bright};               // play triangle: the lifted gold, on the dark disc
  --site-ondark-gold: #{$gold-bright};               // #floating-font-size-toggle[aria-pressed]: always on a dark translucent disc
}

/* Dark palette: a night version of the same warm, illuminated-manuscript
   scheme, hand-derived from dirt rather than one of the theme's stock dark
   skins.

   $primary-color (umber-50) does the same two opposing jobs as in light: the
   background behind white text (.btn--primary) and the default blockquote
   rule. --site-blockquote-border-default decouples them.

   $active-color (--mm-active-color, the TOC scrollspy highlight) has to stay
   dark enough that yiq-contrasted() still picks white: gold-shade's YIQ is
   well under the 175 threshold. The stock 80% tint would give a near-white
   pill on a dark page.

   Defined once via a mixin and included from both the explicit-choice
   selector and the no-JS system-preference fallback, so the two never drift
   apart from being hand-copied twice. */
@mixin site-dark-palette {
  --mm-background-color: #{$night-22};
  --mm-text-color: #{$bone-84}; // eased down from bone-90 to soften halation of the reading serif on the dark ground
  --mm-muted-text-color: #{$umber-67};
  --mm-primary-color: #{$umber-50};
  --mm-border-color: #{$umber-38};
  --mm-footer-background-color: #{$night-25};
  --mm-link-color: #{$wheat}; // wheat-gold tint, kin to --mm-focus-color
  --mm-link-color-hover: #{$wheat-pale};
  --mm-link-color-visited: #{$umber-74}; // recedes to muted tan
  --mm-masthead-link-color: #{$bone-90};
  --mm-masthead-link-color-hover: #{$bone-90};
  --mm-navicon-link-color-hover: #{$umber-38};
  --mm-focus-color: #{$gold-bright}; // $primary-color is only 2:1 here -- not a visible focus ring
  --mm-active-color: #{$gold-shade}; // TOC scrollspy highlight: the lifted gold at half strength on the ground
  --mm-form-background-color: #{$night-25};
  --mm-code-background-color: #{$night-25};
  --mm-code-background-color-dark: #{$night-22};

  --mm-border-color-h00025: #{mix(#000, $umber-38, 25%)};
  --mm-primary-color-h00025: #{mix(#000, $umber-50, 25%)};
  --mm-primary-color-hover: #{mix(#000, $umber-50, 20%)};
  --mm-primary-color-h00010: #{mix(#000, $umber-50, 10%)};
  --mm-primary-color-h00050: #{mix(#000, $umber-50, 50%)};
  --mm-primary-color-alpha-25: #{rgba($umber-50, 0.25)};
  --mm-text-color-alpha-06: #{rgba($bone-84, 0.06)};
  --mm-primary-color-alpha-70: #{rgba($umber-50, 0.7)};
  --mm-muted-text-color-alpha-50: #{rgba($umber-67, 0.5)};
  --mm-on-accent: #{$white};
  --mm-muted-text-color-contrast: #{$white};
  --mm-active-color-contrast: #{$white};
  --mm-notice-bg-default: #3c3b3a;
  --mm-notice-bg-primary: #2d2821;
  --mm-notice-bg-info: #223438;
  --mm-notice-bg-warning: #412e13;
  --mm-notice-bg-success: #23361f;
  --mm-notice-bg-danger: #462825;
  --mm-code-notice-bg-default: #2c2b28;
  --mm-code-notice-bg-primary: #24211c;
  --mm-code-notice-bg-info: #1f2727;
  --mm-code-notice-bg-warning: #2f2415;
  --mm-code-notice-bg-success: #20281b;
  --mm-code-notice-bg-danger: #31211e;

  --site-quote-gold: #{$gold-bright}; // dirt's light gold reads muddy on a dark ground; lifted
  --site-src-text: #{$umber-74};
  --site-src-border: #{$umber-60};
  --site-gloss-border: #{$verdigris-bright};
  --site-gloss-bg: #{rgba($verdigris-bright, 0.08)};
  --site-glosskey-bg: #{$night-25};
  --site-toctitle-bg: #{$night-29}; // a sand-toned bar a step above the ground
  --site-toctitle-text: #{$bone-84};
  /* .tldr card, dark: a raised card a step above the ground, a deeper
     shadow to lift it. */
  --site-tldr-fill: #{$night-25};
  --site-tldr-line: #3a342b; // softer than the border colour, kept by choice (palette decision 4A)
  --site-tldr-label: #{$gold-bright};
  --site-tldr-edge: #{$gold-bright};
  --site-tldr-shadow: #{rgba($black, 0.45)};
  --site-breadcrumb-sep: #{$umber-50};
  --site-return-hover-bg: #{rgba($umber-60, 0.18)};
  --site-floatnav-icon: #{$bone-90};
  --site-floatnav-bg: #{rgba($night-29, 0.55)};
  --site-floatnav-border: #{$umber-50};
  --site-floatnav-shadow: #{rgba($black, 0.6)};
  --site-tocbackdrop-bg: #{rgba($black, 0.65)};
  --site-glossterm-underline: #{$umber-74};
  --site-glosstip-bg: #{$night-29}; // #gloss-tip card -- raised above the page ground, not inverted
  --site-glosstip-text: #{$bone-90};
  --site-glosstip-border: #{$umber-50};
  --site-blockquote-border-default: #6b6152; // 2.9:1, under the 3:1 non-text minimum; kept faint by choice (palette decision 5A)
}
