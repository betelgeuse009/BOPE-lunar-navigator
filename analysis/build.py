"""Static build: writes the contract files to disk, as an offline fallback for the API.

Run from the repo root:   .venv/Scripts/python.exe -m analysis.build              (writes data/samples/)
Then check:               .venv/Scripts/python.exe contracts/validate.py data/samples

The catalogue currently holds only example points (analysis/sites.py), so the default output is data/samples/.
Once the curated sites exist (T05), run it with  --out data/processed.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import config, horizon, products, sites
from .metrics import Inputs

PERIODS = [("2026-11", "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z"),
           ("2026-12", "2026-12-01T00:00:00Z", "2027-01-01T00:00:00Z")]
MATRIX_DATES = 30   # one landing per day from the start of the first period


def write(out: Path, rel: str, doc: dict) -> None:
    path = out / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {path.relative_to(config.REPO)} ({path.stat().st_size / 1024:.0f} kB)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", default="data/samples", help="output folder, relative to the repo root")
    out = config.REPO / ap.parse_args().out
    inp = Inputs()
    has_terrain = horizon.terrain_available()
    if has_terrain:
        for s in sites.SITES:
            write(out, f"horizon/{s['id']}.json", products.horizon_doc(s["id"], s["lat_deg"], s["lon_deg"], inp.obs_height_m))
    for pid, start, end in PERIODS:
        write(out, f"scene/{pid}.json", products.scene_doc(pid, start, end, config.STEP_S))
        for s in sites.SITES:
            write(out, f"ephemeris/{s['id']}_{pid}.json",
                  products.ephemeris_doc(s["id"], pid, s["lat_deg"], s["lon_deg"], start, end, config.STEP_S, inp))
            write(out, f"metrics/{s['id']}_{pid}.json",
                  products.metrics_doc(s["id"], pid, s["lat_deg"], s["lon_deg"], start, end, config.CALC_STEP_S, inp))
    write(out, "matrix.json", products.matrix_doc(
        [s["id"] for s in sites.SITES], [s["lat_deg"] for s in sites.SITES], [s["lon_deg"] for s in sites.SITES],
        PERIODS[0][1], MATRIX_DATES, 24.0, config.MISSION_H, config.AREA_CALC_STEP_S, inp, config.SCORE_WEIGHTS))
    write(out, "sites.json", products.sites_doc())
    write(out, "manifest.json", products.manifest_doc(PERIODS, config.STEP_S, has_matrix=True, has_horizon=has_terrain))


if __name__ == "__main__":
    main()
