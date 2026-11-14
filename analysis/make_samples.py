"""Generate contract-valid SAMPLE files in data/samples/ from the real SPICE kernels.

Purpose: give FE realistic numbers to build on before the curated sites and terrain horizons exist.
The three sites are example points chosen to show three regimes (they are NOT landing sites):
  south pole (Sun grazing the horizon), near-side centre (Earth always high), far-side centre (Earth never up).
Terrain is ignored: visible fractions use a flat 0 deg horizon. Windows have the resolution of the time step
(no bisection refinement yet). Uncertainties are null (not estimated yet).

Run:  .venv/Scripts/python.exe analysis/make_samples.py
Check: .venv/Scripts/python.exe contracts/validate.py data/samples
"""
from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone

import numpy as np

import ephemeris as eph

OUT = eph.REPO / "data" / "samples"
STEP_S = 600
PERIODS = [("2026-11", "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z"),
           ("2026-12", "2026-12-01T00:00:00Z", "2027-01-01T00:00:00Z")]
SITES = [
    {"id": "example-south-pole", "name": "Example: south pole", "lat_deg": -89.5, "lon_deg": -135.0},
    {"id": "example-near-side", "name": "Example: near-side centre", "lat_deg": 0.0, "lon_deg": 0.0},
    {"id": "example-far-side", "name": "Example: far-side centre", "lat_deg": 0.0, "lon_deg": 180.0},
]
OBS_HEIGHT_M = 2.0
SUN_THRESHOLD = 0.5
EARTH_MIN_ELEV_DEG = 0.0
MISSION_H = 14 * 24
NOTES = ("SAMPLE DATA for front-end development. Example points, not landing sites. "
         "Flat 0 deg horizon (terrain ignored). Windows at time-step resolution. Uncertainty not estimated.")


def git_tool(script: str) -> str:
    try:
        sha = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=eph.REPO, text=True).strip()
    except Exception:
        sha = "unknown"
    return f"analysis/{script}@{sha}"


def header(datasets: list[str]) -> dict:
    return {
        "contract_version": "0.1",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": {"datasets": [{"name": n} for n in datasets], "tool": git_tool("make_samples.py"), "notes": NOTES},
    }


def r(a, nd):
    return np.round(np.asarray(a, dtype=float), nd).tolist()


def runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Contiguous True runs as (start, end_exclusive) index pairs."""
    m = np.concatenate([[False], mask, [False]]).astype(int)
    d = np.diff(m)
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))


def longest_h(mask: np.ndarray) -> float:
    rs = runs(mask)
    return max((e - s) for s, e in rs) * STEP_S / 3600.0 if rs else 0.0


def windows(mask: np.ndarray, times: list[str], end_utc: str) -> list[dict]:
    return [{"start_utc": times[s], "end_utc": times[e] if e < len(times) else end_utc} for s, e in runs(mask)]


def metric(v):
    return {"value": None if v is None else round(float(v), 4), "uncertainty": None}


def write(rel: str, data: dict) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {path.relative_to(eph.REPO)} ({path.stat().st_size / 1024:.0f} kB)")


def main() -> None:
    datasets = eph.load_kernels()
    r_sun, r_earth = eph.body_radius_km("SUN"), eph.body_radius_km("EARTH")
    times = eph.utc_grid(PERIODS[0][1], PERIODS[-1][2], STEP_S)
    ets = eph.utc_to_et(times)
    phase = eph.earth_phase_frac(ets)

    # Site-independent scene files (sub-solar / sub-Earth points) for the 3D globe.
    ss_lat, ss_lon = eph.sub_point("SUN", ets)
    se_lat, se_lon = eph.sub_point("EARTH", ets)
    for pid, start, end in PERIODS:
        i0, i1 = times.index(start), (times.index(end) if end in times else len(times))
        write(f"scene/{pid}.json", {
            **header(datasets), "period_id": pid, "aberration_correction": eph.ABCORR,
            "time_utc": times[i0:i1],
            "subsolar_lat_deg": r(ss_lat[i0:i1], 3), "subsolar_lon_deg": r(ss_lon[i0:i1], 3),
            "subearth_lat_deg": r(se_lat[i0:i1], 3), "subearth_lon_deg": r(se_lon[i0:i1], 3),
            "earth_phase_frac": r(phase[i0:i1], 4),
        })

    landing = [t for t in times if t.endswith("T00:00:00Z") and t < PERIODS[0][2]]
    n_mission = MISSION_H * 3600 // STEP_S
    cells = {k: [] for k in ["sunlit_frac", "earth_visible_frac", "both_frac", "longest_dark_h", "longest_no_earth_h"]}

    for site in SITES:
        obs = eph.site_position_km(site["lat_deg"], site["lon_deg"], OBS_HEIGHT_M)
        sun, earth = eph.topocentric("SUN", ets, obs), eph.topocentric("EARTH", ets, obs)
        sun_rad = eph.angular_radius_deg(r_sun, sun["dist_km"])
        earth_rad = eph.angular_radius_deg(r_earth, earth["dist_km"])
        sun_vis = eph.visible_disk_frac(sun["el_deg"], sun_rad)
        earth_vis = eph.visible_disk_frac(earth["el_deg"], earth_rad)
        lit = sun_vis >= SUN_THRESHOLD
        comm = (earth_vis >= 0.5) & (earth["el_deg"] >= EARTH_MIN_ELEV_DEG)
        sun_enu, earth_enu = eph.dir_enu(sun["az_deg"], sun["el_deg"]), eph.dir_enu(earth["az_deg"], earth["el_deg"])

        for pid, start, end in PERIODS:
            sl = slice(times.index(start), times.index(end) if end in times else len(times))
            t = times[sl]
            write(f"ephemeris/{site['id']}_{pid}.json", {
                **header(datasets), "site_id": site["id"], "period_id": pid, "aberration_correction": eph.ABCORR,
                "time_utc": t,
                "sun_az_deg": r(sun["az_deg"][sl], 3), "sun_el_deg": r(sun["el_deg"][sl], 3),
                "sun_visible_frac": r(sun_vis[sl], 4),
                "earth_az_deg": r(earth["az_deg"][sl], 3), "earth_el_deg": r(earth["el_deg"][sl], 3),
                "earth_visible_frac": r(earth_vis[sl], 4),
                "sun_dist_km": r(sun["dist_km"][sl], 0), "earth_dist_km": r(earth["dist_km"][sl], 1),
                "sun_radius_deg": r(sun_rad[sl], 4), "earth_radius_deg": r(earth_rad[sl], 4),
                "earth_phase_frac": r(phase[sl], 4),
                "sun_dir_enu": r(sun_enu[sl], 5), "earth_dir_enu": r(earth_enu[sl], 5),
            })
            l, c = lit[sl], comm[sl]
            write(f"metrics/{site['id']}_{pid}.json", {
                **header(datasets), "site_id": site["id"], "period_id": pid,
                "sun_threshold_frac": SUN_THRESHOLD, "earth_min_elev_deg": EARTH_MIN_ELEV_DEG,
                "metrics": {
                    "sunlit_frac": metric(l.mean()), "earth_visible_frac": metric(c.mean()),
                    "both_frac": metric((l & c).mean()),
                    "longest_dark_h": metric(longest_h(~l)), "longest_no_earth_h": metric(longest_h(~c)),
                    "mean_sun_el_when_lit_deg": metric(sun["el_deg"][sl][l].mean() if l.any() else None),
                },
                "sun_windows": windows(l, t, end), "earth_windows": windows(c, t, end),
            })

        rows = {k: [] for k in cells}
        for d in landing:
            w = slice(times.index(d), times.index(d) + n_mission)
            rows["sunlit_frac"].append(round(float(lit[w].mean()), 4))
            rows["earth_visible_frac"].append(round(float(comm[w].mean()), 4))
            rows["both_frac"].append(round(float((lit[w] & comm[w]).mean()), 4))
            rows["longest_dark_h"].append(round(longest_h(~lit[w]), 2))
            rows["longest_no_earth_h"].append(round(longest_h(~comm[w]), 2))
        for k in cells:
            cells[k].append(rows[k])

    write("matrix.json", {
        **header(datasets), "site_ids": [s["id"] for s in SITES], "landing_dates_utc": landing,
        "mission_duration_h": MISSION_H, "sun_threshold_frac": SUN_THRESHOLD, "cells": cells,
        "uncertainty_notes": "Not estimated (sample data, flat horizon).",
    })
    write("sites.json", {**header(datasets), "sites": [
        {**s, "category": "other",
         "coord_source": "Development example point chosen by AERO; not a landing site",
         "description": "Example point for front-end development only."} for s in SITES]})
    write("manifest.json", {
        **header(datasets),
        "periods": [{"id": p, "label": p, "start_utc": s, "end_utc": e, "step_s": STEP_S} for p, s, e in PERIODS],
        "available": [{"site_id": s["id"], "has_horizon": False, "period_ids": [p for p, _, _ in PERIODS]} for s in SITES],
        "has_matrix": True, "has_scene": True,
    })


if __name__ == "__main__":
    main()
