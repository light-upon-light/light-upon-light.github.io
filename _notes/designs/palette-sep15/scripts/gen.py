import re, html, pathlib, collections

REPO = pathlib.Path(__file__).resolve().parents[4]
SITE = REPO / "_site"  # run `bundle exec jekyll build` first
dirt = (REPO / "_sass/minimal-mistakes/skins/_dirt.scss").read_text(encoding="utf8")
css = "".join((SITE / "assets/css" / f).read_text(encoding="utf8") for f in ("main.css", "site.css"))
og = (REPO / "_notes/scripts/og/og.html").read_text(encoding="utf8")


def block(src, opener):
    i = src.index(opener) + len(opener)
    depth, j = 1, i
    while depth:
        c = src[j]
        depth += c == "{"
        depth -= c == "}"
        j += 1
    return src[i : j - 1]


def parse_tokens(body):
    out, note = collections.OrderedDict(), ""
    body = body.replace("\r", "")
    for chunk in re.split(r"(/\*.*?\*/)", body, flags=re.S):
        if chunk.startswith("/*"):
            note = " ".join(chunk[2:-2].split())
            continue
        for line in chunk.split("\n"):
            if not line.strip():
                if out:
                    note = ""
                continue
            m = re.match(r"\s*(--[a-z0-9-]+)\s*:\s*([^;]+);\s*(?://\s*(.*))?", line)
            if m:
                out[m[1]] = dict(value=m[2].strip(), trail=(m[3] or "").strip(), block=note)
    return out


light = parse_tokens(block(dirt, "@mixin site-light-palette {"))
dark = parse_tokens(block(dirt, "@mixin site-dark-palette {"))
inv_body = dirt[dirt.index(":root {\n  @include site-light-palette;") :]
invariant = parse_tokens(block(inv_body, ":root {"))
base16 = collections.OrderedDict(
    (m[1], m[2].lower()) for m in re.finditer(r"\$(base0[0-9a-f])\s*:\s*(#[0-9a-fA-F]+)", dirt)
)

# ---- consumers from the compiled CSS -------------------------------------
clean = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
rules = []  # (selector, decls)
stack, buf = [], ""
for tok in re.split(r"([{}])", clean):
    if tok == "{":
        stack.append(buf.strip()); buf = ""
    elif tok == "}":
        if buf.strip() and stack:
            rules.append((stack[-1], [stack[k] for k in range(len(stack) - 1)], buf))
        buf = ""
        if stack:
            stack.pop()
    else:
        buf += tok

consumers = collections.defaultdict(list)
literals = collections.defaultdict(list)
COLOR_PROPS = ("color", "background", "border", "shadow", "outline", "fill", "stroke")
HEX = re.compile(r"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b")
RGB = re.compile(r"rgba?\([^)]*\)")
for sel, ctx, decls in rules:
    is_palette = sel.startswith(":root") and "--" in decls
    for d in decls.split(";"):
        if ":" not in d:
            continue
        prop, val = d.split(":", 1)
        prop = prop.strip()
        if prop.startswith("--") and is_palette:
            continue
        for v in re.findall(r"var\((--(?:mm|site)-[a-z0-9-]+)", val):
            consumers[v].append((sel, prop))
        if any(p in prop for p in COLOR_PROPS) and not prop.startswith("--"):
            val2 = re.sub(r"url\([^)]*\)", "", val)
            for lit in HEX.findall(val2) + RGB.findall(val2):
                literals[lit.lower().replace(" ", "")].append((sel, prop))


def short_sel(s):
    s = re.sub(r"\s+", " ", s)
    parts = [p.strip() for p in s.split(",")]
    return parts


def consumer_list(items, cap=8):
    seen = collections.OrderedDict()
    for sel, prop in items:
        for p in short_sel(sel):
            seen.setdefault(p, set()).add(prop)
    keys = list(seen)
    shown = keys[:cap]
    extra = len(keys) - len(shown)
    return [(k, sorted(seen[k])) for k in shown], extra


# ---- colour maths --------------------------------------------------------
def to_rgba(v, table=None):
    v = v.strip()
    if v.startswith("var("):
        name = re.match(r"var\((--[a-z0-9-]+)\)", v)[1]
        return to_rgba(table[name]["value"], table)
    if v.startswith("#"):
        h = v[1:]
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return r, g, b, a
    nums = [float(x) for x in re.findall(r"[\d.]+", v)]
    return int(nums[0]), int(nums[1]), int(nums[2]), (nums[3] if len(nums) > 3 else 1.0)


