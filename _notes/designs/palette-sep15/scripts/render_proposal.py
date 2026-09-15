"""Render proposal.json (from propose.py) into ../2-consolidation-proposal.html, reusing the
palette demo's stylesheet so the two pages read as one set."""
import json, html, re, pathlib, collections

HERE = pathlib.Path(__file__).parent
data = json.loads((HERE / "proposal.json").read_text(encoding="utf8"))
tpl = (HERE / "template.html").read_text(encoding="utf8")
style = re.search(r"<style>(.*?)</style>", tpl, flags=re.S)[1]
fonts = re.search(r'(<link rel="preconnect".*?display=swap">)', tpl, flags=re.S)[1]
e = html.escape
S = data["stats"]
rows, checks, base = data["rows"], data["checks"], data["base"]


def grade(d):
    if d < 0.005:
        return "same", "Unchanged"
    if d < 0.02:
        return "tiny", "Imperceptible"
    if d < 0.05:
        return "slight", "Slight"
    return "visible", "Visible"


def sw(v):
    return f'<span class="mini" style="background:{e(v)}" title="{e(v)}"></span>'


# how many tokens reference each base, per mode
uses = collections.defaultdict(lambda: [0, 0])
for r in rows:
    for i, key in enumerate(("lref", "dref")):
        ref = r.get(key)
        if ref:
            name = re.match(r"(?:darken\()?([a-z0-9-]+)", ref)[1]
            uses[name][i] += 1

families = collections.OrderedDict()
for name, (fam, hexv, note) in base.items():
    families.setdefault(fam, []).append((name, hexv, note))

base_html = ""
for fam, items in families.items():
    cards = ""
    for name, hexv, note in items:
        lu, du = uses[name]
        new = note.startswith("NEW")
        cards += (
            f'<div class="base{" base--new" if new else ""}"><span class="big" style="background:{e(hexv)}"></span>'
            f'<div class="bmeta"><code>${e(name)}</code><span class="hex">{e(hexv)}</span>'
            f'<span class="bnote">{e(note)}</span>'
            f'<span class="bcount">{lu} light · {du} dark</span></div></div>'
        )
    base_html += f'<h3 class="fam">{e(fam)}</h3><div class="bases">{cards}</div>'


def side(old, new, ref, d):
    if old is None:
        return '<td class="na" colspan="1">Same in both modes</td>'
    g, lab = grade(d)
    return (
        f'<td><div class="chg">{sw(old)}<span class="arrow" aria-hidden="true">→</span>{sw(new)}'
        f'<div class="chgt"><code>{e(ref)}</code><span class="vals">{e(old)} → {e(new)}</span></div>'
        f'<span class="pill pill--{g}" title="OKLab ΔE {d:.3f}">{lab}</span></div></td>'
    )


tr = ""
for r in rows:
    worst = max(r["ld"], r["dd"] or 0)
    tr += (
        f'<tr data-grade="{grade(worst)[0]}"><th scope="row"><code>{e(r["token"])}</code></th>'
        + side(r["lo"], r["ln"], r["lref"], r["ld"])
        + side(r["do"], r["dn"], r["dref"], r["dd"])
        + "</tr>"
    )

ct = ""
fails_before = sum(c["before"] < c["need"] for c in checks)
fails_after = sum(c["after"] < c["need"] for c in checks)
for c in checks:
    ok = c["after"] >= c["need"]
    fixed = c["before"] < c["need"] <= c["after"]
    status = "Fixed" if fixed else ("Passes" if ok else "Fails")
    cls = "fixed" if fixed else ("pass" if ok else "fail")
    delta = c["after"] - c["before"]
    ct += (
        f'<tr><th scope="row">{e(c["name"])}</th><td>{e(c["mode"])}</td>'
        f'<td class="num">{c["before"]:.2f}</td><td class="num">{c["after"]:.2f}</td>'
        f'<td class="num dim">{delta:+.2f}</td><td class="num dim">{c["need"]:g}</td>'
        f'<td><span class="pill pill--{cls}">{status}</span></td></tr>'
    )

visible = [r for r in rows if max(r["ld"], r["dd"] or 0) >= 0.05]

