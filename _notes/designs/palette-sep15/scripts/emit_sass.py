"""Apply the picks from 3-decisions.html (1B 2B 3B 4A 5A 6A) to propose.py's
mapping. Writes expected.json (token -> [light, dark] colour) and contrast.txt
for one stage of the rollout, so a build can be checked against it:

  STAGE=1  base colours, invisible merges, dark surfaces merged (3B)
  STAGE=2  + warm light ground and ink (1B)
  STAGE=3  + light muted text #7a6c5c (2B)

Usage: uv run python emit_sass.py 3
"""
import contextlib, io, json, pathlib, sys

with contextlib.redirect_stdout(io.StringIO()):
    import propose as p

HERE = pathlib.Path(__file__).parent
STAGE = int(sys.argv[1]) if len(sys.argv) > 1 else 3
LIT = "lit"

B = dict(p.B)
B["umber-54"] = p.rgba("#7a6c5c")
if STAGE < 2:
    B["paper-96"], B["ink-33"] = p.rgba("#f3f3f3"), p.rgba("#343434")

MAP = dict(p.MAP)
MAP["--site-tldr-line"] = (MAP["--site-tldr-line"][0], (LIT, "#3a342b"))                                   # 4A
MAP["--site-blockquote-border-default"] = (MAP["--site-blockquote-border-default"][0], (LIT, "#6b6152"))   # 5A
MAP["--site-glosstip-border"] = ((LIT, "#5c5445"), MAP["--site-glosstip-border"][1])                       # 6A
if STAGE >= 3:
    MAP["--mm-muted-text-color"] = (p.ref("umber-54"), MAP["--mm-muted-text-color"][1])
    MAP["--mm-muted-text-color-alpha-50"] = (p.ref("umber-54", .5), MAP["--mm-muted-text-color-alpha-50"][1])
else:
    MAP["--mm-muted-text-color"] = ((LIT, "#8e8b82"), MAP["--mm-muted-text-color"][1])
    MAP["--mm-muted-text-color-alpha-50"] = ((LIT, "rgba(142, 139, 130, 0.5)"), MAP["--mm-muted-text-color-alpha-50"][1])


def resolve(r):
    if r[0] == LIT:
        return p.rgba(r[1])
    if r[0] == "mix":
        c = B[r[1]]
        return tuple(round(c[i] * (1 - r[2])) for i in range(3)) + (1.0,)
    if r[0] == "rgba":
        return B[r[1]][:3] + (r[2],)
    return B[r[0]][:3] + ((r[1] if r[1] is not None else 1.0),)


expected = {t: [p.css(resolve(MAP[t][0])), p.css(resolve(MAP[t][1]))] for t in MAP}
expected.update({t: [p.css(resolve(r))] * 2 for t, r in p.IMAP.items()})
(HERE / "expected.json").write_text(json.dumps(expected, indent=1), encoding="utf8")

PAIRS = p.PAIRS + [
    ("Link hover on page", "--mm-link-color-hover", "--mm-background-color", 4.5),
]
lines = []
for name, fg, bg, need in PAIRS:
    vals = []
    for mode in (0, 1):
        g = resolve(MAP["--mm-background-color"][mode])
        b = p.over(resolve(MAP[bg][mode]), g)
        vals.append(p.cr(p.over(resolve(MAP[fg][mode]), b), b))
    flag = lambda v: "" if v >= need else " (below)"
    lines.append(f"     {name:34} {vals[0]:5.1f}:1{flag(vals[0]):8} {vals[1]:5.1f}:1{flag(vals[1])}")
table = "     {:34} {:>15} {:>9}\n".format("pair (minimum 4.5, rules 3)", "light", "dark") + "\n".join(lines)
(HERE / "contrast.txt").write_text(table, encoding="utf8")
print(f"stage {STAGE}: {len(expected)} tokens\n{table}")