def over(c, ground):
    r, g, b, a = c
    R, G, B, _ = ground
    return (r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a), 1.0)


def lum(c):
    def ch(x):
        x /= 255
        return x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


LG = to_rgba(light["--mm-background-color"]["value"])
DG = to_rgba(dark["--mm-background-color"]["value"])


def norm(v, table):
    c = to_rgba(v, table)
    if c[3] >= 1:
        return "#%02x%02x%02x" % c[:3]
    return "rgba(%d, %d, %d, %s)" % (c[0], c[1], c[2], ("%g" % c[3]))


# ---- descriptions --------------------------------------------------------
DESC = {
    "--mm-background-color": "Page ground behind everything.",
    "--mm-text-color": "Body text.",
    "--mm-muted-text-color": "Secondary text: dates, captions, page meta.",
    "--mm-primary-color": "Theme accent. Fills behind white text (buttons) and draws the theme's default rules.",
    "--mm-border-color": "Hairlines and dividers: TOC box, rules, table lines.",
    "--mm-footer-background-color": "Footer band.",
    "--mm-link-color": "Links.",
    "--mm-link-color-hover": "Links on hover.",
    "--mm-link-color-visited": "Visited links.",
    "--mm-masthead-link-color": "Site title and masthead nav links.",
    "--mm-masthead-link-color-hover": "Masthead links on hover.",
    "--mm-navicon-link-color-hover": "Hamburger (overflow menu) icon on hover.",
    "--mm-focus-color": "Keyboard focus ring.",
    "--mm-active-color": "TOC scrollspy highlight (the current section's row).",
    "--mm-form-background-color": "Form field fill.",
    "--mm-code-background-color": "Code blocks and inline code.",
    "--mm-code-background-color-dark": "Darker code surfaces (code block gutters, <kbd>).",
    "--mm-border-color-h00025": "Border colour darkened 25%: pagination, table rules, page hairlines.",
    "--mm-primary-color-h00025": "Primary darkened 25%: search toggle hover, back-to-top hover.",
    "--mm-primary-color-hover": "Primary button fill on hover.",
    "--mm-primary-color-h00010": "Primary darkened 10%: primary notice links and blockquote rule.",
    "--mm-primary-color-h00050": "Primary darkened 50%: primary notice link hover.",
    "--mm-primary-color-alpha-25": "Primary at 25%: primary notice shadow.",
    "--mm-text-color-alpha-06": "Text at 6%: inset shadow on focused form fields.",
    "--mm-primary-color-alpha-70": "Primary at 70%: glow on focused form fields.",
    "--mm-muted-text-color-alpha-50": "Muted at 50%: disabled pagination items.",
    "--mm-on-accent": "Text on accent fills (theme's contrast pick).",
    "--mm-muted-text-color-contrast": "Text on a muted fill (pager hover).",
    "--mm-active-color-contrast": "Text on the TOC highlight.",
}
NOTICE = {"default": "Default", "primary": "Primary", "info": "Info", "warning": "Warning", "success": "Success", "danger": "Danger"}
for k, lab in NOTICE.items():
    DESC[f"--mm-notice-bg-{k}"] = f"{lab} notice box fill."
    DESC[f"--mm-code-notice-bg-{k}"] = f"Code inside a {lab.lower()} notice."

