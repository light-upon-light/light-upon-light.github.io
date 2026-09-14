"""Add sunnah.com reference numbers (field `s`) to the Sahih Muslim corpus files.

The corpus `n` for Muslim is the upstream edition's sequential number (1-7563),
not sunnah.com's reference number. Upstream carries the sunnah.com number as
`arabicnumber` ("2490", "1422.02" for 1422b); the original build dropped it.

    uv run python _notes/scripts/hadith/add_muslim_sunnah_ref.py [--src DIR]

--src reads eng-muslim.min.json / ara-muslim.min.json from DIR instead of
fetching them from jsDelivr. Idempotent: an existing `s` is recomputed.
"""

import argparse
import json
import pathlib
import string
import urllib.request

URL = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{}.min.json"
ROOT = pathlib.Path(__file__).resolve().parents[3]
DATA = ROOT / "_notes" / "data" / "hadith"


def load_edition(name, src):
    if src:
        return json.loads((pathlib.Path(src) / f"{name}.min.json").read_text(encoding="utf-8"))["hadiths"]
    with urllib.request.urlopen(URL.format(name)) as r:
        return json.loads(r.read().decode("utf-8"))["hadiths"]


def sunnah_ref(arabicnumber):
    """'1422.02' -> '1422b', '2490' -> '2490', None -> None."""
    if arabicnumber is None:
        return None
    whole, _, sub = str(arabicnumber).partition(".")
    if not sub:
        return whole
    i = int(sub)
    assert 1 <= i <= 26, arabicnumber
    return whole + string.ascii_lowercase[i - 1]


def rewrite(path, upstream, check_ref):
    raw = path.read_bytes().decode("utf-8")
    nl = "\r\n" if "\r\n" in raw else "\n"
    records = [json.loads(line) for line in raw.splitlines() if line]
    assert len(records) == len(upstream), (path, len(records), len(upstream))
    out = []
    for rec, up in zip(records, upstream):
        assert rec["n"] == up["hadithnumber"], (path, rec["n"], up["hadithnumber"])
        if check_ref:
            assert {"book": rec["b"], "hadith": rec["h"]} == up["reference"], (path, rec["n"])
        rest = {k: v for k, v in rec.items() if k not in ("n", "s")}
        out.append({"n": rec["n"], "s": sunnah_ref(up.get("arabicnumber")), **rest})
    path.write_bytes((nl.join(json.dumps(r, ensure_ascii=False) for r in out) + nl).encode("utf-8"))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src")
    args = ap.parse_args()
    eng = load_edition("eng-muslim", args.src)
    ara = load_edition("ara-muslim", args.src)
    for e, a in zip(eng, ara, strict=True):
        assert e["hadithnumber"] == a["hadithnumber"] and e.get("arabicnumber") == a.get("arabicnumber")
    en = rewrite(DATA / "en" / "muslim.jsonl", eng, check_ref=True)
    rewrite(DATA / "ar" / "muslim.jsonl", ara, check_ref=False)
    refs = [r["s"] for r in en if r["s"]]
    assert len(refs) == len(set(refs)), "duplicate sunnah.com reference"
    print(f"{len(en)} records, {len(refs)} with s, {len(en) - len(refs)} with s = null")


if __name__ == "__main__":
    main()
