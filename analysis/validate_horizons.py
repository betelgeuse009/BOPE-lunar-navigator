"""Cross-check our API against JPL Horizons (task T06).

For several sites and times, asks JPL Horizons for the apparent (airless) azimuth, elevation and range of the Sun
and the Earth seen from a point on the Moon, asks our API (/api/ephemeris) for the same, and compares.

Run from the repo root:   .venv/Scripts/python.exe -m analysis.validate_horizons            (uses the cache if present)
                          .venv/Scripts/python.exe -m analysis.validate_horizons --refresh  (asks Horizons again)
Writes:  data/validation/horizons/*.txt  raw Horizons replies (so the check can be rerun offline)
         docs/validation/horizons.md     the comparison report

Horizons settings (from its reply header): DE441 ephemeris, centre frame MEAN_ME, sphere R = 1737.4 km, airless,
light time + gravitational deflection + stellar aberration. Ours: DE440s, MOON_ME, same sphere, LT+S.
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import numpy as np
from fastapi.testclient import TestClient

from . import config, ephemeris as eph
from .api import app

HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
CACHE_DIR = config.REPO / "data" / "validation" / "horizons"
REPORT = config.REPO / "docs" / "validation" / "horizons.md"
TOLERANCE_DEG = 0.01
AU_KM = 149_597_870.7

# Sites chosen to cover the regimes the navigator cares about (example points, not landing sites).
SITES = [
    ("south-pole", -89.5, -135.0),
    ("south-polar-85s", -85.3, 31.2),
    ("near-side-centre", 0.0, 0.0),
    ("far-side-centre", 0.0, 180.0),
    ("north-mid-latitude", 45.0, -60.0),
]
BODIES = [("SUN", "10"), ("EARTH", "399")]
OBS_HEIGHT_M = 2.0
# 12 instants over Nov-Dec 2026, at different hours so the Sun and Earth are seen in many directions.
TIMES = [eph.format_utc(datetime(2026, 11, 1, tzinfo=timezone.utc) + timedelta(days=5 * k, hours=(7 * k) % 24))
         for k in range(12)]


def horizons_query(lat: float, lon: float, body_code: str) -> str:
    """Raw Horizons text table for one site and body at all TIMES."""
    params = {
        "format": "json", "COMMAND": f"'{body_code}'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'", "CENTER": "'coord@301'", "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon % 360.0:.6f},{lat:.6f},{OBS_HEIGHT_M / 1000.0:.6f}'",
        "TLIST": " ".join(f"'{t[:-1].replace('T', ' ')}'" for t in TIMES), "TLIST_TYPE": "'CAL'", "TIME_TYPE": "'UT'",
        "QUANTITIES": "'4,20'", "ANG_FORMAT": "'DEG'", "CSV_FORMAT": "'YES'", "EXTRA_PREC": "'YES'",
    }
    req = urllib.request.Request(f"{HORIZONS_URL}?{urllib.parse.urlencode(params)}",
                                 headers={"User-Agent": "lunar-navigator-validation"})
    with urllib.request.urlopen(req, timeout=60) as r:
        reply = json.loads(r.read().decode("utf-8"))
    if "error" in reply:
        raise RuntimeError(f"Horizons error: {reply['error']}")
    return reply["result"]


def parse_table(text: str) -> dict[str, np.ndarray]:
    """Rows between $$SOE and $$EOE: date, solar flag, interferer flag, az, el, delta (AU), deldot."""
    body = text.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    rows = [[c.strip() for c in line.split(",")] for line in body.strip().splitlines()]
    return {"az_deg": np.array([float(r[3]) for r in rows]), "el_deg": np.array([float(r[4]) for r in rows]),
            "dist_km": np.array([float(r[5]) * AU_KM for r in rows])}


def horizons(site: str, lat: float, lon: float, body: str, code: str, refresh: bool) -> dict[str, np.ndarray]:
    path = CACHE_DIR / f"{site}_{body.lower()}.txt"
    if refresh or not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(horizons_query(lat, lon, code), encoding="utf-8")
        time.sleep(1.0)   # be polite to the public service
    table = parse_table(path.read_text(encoding="utf-8"))
    if len(table["az_deg"]) != len(TIMES):
        raise RuntimeError(f"{path.name}: expected {len(TIMES)} rows, got {len(table['az_deg'])}")
    return table


def ours_api(client: TestClient, lat: float, lon: float, body: str) -> dict[str, np.ndarray]:
    """Values exactly as /api/ephemeris serves them (rounded to 0.001 deg), one request per instant."""
    out = {"az_deg": [], "el_deg": [], "dist_km": []}
    key = body.lower()
    for t in TIMES:
        r = client.get("/api/ephemeris", params={"lat_deg": lat, "lon_deg": lon, "start_utc": t, "mission_h": 1,
                                                 "step_s": 600, "obs_height_m": OBS_HEIGHT_M,
                                                 # Horizons has no terrain: compare at the same altitude (sphere + 2 m)
                                                 "use_terrain": False})
        r.raise_for_status()
        d = r.json()
        assert d["time_utc"][0] == t
        for q in out:
            out[q].append(d[f"{key}_{q}"][0])
    return {q: np.array(v) for q, v in out.items()}


def ours_engine(lat: float, lon: float, body: str) -> dict[str, np.ndarray]:
    """Same computation at full precision (no rounding), to see the true difference below the API rounding."""
    out = {"az_deg": [], "el_deg": [], "dist_km": []}
    pos = eph.site_positions_km(lat, lon, OBS_HEIGHT_M)
    for t in TIMES:
        bv = eph.body_vectors(t, eph.format_utc(eph.parse_utc(t) + timedelta(seconds=120)), 60)
        topo = eph.topocentric(bv.sun_km if body == "SUN" else bv.earth_km, pos)
        for q in out:
            out[q].append(topo[q][0, 0])
    return {q: np.array(v) for q, v in out.items()}


def separation_deg(az1, el1, az2, el2) -> np.ndarray:
    """Angle between two directions given as az/el (deg). Insensitive to the azimuth blow-up near the zenith."""
    a = eph.dir_enu(np.asarray(az1), np.asarray(el1))
    b = eph.dir_enu(np.asarray(az2), np.asarray(el2))
    return np.degrees(np.arctan2(np.linalg.norm(np.cross(a, b), axis=-1), np.sum(a * b, axis=-1)))


def compare(ref: dict, ours: dict) -> dict[str, np.ndarray]:
    return {
        "sep_deg": separation_deg(ref["az_deg"], ref["el_deg"], ours["az_deg"], ours["el_deg"]),
        "d_el_deg": ours["el_deg"] - ref["el_deg"],
        "d_az_deg": (ours["az_deg"] - ref["az_deg"] + 180.0) % 360.0 - 180.0,
        "d_dist_km": ours["dist_km"] - ref["dist_km"],
    }


def run(refresh: bool = False) -> list[dict]:
    client = TestClient(app)
    results = []
    for site, lat, lon in SITES:
        for body, code in BODIES:
            ref = horizons(site, lat, lon, body, code, refresh)
            api, eng = ours_api(client, lat, lon, body), ours_engine(lat, lon, body)
            results.append({"site": site, "lat": lat, "lon": lon, "body": body, "ref": ref,
                            "api": compare(ref, api), "engine": compare(ref, eng)})
    return results


def report(results: list[dict]) -> str:
    worst_api = max(r["api"]["sep_deg"].max() for r in results)
    worst_eng = max(r["engine"]["sep_deg"].max() for r in results)
    verdict = "PASS" if worst_api <= TOLERANCE_DEG else "FAIL"
    lines = [
        "# Validation: our API vs JPL Horizons (T06)",
        "",
        f"Generated by `python -m analysis.validate_horizons` on {eph.format_utc(datetime.now(timezone.utc))}. "
        "Raw Horizons replies: `data/validation/horizons/`.",
        "",
        f"**Result: {verdict}.** Largest angular difference: **{worst_api:.5f} deg** as served by the API "
        f"(az/el rounded to 0.001 deg), **{worst_eng:.6f} deg** at full precision. Tolerance: {TOLERANCE_DEG} deg.",
        "",
        f"Setup: {len(SITES)} sites x 2 bodies x {len(TIMES)} instants ({TIMES[0]} .. {TIMES[-1]}), observer height "
        f"{OBS_HEIGHT_M} m. Horizons: DE441, MEAN_ME, airless apparent az/el (light time, gravitational deflection, "
        "stellar aberration). Ours: DE440s, MOON_ME, LT+S. Both use the 1737.4 km sphere.",
        "",
        "Angular difference = angle between the two directions (robust near the zenith, where azimuth is ill-defined). "
        "Max over the instants:",
        "",
        "| Site | lat, lon | Body | El range (Horizons) | Max angle, API | Max angle, full precision | Max abs d_el, full | Max abs d_range, km |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in results:
        e = r["engine"]
        lines.append(
            f"| {r['site']} | {r['lat']}, {r['lon']} | {r['body']} | {r['ref']['el_deg'].min():.2f} .. {r['ref']['el_deg'].max():.2f} | "
            f"{r['api']['sep_deg'].max():.5f} | {e['sep_deg'].max():.6f} | {np.abs(e['d_el_deg']).max():.6f} | "
            f"{np.abs(e['d_dist_km']).max():.3f} |")
    lines += ["", "Instants: " + ", ".join(TIMES), ""]
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description="Cross-check our API against JPL Horizons")
    ap.add_argument("--refresh", action="store_true", help="query Horizons again instead of using the cache")
    results = run(ap.parse_args().refresh)
    text = report(results)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
