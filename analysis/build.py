"""Static build: writes the contract files to disk, the offline fallback for the API (the front end reads them when the
API is not running, e.g. on a public demo link).

Run from the repo root:
  .venv/Scripts/python.exe -m analysis.build            data/processed/: full set for the 31 known landing sites
                                                        (several minutes with the terrain maps)
  .venv/Scripts/python.exe -m analysis.build --sites    only data/processed/sites.json (seconds)
  .venv/Scripts/python.exe -m analysis.build --samples  data/samples/: full set for the 3 example points
Then check:  .venv/Scripts/python.exe contracts/validate.py data/processed

What the full set contains (contracts/README.md):
  manifest.json, sites.json
  horizon/<site>.json               terrain skyline (720 azimuths)
  ephemeris/<site>_<period>.json    Sun/Earth every 10 min for each period (ENU vectors left out to halve the size;
                                    the API has them)
  metrics/<site>_<period>.json      metrics with uncertainties, Sun/Earth windows, countdowns
  scene/<period>.json               sub-solar / sub-Earth points for the globe lighting
  matrix.json                       sites x landing dates: one landing per day over MATRIX_DAYS (seasonal changes),
                                    14-day missions
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from . import config, horizon, products, sites
from .metrics import Inputs

PERIODS = [("2026-11", "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z"),
           ("2026-12", "2026-12-01T00:00:00Z", "2027-01-01T00:00:00Z")]
MATRIX_FIRST = "2026-11-01T00:00:00Z"
MATRIX_DAYS = 181          # Nov 2026 .. Apr 2027: one landing per day, about six lunar days
SAMPLES_MATRIX_DAYS = 30


def write(out: Path, rel: str, doc: dict) -> None:
    path = out / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {path.relative_to(config.REPO)} ({path.stat().st_size / 1024:.0f} kB)", flush=True)


def build_set(out: Path, site_list: list[dict], matrix_days: int, include_enu: bool) -> None:
    """Every contract file for `site_list` into `out`."""
    t0 = time.time()
    inp = Inputs()
    has_terrain = horizon.terrain_available()
    write(out, "sites.json", products.sites_doc(site_list))
    if has_terrain:
        for s in site_list:
            write(out, f"horizon/{s['id']}.json", products.horizon_doc(s["id"], s["lat_deg"], s["lon_deg"], inp.obs_height_m))
    for pid, start, end in PERIODS:
        write(out, f"scene/{pid}.json", products.scene_doc(pid, start, end, config.STEP_S))
        for s in site_list:
            write(out, f"ephemeris/{s['id']}_{pid}.json",
                  products.ephemeris_doc(s["id"], pid, s["lat_deg"], s["lon_deg"], start, end, config.STEP_S, inp,
                                         include_enu=include_enu))
            write(out, f"metrics/{s['id']}_{pid}.json",
                  products.metrics_doc(s["id"], pid, s["lat_deg"], s["lon_deg"], start, end, config.CALC_STEP_S, inp))
    write(out, "matrix.json", products.matrix_doc(
        [s["id"] for s in site_list], [s["lat_deg"] for s in site_list], [s["lon_deg"] for s in site_list],
        MATRIX_FIRST, matrix_days, 24.0, config.MISSION_H, config.AREA_CALC_STEP_S, inp, config.SCORE_WEIGHTS))
    # The manifest goes last: the front end switches to data/processed/ as soon as it exists.
    write(out, "manifest.json", products.manifest_doc(PERIODS, config.STEP_S, has_matrix=True, has_horizon=has_terrain,
                                                      site_list=site_list))
    print(f"done in {time.time() - t0:.0f} s", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--sites", action="store_true", help="only write data/processed/sites.json")
    ap.add_argument("--samples", action="store_true", help="write data/samples/ for the 3 example points")
    args = ap.parse_args()
    processed = config.REPO / "data" / "processed"
    if args.sites:
        write(processed, "sites.json", products.sites_doc(sites.CATALOG))
    elif args.samples:
        build_set(config.REPO / "data" / "samples", sites.EXAMPLES, SAMPLES_MATRIX_DAYS, include_enu=True)
    else:
        build_set(processed, sites.CATALOG, MATRIX_DAYS, include_enu=False)


if __name__ == "__main__":
    main()