extra_css = """
  .page { max-width: 1180px; margin: 0 auto; }
  .lede { max-width: 68ch; }
  main.solo section { margin-bottom: 56px; }
  .decide { margin: 12px 0 0; padding: 0; list-style: none; display: grid; gap: 12px; max-width: 78ch; }
  .decide li { padding: 12px 14px; background: var(--raised); border-radius: 3px; }
  .decide b { font-family: Karla, -apple-system, "Segoe UI", Arial, sans-serif; display: block; margin-bottom: 2px; }
  .fam { font: 700 12px/1 Karla, -apple-system, "Segoe UI", Arial, sans-serif; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 22px 0 10px; }
  .bases { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
  .base { display: grid; grid-template-columns: 52px 1fr; gap: 10px; align-items: start; padding: 8px; border: 1px solid var(--rule); border-radius: 3px; }
  .base--new { border-color: var(--gold); }
  .big { width: 52px; height: 52px; border-radius: 2px; box-shadow: inset 0 0 0 1px var(--spec-edge); }
  .bmeta { display: flex; flex-direction: column; gap: 1px; min-width: 0; font-size: 13px; line-height: 1.35; }
  .bmeta code { font-weight: 600; font-size: 13px; overflow-wrap: anywhere; }
  .bnote { color: var(--muted); }
  .base--new .bnote { color: var(--gold); font-weight: 600; }
  .bcount { color: var(--muted); font-family: Karla, -apple-system, "Segoe UI", Arial, sans-serif; font-size: 12px; font-variant-numeric: tabular-nums; }
  .tablewrap { overflow-x: auto; margin-top: 10px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { text-align: left; vertical-align: top; padding: 9px 10px 9px 0; border-bottom: 1px solid var(--rule); }
  thead th { font: 700 11px/1.2 Karla, -apple-system, "Segoe UI", Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); border-bottom: 2px solid var(--ink); }
  tbody th { font-weight: 400; }
  tbody th code { font-size: 13px; }
  .num { font-variant-numeric: tabular-nums; text-align: right; font-family: ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; font-size: 13px; }
  .dim { color: var(--muted); }
  .na { color: var(--muted); font-style: italic; }
  .chg { display: grid; grid-template-columns: auto auto auto 1fr auto; align-items: center; gap: 6px; min-width: 330px; }
  .mini { width: 26px; height: 26px; border-radius: 2px; box-shadow: inset 0 0 0 1px var(--spec-edge); }
  .arrow { color: var(--muted); }
  .chgt { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
  .chgt code { font-size: 12.5px; }
  .vals { font-family: ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; font-size: 11.5px; color: var(--muted); overflow-wrap: anywhere; }
  .pill { font: 700 11px/1 Karla, -apple-system, "Segoe UI", Arial, sans-serif; letter-spacing: 0.04em; padding: 4px 7px; border-radius: 999px; white-space: nowrap; border: 1px solid transparent; }
  .pill--same { color: var(--muted); border-color: var(--rule); }
  .pill--tiny { color: var(--muted); background: var(--raised); }
  .pill--slight { color: var(--ink); background: var(--rule); }
  .pill--visible, .pill--fail { color: var(--ground); background: var(--ink); }
  .pill--pass { color: var(--muted); border-color: var(--rule); }
  .pill--fixed { color: var(--ground); background: var(--gold); }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; margin-top: 8px; font-family: Karla, -apple-system, "Segoe UI", Arial, sans-serif; font-size: 14px; }
  .toolbar input { accent-color: var(--gold); }
  pre { background: var(--raised); padding: 14px 16px; border-radius: 3px; overflow-x: auto; font-size: 13px; line-height: 1.5; }
  .sec p + p { margin-top: 8px; }
"""

decisions = f"""
<ul class="decide">
  <li><b>1 · Warm the light-mode ground and ink.</b> The page ground <code>#f3f3f3</code> and ink <code>#343434</code> are the only hueless colours left: everything the site added, and all of dark mode, sits in one warm band (OKLCH hue 70–90). Proposed <code>#f4f2ee</code> / <code>#3a3631</code> keep their lightness, so contrast barely moves (body text 11.2 → 10.7:1). Side by side the page reads a shade warmer; alone it is hard to spot.</li>
  <li><b>2 · Darken light-mode muted text.</b> Dates and page meta are <code>#8e8b82</code>, only 3.07:1 on the ground, under the 4.5:1 AA minimum. Proposed: the source-text umber <code>#6f6152</code> (5.35:1). This is the one clearly visible change. If muted text should stay distinguishable from source-quote text, a step between the two (about 4.6:1) also works.</li>
  <li><b>3 · Collapse dark-mode surfaces to three steps.</b> Seven surface colours sit between OKLab L 0.25 and 0.29: footer, form, code, key-terms, summary card, TOC bar, glossary tip. Proposed: <code>night-22</code> ground, <code>night-25</code> raised, <code>night-29</code> bar or tip. The largest move is ΔE 0.013.</li>
  <li><b>4 · Summary-card border in dark mode.</b> <code>#3a342b</code> was chosen in today's redesign. Mapping it onto the dark border <code>#4a4238</code> is the one other visible change (ΔE 0.056). If the softer line matters, it can keep its value as a card-only exception.</li>
  <li><b>5 · Two rules move to an existing step.</b> The dark default-blockquote rule goes from <code>#6b6152</code> (2.86:1, under the 3:1 minimum for a meaningful rule) to <code>#8a7d68</code> (4.31:1), the same umber as the source-quote rule. The light glossary-tip border goes from <code>#5c5445</code> to <code>#6f6152</code>, which only shows on the tip's dark card.</li>
</ul>"""

