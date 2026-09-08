/* ==========================================================================
   Site JS
   ==========================================================================

   Custom JS for this site, moved out of the <script> blocks that used to be
   inlined into every page via _includes/footer/custom.html (P1-3 in the site
   audit: ~37 KB of identical JS repeated verbatim on every one of the 13
   pages, uncacheable).

   P1-5 (audit) then dropped the theme's jQuery bundle (main.min.js --
   jQuery + fitvids + magnific-popup + throttle-debounce + smooth-scroll +
   greedy-navigation + gumshoe, 124 KB / 42.7 KB gzipped) entirely: this
   site's own JS was already vanilla, and jQuery was there only to run that
   bundle. Only the pieces this site actually used got reimplemented --
   Gumshoe (below, a line-for-line port), the theme's header-permalink
   anchors (below), and a ~30-line stand-in for GreedyNav (below, NOT a
   port -- see its own comment for why the naive "ship nothing, the toggle
   and dropdown already carry `.hidden`" plan turned out to be wrong).
   fitvids, magnific-popup and throttle-debounce were dead code (no
   matching elements anywhere in the built site -- no static iframe/video,
   no `.image-popup` targets, and _main.js never even called
   throttle-debounce). SmoothScroll became a plain CSS `scroll-behavior:
   smooth` + `scroll-padding-top` in site.scss (the masthead is `position:
   relative`, not fixed, so no extra offset is needed for anything
   scrolling under it). See theme_internals.md for the scrollspy diff
   verification.

   This file's own script tag is now the only one in footer_scripts
   (_config.yml) -- ordering within THIS file is what matters instead:
   the scrollspy's own first detect() runs synchronously and dispatches
   `gumshoeActivate`, so anything that listens for it (the floating-nav
   IIFE just below) must be defined earlier in this same file, which it is.

   Everything below the P1-3 relocation comment is a pure relocation --
   nothing in it has been reordered, renamed, or rewritten. The pre-paint
   theme/font-size toggle bootstrap scripts and the quran_section breadcrumb
   script stay inline in the two custom.html includes (see the header
   comment in assets/css/site.scss for why). */

/* --------------------------------------------------------------------------
   Nav-link overflow (P1-5: replaces the theme's GreedyNav plugin)
   -------------------------------------------------------------------------- */

  /* _data/navigation.yml holds exactly one link, so GreedyNav's own job --
     incrementally measuring and moving links one at a time to fit as many
     as possible -- is more than this site ever needs: the only question is
     whether that ONE link fits at all. Everything below is that binary
     check, not a port of the plugin.

     _includes/masthead.html's own comment (accurate when written) argued
     this could never overflow because GreedyNav doesn't know about the two
     appearance toggle buttons it added and so overestimates available
     space by their combined width. That comment turned out to be wrong at
     narrow widths once GreedyNav itself was removed: at 375px the link
     doesn't just fail to fit, it renders ~135px into the site title's own
     space (`.visible-links` is flex:1 with `justify-content: flex-end`, so
     overflow spills past the container's START edge, not its end -- content
     `scrollWidth` doesn't register that direction of overflow, which is why
     this measures the link's own natural width against the container's
     box instead of using a scrollWidth check). Confirmed side-by-side
     against the theme's own GreedyNav output at 375/768/1280px -- see
     theme_internals.md. */
  (function () {
    var nav = document.querySelector("nav.greedy-nav");
    if (!nav) return;

    var vlinks = nav.querySelector(".visible-links");
    var hlinks = nav.querySelector(".hidden-links");
    var toggle = nav.querySelector(".greedy-nav__toggle");
    if (!vlinks || !hlinks || !toggle || !vlinks.children.length) return;

    function naturalWidth() {
      var w = 0;
      var items = vlinks.children;
      for (var i = 0; i < items.length; i++) w += items[i].offsetWidth;
      return w;
    }

    function check() {
      // Reset to "all visible" before each measurement -- offsetWidth on an
      // item already sitting in the hidden, display:none dropdown is 0, so
      // measuring from there would always read as "fits".
      hlinks.classList.add("hidden");
      toggle.classList.remove("close");
      while (hlinks.firstElementChild) vlinks.appendChild(hlinks.firstElementChild);

      if (naturalWidth() > vlinks.clientWidth) {
        while (vlinks.firstElementChild) hlinks.appendChild(vlinks.firstElementChild);
        toggle.classList.remove("hidden");
      } else {
        toggle.classList.add("hidden");
      }
    }

    toggle.addEventListener("click", function () {
      hlinks.classList.toggle("hidden");
      toggle.classList.toggle("close");
    });

    // Dismiss on an outside click/tap, same as GreedyNav's own hidden-links
    // click/mouseleave handling -- simplified to one listener since there's
    // no hover-intent close timer to replicate for a single link.
    document.addEventListener("click", function (e) {
      if (hlinks.classList.contains("hidden")) return;
      if (e.target.closest(".hidden-links") || e.target === toggle || toggle.contains(e.target)) return;
      hlinks.classList.add("hidden");
      toggle.classList.remove("close");
    });

    window.addEventListener("resize", check);
    check();
  })();

