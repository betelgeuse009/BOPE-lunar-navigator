"""Check or download the LOLA / LROC maps into data/raw/maps/ (about 6.6 GB in total; list in data/MAPS.md).

Run from the repo root:
  .venv/Scripts/python.exe -m analysis.download_maps --check     report which maps are present and complete
  .venv/Scripts/python.exe -m analysis.download_maps             download the missing ones (skips the 3.3 GB 5 m map)
  .venv/Scripts/python.exe -m analysis.download_maps --all       also download the 5 m map
data/raw/ is git-ignored: everyone keeps their own copy.
"""
from __future__ import annotations

import argparse
import urllib.request

from . import config

BIG = {"dem_87s_5m"}   # only with --all


def status(key: str) -> str:
    rel, _url, size = config.MAPS[key]
    path = config.MAPS_DIR / rel
    if not path.exists():
        return "missing"
    return "ok" if path.stat().st_size == size else f"wrong size ({path.stat().st_size} bytes, expected {size})"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="only report, download nothing")
    ap.add_argument("--all", action="store_true", help="include the 3.3 GB 5 m south-pole map")
    args = ap.parse_args()
    problems = 0
    for key, (rel, url, size) in config.MAPS.items():
        st = status(key)
        if st == "ok" or args.check or (key in BIG and not args.all) or url is None:
            note = "" if st == "ok" else ("  (download by hand, see data/MAPS.md)" if url is None else
                                          "  (skipped: use --all)" if key in BIG and not args.all and not args.check else "")
            print(f"{st:>8}  {rel}  ({size / 1e6:,.0f} MB){note}")
            problems += st != "ok"
            continue
        path = config.MAPS_DIR / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        print(f"     get  {url}  ({size / 1e6:,.0f} MB)")
        tmp = path.with_name(path.name + ".part")
        req = urllib.request.Request(url, headers={"User-Agent": "lunar-navigator-maps"})
        with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)
        tmp.replace(path)
        print(f"{status(key):>8}  {rel}")
    print("all maps present" if not problems else f"{problems} map(s) missing or incomplete")


if __name__ == "__main__":
    main()