SITE_DESC = {
    "--site-quote-gold": "Gold for revealed text: the Qur'an-quote blockquote rule, roman/alpha numerals, large-text toggle on, dark-mode selection.",
    "--site-src-text": "Source-citation blockquote text; video embed summary; current breadcrumb; back-to-Qur'an link.",
    "--site-src-border": "Rule on source blockquotes, video embeds and the back-to-Qur'an link.",
    "--site-gloss-border": "Rule on the author's-commentary (gloss) blockquote.",
    "--site-gloss-bg": "Wash behind the gloss blockquote.",
    "--site-glosskey-bg": "Parchment fill of the key-terms block.",
    "--site-toctitle-bg": "TOC title bar and mobile TOC disclosure fill.",
    "--site-toctitle-text": "Text on the TOC title bar.",
    "--site-tldr-fill": "Summary card fill.",
    "--site-tldr-line": "Summary card hairline border.",
    "--site-tldr-label": "Summary card label (\"Summary\").",
    "--site-tldr-edge": "Gold fade along the top edge of the open summary card.",
    "--site-tldr-shadow": "Soft shadow lifting the summary card.",
    "--site-breadcrumb-sep": "The › separators in the Qur'an breadcrumb.",
    "--site-return-hover-bg": "Back-to-Qur'an link hover wash.",
    "--site-floatnav-icon": "Icons on the floating nav buttons.",
    "--site-floatnav-bg": "Floating nav button disc.",
    "--site-floatnav-border": "Floating nav button ring.",
    "--site-floatnav-shadow": "Floating nav button shadow.",
    "--site-tocbackdrop-bg": "Dimmer behind the mobile TOC drawer.",
    "--site-glossterm-underline": "Dotted underline on glossary terms in prose.",
    "--site-glosstip-bg": "Glossary hover-tip card.",
    "--site-glosstip-text": "Glossary hover-tip text.",
    "--site-glosstip-border": "Glossary hover-tip border.",
    "--site-blockquote-border-default": "Rule on an untagged blockquote.",
    "--site-poster-ground": "Video poster and player ground.",
    "--site-poster-scrim": "Dimmer over the video thumbnail.",
    "--site-poster-title-scrim": "Top of the shade behind the video title.",
    "--site-poster-text": "Video title on the poster.",
    "--site-poster-disc": "Play-button disc.",
    "--site-poster-disc-hover": "Play-button disc on hover.",
    "--site-poster-disc-border": "Play-button disc ring.",
    "--site-poster-play": "Play triangle.",
    "--site-ondark-gold": "Floating large-text toggle when on.",
}
DESC.update(SITE_DESC)

GROUPS = [
    ("page", "Page and text", "The ground, the ink, and the chrome every page shares.",
     ["--mm-background-color", "--mm-text-color", "--mm-muted-text-color", "--mm-primary-color", "--mm-border-color",
      "--mm-footer-background-color", "--mm-masthead-link-color", "--mm-masthead-link-color-hover",
      "--mm-navicon-link-color-hover", "--mm-focus-color", "--mm-form-background-color",
      "--mm-code-background-color", "--mm-code-background-color-dark"]),
    ("links", "Links", "", ["--mm-link-color", "--mm-link-color-hover", "--mm-link-color-visited"]),
    ("evidence", "Evidence blockquotes", "Gold for revealed text, taupe for the apparatus, verdigris for the author's commentary.",
     ["--site-quote-gold", "--site-src-text", "--site-src-border", "--site-gloss-border", "--site-gloss-bg",
      "--site-blockquote-border-default"]),
    ("tldr", "Summary card", "Gilt edge: lifted paper, a warm hairline, a gold top edge. Uncommitted redesign in the working tree.",
     ["--site-tldr-fill", "--site-tldr-line", "--site-tldr-label", "--site-tldr-edge", "--site-tldr-shadow"]),
    ("glossary", "Glossary", "The key-terms block and the hover tips on terms in prose.",
     ["--site-glosskey-bg", "--site-glossterm-underline", "--site-glosstip-bg", "--site-glosstip-text", "--site-glosstip-border"]),
    ("toc", "Table of contents", "",
     ["--mm-active-color", "--mm-active-color-contrast", "--site-toctitle-bg", "--site-toctitle-text", "--site-tocbackdrop-bg"]),
    ("nav", "Floating nav and breadcrumb", "",
     ["--site-floatnav-icon", "--site-floatnav-bg", "--site-floatnav-border", "--site-floatnav-shadow",
      "--site-breadcrumb-sep", "--site-return-hover-bg"]),
    ("derived", "Theme-derived", "Precomputed stand-ins for the theme's Sass mix()/rgba()/contrast calls, which can't run on a custom property.",
     ["--mm-border-color-h00025", "--mm-primary-color-h00025", "--mm-primary-color-hover", "--mm-primary-color-h00010",
      "--mm-primary-color-h00050", "--mm-primary-color-alpha-25", "--mm-text-color-alpha-06", "--mm-primary-color-alpha-70",
      "--mm-muted-text-color-alpha-50", "--mm-on-accent", "--mm-muted-text-color-contrast"]),
    ("notices", "Notices", "The theme's notice boxes. Carried in both palettes; no page uses them today.",
     [f"--mm-notice-bg-{k}" for k in NOTICE] + [f"--mm-code-notice-bg-{k}" for k in NOTICE]),
]
listed = {t for g in GROUPS for t in g[3]}
missing = [t for t in light if t not in listed]
assert not missing, missing
assert set(light) == set(dark), set(light) ^ set(dark)

