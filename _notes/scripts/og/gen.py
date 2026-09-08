"""Generate Open Graph / link-preview cards for every article page.

Renders _notes/scripts/og/og.html once per page with headless Chrome at
1200x630 and writes PNGs to assets/images/og/. Each page points at its card
via `header.og_image` in front matter; _config.yml `og_image` is the
fallback (assets/images/og/default.png). The theme's _includes/seo.html
prefers page.header.og_image and falls back to site.og_image.

Usage (from repo root or anywhere):
    python _notes/scripts/og/gen.py               # regenerate all
    python _notes/scripts/og/gen.py quran aisha   # regenerate named slugs

Requires Google Chrome. No other dependencies. Re-run whenever a page's
title or section label changes, or the CARDS list below is edited, then
commit the changed PNGs.
"""

import subprocess, sys, urllib.parse, pathlib, tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]  # _notes/scripts/og -> repo root
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTDIR = ROOT / "assets" / "images" / "og"
OUTDIR.mkdir(parents=True, exist_ok=True)

# og.html has the literal token FONTS where the assets/fonts file:// URL goes
html = (HERE / "og.html").read_text(encoding="utf-8").replace(
    "FONTS", (ROOT / "assets" / "fonts").as_uri()
)
page = pathlib.Path(tempfile.gettempdir()) / "lul_og_built.html"
page.write_text(html, encoding="utf-8")

SALLA = "\uFDFA"   # ﷺ  (rendered via Amiri in og.html)
RASM = "\u2019"    # ’

# (slug, kicker, title) -- kicker "" renders no kicker line.
# Titles are the short, card-friendly form, not necessarily page.title.
CARDS = [
    ("default", "", f"Articles on the Qur{RASM}an, the Prophet Muhammad {SALLA}, and Islam"),
    ("quran", "", f"The Qur{RASM}an and the Messenger {SALLA}: Evidence for Prophethood"),
    ("messenger", f"The Messenger of God {SALLA}", f"The Messenger {SALLA}: The Evidence in Full"),
    ("aisha", "Misconceptions About Islam", f"The Prophet Muhammad{RASM}s {SALLA} Marriage to Aisha"),
    ("jizya", "Misconceptions About Islam", "The Jizya: What Non-Muslims Paid, and What For"),
    ("polygyny", "Misconceptions About Islam", f"Four Wives: What the Qur{RASM}an Permits and What It Requires"),
    ("punishments", "Misconceptions About Islam", "The Hudud Punishments in Islam"),
    ("ridda", "Misconceptions About Islam", "Apostasy in Islam"),
    ("sword", "Misconceptions About Islam", "Did Islam Spread by the Sword?"),
    ("wadribuhunna", "Misconceptions About Islam", f"Does Qur{RASM}an 4:34 Permit Domestic Abuse?"),
    ("women", "Misconceptions About Islam", "Islam and Women"),
    ("about", "", "About this site"),
    ("messenger-character", f"The Messenger of God {SALLA}", "The man his companions and family knew"),
    ("messenger-claim", f"The Messenger of God {SALLA}", "Why believe his claim? The competing explanations"),
    ("messenger-earlier-scripture", f"The Messenger of God {SALLA}", "Earlier scripture and the prophetic claim"),
    ("messenger-encounters", f"The Messenger of God {SALLA}", "Encounters, changed minds, and later appraisals"),
    ("messenger-everyday-character", f"The Messenger of God {SALLA}", "Character in everyday relationships"),
    ("messenger-family", f"The Messenger of God {SALLA}", "Parents, marriage, women, and children"),
    ("messenger-health-and-creation", f"The Messenger of God {SALLA}", "Health, animals, and shared resources"),
    ("messenger-human-dignity", f"The Messenger of God {SALLA}", "Care for the vulnerable and human dignity"),
    ("messenger-justice", f"The Messenger of God {SALLA}", "Justice, religious difference, and restraint in conflict"),
    ("messenger-knowledge", f"The Messenger of God {SALLA}", "Knowledge, reason, and signs in nature"),
    ("messenger-life", f"The Messenger of God {SALLA}", "His life through hardship and power"),
    ("messenger-miracles", f"The Messenger of God {SALLA}", "Reported miracles and how to assess them"),
    ("messenger-predictions", f"The Messenger of God {SALLA}", "Predictions and their reported fulfillment"),
    ("messenger-quran", f"The Messenger of God {SALLA}", f"Muhammad {SALLA} and the Qur{RASM}an he delivered"),
    ("messenger-sources", f"The Messenger of God {SALLA}", "Sources, transmission, and bibliography"),
    ("messenger-work-and-authority", f"The Messenger of God {SALLA}", "Work, wealth, and public responsibility"),
    ("messenger-worship", f"The Messenger of God {SALLA}", "Worship, mercy, and the inner life"),
]

only = set(sys.argv[1:])
for slug, kicker, title in CARDS:
    if only and slug not in only:
        continue
    q = urllib.parse.urlencode({"title": title, "kicker": kicker})
    out = OUTDIR / f"{slug}.png"
    cmd = [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
           "--force-device-scale-factor=1", "--default-background-color=00000000",
           f"--screenshot={out}", "--window-size=1200,630",
           page.as_uri() + "?" + q]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    sz = out.stat().st_size if out.exists() else -1
    print(f"{slug:34s} {sz:>8d} bytes  rc={r.returncode}")
