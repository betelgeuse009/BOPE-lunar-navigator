"""Uncertainty of the site parameters (task T22).

Two physical sources, both user inputs:
1. Landing position. A lander does not touch down on the exact point: the parameters are re-evaluated at
   RING_POINTS points on a circle of radius `position_uncertainty_m` around the site. At the pole a few hundred
   metres can move a site from a ridge into a shadow, so this is often the dominant term.
2. Skyline accuracy. The terrain horizon is shifted by +/- `horizon_uncertainty_deg` and the parameters are
   recomputed. At the pole the Sun moves along the skyline, so 0.1 deg can shift a sunset by hours.

For each parameter: position term = largest |change| over the ring, horizon term = largest |change| for the two shifts,
uncertainty = sqrt(position^2 + horizon^2). It is a +/- bound in the parameter's unit, not a standard deviation.
`range` gives the lowest and highest value actually found over all variants (never outside the physical limits).
`elevation_m` also includes the LOLA height error where it is mapped (south of 80 S).

The ring uses the coarse ("fast") skyline for every point, including the centre it is compared with, so the
difference measures the terrain, not the profile resolution.
"""
from __future__ import annotations

import dataclasses

import numpy as np

from . import ephemeris as eph, metrics, scoring
from .metrics import Inputs

RING_POINTS = 8
SKIP = {"window_h"}


def _dev(a, b) -> float | None:
    """|a - b|, or None when either side is not a number (for example "never dark" in one variant)."""
    if a is None or b is None:
        return None
    return abs(float(a) - float(b))


def _max(values) -> float | None:
    """Largest deviation; None if any variant could not be compared (the parameter is then undefined in a variant)."""
    values = list(values)
    if not values:
        return 0.0
    return None if any(v is None for v in values) else max(values)


def spread(bv: eph.BodyVectors, lat: float, lon: float, inp: Inputs, step_s: int, nominal: dict,
           weights: dict | None = None, limits: dict | None = None, height_error_m: float | None = None) -> dict:
    """Uncertainty of every parameter in `nominal` (the output of metrics.summarize for this site and window)."""
    keys = [k for k in nominal if k not in SKIP]
    pos_variants, hz_variants, pos_ref = [], [], None

    if inp.position_uncertainty_m > 0:
        ang = np.arange(RING_POINTS) * 2.0 * np.pi / RING_POINTS
        r_km = inp.position_uncertainty_m / 1000.0
        lats, lons = eph.offset_points(lat, lon, r_km * np.sin(ang), r_km * np.cos(ang))
        fast = dataclasses.replace(inp, fast_horizon=True)
        s = metrics.site_series(bv, np.r_[lat, lats], np.r_[lon, lons], fast)
        ps = [metrics.summarize(s, i, slice(None), step_s, fast) for i in range(RING_POINTS + 1)]
        pos_ref, pos_variants = ps[0], ps[1:]

    if inp.horizon_uncertainty_deg > 0:
        for off in (inp.horizon_uncertainty_deg, -inp.horizon_uncertainty_deg):
            shifted = dataclasses.replace(inp, horizon_offset_deg=off)
            s = metrics.site_series(bv, lat, lon, shifted)
            hz_variants.append(metrics.summarize(s, 0, slice(None), step_s, shifted))

    out, components = {}, {}
    for k in keys:
        if nominal[k] is None:
            out[k] = None
            continue
        pos = _max(_dev(p[k], pos_ref[k]) for p in pos_variants)
        hz = _max(_dev(p[k], nominal[k]) for p in hz_variants)
        parts = {"position": pos, "horizon": hz}
        if k == "elevation_m" and height_error_m is not None and not np.isnan(height_error_m):
            parts["height_error"] = float(height_error_m)
        out[k] = None if any(v is None for v in parts.values()) else float(np.sqrt(sum(v * v for v in parts.values())))
        values = [nominal[k]] + [q[k] for q in pos_variants + hz_variants]
        if all(v is not None for v in values):
            parts["range"] = [float(min(values)), float(max(values))]   # lowest / highest value found, physical units
        components[k] = parts

    result = {"uncertainty": out, "components": components}
    if weights is not None:
        nom = scoring.score(nominal, weights)["value"]
        pos = _max(_dev(scoring.score(p, weights)["value"], scoring.score(pos_ref, weights)["value"]) for p in pos_variants)
        hz = _max(_dev(scoring.score(p, weights)["value"], nom) for p in hz_variants)
        result["score_uncertainty"] = None if nom is None or pos is None or hz is None else float(np.hypot(pos, hz))
    if limits is not None:
        nominal_broken = {v["limit"] for v in scoring.feasibility(nominal, limits)["violations"]}
        broken_somewhere = set()
        for p in pos_variants + hz_variants:
            broken_somewhere |= {v["limit"] for v in scoring.feasibility(p, limits)["violations"]}
        result["requirements_at_risk"] = sorted(broken_somewhere - nominal_broken)
    return result