/* --------------------------------------------------------------------------
   Floating navigation / TOC drawer (from _includes/footer/custom.html)
   -------------------------------------------------------------------------- */

  (function () {
    var nav = document.getElementById("floating-nav");
    var topBtn = document.getElementById("back-to-top");
    var tocBtn = document.getElementById("toc-toggle");
    var prevBtn = document.getElementById("prev-section");
    var nextBtn = document.getElementById("next-section");
    if (!nav) return;

    var body = document.body;
    var sourceToc = document.querySelector(".sidebar__right .toc");
    var panel = null;
    var drawer = null;

    function reduceMotion() {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    /* --- collapse the h2 sections and the h3 groups inside them ---

       Runs on the real sidebar TOC before the drawer clone below copies its
       innerHTML, so both the desktop sticky sidebar and the mobile drawer
       pick up the same collapsed markup for free. A single delegated click
       listener (bottom of this function) handles toggles in both copies,
       since innerHTML cloning doesn't carry event listeners along with it.

       Collapsing is by the `hidden` attribute, not a CSS rule -- the UA
       stylesheet's `[hidden] { display: none }` does the hiding, which is
       why nothing here or in head/custom.html needs a display rule to
       match. Anything that inspects TOC state must read `.hidden`, not
       the document's own stylesheets. */
    function decorateList(list) {
      var items = Array.prototype.slice.call(list.children);
      for (var i = 0; i < items.length; i++) {
        var li = items[i];
        var link = li.querySelector(":scope > a");
        var submenu = li.querySelector(":scope > ul");
        if (!link || !submenu) continue;

        var row = document.createElement("div");
        row.className = "toc__heading-row";
        li.insertBefore(row, link);
        row.appendChild(link);

        var toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "toc__toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Toggle " + link.textContent.trim() + " section");
        toggle.innerHTML =
          '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">' +
          '<path d="M7 10 L12 15 L17 10" fill="none" stroke="currentColor" ' +
          'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>';
        row.appendChild(toggle);

        li.classList.add("is-collapsed");
        submenu.hidden = true;
      }
    }

    /* Two levels, because a page with many h3s under one h2 (quran.md) fills
       the whole sidebar the moment its h2 opens. Grouping those h3s and
       collapsing them too means only the group the reader is actually in
       shows its h4s.

       The second pass reads `:scope > li > ul` *after* the first has run,
       which is safe: decorateList moves only the <a> into the new row, so
       the submenu stays a direct child of its <li>. An <li> with no
       submenu -- an h3 with no h4s under it -- gets no row and no chevron
       and stays a plain link. */
    function makeCollapsible(tocNav) {
      var topMenu = tocNav.querySelector(".toc__menu");
      if (!topMenu) return;

      decorateList(topMenu);

      var subLists = topMenu.querySelectorAll(":scope > li > ul");
      for (var i = 0; i < subLists.length; i++) decorateList(subLists[i]);
    }

    /* A click toggles unless it lands on the heading text itself (the <a>,
       sized to its own text -- see the CSS above), which navigates as
       normal. That covers the toggle button and the empty strip between
       the text and the button, both of which belong to the row, not to
       the link. */
    document.addEventListener("click", function (e) {
      var row = e.target.closest(".toc__heading-row");
      if (!row || e.target.closest("a")) return;

      var li = row.parentElement;
      var submenu = li.querySelector(":scope > ul");
      if (!submenu) return;

      var collapsed = li.classList.toggle("is-collapsed");
      submenu.hidden = collapsed;
      var toggle = row.querySelector(".toc__toggle");
      if (toggle) toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });

    /* --- open the section the reader is currently in, collapse the rest ---

       Gumshoe (the theme's scrollspy) bubbles a `gumshoeActivate` event up
       from whichever <li> it marks .active -- for every heading level it
       tracks, not just the top ones (`nested: false` in the theme's own
       init, so h3 activation doesn't also mark its parent h2). Walking up
       from that <li> to its ancestors in .toc__menu gives the chain of
       sections the reader is inside; each one opens and its siblings at
       that level collapse. Two levels deep now, so landing in an h4 opens
       its h2 *and* its h3 group while every other group stays shut.

       Gumshoe activates the h4 directly, not its h3 group heading -- which
       is also why the chain walk, rather than the h3 being active, is what
       drives this: a bare `### Group` immediately followed by `#### Sub`
       has almost no scroll height and is rarely the active item. */
    function setOpenSibling(list, activeLi) {
      var items = list.children;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var submenu = item.querySelector(":scope > ul");
        if (!submenu) continue; // not collapsible, nothing to do

        var open = item === activeLi;
        item.classList.toggle("is-collapsed", !open);
        submenu.hidden = !open;
        var toggle = item.querySelector(":scope > .toc__heading-row > .toc__toggle");
        if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    }

    function expandActiveSection(tocRoot, activeLink) {
      var topMenu = tocRoot.querySelector(".toc__menu");
      if (!topMenu || !activeLink) return;

      /* outermost first. The `contains` guard keeps a link from the drawer
         clone (a separate DOM tree) from producing a bogus chain. */
      var chain = [];
      var li = activeLink.closest("li");
      while (li && topMenu.contains(li)) {
        chain.unshift(li);
        li = li.parentElement && li.parentElement.closest("li");
      }
      if (!chain.length) return;

      var list = topMenu;
      for (var d = 0; d < chain.length; d++) {
        setOpenSibling(list, chain[d]);
        list = chain[d].querySelector(":scope > ul");
        if (!list) break;
      }

      /* Anything below where the chain ran out closes. Without this,
         arriving at an h2 heading (a chain of one) reopens that section
         with whichever h3 group was last expanded still open, rather than
         at its own top level. Passing no active item collapses them all. */
      if (list) setOpenSibling(list, null);
    }

    if (sourceToc) makeCollapsible(sourceToc);

    /* Flat, document-order list of every TOC link at every heading level --
       what #prev-section / #next-section below step through. querySelectorAll
       walks the tree in document order regardless of nesting, so this is
       already h2/h3/h4 interleaved correctly without any manual sorting. */
    var tocLinks = sourceToc
      ? Array.prototype.slice.call(sourceToc.querySelectorAll(".toc__menu a[href]"))
      : [];
    var activeIndex = -1;

    function updateSectionButtons() {
      if (!prevBtn || !nextBtn) return;
      prevBtn.disabled = activeIndex <= 0;
      nextBtn.disabled = activeIndex !== -1 && activeIndex >= tocLinks.length - 1;
    }

    /* $large -- below this, sourceToc is not the sticky sidebar but an
       inline block sitting in normal document flow near the top of the
       article. Its own height participates in page layout there, so
       collapsing/expanding it while the reader is scrolled well past it
       shifts every line below by the height delta: a visible jump that
       fights the reader's own momentum scroll, worst exactly when a
       heading crosses the activation threshold. The sticky sidebar is a
       separate column at $large and up, so its height changes don't move
       the article -- auto-expand is safe there and left as is. */
    var isSidebarLayout = window.matchMedia("(min-width: 64em)");

    /* At $large and up, the button column anchors to the sidebar TOC's own
       right edge instead of the stylesheet's plain `right: 1rem` (which
       pins it to the viewport edge -- on anything wider than the page's
       own max-width that leaves it stranded in empty margin, far from the
       TOC it operates on). This used to be computed here on load and on
       every `resize` via two forced-layout reads (`sourceToc`'s and
       `nav`'s `getBoundingClientRect()`), which is more than the geometry
       needs: `.sidebar__right`'s right edge is a pure function of the
       page's own max-width and #main's padding, both fixed values from
       the theme's compiled CSS, not anything that has to be measured at
       runtime. It's expressed directly in CSS now -- see the `#floating-nav`
       rule in site.scss for the derivation. Nothing here needs to run on
       resize any more. */

    /* Registered before scripts.html loads main.min.js further down the
       page, so this is in place before the theme's own Gumshoe init runs
       its first, synchronous detect() -- the event this listens for is not
       missed on initial load.

       The theme's own smoothScroll plugin animates every `a[href*="#"]`
       click over up to ~500ms (durationMax), and Gumshoe re-runs detect() on
       every intermediate scroll frame of that animation -- so a single TOC
       jump activates every heading it passes on the way, each one
       synchronously opening and closing its collapsible group as the
       animation flies past it. Debouncing expandActiveSection (not the
       activeIndex/button update above, which is cheap and fine to track
       live) means only the *final*, settled heading actually restructures
       the DOM -- 180ms of quiet after the last activation is comfortably
       past any real jump. Below $large the call is skipped entirely; see
       isSidebarLayout above. A reader can still open any section by hand --
       only the automatic follow-the-scroll behaviour is disabled. */
    var expandTimer = null;
    if (sourceToc) {
      document.addEventListener("gumshoeActivate", function (e) {
        var link = e.detail && e.detail.link;
        activeIndex = tocLinks.indexOf(link);
        updateSectionButtons();

        if (!isSidebarLayout.matches) return;

        window.clearTimeout(expandTimer);
        expandTimer = window.setTimeout(function () {
          expandActiveSection(sourceToc, link);
        }, 180);
      });
    }

    /* --- prev / next section: step through the same flat link list,
       reusing whichever link the reader would have clicked in the TOC
       itself, so the jump goes through the theme's own smoothScroll plugin
       and the debounce above exactly as a TOC click would. */
    function goToSection(index) {
      if (index < 0 || index >= tocLinks.length) return;
      tocLinks[index].click();
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (activeIndex > 0) goToSection(activeIndex - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (activeIndex === -1) goToSection(0);
        else if (activeIndex < tocLinks.length - 1) goToSection(activeIndex + 1);
      });
    }

    updateSectionButtons();

    /* --- build the panel from a clone; the page's own TOC is never touched --- */

    if (!sourceToc) {
      // home and about have no TOC; hide that button and keep back-to-top
      nav.classList.add("no-toc");
    } else {
      /* A <nav> that does NOT carry the `toc` class, wrapping a div that
         does. Both halves are load-bearing:

         - It must be a <nav>. `_base.scss` scopes the list reset to `nav`
           — `li { list-style: none }`, `a { text-decoration: none }`,
           `ul { margin: 0; padding: 0 }`. Any other element and the menu
           comes back with bullets, underlines and a browser's default
           indent.
         - The <nav> must not match `nav.toc a`. The theme drives its
           scrollspy with `new Gumshoe("nav.toc a")`, and Gumshoe resolves
           duplicate links to the *last* match in document order, so a
           cloned <nav class="toc"> steals the highlight from the real TOC
           and keeps it even at desktop width, where the panel is
           `display: none` and the sticky sidebar is the only one on screen.

         Holding `toc` on the inner div satisfies both, since the theme's
         `.toc` rules never mention the element they sit on. */
      drawer = document.createElement("nav");
      drawer.id = "toc-drawer";
      drawer.setAttribute("aria-label", "Table of contents");

      var tocBox = document.createElement("div");
      tocBox.className = sourceToc.className;
      tocBox.innerHTML = sourceToc.innerHTML;
      drawer.appendChild(tocBox);

      /* A real <dialog>, opened with showModal(). That hands the platform
         the focus trap, background inertness (aria-modal + inert, both
         applied by the browser -- never add them by hand, see the comment
         on openDrawer below), Escape-to-close, ::backdrop and top-layer
         rendering that the old hand-built div/backdrop pair had to fake or
         went without. `closedby="any"` gives light-dismiss (a tap on the
         backdrop) natively where supported; the click listener below is
         the fallback for engines that don't have it yet. */
      panel = document.createElement("dialog");
      panel.id = "toc-panel";
      panel.setAttribute("closedby", "any");
      panel.appendChild(drawer);
      body.appendChild(panel);

      tocBtn.setAttribute("aria-controls", "toc-drawer");

      var header = drawer.querySelector("header");
      if (header) {
        var closeBtn = document.createElement("button");
        closeBtn.id = "toc-close";
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Close table of contents");
        closeBtn.innerHTML =
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
          '<path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" ' +
          'stroke-width="2.2" stroke-linecap="round" /></svg>';
        closeBtn.addEventListener("click", function () {
          closeDrawer(true);
        });
        header.appendChild(closeBtn);
      }

      // jumping to a heading should dismiss the panel
      drawer.addEventListener("click", function (e) {
        if (e.target.closest("a")) closeDrawer(false);
      });

      /* Fallback light-dismiss for engines without `closedby`. A click
         whose event target IS the dialog element itself (rather than
         something inside it) landed on the backdrop: a modal <dialog>'s
         rendered box is only its content, but the UA still resolves a
         click anywhere in the dialog's allocated (fixed) rectangle -- the
         backdrop included -- to the dialog element when nothing inside it
         was hit. `drawer` fills the dialog's padding box completely (see
         the CSS), so there is no dead space inside #toc-panel that isn't
         part of `drawer` for this to misfire on. */
      panel.addEventListener("click", function (e) {
        if (e.target === panel) closeDrawer(true);
      });

      /* Escape and (where supported) `closedby="any"` backdrop clicks both
         request a close via the `cancel` event before the dialog would
         close itself. Taking it over and routing it through closeDrawer
         keeps a single close path -- aria-expanded, focus return, and (via
         the CSS) the slide-out transition all run the same way regardless
         of what triggered the close. */
      panel.addEventListener("cancel", function (e) {
        e.preventDefault();
        closeDrawer(true);
      });
    }

    /* --- show / hide the buttons on scroll --- */

    var shown = false;
    var ticking = false;
    var masthead = document.querySelector(".masthead");

    /* Hysteresis, not a single threshold: a bare edge flips back and forth
       (each flip replaying the 0.2s show/hide transition) whenever the
       scroll position sits right on it -- rubber-band overscroll, or (on
       the innerHeight-based branch below) `innerHeight` itself changing as
       a mobile address bar collapses. */
    function update() {
      ticking = false;
      var should;

      if (isSidebarLayout.matches && masthead) {
        /* Desktop: appear the moment the masthead itself scrolls out of
           view, not after a further scroll to a full viewport height --
           the sidebar TOC these buttons act on is already on screen by
           then, so waiting served no purpose. `bottom <= 0` is the
           masthead fully gone; re-hiding waits until 40px of it has
           scrolled back into view, the dead zone that prevents flicker
           right at the edge. */
        var mastBottom = masthead.getBoundingClientRect().bottom;
        should = shown ? mastBottom <= 40 : mastBottom <= 0;
      } else {
        /* Mobile/tablet: no fixed masthead-height relationship worth
           trusting across breakpoints and address-bar resizes, so this
           keeps the original viewport-height threshold. Shown state needs
           to climb past a full viewport height to appear, but only has to
           drop back below 80% of one to disappear. */
        var y = window.pageYOffset;
        var threshold = window.innerHeight * (shown ? 0.8 : 1);
        should = y > threshold;
      }

      if (should !== shown) {
        shown = should;
        nav.classList.toggle("is-visible", shown);
      }
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    /* --- open / close ---

       `panel.open` (native to <dialog>) is the single source of truth for
       open state now -- no more `.is-open` class to keep in sync with it. */

    function isOpen() {
      return !!panel && panel.open;
    }

    // focusing inside a fixed panel will scroll the document unless asked not
    // to, which is exactly the lurch this whole approach exists to avoid
    function focusQuietly(el) {
      try {
        el.focus({ preventScroll: true });
      } catch (e) {
        el.focus();
      }
    }

    /* The scroll lock. showModal()'s focus trap already stops keyboard
       scrolling from reaching the document -- arrow/space/page keys only
       scroll whatever has focus or its nearest scrollable ancestor, and
       focus can't leave the dialog while it's modal. Wheel input doesn't
       depend on focus, though, and isn't reliably absorbed by ::backdrop
       across engines, so it still needs an explicit block. `touch-action:
       none` on ::backdrop (see the CSS) covers touch panning the same way
       the old #toc-backdrop did.

       Not the theme's `overflow--hidden` body class, for the same reason
       as before: `overflow: hidden` on <body> establishes a block
       formatting context, and reflowing the theme's layout under it
       shortens the page by well over a thousand pixels -- the reader would
       watch the article jump to another section right as the drawer opens. */
    function blockWheel(e) {
      if (e.target.closest && e.target.closest(".toc__menu")) return; // let the drawer's own list scroll
      e.preventDefault();
    }

    /* Copy the scrollspy's current highlight from the real TOC onto the
       clone. Doing it once per open is enough: the backdrop blocks scrolling
       while the panel is up, so the reader cannot leave the section. */
    function syncActive() {
      if (!drawer || !sourceToc) return;

      var stale = drawer.querySelectorAll(".active");
      for (var i = 0; i < stale.length; i++) stale[i].classList.remove("active");

      var current = sourceToc.querySelector("li.active > a, li.active a");
      if (!current) return;

      var href = current.getAttribute("href");
      var links = drawer.querySelectorAll("a[href]");
      for (var j = 0; j < links.length; j++) {
        if (links[j].getAttribute("href") !== href) continue;
        var li = links[j].closest("li");
        if (li) li.classList.add("active");
        expandActiveSection(drawer, links[j]);
        return;
      }
    }

    function openDrawer() {
      if (!panel || isOpen()) return;
      syncActive();

      panel.showModal(); // supplies the focus trap, aria-modal, ::backdrop and top-layer rendering
      document.addEventListener("wheel", blockWheel, { passive: false });

      tocBtn.setAttribute("aria-expanded", "true");
      drawer.setAttribute("tabindex", "-1");
      /* showModal() moves focus itself (to the dialog, in the absence of an
         [autofocus] element) and that default move is not guaranteed to be
         scroll-safe, so this overrides it with the same preventScroll focus
         used everywhere else here. */
      focusQuietly(drawer);
    }

    function closeDrawer(returnFocus) {
      if (!panel || !isOpen()) return;

      /* panel.close() removes the `open` attribute immediately, which is
         also what the CSS keys the slide-out transform off of --
         `transition-behavior: allow-discrete` on `display`/`overlay` (see
         the CSS) is what holds the dialog in the top layer for exactly as
         long as that transform transition runs, so there is no JS timer
         here duplicating the transition's duration the way the old
         backdrop-unmount setTimeout did. */
      panel.close();
      document.removeEventListener("wheel", blockWheel);

      tocBtn.setAttribute("aria-expanded", "false");
      drawer.removeAttribute("tabindex");

      if (returnFocus) focusQuietly(tocBtn);
    }

    tocBtn.addEventListener("click", function () {
      if (isOpen()) closeDrawer(true);
      else openDrawer();
    });

    // the panel only exists below $large; don't let it linger past a rotate.
    // Also the guard against a modal <dialog> whose computed display drops
    // to `none` (the $large media query, in the CSS) while it is still
    // open -- browsers vary on how gracefully that's handled on its own,
    // so this closes it explicitly first.
    window.addEventListener("resize", function () {
      if (isOpen() && window.innerWidth >= 1024) closeDrawer(false);
    });

    /* --- back to top --- */

    topBtn.addEventListener("click", function () {
      closeDrawer(false);
      window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
    });

    update();
  })();

