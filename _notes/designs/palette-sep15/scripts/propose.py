import re, math, html, json, pathlib, collections

HERE = pathlib.Path(__file__).parent
REPO = pathlib.Path(__file__).resolve().parents[4]
# The palette as it stood before the proposal was applied (a835db9); the
# live file now holds Sass interpolations, not hex.
import subprocess
dirt = subprocess.run(["git", "-C", str(REPO), "show", "a835db9:_sass/minimal-mistakes/skins/_dirt.scss"],
                      capture_output=True, text=True, encoding="utf8", check=True).stdout


def block(src, opener):
    i = src.index(opener) + len(opener); d = 1; j = i
    while d:
        d += src[j] == "{"; d -= src[j] == "}"; j += 1
    return src[i:j - 1]


def toks(body):
    return {m[1]: m[2].strip() for m in re.finditer(r"(--[a-z0-9-]+)\s*:\s*([^;]+);", re.sub(r"//[^\n]*", "", re.sub(r"/\*.*?\*/", "", body, flags=re.S)))}


L = toks(block(dirt, "@mixin site-light-palette {"))
D = toks(block(dirt, "@mixin site-dark-palette {"))
I = toks(block(dirt[dirt.index(":root {\n  @include site-light-palette;"):], ":root {"))


# ---- colour maths --------------------------------------------------------
def rgba(v, t=None):
    v = v.strip()
    if v.startswith("var("):
        return rgba(t[v[4:-1]], t)
    if v.startswith("#"):
        h = v[1:]; h = "".join(c * 2 for c in h) if len(h) <= 4 else h
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (1.0,)
    n = [float(x) for x in re.findall(r"[\d.]+", v)]
    return (n[0], n[1], n[2], n[3] if len(n) > 3 else 1.0)


def lin(x): x /= 255; return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
def delin(x): return 255 * (12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055)


def oklab(c):
    r, g, b = (lin(x) for x in c[:3])
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (x ** (1 / 3) for x in (l, m, s))
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def from_oklch(L_, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l = (L_ + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L_ - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L_ - 0.0894841775 * a - 1.2914855480 * b) ** 3
    rgb = (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
           -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
           -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(delin(max(0, x))))) for x in rgb)


def over(c, g):
    a = c[3]; return tuple(c[i] * a + g[i] * (1 - a) for i in range(3)) + (1.0,)


def lum(c): return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])


def cr(fg, bg):
    a, b = sorted((lum(fg), lum(bg)), reverse=True); return (a + 0.05) / (b + 0.05)


def de(a, b): return math.dist(oklab(a), oklab(b))
def hx(c): return "#%02x%02x%02x" % tuple(int(round(x)) for x in c[:3])
def mix_black(c, p): return tuple(c[i] * (1 - p) for i in range(3)) + (1.0,)  # Sass mix(#000, c, p)


# ---- proposed base colours ------------------------------------------------
# Warm neutral ramp named by OKLab lightness (x100), so the name says where a
# step sits. Existing warm values are kept wherever one already sat on a step;
# only the theme's hueless greys are newly minted (same lightness, warm hue).
BASE = collections.OrderedDict([
    # family, name, hex, note
    ("paper-99", ("Warm neutral", "#fdfcf9", "kept (summary card fill)")),
    ("paper-96", ("Warm neutral", from_oklch(0.962, 0.006, 85), "NEW: #f3f3f3 page ground, warmed at the same lightness")),
    ("sand-92", ("Warm neutral", "#ebe3d1", "kept (key-terms parchment)")),
    ("sand-90", ("Warm neutral", "#e9dcbe", "kept (light border, footer)")),
    ("bone-90", ("Warm neutral", "#e6ded2", "kept (dark masthead, icons)")),
    ("bone-84", ("Warm neutral", "#d3cbba", "kept (dark body text)")),
    ("umber-78", ("Warm neutral", "#c3b4a0", "kept (light breadcrumb separator)")),
    ("umber-74", ("Warm neutral", "#b8ab97", "kept (dark source text)")),
    ("umber-67", ("Warm neutral", "#a1937c", "kept (light source rule)")),
    ("umber-60", ("Warm neutral", "#8a7d68", "kept (already used in both modes)")),
    ("umber-50", ("Warm neutral", "#6f6152", "kept (light source text)")),
    ("umber-38", ("Warm neutral", "#4a4238", "kept (dark border)")),
    ("ink-33", ("Warm neutral", from_oklch(0.335, 0.010, 75), "NEW: #343434 ink, warmed at the same lightness")),
    ("night-29", ("Warm neutral", "#2e2923", "kept (dark TOC title bar)")),
    ("night-25", ("Warm neutral", "#26221c", "kept (dark form and code fill)")),
    ("night-22", ("Warm neutral", "#1c1a17", "kept (dark page ground)")),
    ("gold-tint", ("Gold", "#dcc8a4", "kept (light TOC highlight)")),
    ("gold", ("Gold", "#a8792a", "kept (light quote gold)")),
    ("gold-bright", ("Gold", "#d4a04a", "kept (dark quote gold)")),
    ("gold-shade", ("Gold", "#785d31", "kept (dark TOC highlight)")),
    ("sienna", ("Sienna", "#8a5320", "kept (light link)")),
    ("sienna-deep", ("Sienna", "#6e3f14", "kept (light link hover)")),
    ("wheat", ("Sienna", "#d9b483", "kept (dark link)")),
    ("wheat-pale", ("Sienna", "#e8cea3", "kept (dark link hover)")),
    ("verdigris", ("Verdigris", "#2e6b63", "kept (light gloss rule)")),
    ("verdigris-bright", ("Verdigris", "#4fa89c", "kept (dark gloss rule)")),
    ("white", ("Pure", "#ffffff", "text on accent fills")),
    ("black", ("Pure", "#000000", "shadows and scrims")),
])
B = {k: rgba(v[1]) for k, v in BASE.items()}