B16_DESC = {
    "base00": "Code block ground", "base01": "Line highlight", "base02": "Selection", "base03": "Comments",
    "base04": "Dark foreground", "base05": "Default code text", "base06": "Light foreground", "base07": "Lightest",
    "base08": "Variables, tags", "base09": "Numbers, constants", "base0a": "Classes", "base0b": "Strings",
    "base0c": "Regex, escapes", "base0d": "Functions", "base0e": "Keywords", "base0f": "Deprecated, embedded",
}

# value -> tokens sharing it (per mode), for the coherence notes
def share_map(table):
    m = collections.defaultdict(list)
    for k, v in table.items():
        m[norm(v["value"], table)].append(k)
    return m

LSH, DSH = share_map(light), share_map(dark)

e = html.escape


def chip(value, table, ground, mode, shares=None, token=None):
    n = norm(value, table) if table is not None else value
    c = to_rgba(n)
    ratio = contrast(over(c, ground), ground)
    alias = ""
    if value.startswith("var("):
        alias = f'<span class="alias">= {e(value[4:-1])}</span>'
    same = ""
    if shares is not None:
        others = [t for t in shares[n] if t != token]
        if others:
            same = f'<span class="same" title="{e(", ".join(others))}">same as {len(others)} other{"s" if len(others) > 1 else ""}</span>'
    return (
        f'<div class="chip chip--{mode}"><span class="sw" style="background:{e(n)}"></span>'
        f'<span class="hex">{e(n)}</span>{alias}'
        f'<span class="ratio" title="Contrast against the {mode} page ground">{ratio:.1f}:1</span>{same}</div>'
    )


def cons_html(token_or_items):
    items = consumers.get(token_or_items, []) if isinstance(token_or_items, str) else token_or_items
    lst, extra = consumer_list(items)
    if not lst:
        return '<p class="uses uses--none">No rule in the built CSS reads this.</p>'
    lis = "".join(f"<li><code>{e(s)}</code> <span class=\"prop\">{e(', '.join(p))}</span></li>" for s, p in lst)
    more = f'<li class="more">+{extra} more selectors</li>' if extra else ""
    return f'<ul class="uses">{lis}{more}</ul>'


def row(token, lv, dv, sep_dark=True):
    note = DESC.get(token, "")
    trail = light.get(token, {}).get("trail") or invariant.get(token, {}).get("trail", "")
    extra = f'<p class="src">{e(trail)}</p>' if trail and "--" not in trail[:3] else ""
    d = dark.get(token, {}).get("trail", "")
    extra += f'<p class="src"><b>Dark:</b> {e(d)}</p>' if d else ""
    swatches = chip(lv, light, LG, "light", LSH, token)
    swatches += chip(dv, dark, DG, "dark", DSH, token) if sep_dark else chip(lv, None, DG, "dark")
    kind = "" if sep_dark else '<span class="tag">same in both modes</span>'
    return (
        f'<article class="tok" data-q="{e((token + " " + note + " " + trail).lower())}">'
        f'<div class="meta"><h3><code>{e(token)}</code>{kind}</h3><p class="desc">{e(note)}</p>{extra}'
        f'<details><summary>Used by</summary>{cons_html(token)}</details></div>'
        f'<div class="chips">{swatches}</div></article>'
    )


sections = []
for gid, title, blurb, toks in GROUPS:
    rows = "".join(row(t, light[t]["value"], dark[t]["value"]) for t in toks)
    sections.append((gid, title, blurb, rows, len(toks)))

inv_rows = "".join(row(t, v["value"], v["value"], sep_dark=False) for t, v in invariant.items())
sections.append(("invariant", "Mode-invariant", "Colours on surfaces that are dark in both modes: the video poster and the floating nav disc. Deliberately no dark-mode value.", inv_rows, len(invariant)))

