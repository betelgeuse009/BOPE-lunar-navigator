"""Builds the JSON documents of the data contract (contracts/). Used by both the API and the static build,
so a file on disk and an API response are always the same thing.
"""
from __future__ import annotations

import subprocess
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import numpy as np

from . import config, ephemeris as eph, horizon, metrics, scoring, sites, visibility as vis
from .metrics import Inputs

NOTES = (f"Horizon model: {horizon.SOURCE} (terrain ignored until the LOLA maps are wired in). "
         "Uncertainty not estimated yet. Sun/Earth az/el cross-checked against JPL Horizons: max 0.00003 deg "
         "(docs/validation/horizons.md).")


@lru_cache(maxsize=1)
def _git_sha() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=config.REPO, text=True).strip()
    except Exception:
        return "unknown"


def header(module: str) -> dict:
    return {
        "contract_version": "0.1",
        "generated_at": eph.format_utc(datetime.now(timezone.utc)),
        "source": {"datasets": [{"name": n, "url": f"{config.NAIF_BASE_URL}/{p}"} for n, p in config.KERNELS.items()],
                   "tool": f"analysis/{module}@{_git_sha()}", "notes": NOTES},
    }


def _r(a, nd: int) -> list:
    return np.round(np.asarray(a, dtype=float), nd).tolist()


def _metric(v, nd: int = 4) -> dict:
    return {"value": None if v is None else round(float(v), nd), "uncertainty": None}


def _check_steps(n_steps: int, n_sites: int = 1) -> None:
    if n_steps < 2:
        raise ValueError("the time window must contain at least 2 steps (check start, end and step)")
    if n_steps > config.MAX_STEPS:
        raise ValueError(f"{n_steps} time steps requested, the limit is {config.MAX_STEPS}: shorten the window or raise the step")
    if n_steps * n_sites > config.MAX_SITE_STEPS:
        raise ValueError(f"{n_sites} points x {n_steps} steps is too much for one request: "
                         "reduce the radius, increase the spacing, shorten the window or raise calc_step_s")


