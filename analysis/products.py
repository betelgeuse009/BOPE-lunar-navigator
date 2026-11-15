"""Builds the JSON documents of the data contract (contracts/). Used by both the API and the static build,
so a file on disk and an API response are always the same thing.
"""
from __future__ import annotations

import dataclasses
import subprocess
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import numpy as np

from . import config, ephemeris as eph, horizon, metrics, scoring, sites, terrain, uncertainty, visibility as vis
from .metrics import Inputs

_TERRAIN_MAPS = ("dem_87s_5m", "dem_80s_80m", "dem_60s_240m", "dem_global", "slope_80s_80m", "dem_err_80s_80m")


def notes(terrain_used: bool) -> str:
    model = ("Horizon model: lola-terrain (real skyline from the LOLA DEMs out to 200 km, target accuracy 0.1 deg)."
             if terrain_used else
             "Horizon model: smooth-sphere (terrain ignored: the LOLA maps are missing or use_terrain is off).")
    return (f"{model} Metric uncertainties (where given) combine the landing-position spread and the skyline accuracy "
            "(analysis/uncertainty.py). Sun/Earth az/el cross-checked against JPL Horizons: max 0.00003 deg "
            "(docs/validation/horizons.md).")


@lru_cache(maxsize=1)
def _git_sha() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=config.REPO, text=True).strip()
    except Exception:
        return "unknown"


def header(module: str, terrain_used: bool = False) -> dict:
    datasets = [{"name": n, "url": f"{config.NAIF_BASE_URL}/{p}"} for n, p in config.KERNELS.items()]
    if terrain_used:
        datasets += [{"name": config.MAPS[k][0].rsplit("/", 1)[-1], "url": config.MAPS[k][1]}
                     for k in _TERRAIN_MAPS if terrain.has(k)]
    return {
        "contract_version": "0.1",
        "generated_at": eph.format_utc(datetime.now(timezone.utc)),
        "source": {"datasets": datasets, "tool": f"analysis/{module}@{_git_sha()}", "notes": notes(terrain_used)},
    }


def _r(a, nd: int) -> list:
    return np.round(np.asarray(a, dtype=float), nd).tolist()


def _num(v, nd: int = 4):
    return None if v is None or np.isnan(v) else round(float(v), nd)


def _metric(v, nd: int = 4, uncertainty=None) -> dict:
    return {"value": _num(v, nd), "uncertainty": _num(uncertainty, nd)}


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
                  step_s: int, inp: Inputs, include_enu: bool = True) -> dict:
    bv = _grid(start, end, step_s)
    s = metrics.site_series(bv, lat, lon, inp)
    doc = {
        **header("ephemeris.py", s["terrain"]), "site_id": site_id, "period_id": period_id,
        "aberration_correction": config.ABCORR,
        "time_utc": list(bv.times_utc),
        "sun_az_deg": _r(s["sun_az_deg"][0], 3), "sun_el_deg": _r(s["sun_el_deg"][0], 3),
        "sun_visible_frac": _r(s["sun_visible_frac"][0], 4),
        "earth_az_deg": _r(s["earth_az_deg"][0], 3), "earth_el_deg": _r(s["earth_el_deg"][0], 3),
        "earth_visible_frac": _r(s["earth_visible_frac"][0], 4),
        "sun_dist_km": _r(s["sun_dist_km"][0], 0), "earth_dist_km": _r(s["earth_dist_km"][0], 1),
        "sun_radius_deg": _r(s["sun_radius_deg"][0], 4), "earth_radius_deg": _r(s["earth_radius_deg"][0], 4),
        "earth_phase_frac": _r(bv.earth_phase_frac, 4),
        "sun_ra_deg": _r(bv.radec_deg[:, 0], 4), "sun_dec_deg": _r(bv.radec_deg[:, 1], 4),
        "earth_ra_deg": _r(bv.radec_deg[:, 2], 4), "earth_dec_deg": _r(bv.radec_deg[:, 3], 4),
    }
    if include_enu:
        doc["sun_dir_enu"] = _r(eph.dir_enu(s["sun_az_deg"][0], s["sun_el_deg"][0]), 5)
        doc["earth_dir_enu"] = _r(eph.dir_enu(s["earth_az_deg"][0], s["earth_el_deg"][0]), 5)
    return doc