# base16
b16_rows = ""
for name, val in base16.items():
    items = literals.pop(val, [])
    b16_rows += (
        f'<article class="tok" data-q="{e((name + " " + B16_DESC[name] + " syntax code").lower())}">'
        f'<div class="meta"><h3><code>${name}</code><span class="tag">same in both modes</span></h3>'
        f'<p class="desc">{e(B16_DESC[name])} (syntax highlighting).</p>'
        f'<details><summary>Used by</summary>{cons_html(items)}</details></div>'
        f'<div class="chips">{chip(val, None, LG, "light")}{chip(val, None, DG, "dark")}</div></article>'
    )
sections.append(("syntax", "Code syntax", "Dirt's base16 scheme, written as literal Sass variables in _dirt.scss. Already a dark scheme, so identical in both modes.", b16_rows, len(base16)))

# remaining literals in the compiled CSS
lit_rows = ""
lit_count = 0
for val, items in sorted(literals.items(), key=lambda kv: -len(kv[1])):
    try:
        to_rgba(val)
    except Exception:
        continue
    lit_count += 1
    lit_rows += (
        f'<article class="tok" data-q="{e(val)} theme literal">'
        f'<div class="meta"><h3><code>{e(val)}</code><span class="tag">same in both modes</span></h3>'
        f'<p class="desc">Written as a literal in the theme\'s own partials, not a palette property.</p>'
        f'<details><summary>Used by</summary>{cons_html(items)}</details></div>'
        f'<div class="chips">{chip(val, None, LG, "light")}{chip(val, None, DG, "dark")}</div></article>'
    )
sections.append(("literals", "Theme literals", "Every remaining hard-coded colour in the compiled CSS. They come from the theme's own Sass (mostly white/black overlays on components this site doesn't render) and site.css contributes none.", lit_rows, lit_count))

# og card
og_style = og[og.index("<style>") : og.index("</style>")]
og_items = collections.OrderedDict()
for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", og_style):
    for d in body.split(";"):
        if ":" in d:
            p, v = d.split(":", 1)
            for lit in HEX.findall(v) + RGB.findall(v):
                og_items.setdefault(lit.lower(), []).append((sel.strip(), p.strip()))
OG_DESC = {"#e9dcbe": "Card ground (the light border colour).", "#343434": "Wordmark and title (the light text colour).",
           "#ca7f32": "Ochre stripe down the right edge (base09).", "rgba(52,52,52,0.32)": "Rule under the wordmark.",
           "#7a6f57": "Kicker and footer text."}
og_rows = ""
for val, items in og_items.items():
    key = val.replace(" ", "")
    og_rows += (
        f'<article class="tok" data-q="{e(val)} og link preview card">'
        f'<div class="meta"><h3><code>{e(val)}</code><span class="tag">light only</span></h3>'
        f'<p class="desc">{e(OG_DESC.get(key, ""))}</p>'
        f'<details><summary>Used by</summary>{cons_html(items)}</details></div>'
        f'<div class="chips">{chip(val, None, to_rgba("#e9dcbe"), "light")}</div></article>'
    )
sections.append(("og", "Link-preview cards", "og.html renders the 1200×630 share images on its own, outside the site's CSS, so these are hard-coded copies. Contrast is measured against the card ground.", og_rows, len(og_items)))

total = sum(s[4] for s in sections)
distinct_l = len({norm(v["value"], light) for v in light.values()})
distinct_d = len({norm(v["value"], dark) for v in dark.values()})

nav = "".join(f'<a href="#{g}">{e(t)} <span>{n}</span></a>' for g, t, _, _, n in sections)
body = "".join(
    f'<section id="{g}"><header class="sec"><h2>{e(t)}</h2><p>{e(b)}</p></header>{r}</section>'
    for g, t, b, r, _ in sections
)

tpl = (pathlib.Path(__file__).parent / "template.html").read_text(encoding="utf8")
out = (tpl.replace("{{NAV}}", nav).replace("{{BODY}}", body)
       .replace("{{TOTAL}}", str(total)).replace("{{PALETTE}}", str(len(light)))
       .replace("{{DL}}", str(distinct_l)).replace("{{DD}}", str(distinct_d))
       .replace("{{INV}}", str(len(invariant))).replace("{{LIT}}", str(lit_count)))
(pathlib.Path(__file__).parent.parent / "1-palette.html").write_text(out, encoding="utf8")
print("tokens", len(light), "invariant", len(invariant), "base16", len(base16), "literals", lit_count, "og", len(og_items))
print("no consumers:", [t for t in list(light) + list(invariant) if not consumers.get(t)])
print("distinct", distinct_l, distinct_d)
