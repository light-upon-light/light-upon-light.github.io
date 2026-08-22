/* ==========================================================================
   Site JS
   ==========================================================================

   Custom JS for this site, moved out of the <script> blocks that used to be
   inlined into every page via _includes/footer/custom.html (P1-3 in the site
   audit: ~37 KB of identical JS repeated verbatim on every one of the 13
   pages, uncacheable). Loaded via site.footer_scripts in _config.yml, which
   MUST list this file before /assets/js/main.min.js: this script registers a
   `gumshoeActivate` listener that has to be in place before the theme's own
   Gumshoe init runs its first synchronous detect(), or the initial
   activation is missed. See the comment in _config.yml.

   This is a pure relocation -- nothing below has been reordered, renamed, or
   rewritten. The pre-paint theme/font-size toggle bootstrap scripts and the
   quran_section breadcrumb script stay inline in the two custom.html includes
   (see the header comment in assets/css/site.scss for why). */

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