def ref(name, alpha=None):
    return (name, alpha)


# token -> (light ref, dark ref). A ref is (base, alpha) or ("mix", base, pct)
# for the theme's darken-by-mixing-black stand-ins, which Sass can then compute.
MAP = {
    "--mm-background-color": (ref("paper-96"), ref("night-22")),
    "--mm-text-color": (ref("ink-33"), ref("bone-84")),
    "--mm-muted-text-color": (ref("umber-50"), ref("umber-67")),
    "--mm-primary-color": (ref("ink-33"), ref("umber-50")),
    "--mm-border-color": (ref("sand-90"), ref("umber-38")),
    "--mm-footer-background-color": (ref("sand-90"), ref("night-25")),
    "--mm-link-color": (ref("sienna"), ref("wheat")),
    "--mm-link-color-hover": (ref("sienna-deep"), ref("wheat-pale")),
    "--mm-link-color-visited": (ref("umber-50"), ref("umber-74")),
    "--mm-masthead-link-color": (ref("ink-33"), ref("bone-90")),
    "--mm-masthead-link-color-hover": (ref("ink-33"), ref("bone-90")),
    "--mm-navicon-link-color-hover": (ref("sand-90"), ref("umber-38")),
    "--mm-focus-color": (ref("ink-33"), ref("gold-bright")),
    "--mm-active-color": (ref("gold-tint"), ref("gold-shade")),
    "--mm-form-background-color": (ref("paper-96"), ref("night-25")),
    "--mm-code-background-color": (ref("paper-99"), ref("night-25")),
    "--mm-code-background-color-dark": (ref("umber-78"), ref("night-22")),
    "--mm-border-color-h00025": (("mix", "sand-90", .25), ("mix", "umber-38", .25)),
    "--mm-primary-color-h00025": (("mix", "ink-33", .25), ("mix", "umber-50", .25)),
    "--mm-primary-color-hover": (("mix", "ink-33", .20), ("mix", "umber-50", .20)),
    "--mm-primary-color-h00010": (("mix", "ink-33", .10), ("mix", "umber-50", .10)),
    "--mm-primary-color-h00050": (("mix", "ink-33", .50), ("mix", "umber-50", .50)),
    "--mm-primary-color-alpha-25": (ref("ink-33", .25), ref("umber-50", .25)),
    "--mm-text-color-alpha-06": (ref("ink-33", .06), ref("bone-84", .06)),
    "--mm-primary-color-alpha-70": (ref("ink-33", .7), ref("umber-50", .7)),
    "--mm-muted-text-color-alpha-50": (ref("umber-50", .5), ref("umber-67", .5)),
    "--mm-on-accent": (ref("white"), ref("white")),
    "--mm-muted-text-color-contrast": (ref("white"), ref("white")),
    "--mm-active-color-contrast": (ref("ink-33"), ref("white")),
    "--site-quote-gold": (ref("gold"), ref("gold-bright")),
    "--site-src-text": (ref("umber-50"), ref("umber-74")),
    "--site-src-border": (ref("umber-67"), ref("umber-60")),
    "--site-gloss-border": (ref("verdigris"), ref("verdigris-bright")),
    "--site-gloss-bg": (ref("verdigris", .05), ref("verdigris-bright", .08)),
    "--site-glosskey-bg": (ref("sand-92"), ref("night-25")),
    "--site-toctitle-bg": (ref("gold-tint"), ref("night-29")),
    "--site-toctitle-text": (ref("umber-38"), ref("bone-84")),
    "--site-tldr-fill": (ref("paper-99"), ref("night-25")),
    "--site-tldr-line": (ref("sand-92"), ref("umber-38")),
    "--site-tldr-label": (ref("sienna"), ref("gold-bright")),
    "--site-tldr-edge": (ref("gold"), ref("gold-bright")),
    "--site-tldr-shadow": (("rgba", "umber-50", .12), ref("black", .45)),
    "--site-breadcrumb-sep": (ref("umber-78"), ref("umber-50")),
    "--site-return-hover-bg": (ref("umber-67", .14), ref("umber-60", .18)),
    "--site-floatnav-icon": (ref("paper-96"), ref("bone-90")),
    "--site-floatnav-bg": (ref("ink-33", .55), ref("night-29", .55)),
    "--site-floatnav-border": (ref("sand-90"), ref("umber-50")),
    "--site-floatnav-shadow": (ref("black", .3), ref("black", .6)),
    "--site-tocbackdrop-bg": (ref("ink-33", .5), ref("black", .65)),
    "--site-glossterm-underline": (ref("umber-60"), ref("umber-74")),
    "--site-glosstip-bg": (ref("ink-33"), ref("night-29")),
    "--site-glosstip-text": (ref("paper-96"), ref("bone-90")),
    "--site-glosstip-border": (ref("umber-50"), ref("umber-50")),
    "--site-blockquote-border-default": (ref("ink-33"), ref("umber-60")),  # dark was 2.86:1, under the 3:1 non-text minimum
}
# notices are unused theme boxes: leave their precomputed values alone
NOTICES = [k for k in L if "notice" in k]
IMAP = {
    "--site-poster-ground": ref("night-22"),
    "--site-poster-scrim": ref("black", .28),
    "--site-poster-title-scrim": ref("black", .75),
    "--site-poster-text": ref("bone-90"),
    "--site-poster-disc": ref("night-22", .72),
    "--site-poster-disc-hover": ref("night-22", .85),
    "--site-poster-disc-border": ref("bone-90", .3),
    "--site-poster-play": ref("gold-bright"),
    "--site-ondark-gold": ref("gold-bright"),
}
missing = set(L) - set(MAP) - set(NOTICES)
assert not missing, missing
assert set(I) == set(IMAP), set(I) ^ set(IMAP)