/* --------------------------------------------------------------------------
   yt-embed mount/unmount (from _includes/footer/custom.html)
   -------------------------------------------------------------------------- */

  (function () {
    /* Flip to true for the click-to-play thumbnail facade described above.
       Nothing else needs to change: the poster's CSS is already in
       _includes/head/custom.html, and autoplay rides along with it, since
       the player is then mounted inside a real click and so has the user
       activation that autoplay requires. */
    var USE_POSTER = false;

    /* `toggle` is queued, not synchronous, so between a box opening and
       this script hearing about it the browser can lay out and paint an
       open frame that nothing has collapsed yet -- one frame of the
       fallback link at its natural height, which the reader sees as the
       page twitching before the box grows. This class is what lets the CSS
       collapse that state, and it is set from script precisely so that a
       reader without JS, who has nothing but that link, still sees it. */
    document.documentElement.classList.add("yt-embed-js");

    var PLAYER_ALLOW =
      "accelerometer; autoplay; clipboard-write; encrypted-media; " +
      "gyroscope; picture-in-picture; web-share";

    var THUMB = "https://i.ytimg.com/vi/";

    /* Matches the CSS. The close has to run for exactly as long as the
       open, or the two stop cancelling out -- see below. */
    var GROW_MS = 280;

    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)");

    function buildPlayer(frame, id, title, autoplay) {
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(id) + (autoplay ? "?autoplay=1" : "");
      iframe.title = title;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allow = PLAYER_ALLOW;
      iframe.allowFullscreen = true;
      iframe.setAttribute("frameborder", "0");
      return iframe;
    }

    function buildPoster(frame, id, title) {
      var poster = document.createElement("button");
      poster.type = "button";
      poster.className = "yt-embed__poster";
      poster.setAttribute("aria-label", "Play: " + title);

      /* maxresdefault is 16:9 and the sharpest, but is not generated for
         every video; hqdefault always exists, at 4:3 with letterbox bars
         that the CSS crops off. If both fail -- a content blocker, or an
         unlisted video -- the image is dropped and the poster falls back
         to the panel it is drawn on. */
      var img = document.createElement("img");
      img.className = "yt-embed__poster-img";
      img.alt = ""; // decorative: the button's aria-label already names it
      img.setAttribute("width", "1280");
      img.setAttribute("height", "720");
      img.onerror = function () {
        if (img.src.indexOf("maxresdefault") !== -1) {
          img.src = THUMB + encodeURIComponent(id) + "/hqdefault.jpg";
        } else {
          img.remove();
        }
      };
      img.src = THUMB + encodeURIComponent(id) + "/maxresdefault.jpg";

      var play = document.createElement("span");
      play.className = "yt-embed__poster-play";

      var caption = document.createElement("span");
      caption.className = "yt-embed__poster-title";
      caption.appendChild(document.createTextNode(title));

      poster.appendChild(img);
      poster.appendChild(play);
      poster.appendChild(caption);

      poster.addEventListener("click", function () {
        if (frame.querySelector("iframe")) return;

        /* autoplay=1 takes only because this runs inside a real click: the
           activation is what lets the delegated permission through. The
           same mount from the toggle handler would be blocked, and the
           reader would face a paused player they have to click again.

           Inserted UNDER the poster, which then fades rather than being
           torn away, so the player's white-then-black load happens behind
           an opaque panel. */
        frame.insertBefore(buildPlayer(frame, id, title, true), poster);
        poster.classList.add("is-dismissed");
      });

      return poster;
    }

    /* Closing a <details> is instant and unanimatable: the content is gone
       the moment `open` clears, so there is nothing left to shrink. The
       close therefore has to be run BEFORE the state changes, which means
       intercepting the click on the summary, animating, and only then
       letting the box close.

       This is also what keeps the page from lurching when one box is
       swapped for another. The closing box shrinks over exactly as long as
       the opening one grows, on the same curve read the same way round --
       so at every instant one has lost precisely what the other has gained
       and the document's total height does not move. Reverse the easing on
       one of them and that cancellation is lost. */
    function closeSmoothly(details) {
      var frame = details.querySelector(".yt-embed__frame");

      if (!frame || !frame.classList.contains("is-loaded") ||
          (reduced && reduced.matches)) {
        details.open = false;
        return;
      }

      if (frame.classList.contains("is-closing")) return; // already going

      frame.classList.add("is-closing");

      var done = false;
      var finish = function () {
        if (done) return;
        done = true;

        /* Close FIRST and let the teardown branch drop `is-closing` with
           everything else. Removing it here instead leaves a box that is
           still open with only `is-loaded` on it -- which is the full
           56.25% -- so the collapsed frame springs back to full height for
           the one frame before `open` clears. */
        details.open = false; // fires `toggle`, which tears the player down
      };

      frame.addEventListener("animationend", finish, { once: true });
      setTimeout(finish, GROW_MS + 120); // in case the animation never runs
    }

    /* A click on the summary of an OPEN box is a close request, and the
       browser would grant it instantly. Take it over. A reader who clicks
       again mid-close is ignored rather than cancelled: the box finishes
       closing and reopens on the next click, which over 0.28s is not worth
       the bookkeeping a real cancel would need. */
    document.addEventListener("click", function (e) {
      if (!e.target.closest) return;

      var summary = e.target.closest("details.yt-embed > summary");
      if (!summary) return;

      var details = summary.parentNode;
      if (!details.open) return; // opening: nothing to animate away

      e.preventDefault();
      closeSmoothly(details);
    });

    document.addEventListener("toggle", function (e) {
      var details = e.target;
      if (!details.classList || !details.classList.contains("yt-embed")) return;

      var frame = details.querySelector(".yt-embed__frame");
      if (!frame) return;

      if (!details.open) {
        /* Teardown is the point of the exercise, not tidiness: leaving the
           players mounted lets a reader who works down the page rebuild the
           exact pile of iframes this whole approach exists to avoid. It also
           stops the audio, which a reader closing the box plainly wants.
           Removing exactly the injected elements, rather than emptying the
           frame, is what leaves the include's own fallback <a> in place
           with its original href. */
        var mounted = frame.querySelectorAll("iframe, .yt-embed__poster");
        for (var j = 0; j < mounted.length; j++) mounted[j].remove();

        frame.classList.remove("is-loaded", "is-closing");
        return;
      }

      if (frame.querySelector("iframe, .yt-embed__poster")) return; // built

      /* One box at a time: opening this one closes the rest. <details>
         elements are otherwise independent, and a reader working down the
         page would leave a trail of open boxes behind them. This is also
         what keeps at most one player alive, since a player can only exist
         inside an open box. Routed through closeSmoothly so the shrink
         runs against this box's growth rather than after it. */
      var open = document.querySelectorAll("details.yt-embed[open]");
      for (var i = 0; i < open.length; i++) {
        if (open[i] !== details) closeSmoothly(open[i]);
      }

      var id = details.getAttribute("data-yt-id");
      if (!id) return; // no ID parsed -- leave the fallback link in place

      var title = details.getAttribute("data-yt-title") || "YouTube video";

      frame.appendChild(USE_POSTER
        ? buildPoster(frame, id, title)
        : buildPlayer(frame, id, title, false));

      frame.classList.add("is-loaded");
    }, true);
  })();