def metrics_doc(site_id: str, period_id: str, lat: float, lon: float, start: str, end: str,
                calc_step_s: int, inp: Inputs) -> dict:
    bv = _grid(start, end, calc_step_s)
    s = metrics.site_series(bv, lat, lon, inp)
    p = metrics.summarize(s, 0, slice(None), calc_step_s, inp)
    u = uncertainty.spread(bv, lat, lon, inp, calc_step_s, p)["uncertainty"]
    end_utc = eph.format_utc(eph.parse_utc(end))
    doc = {
        **header("metrics.py", s["terrain"]), "site_id": site_id, "period_id": period_id,
        "sun_threshold_frac": inp.sun_threshold_frac, "earth_min_elev_deg": inp.earth_min_elev_deg,
        "metrics": {k: _metric(p[k], 4, u[k]) for k in ("sunlit_frac", "earth_visible_frac", "both_frac", "longest_dark_h",
                                                        "longest_no_earth_h", "mean_sun_el_when_lit_deg",
                                                        "hours_to_first_dark_h", "hours_to_first_sun_h",
                                                        "hours_to_first_earth_loss_h", "hours_to_first_earth_h")},
        "sun_windows": vis.windows(s["lit"][0], bv.times_utc, end_utc),
        "earth_windows": vis.windows(s["comm"][0], bv.times_utc, end_utc),
    }
    if p["battery_needed_wh"] is not None:
        doc["metrics"]["battery_needed_wh"] = _metric(p["battery_needed_wh"], 1, u["battery_needed_wh"])
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
        "sun_ra_deg": _r(bv.radec_deg[:, 0], 4), "sun_dec_deg": _r(bv.radec_deg[:, 1], 4),
        "earth_ra_deg": _r(bv.radec_deg[:, 2], 4), "earth_dec_deg": _r(bv.radec_deg[:, 3], 4),
    }


