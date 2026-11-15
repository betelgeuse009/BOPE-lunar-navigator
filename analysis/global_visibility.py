"""Long-term Sun and Earth visibility for the whole Moon, for the map layers (display only).

For every cell of a 2 deg grid: the share of time, over one 18.6-year lunar precession cycle, in which any part of the
Sun's (or the Earth's) disc is above the horizon. This is the definition of NASA's AVGVISIB polar maps, so the two
agree in meaning. Horizon: smooth sphere seen from 2 m (terrain ignored: a whole-Moon grid with the terrain skyline
would take hours). Good away from the poles, where the Sun and the Earth rise high; near the poles use the NASA maps.

Run from the repo root:   .venv/Scripts/python.exe -m analysis.global_visibility
Writes data/processed/layers/visibility_global.json (read by frontend/scripts/layers.py).
"""
from __future__ import annotations

import json

import numpy as np

from . import config, ephemeris as eph, horizon, visibility as vis

STEP_DEG = 2.0
START, END, STEP_S = "2020-01-01T00:00:00Z", "2038-08-01T00:00:00Z", 6 * 3600
OBS_HEIGHT_M = 2.0
OUT = config.REPO / "data" / "processed" / "layers" / "visibility_global.json"


def main() -> None:
    lats = np.arange(90.0 - STEP_DEG / 2, -90.0, -STEP_DEG)          # cell centres, north to south
    lons = np.arange(-180.0 + STEP_DEG / 2, 180.0, STEP_DEG)
    bv = eph.body_vectors(START, END, STEP_S)
    r_sun, r_earth = eph.body_radius_km("SUN"), eph.body_radius_km("EARTH")
    hz = -horizon.dip_deg(OBS_HEIGHT_M)
    sun, earth = np.empty((lats.size, lons.size)), np.empty((lats.size, lons.size))
    for i, lat in enumerate(lats):
        pos = eph.site_positions_km(np.full(lons.size, lat), lons, OBS_HEIGHT_M)
        for body, vec, radius, out in (("sun", bv.sun_km, r_sun, sun), ("earth", bv.earth_km, r_earth, earth)):
            t = eph.topocentric(vec, pos)
            frac = vis.visible_disk_frac(t["el_deg"], eph.angular_radius_deg(radius, t["dist_km"]), hz)
            out[i] = (frac > 0).mean(axis=1)                        # any part of the disc visible
        print(f"lat {lat:6.1f}: sun {sun[i].mean():.3f} earth {earth[i].min():.3f}..{earth[i].max():.3f}", flush=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "step_deg": STEP_DEG, "start_utc": START, "end_utc": END, "step_s": STEP_S, "obs_height_m": OBS_HEIGHT_M,
        "horizon": "smooth-sphere", "definition": "share of time with any part of the disc above the horizon",
        "lat_deg": lats.tolist(), "lon_deg": lons.tolist(),
        "sun_frac": np.round(sun, 4).tolist(), "earth_frac": np.round(earth, 4).tolist()}), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