/* --------------------------------------------------------------------------
   Heading permalink anchors (P1-5: ported from the theme's _main.js)
   -------------------------------------------------------------------------- */

  /* Was already plain DOM code inside _main.js's $(document).ready wrapper
     -- nothing here needed jQuery, so this is a straight move, not a
     rewrite. Runs on every heading with an id (kramdown auto-generates one
     for every h1-h6) inside .page__content, appending a "#" permalink icon
     the theme's own CSS already styles (`.header-link`). */
  (function () {
    var pageContentElement = document.querySelector(".page__content");
    if (!pageContentElement) return;

    pageContentElement
      .querySelectorAll("h1, h2, h3, h4, h5, h6")
      .forEach(function (element) {
        var id = element.getAttribute("id");
        if (!id) return;
        var anchor = document.createElement("a");
        anchor.className = "header-link";
        anchor.href = "#" + id;
        anchor.innerHTML =
          '<span class="sr-only">Permalink</span><i class="fas fa-link"></i>';
        anchor.title = "Permalink";
        element.appendChild(anchor);
      });
  })();

/* --------------------------------------------------------------------------
   Scrollspy (P1-5: replaces the theme's Gumshoe plugin from main.min.js)
   -------------------------------------------------------------------------- */

  /* A line-for-line port of gumshoejs v5.1.1's algorithm (MIT, Chris
     Ferdinandi), not an approximation. This has to reproduce Gumshoe's
     contract exactly: the floating-nav IIFE above listens for
     `gumshoeActivate` and reads `e.detail.link`, `.toc .active a` /
     `.toc .active > .toc__heading-row` in site.scss key off `.active` on
     the <li>, and the drawer clone in the IIFE above is deliberately a
     `<nav>` that does NOT match `nav.toc a` so it can't steal the
     highlight -- see theme_internals.md. An IntersectionObserver
     approximation would diverge from Gumshoe exactly at the edge cases
     that matter (the null/no-active state at the top of the page, the
     forced-last-item case at the bottom); Gumshoe itself is a plain
     scroll+rAF scan, so replicating that algorithm is neither slower nor
     riskier than approximating it.

     MUST run after the floating-nav IIFE above: this spy's very first
     detect() (below) runs synchronously, and it dispatches the
     `gumshoeActivate` that IIFE listens for -- the listener has to already
     be registered, which it is, having executed earlier in this same
     script. (The _config.yml comment ordering site.js before
     main.min.js documented the opposite requirement for the theme's own
     Gumshoe init; now that Gumshoe is gone, ordering within this single
     file is what matters instead.) */

  (function () {
    var navItems = Array.prototype.slice.call(document.querySelectorAll("nav.toc a"));
    if (!navItems.length) return; // pages without a TOC (home, about)

    // Offset from the top of the viewport at which a heading counts as
    // "reached". Keep this the same number as `scroll-padding-top` in
    // site.scss so the heading a reader jumps to is also the one that
    // lights up on arrival.
    var OFFSET = 20;

    var items = []; // { nav: <a>, content: <heading> } pairs
    navItems.forEach(function (a) {
      if (!a.hash) return;
      var id;
      try {
        id = decodeURIComponent(a.hash.substr(1));
      } catch (e) {
        return; // malformed fragment -- skip rather than take the whole spy down
      }
      var content = document.getElementById(id);
      if (content) items.push({ nav: a, content: content });
    });
    if (!items.length) return;

    function offsetTop(el) {
      var y = 0;
      while (el) {
        y += el.offsetTop;
        el = el.offsetParent;
      }
      return y >= 0 ? y : 0;
    }

    // Sort content areas top-to-bottom in the document, same as Gumshoe's
    // sortContents -- needed because CSS order and DOM order can differ,
    // and this is re-run on resize (Gumshoe's `reflow: true`).
    function sortItems() {
      items.sort(function (a, b) { return offsetTop(a.content) - offsetTop(b.content); });
    }
    sortItems();

    function documentHeight() {
      var body = document.body, doc = document.documentElement;
      return Math.max(
        body.scrollHeight, doc.scrollHeight,
        body.offsetHeight, doc.offsetHeight,
        body.clientHeight, doc.clientHeight
      );
    }

    function isAtBottom() {
      return window.innerHeight + window.pageYOffset >= documentHeight();
    }

    // Gumshoe compares with `parseInt(bounds.top, 10)`, not the raw float --
    // truncation, not rounding. A landing spot from `scroll-padding-top: 20px`
    // (site.scss) can settle at a sub-pixel value like 20.125, which is
    // "past OFFSET" once truncated to 20 but NOT by a bare `<= 20` float
    // comparison -- caught by diffing this exact case (the #next-section
    // button landing one heading short) against the theme's own Gumshoe,
    // which truncates and therefore does activate there.
    function topInView(el) {
      return parseInt(el.getBoundingClientRect().top, 10) <= OFFSET;
    }

    function bottomInView(el) {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      return parseInt(el.getBoundingClientRect().bottom, 10) < vh;
    }

    // Gumshoe's getActive: force the last item at the bottom of the page
    // (so the final section is highlighted even if its heading never
    // crosses OFFSET, e.g. a short trailing section); otherwise the
    // deepest (last, document-order) content area whose top has scrolled
    // up past OFFSET.
    function getActive() {
      var last = items[items.length - 1];
      if (isAtBottom() && bottomInView(last.content)) return last;
      for (var i = items.length - 1; i >= 0; i--) {
        if (topInView(items[i].content)) return items[i];
      }
      return null; // nothing reached yet (top of page) -- a real state, not a bug:
                    // activeIndex stays -1 and #next-section's "jump to first
                    // section" special case (site.js above) depends on it.
    }

    var current = null;

    function deactivate(item) {
      if (!item) return;
      var li = item.nav.closest("li");
      if (li) li.classList.remove("active");
      item.content.classList.remove("active"); // Gumshoe's contentClass; nothing
                                                 // in this repo's CSS currently
                                                 // keys off it outside .toc, but
                                                 // the contract includes it
    }

    function activate(item) {
      if (!item) return;
      var li = item.nav.closest("li");
      if (li) li.classList.add("active");
      item.content.classList.add("active");

      // Dispatched from the <li>, bubbling, exactly like Gumshoe -- the
      // floating-nav IIFE above reads e.detail.link and does
      // tocLinks.indexOf(link), so it must be this exact <a> node from the
      // real sidebar TOC (not a clone).
      if (li) {
        li.dispatchEvent(new CustomEvent("gumshoeActivate", {
          bubbles: true,
          cancelable: true,
          detail: { link: item.nav, content: item.content }
        }));
      }
    }

    function detect() {
      var active = getActive();

      if (!active) {
        if (current) { deactivate(current); current = null; }
        return;
      }
      // Fire only on an actual transition, like Gumshoe -- otherwise the
      // 180ms debounce in the floating-nav IIFE above never sees quiet
      // during a continuous scroll and the TOC stops re-expanding.
      if (current && active.content === current.content) return;

      deactivate(current);
      activate(active);
      current = active;
    }

    var scrollTicking = false;
    window.addEventListener("scroll", function () {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(function () { scrollTicking = false; detect(); });
    }, { passive: true });

    var resizeTicking = false;
    window.addEventListener("resize", function () {
      if (resizeTicking) return;
      resizeTicking = true;
      window.requestAnimationFrame(function () {
        resizeTicking = false;
        sortItems();
        detect();
      });
    });

    detect(); // synchronous initial detect, mirrors Gumshoe's own init()

    /* --- auto-scroll the sticky sidebar TOC so the active entry stays
       visible, ported verbatim (Chrome-only gate and all -- the theme's own
       comment says it "has issues on Firefox") from the theme's _main.js.
       `e.target` here is the <li> the dispatch above bubbled from, exactly
       as it was `event.target` on Gumshoe's own dispatch.

       `behavior: "instant"`, not the original's "auto": "auto" defers to
       the CSS `scroll-behavior` of the scrolling box, and site.scss now
       sets `html { scroll-behavior: smooth }` (P1-5, replacing the
       theme's SmoothScroll plugin). Left as "auto" this call would pick up
       that smooth animation and lag behind the reader's own scrolling --
       exactly the desync this function exists to prevent. "instant" opts
       out of CSS scroll-behavior explicitly and reproduces what "auto"
       actually did before that CSS rule existed. */
    function scrollTocToContent(e) {
      var target = e.target;
      var scrollOptions = { behavior: "instant", block: "nearest", inline: "start" };

      var tocElement = document.querySelector("aside.sidebar__right.sticky");
      if (!tocElement) return;
      if (window.getComputedStyle(tocElement).position !== "sticky") return;

      if (target.parentElement.classList.contains("toc__menu") && target === target.parentElement.firstElementChild) {
        var header = document.querySelector("nav.toc header");
        if (header) header.scrollIntoView(scrollOptions);
      } else {
        target.scrollIntoView(scrollOptions);
      }
    }

    if (window.chrome) {
      document.addEventListener("gumshoeActivate", scrollTocToContent);
    }
  })();