def resolve(r):
    if r[0] == "mix":
        return mix_black(B[r[1]], r[2])
    if r[0] == "rgba":
        return B[r[1]][:3] + (r[2],)
    name, a = r
    return B[name][:3] + ((a if a is not None else 1.0),)


def label(r):
    if r[0] == "mix":
        return f"darken({r[1]}, {int(r[2]*100)}%)"
    if r[0] == "rgba":
        return f"{r[1]} @ {int(r[2]*100)}%"
    return r[0] if r[1] is None else f"{r[0]} @ {round(r[1]*100)}%"


def css(c):
    return hx(c) if c[3] >= 1 else "rgba(%d, %d, %d, %g)" % (round(c[0]), round(c[1]), round(c[2]), c[3])


LG_old, DG_old = rgba(L["--mm-background-color"]), rgba(D["--mm-background-color"])
LG_new, DG_new = resolve(MAP["--mm-background-color"][0]), resolve(MAP["--mm-background-color"][1])


def delta(old, new, ground_old, ground_new):
    return de(over(old, ground_old), over(new, ground_new))


rows = []
for tok in MAP:
    lo, do = rgba(L[tok], L), rgba(D[tok], D)
    ln, dn = resolve(MAP[tok][0]), resolve(MAP[tok][1])
    rows.append(dict(token=tok, lo=css(lo), ln=css(ln), lref=label(MAP[tok][0]), ld=delta(lo, ln, LG_old, LG_new),
                     do=css(do), dn=css(dn), dref=label(MAP[tok][1]), dd=delta(do, dn, DG_old, DG_new)))
for tok, r in IMAP.items():
    o, n = rgba(I[tok]), resolve(r)
    rows.append(dict(token=tok, lo=css(o), ln=css(n), lref=label(r), ld=delta(o, n, rgba("#1e1b18"), B["night-22"]),
                     do=None, dn=None, dref=None, dd=0, invariant=True))