def _grid(start_utc: str, end_utc: str, step_s: int, n_sites: int = 1) -> eph.BodyVectors:
    start, end = eph.parse_utc(start_utc), eph.parse_utc(end_utc)
    if end <= start:
        raise ValueError("end must be after start")
    _check_steps(int((end - start).total_seconds() // step_s), n_sites)
    return eph.body_vectors(eph.format_utc(start), eph.format_utc(end), step_s)


def end_of_mission(start_utc: str, mission_h: float) -> str:
    return eph.format_utc(eph.parse_utc(start_utc) + timedelta(hours=mission_h))


# ---------------------------------------------------------------- contract files

def ephemeris_doc(site_id: str, period_id: str, lat: float, lon: float, start: str, end: str,
                  step_s: int, inp: Inputs) -> dict:
    bv = _grid(start, end, step_s)
    s = metrics.site_series(bv, lat, lon, inp)
    return {
        **header("ephemeris.py"), "site_id": site_id, "period_id": period_id, "aberration_correction": config.ABCORR,
        "time_utc": list(bv.times_utc),
        "sun_az_deg": _r(s["sun_az_deg"][0], 3), "sun_el_deg": _r(s["sun_el_deg"][0], 3),
        "sun_visible_frac": _r(s["sun_visible_frac"][0], 4),
        "earth_az_deg": _r(s["earth_az_deg"][0], 3), "earth_el_deg": _r(s["earth_el_deg"][0], 3),
        "earth_visible_frac": _r(s["earth_visible_frac"][0], 4),
        "sun_dist_km": _r(s["sun_dist_km"][0], 0), "earth_dist_km": _r(s["earth_dist_km"][0], 1),
        "sun_radius_deg": _r(s["sun_radius_deg"][0], 4), "earth_radius_deg": _r(s["earth_radius_deg"][0], 4),
        "earth_phase_frac": _r(bv.earth_phase_frac, 4),
        "sun_dir_enu": _r(eph.dir_enu(s["sun_az_deg"][0], s["sun_el_deg"][0]), 5),
        "earth_dir_enu": _r(eph.dir_enu(s["earth_az_deg"][0], s["earth_el_deg"][0]), 5),
    }


def metrics_doc(site_id: str, period_id: str, lat: float, lon: float, start: str, end: str,
                calc_step_s: int, inp: Inputs) -> dict:
    bv = _grid(start, end, calc_step_s)
    s = metrics.site_series(bv, lat, lon, inp)
    p = metrics.summarize(s, 0, slice(None), calc_step_s, inp)
    end_utc = eph.format_utc(eph.parse_utc(end))
    doc = {
        **header("metrics.py"), "site_id": site_id, "period_id": period_id,
        "sun_threshold_frac": inp.sun_threshold_frac, "earth_min_elev_deg": inp.earth_min_elev_deg,
        "metrics": {k: _metric(p[k]) for k in ("sunlit_frac", "earth_visible_frac", "both_frac", "longest_dark_h",
                                               "longest_no_earth_h", "mean_sun_el_when_lit_deg")},
        "sun_windows": vis.windows(s["lit"][0], bv.times_utc, end_utc),
        "earth_windows": vis.windows(s["comm"][0], bv.times_utc, end_utc),
    }
    if p["battery_needed_wh"] is not None:
        doc["metrics"]["battery_needed_wh"] = _metric(p["battery_needed_wh"], 1)
    return doc


def scene_doc(period_id: str, start: str, end: str, step_s: int) -> dict:
    bv = _grid(start, end, step_s)
    ss_lat, ss_lon = eph.sub_point_deg(bv.sun_km)
    se_lat, se_lon = eph.sub_point_deg(bv.earth_km)
    return {
        **header("ephemeris.py"), "period_id": period_id, "aberration_correction": config.ABCORR,
        "time_utc": list(bv.times_utc),
        "subsolar_lat_deg": _r(ss_lat, 3), "subsolar_lon_deg": _r(ss_lon, 3),
        "subearth_lat_deg": _r(se_lat, 3), "subearth_lon_deg": _r(se_lon, 3),
        "earth_phase_frac": _r(bv.earth_phase_frac, 4),
    }


def matrix_doc(site_ids: list[str], lats, lons, first_landing: str, n_dates: int, date_step_h: float,
               mission_h: float, calc_step_s: int, inp: Inputs, weights: dict) -> dict:
    """Site x landing-date grid. Cell = parameters over [landing, landing + mission_h]."""
    stride, per_mission = date_step_h * 3600 / calc_step_s, mission_h * 3600 / calc_step_s
    if stride != int(stride) or per_mission != int(per_mission) or stride < 1 or per_mission < 2:
        raise ValueError("date_step_h and mission_h must be whole multiples of calc_step_s")
    stride, per_mission = int(stride), int(per_mission)
    end = end_of_mission(first_landing, (n_dates - 1) * date_step_h + mission_h)
    bv = _grid(first_landing, end, calc_step_s, len(site_ids))
    s = metrics.site_series(bv, lats, lons, inp)
    names = ["sunlit_frac", "earth_visible_frac", "both_frac", "longest_dark_h", "longest_no_earth_h"]
    cells = {k: [] for k in names + ["score"]}
    for i in range(len(site_ids)):
        rows = {k: [] for k in cells}
        for j in range(n_dates):
            p = metrics.summarize(s, i, slice(j * stride, j * stride + per_mission), calc_step_s, inp)
            for k in names:
                rows[k].append(round(p[k], 4))
            sc = scoring.score(p, weights)["value"]
            rows["score"].append(None if sc is None else round(sc, 4))
        for k in cells:
            cells[k].append(rows[k])
    return {
        **header("metrics.py"), "site_ids": site_ids,
        "landing_dates_utc": [bv.times_utc[j * stride] for j in range(n_dates)],
        "mission_duration_h": mission_h, "sun_threshold_frac": inp.sun_threshold_frac, "cells": cells,
        "uncertainty_notes": "Not estimated yet. " + NOTES,
    }


def sites_doc() -> dict:
    return {**header("sites.py"), "sites": sites.SITES}


def manifest_doc(periods: list[tuple[str, str, str]], step_s: int, has_matrix: bool) -> dict:
    return {
        **header("build.py"),
        "periods": [{"id": p, "label": p, "start_utc": s, "end_utc": e, "step_s": step_s} for p, s, e in periods],
        "available": [{"site_id": s["id"], "has_horizon": False, "period_ids": [p for p, _, _ in periods]}
                      for s in sites.SITES],
        "has_matrix": has_matrix, "has_scene": True,
    }


# ---------------------------------------------------------------- API-only documents (contracts/API.md)

def _public(p: dict) -> dict:
    return {k: _metric(v) for k, v in p.items() if k != "window_h"}


def evaluate_doc(lat: float, lon: float, start: str, end: str, calc_step_s: int, inp: Inputs,
                 weights: dict, limits: dict) -> dict:
    """All parameters of one site over one window, plus feasibility against the user limits and the score."""
    bv = _grid(start, end, calc_step_s)
    s = metrics.site_series(bv, lat, lon, inp)
    p = metrics.summarize(s, 0, slice(None), calc_step_s, inp)
    return {
        **header("metrics.py"),
        "site": {"lat_deg": lat, "lon_deg": lon, "obs_height_m": inp.obs_height_m},
        "window": {"start_utc": bv.times_utc[0], "end_utc": eph.format_utc(eph.parse_utc(end)),
                   "duration_h": p["window_h"], "calc_step_s": calc_step_s},
        "inputs": {**inp.as_dict(), "weights": weights, "limits": limits},
        "horizon_source": horizon.SOURCE, "terrain_available": horizon.TERRAIN_AVAILABLE,
        "parameters": _public(p),
        **scoring.feasibility(p, limits),
        "score": scoring.score(p, weights),
    }


def disc_grid(radius_km: float, spacing_km: float) -> tuple[np.ndarray, np.ndarray]:
    """East/north offsets (km) of a square grid inside a circle. The centre (0, 0) is always index 0."""
    if spacing_km <= 0 or radius_km <= 0:
        raise ValueError("radius_km and spacing_km must be positive")
    n = int(radius_km // spacing_km)
    ax = np.arange(-n, n + 1) * spacing_km
    x, y = np.meshgrid(ax, ax)
    keep = (x * x + y * y <= radius_km * radius_km * (1 + 1e-9)) & ~((x == 0) & (y == 0))
    x, y = np.concatenate([[0.0], x[keep]]), np.concatenate([[0.0], y[keep]])
    if x.size > config.MAX_AREA_POINTS:
        raise ValueError(f"{x.size} grid points, the limit is {config.MAX_AREA_POINTS}: increase spacing_km or reduce radius_km")
    return x, y


def offsets_to_latlon(lat: float, lon: float, east_km: np.ndarray, north_km: np.ndarray):
    """Points reached from (lat, lon) by moving along great circles; exact on the sphere, safe near the poles."""
    r_moon = eph.body_radius_km("MOON")
    east, north, up = (a[0] for a in eph.enu_axes(eph.site_positions_km(lat, lon)))
    rho = np.hypot(east_km, north_km)
    safe = np.where(rho > 0, rho, 1.0)
    d = rho / r_moon
    p = np.cos(d)[:, None] * up + np.sin(d)[:, None] * (east_km[:, None] * east + north_km[:, None] * north) / safe[:, None]
    return np.degrees(np.arcsin(np.clip(p[:, 2], -1, 1))), np.degrees(np.arctan2(p[:, 1], p[:, 0]))


AREA_PARAMETERS = ("sunlit_frac", "longest_dark_h", "earth_visible_frac", "longest_no_earth_h", "both_frac",
                   "sun_energy_tracking_kwh_m2", "energy_margin_kwh", "battery_needed_wh", "slope_deg")


def area_doc(lat: float, lon: float, radius_km: float, spacing_km: float, start: str, end: str,
             calc_step_s: int, inp: Inputs, weights: dict, limits: dict) -> dict:
    """Evaluate a disc of points around a site: score and feasibility for each, the best point, and whether
    the centre is already the best."""
    x, y = disc_grid(radius_km, spacing_km)
    lats, lons = offsets_to_latlon(lat, lon, x, y)
    bv = _grid(start, end, calc_step_s, x.size)
    s = metrics.site_series(bv, lats, lons, inp)
    params = [metrics.summarize(s, i, slice(None), calc_step_s, inp) for i in range(x.size)]
    scores = [scoring.score(p, weights)["value"] for p in params]
    feas = [scoring.feasibility(p, limits)["feasible"] for p in params]

    # Best = highest score among feasible points (among all points if none is feasible).
    pool = [i for i in range(x.size) if feas[i]] or list(range(x.size))
    ranked = [i for i in pool if scores[i] is not None]
    best = max(ranked, key=lambda i: scores[i]) if ranked else 0
    gain = (scores[best] - scores[0]) if scores[best] is not None and scores[0] is not None else None
    center_is_best = best == 0 or (feas[0] and gain is not None and gain < 1e-4)
    if center_is_best:
        best = 0
    valid = [v for v in scores if v is not None]

    def col(name):
        return [None if p[name] is None else round(p[name], 4) for p in params]

    return {
        **header("metrics.py"),
        "center": {"lat_deg": lat, "lon_deg": lon, "obs_height_m": inp.obs_height_m},
        "radius_km": radius_km, "spacing_km": spacing_km,
        "window": {"start_utc": bv.times_utc[0], "end_utc": eph.format_utc(eph.parse_utc(end)),
                   "duration_h": params[0]["window_h"], "calc_step_s": calc_step_s},
        "inputs": {**inp.as_dict(), "weights": weights, "limits": limits},
        "horizon_source": horizon.SOURCE, "terrain_available": horizon.TERRAIN_AVAILABLE,
        "points": {
            "lat_deg": _r(lats, 5), "lon_deg": _r(lons, 5), "east_km": _r(x, 3), "north_km": _r(y, 3),
            "score": [None if v is None else round(v, 5) for v in scores], "feasible": feas,
            "parameters": {k: col(k) for k in AREA_PARAMETERS},
        },
        "score_range": [min(valid), max(valid)] if valid else None,
        "center_score": scores[0], "center_feasible": feas[0], "center_is_best": center_is_best,
        "best": {"index": best, "lat_deg": round(float(lats[best]), 5), "lon_deg": round(float(lons[best]), 5),
                 "score": scores[best], "feasible": feas[best], "score_gain": 0.0 if center_is_best else gain,
                 "dist_km": round(float(np.hypot(x[best], y[best])), 3),
                 "bearing_deg": round(float(np.degrees(np.arctan2(x[best], y[best])) % 360.0), 1)},
    }
