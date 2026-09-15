"""Rollout helper for the palette picks.

  uv run python splice_verify.py splice N   write stage N's palette into _dirt.scss
  uv run python splice_verify.py verify N   compare _site/assets/css/main.css to stage N

Run emit_sass.py N first (it writes expected.json and contrast.txt)."""
import json, pathlib, re, sys

HERE = pathlib.Path(__file__).parent
REPO = HERE.resolve().parents[3]
DIRT = REPO / "_sass/minimal-mistakes/skins/_dirt.scss"
cmd, stage = sys.argv[1], int(sys.argv[2])

if cmd == "splice":
    tpl = (HERE / "palette_block.scss.tpl").read_text(encoding="utf8")
    warm = stage >= 2
    muted = stage >= 3
    block = (tpl.replace("{{PAPER96}}", "#f4f2ee" if warm else "#f3f3f3")
             .replace("{{INK33}}", "#3a3631" if warm else "#343434")
             .replace("{{UMBER54}}", "$umber-54: #7a6c5c;\n" if muted else "")
             .replace("{{MUTED}}", "#{$umber-54}" if muted else "#8e8b82")
             .replace("{{MUTED50}}", "#{rgba($umber-54, 0.5)}" if muted else "rgba(142, 139, 130, 0.5)")
             .replace("{{CONTRAST}}", (HERE / "contrast.txt").read_text(encoding="utf8")))
    assert "{{" not in block
    src = DIRT.read_text(encoding="utf8")
    start = src.index("/* Base colours.") if "/* Base colours." in src else src.index("/* Light palette")
    end = src.index("/* Explicit choice, via [data-theme]")
    DIRT.write_text(src[:start] + block + "\n" + src[end:], encoding="utf8", newline="\n")
    print("spliced stage", stage)
    sys.exit()

# ---- verify ---------------------------------------------------------------
css = (REPO / "_site/assets/css/main.css").read_text(encoding="utf8")
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def props(sel):
    i = css.index(sel + "{") + len(sel) + 1
    return dict(re.findall(r"(--[a-z0-9-]+):\s*([^;}]+)", css[i:css.index("}", i)]))


NAMED = {"white": "#ffffff", "black": "#000000"}


def num(v):
    v = NAMED.get(v.strip(), v.strip())
    if v.startswith("#"):
        h = v[1:]
        h = "".join(c * 2 for c in h) if len(h) in (3, 4) else h
        return [int(h[i:i + 2], 16) for i in (0, 2, 4)] + [1.0]
    n = [float(x) for x in re.findall(r"[\d.]+", v)]
    return n[:3] + [n[3] if len(n) > 3 else 1.0]


light = props(":root")
dark = props(':root[data-theme="dark"]')
expected = json.loads((HERE / "expected.json").read_text(encoding="utf8"))
bad = 0
for tok, (ev_l, ev_d) in expected.items():
    for mode, got_tab, ev in (("light", light, ev_l), ("dark", dark, ev_d)):
        if tok.startswith("--site-poster") or tok == "--site-ondark-gold":
            if mode == "dark":
                continue
        got = got_tab.get(tok)
        while got and got.startswith("var("):
            got = got_tab.get(got[4:-1]) or light.get(got[4:-1])
        if got is None:
            print("MISSING", mode, tok); bad += 1; continue
        a, b = num(got), num(ev)
        if max(abs(a[i] - b[i]) for i in range(3)) > 1 or abs(a[3] - b[3]) > 0.001:
            print("DIFF", mode, tok, got, "expected", ev); bad += 1
extra = [t for t in list(light) + list(dark) if t not in expected and "notice" not in t]
print("unexpected tokens:", sorted(set(extra)))
print(f"stage {stage}: {'OK' if not bad else str(bad) + ' problems'}")
sys.exit(1 if bad else 0)