/* --------------------------------------------------------------------------
   Glossary term hovers

   Reads the page-scoped JSON that _includes/glossary-key.html emits
   (#glossary-data), wraps every later occurrence of a known term in the
   article prose with <span class="gloss-term">, and drives one shared
   tooltip (#gloss-tip) on hover, keyboard focus, and tap.

   Independent of the scrollspy above -- it listens for nothing and
   dispatches nothing -- so its position at the end of the file does not
   matter the way ordering above the gumshoeActivate listeners does.

   Progressive enhancement: with no JS, none of this runs and the reader
   still gets the full definitions from the <dl> the include rendered.
   -------------------------------------------------------------------------- */

  (function () {
    var dataEl = document.getElementById("glossary-data");
    var root = document.querySelector(".page__content");
    if (!dataEl || !root || !document.createTreeWalker) return;

    var terms;
    try {
      terms = JSON.parse(dataEl.textContent || "[]");
    } catch (e) {
      return;
    }
    if (!terms || !terms.length) return;

    // lowercased surface form -> term record, plus a combined finder regex.
    var byForm = {};
    var forms = [];
    var i, j;
    for (i = 0; i < terms.length; i++) {
      var t = terms[i];
      var ms = t.match || [];
      for (j = 0; j < ms.length; j++) {
        var form = String(ms[j]).normalize ? String(ms[j]).normalize("NFC") : String(ms[j]);
        byForm[form.toLowerCase()] = t;
        forms.push(form);
      }
    }
    if (!forms.length) return;

    // longest first so "ahl al-dhimma" wins over "dhimma"
    forms.sort(function (a, b) { return b.length - a.length; });

    function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

    var finder, wordChar;
    try {
      finder = new RegExp("(?:" + forms.map(escapeRe).join("|") + ")", "giu");
      wordChar = /[\p{L}\p{M}]/u;
    } catch (e) {
      return; // no Unicode-property regex support: skip the enhancement
    }

    var SKIP = "a,h1,h2,h3,h4,h5,h6,pre,code,sup,button,.quran-arabic,.ayah-ref,.glossary-key,.gloss-term,.no-gloss";
    var PER_TERM_CAP = 40;
    var counts = {};

    function skip(node) {
      var el = node.parentNode;
      while (el && el !== root) {
        if (el.nodeType === 1 && el.matches && el.matches(SKIP)) return true;
        el = el.parentNode;
      }
      return false;
    }

    // collect first so the walk is not mutated mid-iteration
    var targets = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && /\S/.test(n.nodeValue) && !skip(n)) targets.push(n);
    }

    for (i = 0; i < targets.length; i++) wrap(targets[i]);

    function wrap(textNode) {
      var text = textNode.nodeValue;
      var hay = text.normalize ? text.normalize("NFC") : text;
      finder.lastIndex = 0;
      var m, hits = null;
      while ((m = finder.exec(hay))) {
        var s = m.index, e = s + m[0].length;
        var before = s > 0 ? hay.charAt(s - 1) : "";
        var after = e < hay.length ? hay.charAt(e) : "";
        if (before && wordChar.test(before)) continue;
        if (after && wordChar.test(after)) continue;
        var rec = byForm[m[0].toLowerCase()];
        if (!rec) continue;
        if ((counts[rec.id] || 0) >= PER_TERM_CAP) continue;
        counts[rec.id] = (counts[rec.id] || 0) + 1;
        (hits || (hits = [])).push([s, e, rec]);
      }
      if (!hits) return;

      var frag = document.createDocumentFragment();
      var pos = 0;
      for (var k = 0; k < hits.length; k++) {
        var h = hits[k];
        if (h[0] > pos) frag.appendChild(document.createTextNode(text.slice(pos, h[0])));
        var span = document.createElement("span");
        span.className = "gloss-term";
        span.setAttribute("tabindex", "0");
        span.setAttribute("role", "button");
        span.setAttribute("aria-label", h[2].label + ": definition");
        span.setAttribute("data-term", h[2].id);
        span.textContent = text.slice(h[0], h[1]);
        frag.appendChild(span);
        pos = h[1];
      }
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      textNode.parentNode.replaceChild(frag, textNode);
    }

    if (!document.querySelector(".gloss-term")) return;

    /* ---- shared tooltip ---- */
    var defs = {};
    for (i = 0; i < terms.length; i++) defs[terms[i].id] = terms[i];

    var tip = document.createElement("div");
    tip.id = "gloss-tip";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    document.body.appendChild(tip);

    var current = null;   // the .gloss-term the tip is describing
    var pinned = false;    // set by tap/click; survives mouseout
    var reflowQueued = false;

    function place() {
      if (!current) return;
      var r = current.getBoundingClientRect();
      tip.style.top = "0px";
      tip.style.left = "0px";
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var margin = 8;
      var left = r.left;
      if (left + tw > window.innerWidth - margin) left = window.innerWidth - margin - tw;
      if (left < margin) left = margin;
      var top = r.bottom + 6;
      if (top + th > window.innerHeight - margin && r.top - 6 - th > margin) top = r.top - 6 - th;
      tip.style.left = Math.round(left) + "px";
      tip.style.top = Math.round(top) + "px";
    }

    function show(el) {
      var rec = defs[el.getAttribute("data-term")];
      if (!rec) return;
      current = el;
      tip.innerHTML = rec.short;
      tip.hidden = false;
      place();
    }

    function hide() {
      if (pinned) return;
      current = null;
      tip.hidden = true;
    }

    function forceHide() {
      pinned = false;
      current = null;
      tip.hidden = true;
    }

    root.addEventListener("mouseover", function (ev) {
      var el = ev.target.closest && ev.target.closest(".gloss-term");
      if (el && !pinned) show(el);
    });
    root.addEventListener("mouseout", function (ev) {
      var el = ev.target.closest && ev.target.closest(".gloss-term");
      if (el && !pinned) hide();
    });
    root.addEventListener("focusin", function (ev) {
      var el = ev.target.closest && ev.target.closest(".gloss-term");
      if (el) { pinned = false; show(el); }
    });
    root.addEventListener("focusout", function (ev) {
      var el = ev.target.closest && ev.target.closest(".gloss-term");
      if (el) forceHide();
    });
    root.addEventListener("click", function (ev) {
      var el = ev.target.closest && ev.target.closest(".gloss-term");
      if (!el) return;
      ev.preventDefault();
      if (pinned && current === el) { forceHide(); return; }
      pinned = false;
      show(el);
      pinned = true;
    });
    document.addEventListener("click", function (ev) {
      if (!pinned) return;
      if (ev.target.closest && ev.target.closest(".gloss-term")) return;
      if (ev.target === tip || (tip.contains && tip.contains(ev.target))) return;
      forceHide();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape" && ev.keyCode !== 27) return;
      if (tip.hidden) return;
      var active = current;
      forceHide();
      if (active && active.focus) active.focus();
    });

    function onReflow() {
      if (tip.hidden || reflowQueued) return;
      reflowQueued = true;
      window.requestAnimationFrame(function () {
        reflowQueued = false;
        if (pinned) place();
        else hide();
      });
    }
    window.addEventListener("scroll", onReflow, { passive: true });
    window.addEventListener("resize", onReflow);
  })();