# ---- contrast pairs -------------------------------------------------------
PAIRS = [
    ("Body text on page", "--mm-text-color", "--mm-background-color", 4.5),
    ("Muted text (dates, meta) on page", "--mm-muted-text-color", "--mm-background-color", 4.5),
    ("Link on page", "--mm-link-color", "--mm-background-color", 4.5),
    ("Visited link on page", "--mm-link-color-visited", "--mm-background-color", 4.5),
    ("Masthead link on page", "--mm-masthead-link-color", "--mm-background-color", 4.5),
    ("Source-quote text on page", "--site-src-text", "--mm-background-color", 4.5),
    ("Key-terms label on parchment", "--site-src-text", "--site-glosskey-bg", 4.5),
    ("Body text on parchment", "--mm-text-color", "--site-glosskey-bg", 4.5),
    ("Body text on summary card", "--mm-text-color", "--site-tldr-fill", 4.5),
    ("Summary label on card", "--site-tldr-label", "--site-tldr-fill", 4.5),
    ("Link on summary card", "--mm-link-color", "--site-tldr-fill", 4.5),
    ("TOC title text on bar", "--site-toctitle-text", "--site-toctitle-bg", 4.5),
    ("TOC highlight text", "--mm-active-color-contrast", "--mm-active-color", 4.5),
    ("White on primary fill", "--mm-on-accent", "--mm-primary-color", 4.5),
    ("Glossary tip text", "--site-glosstip-text", "--site-glosstip-bg", 4.5),
    ("Code text on code fill", "--mm-text-color", "--mm-code-background-color", 4.5),
    ("Focus ring on page", "--mm-focus-color", "--mm-background-color", 3.0),
    ("Quote gold rule on page", "--site-quote-gold", "--mm-background-color", 3.0),
    ("Gloss rule on page", "--site-gloss-border", "--mm-background-color", 3.0),
    ("Glossary underline on page", "--site-glossterm-underline", "--mm-background-color", 3.0),
    ("Default blockquote rule on page", "--site-blockquote-border-default", "--mm-background-color", 3.0),
]


def val_old(t, mode):
    tab = L if mode == 0 else D
    return rgba(tab[t], tab)


def val_new(t, mode):
    return resolve(MAP[t][mode])


checks = []
for name, fg, bg, need in PAIRS:
    for mode, mname in ((0, "Light"), (1, "Dark")):
        g_old = LG_old if mode == 0 else DG_old
        g_new = LG_new if mode == 0 else DG_new
        bo, bn = over(val_old(bg, mode), g_old), over(val_new(bg, mode), g_new)
        before = cr(over(val_old(fg, mode), bo), bo)
        after = cr(over(val_new(fg, mode), bn), bn)
        checks.append(dict(name=name, mode=mname, need=need, before=before, after=after))
pg, pd, pt = B["night-22"], rgba("#1e1b18"), B["bone-90"]
checks.append(dict(name="Video title on poster", mode="Both", need=4.5, before=cr(rgba("#f2ece1"), rgba("#1e1b18")), after=cr(pt, pg)))
disc_old, disc_new = over(rgba("rgba(22,19,16,0.72)"), rgba("#1e1b18")), over(resolve(IMAP["--site-poster-disc"]), pg)
checks.append(dict(name="Play triangle on disc", mode="Both", need=3.0, before=cr(rgba("#c9973a"), disc_old), after=cr(B["gold-bright"], disc_new)))

old_l = {css(rgba(L[t], L)) for t in MAP}
old_d = {css(rgba(D[t], D)) for t in MAP}
new_l = {css(resolve(MAP[t][0])) for t in MAP}
new_d = {css(resolve(MAP[t][1])) for t in MAP}
stats = dict(base=len(BASE), old_l=len(old_l), old_d=len(old_d), new_l=len(new_l), new_d=len(new_d),
             tokens=len(MAP) + len(IMAP))
(HERE / "proposal.json").write_text(json.dumps(dict(base={k: v for k, v in BASE.items()}, rows=rows, checks=checks, stats=stats), indent=1), encoding="utf8")

print(stats)
print("\nBASE"); [print(f"  {k:17} {v[1]}  {v[2]}") for k, v in BASE.items()]
print("\nCHANGES (OKLab dE on the page ground; >=0.02 is noticeable side by side)")
for r in rows:
    flag = lambda d: "" if d < 0.005 else ("~" if d < 0.02 else ("*" if d < 0.05 else "**"))
    print(f"  {r['token']:34} L {r['lo']:>24} -> {r['ln']:>24} {r['ld']:.3f}{flag(r['ld']):2}"
          + ("" if r.get("invariant") else f" | D {r['do']:>24} -> {r['dn']:>24} {r['dd']:.3f}{flag(r['dd'])}"))
print("\nCONTRAST")
for c in checks:
    ok = "ok " if c["after"] >= c["need"] else "LOW"
    was = "" if c["before"] >= c["need"] else " (already low)"
    print(f"  {ok} {c['mode']:5} {c['name']:36} {c['before']:5.2f} -> {c['after']:5.2f}  need {c['need']}{was}")