def horizon_doc(site_id: str, lat: float, lon: float, obs_height_m: float) -> dict:
    """Terrain skyline of a site: 720 azimuths (0.5 deg), horizon.schema.json."""
    if not horizon.terrain_available():
        raise FileNotFoundError("the LOLA maps are not on disk. Run: python -m analysis.download_maps (list in data/MAPS.md)")
    hz = terrain.horizon(lat, lon, obs_height_m)
    return {
        **header("terrain.py", True), "site_id": site_id, "observer_height_m": obs_height_m,
        "dem": {"product": hz.layers[0]["product"], "resolution_m": hz.layers[0]["resolution_m"],
                "max_range_km": hz.max_range_km, "layers": list(hz.layers)},
        "azimuth_deg": _r(hz.az_deg, 2), "horizon_elev_deg": _r(hz.elev_deg, 3),
        "horizon_elev_uncertainty_deg": None,
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
            rows["score"].append(_num(scoring.score(p, weights)["value"]))
        for k in cells:
            cells[k].append(rows[k])
    return {
        **header("metrics.py", s["terrain"]), "site_ids": site_ids,
        "landing_dates_utc": [bv.times_utc[j * stride] for j in range(n_dates)],
        "mission_duration_h": mission_h, "sun_threshold_frac": inp.sun_threshold_frac, "cells": cells,
        "uncertainty_notes": "Not estimated yet. " + notes(s["terrain"]),
    }


def sites_doc(site_list: list[dict] | None = None) -> dict:
    """Site list with terrain elevation and slope at each point (when the maps are on disk)."""
    out = [dict(s) for s in (sites.SITES if site_list is None else site_list)]
    use_terrain = horizon.terrain_available()
    if use_terrain:
        lats, lons = [s["lat_deg"] for s in out], [s["lon_deg"] for s in out]
        elev = terrain.elevation_m(lats, lons)
        slope, baseline, _src = terrain.slope_deg(lats, lons)
        for s, e, sl, b in zip(out, elev, slope, baseline):
            s["elevation_m"], s["slope_deg"], s["slope_baseline_m"] = round(float(e), 1), round(float(sl), 2), float(b)
    doc = {**header("sites.py", use_terrain), "sites": out}
    doc["source"]["notes"] = ("Coordinates: see coord_source / coord_source_url of each site (NASA NSSDCA tables, LROC, "
                              "USGS planetary nomenclature). elevation_m / slope_deg: LOLA maps at the point. "
                              "Catalogue and exclusions: data/SITES.md.")
    return doc


def manifest_doc(periods: list[tuple[str, str, str]], step_s: int, has_matrix: bool, has_horizon: bool,
                 site_list: list[dict] | None = None) -> dict:
    return {
        **header("build.py", has_horizon),
        "periods": [{"id": p, "label": p, "start_utc": s, "end_utc": e, "step_s": step_s} for p, s, e in periods],
        "available": [{"site_id": s["id"], "has_horizon": has_horizon, "period_ids": [p for p, _, _ in periods]}
                      for s in (sites.SITES if site_list is None else site_list)],
        "has_matrix": has_matrix, "has_scene": True,
    }


# ---------------------------------------------------------------- API-only documents (contracts/API.md)

def _terrain_block(s: dict, lat: float, lon: float, inp: Inputs) -> dict:
    """How the terrain entered the result, so the UI can state it."""
    if not s["terrain"]:
        return {"used": False, "horizon_source": horizon.SMOOTH, "dem_product": None, "dem_resolution_m": None,
                "horizon_layers": [], "horizon_max_range_km": None, "slope_source": None, "slope_baseline_m": None,
                "height_error_m": None}
    hz, dem = terrain.horizon(lat, lon, inp.obs_height_m, inp.fast_horizon), terrain.dem_at(lat, lon)
    return {"used": True, "horizon_source": horizon.TERRAIN, "dem_product": dem["product"],
            "dem_resolution_m": dem["resolution_m"], "horizon_layers": list(hz.layers),
            "horizon_max_range_km": hz.max_range_km, "slope_source": s["slope_source"][0] or None,
            "slope_baseline_m": _num(s["slope_baseline_m"][0], 1), "height_error_m": _num(s["height_error_m"][0], 3)}


def evaluate_doc(lat: float, lon: float, start: str, end: str, calc_step_s: int, inp: Inputs,
                 weights: dict, limits: dict) -> dict:
    """All parameters of one site over one window, plus feasibility against the user limits and the score."""
    bv = _grid(start, end, calc_step_s)
    s = metrics.site_series(bv, lat, lon, inp)
    p = metrics.summarize(s, 0, slice(None), calc_step_s, inp)
    feasibility = scoring.feasibility(p, limits)
    unc = uncertainty.spread(bv, lat, lon, inp, calc_step_s, p, weights, limits, s["height_error_m"][0])
    u = unc["uncertainty"]
    params = {k: _metric(v, 4, u.get(k)) for k, v in p.items() if k != "window_h"}
    params["elevation_m"] = _metric(p["elevation_m"], 1, u["elevation_m"])
    if s["terrain"]:
        mean_sun, mean_earth = terrain.lola_mean_visibility(lat, lon)
        params["lola_mean_sun_visibility_frac"] = _metric(mean_sun[0])       # long-term LOLA average, for context
        params["lola_mean_earth_visibility_frac"] = _metric(mean_earth[0])
    return {
        **header("metrics.py", s["terrain"]),
        "site": {"lat_deg": lat, "lon_deg": lon, "obs_height_m": inp.obs_height_m},
        "window": {"start_utc": bv.times_utc[0], "end_utc": eph.format_utc(eph.parse_utc(end)),
                   "duration_h": p["window_h"], "calc_step_s": calc_step_s},
        "inputs": {**inp.as_dict(), "weights": weights, "limits": limits},
        "horizon_source": horizon.source(inp.use_terrain), "terrain_available": horizon.terrain_available(),
        "terrain": _terrain_block(s, lat, lon, inp),
        "parameters": params,
        "uncertainty_model": {
            "position_uncertainty_m": inp.position_uncertainty_m, "horizon_uncertainty_deg": inp.horizon_uncertainty_deg,
            "method": ("uncertainty = sqrt(position^2 + horizon^2): position = largest change over "
                       f"{uncertainty.RING_POINTS} points on a ring of radius position_uncertainty_m; horizon = largest "
                       "change when the skyline is shifted by +/- horizon_uncertainty_deg. elevation_m adds the LOLA "
                       "height error. A +/- bound in the unit of each parameter; range = lowest and highest value found."),
            "components": {k: {c: ([_num(x) for x in v] if isinstance(v, list) else _num(v)) for c, v in parts.items()}
                           for k, parts in unc["components"].items()},
        },
        **feasibility,
        "requirements_at_risk": unc["requirements_at_risk"],
        "requirements_violated_within_uncertainty": int(feasibility["requirements_violated"] == 1
                                                        or bool(unc["requirements_at_risk"])),
        "score": {**scoring.score(p, weights), "uncertainty": _num(unc["score_uncertainty"])},
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


offsets_to_latlon = eph.offset_points


AREA_PARAMETERS = ("sunlit_frac", "longest_dark_h", "earth_visible_frac", "longest_no_earth_h", "both_frac",
                   "sun_energy_tracking_kwh_m2", "energy_margin_kwh", "battery_needed_wh", "slope_deg", "elevation_m")


def grid_doc(step_deg: float, start: str, end: str, calc_step_s: int, inp: Inputs, weights: dict, limits: dict) -> dict:
    """Score of every cell of a whole-Moon latitude/longitude grid, for the "Score" map layer.

    Horizon: smooth sphere (a terrain skyline costs about 0.3 s per point on the global map, hours for a grid).
    Slope and altitude still come from the LOLA maps when they are on disk, so the slope sub-score is included.
    A clicked point is always evaluated with the full terrain by /api/evaluate.
    """
    if 180.0 / step_deg != int(180.0 / step_deg):
        raise ValueError("step_deg must divide 180 (for example 2, 3, 4, 5, 6, 10)")
    lats = np.arange(90.0 - step_deg / 2, -90.0, -step_deg)        # cell centres, north to south
    lons = np.arange(-180.0 + step_deg / 2, 180.0, step_deg)
    bv = _grid(start, end, calc_step_s)
    smooth = dataclasses.replace(inp, use_terrain=False)
    has_maps = horizon.terrain_available()
    score, feasible = [], []
    for lat in lats:
        row_lat = np.full(lons.size, lat)
        s = metrics.site_series(bv, row_lat, lons, smooth)
        if has_maps:
            s["slope_deg"], s["elevation_m"] = terrain.slope_deg(row_lat, lons)[0], terrain.elevation_m(row_lat, lons, use_5m=False)
        ps = [metrics.summarize(s, i, slice(None), calc_step_s, smooth) for i in range(lons.size)]
        score.append([_num(scoring.score(p, weights)["value"]) for p in ps])
        feasible.append([scoring.feasibility(p, limits)["feasible"] for p in ps])
    valid = [v for row in score for v in row if v is not None]
    return {
        **header("metrics.py", False),
        "step_deg": step_deg, "lat_deg": lats.tolist(), "lon_deg": lons.tolist(),
        "window": {"start_utc": bv.times_utc[0], "end_utc": eph.format_utc(eph.parse_utc(end)), "calc_step_s": calc_step_s},
        "inputs": {**inp.as_dict(), "weights": weights, "limits": limits},
        "horizon_source": horizon.SMOOTH, "slope_from_maps": has_maps,
        "score": score, "feasible": feasible,
        "requirements_violated": [[int(not f) for f in row] for row in feasible],
        "score_range": [min(valid), max(valid)] if valid else None,
    }


def area_doc(lat: float, lon: float, radius_km: float, spacing_km: float, start: str, end: str,
             calc_step_s: int, inp: Inputs, weights: dict, limits: dict) -> dict:
    """Evaluate a disc of points around a site: score and feasibility for each, the best point, and whether
    the centre is already the best. Uses the fast horizon profile (2 deg azimuth steps) for every point."""
    x, y = disc_grid(radius_km, spacing_km)
    lats, lons = offsets_to_latlon(lat, lon, x, y)
    bv = _grid(start, end, calc_step_s, x.size)
    fast = dataclasses.replace(inp, fast_horizon=True)
    s = metrics.site_series(bv, lats, lons, fast)
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
        return [_num(p[name]) for p in params]

    return {
        **header("metrics.py", s["terrain"]),
        "center": {"lat_deg": lat, "lon_deg": lon, "obs_height_m": inp.obs_height_m},
        "radius_km": radius_km, "spacing_km": spacing_km,
        "window": {"start_utc": bv.times_utc[0], "end_utc": eph.format_utc(eph.parse_utc(end)),
                   "duration_h": params[0]["window_h"], "calc_step_s": calc_step_s},
        "inputs": {**inp.as_dict(), "weights": weights, "limits": limits},
        "horizon_source": horizon.source(inp.use_terrain), "terrain_available": horizon.terrain_available(),
        "terrain": _terrain_block(s, float(lats[0]), float(lons[0]), fast),
        "points": {
            "lat_deg": _r(lats, 5), "lon_deg": _r(lons, 5), "east_km": _r(x, 3), "north_km": _r(y, 3),
            "score": [_num(v, 5) for v in scores], "feasible": feas,
            "requirements_violated": [int(not f) for f in feas],
            "parameters": {k: col(k) for k in AREA_PARAMETERS},
        },
        "score_range": [min(valid), max(valid)] if valid else None,
        "center_score": scores[0], "center_feasible": feas[0], "center_requirements_violated": int(not feas[0]),
        "center_is_best": center_is_best,
        "best": {"index": best, "lat_deg": round(float(lats[best]), 5), "lon_deg": round(float(lons[best]), 5),
                 "score": scores[best], "feasible": feas[best], "requirements_violated": int(not feas[best]),
                 "score_gain": 0.0 if center_is_best else gain,
                 "dist_km": round(float(np.hypot(x[best], y[best])), 3),
                 "bearing_deg": round(float(np.degrees(np.arctan2(x[best], y[best])) % 360.0), 1)},
    }