body = f"""
<header class="masthead page">
  <h1>Palette <span>Consolidation</span></h1>
  <p class="lede">A proposal to rebuild the site's colours from a small set of base colours. Every property in <code>_dirt.scss</code> would reference one of them instead of carrying its own hex value. Nothing here is applied yet. Values come from the current <code>_dirt.scss</code>; differences are OKLab ΔE on each mode's page ground (below 0.02 is invisible side by side).</p>
  <ul class="facts">
    <li><b>{S['base']}</b>base colours</li>
    <li><b>{S['old_l']} → {S['new_l']}</b>distinct light values</li>
    <li><b>{S['old_d']} → {S['new_d']}</b>distinct dark values</li>
    <li><b>{len(visible)}</b>visible changes</li>
    <li><b>{fails_before} → {fails_after}</b>contrast failures</li>
  </ul>
</header>
<main class="solo page">
  <section id="decide"><header class="sec"><h2>Decisions for you</h2><p>Everything else is a merge nobody would notice. These five change what a reader sees, or undo a recent choice.</p></header>{decisions}</section>

  <section id="base"><header class="sec"><h2>Base colours</h2><p>A warm neutral ramp named by lightness (paper → sand/bone → umber → ink → night), then the three accent families already in use, plus white and black. Existing values were kept wherever one already sat on a step; only the two outlined in gold are new.</p></header>{base_html}</section>

  <section id="changes"><header class="sec"><h2>Every property, before and after</h2><p>Theme notice boxes are left out: no page uses them, so their precomputed values stay as they are.</p></header>
    <div class="toolbar"><label><input type="checkbox" id="only-changed"> Show only properties that visibly change (slight or visible)</label></div>
    <div class="tablewrap"><table><thead><tr><th>Property</th><th>Light</th><th>Dark</th></tr></thead><tbody id="chg-body">{tr}</tbody></table></div>
  </section>

  <section id="contrast"><header class="sec"><h2>Contrast re-check</h2><p>WCAG 2 ratios for the pairs that matter, composited over the real ground. 4.5:1 for text and 3:1 for rules and focus rings. The dark default-blockquote rule was 2.86:1, below the 3.3:1 its comment claims, so it moves to <code>umber-60</code>.</p></header>
    <div class="tablewrap"><table><thead><tr><th>Pair</th><th>Mode</th><th class="num">Now</th><th class="num">Proposed</th><th class="num">Δ</th><th class="num">Needs</th><th>Result</th></tr></thead><tbody>{ct}</tbody></table></div>
  </section>

  <section id="how"><header class="sec"><h2>How it would be built</h2><p>Base colours become Sass variables at the top of <code>_dirt.scss</code>. Properties interpolate them, and the theme's darken and alpha stand-ins go back to real Sass calls. That deletes about twenty hand-precomputed values, and the three-block light/dark/print structure stays as it is.</p></header>
<pre><code>$paper-96: #f4f2ee;
$ink-33:   #3a3631;
$umber-50: #6f6152;

@mixin site-light-palette {{
  --mm-background-color: #{{$paper-96}};
  --mm-text-color: #{{$ink-33}};
  --mm-primary-color-h00025: #{{mix(#000, $ink-33, 25%)}};
  --site-floatnav-bg: #{{rgba($ink-33, 0.55)}};
}}</code></pre>
  <p>One commit for the rebuild with no visual change, then one commit per decision above, so each can be reverted alone.</p>
  </section>
</main>
<script>
  (function () {{
    var box = document.getElementById("only-changed");
    var rows = document.querySelectorAll("#chg-body tr");
    box.addEventListener("change", function () {{
      Array.prototype.forEach.call(rows, function (r) {{
        var g = r.getAttribute("data-grade");
        r.hidden = box.checked && g !== "slight" && g !== "visible";
      }});
    }});
  }})();
</script>
"""

out = (
    "<title>Palette Consolidation</title>\n"
    '<meta name="description" content="Proposal to rebuild the Light upon Light palette from shared base colours.">\n'
    + fonts + "\n<style>" + style + extra_css + "</style>\n" + body
)
(HERE.parent / "2-consolidation-proposal.html").write_text(out, encoding="utf8")
print("visible:", [r["token"] for r in visible], "fails", fails_before, "->", fails_after)
