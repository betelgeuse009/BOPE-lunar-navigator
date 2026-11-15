"""Lunar Navigator API: live access to the analysis for any point on the Moon.

Run from the repo root:   .venv/Scripts/python.exe -m uvicorn analysis.api:app --port 8000
Interactive docs:         http://localhost:8000/docs
Reference for the FE:     contracts/API.md

Every response has the same JSON shape as the matching file of the data contract (contracts/schemas/),
so the front end can read either the API or the static files.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config, ephemeris as eph, horizon, products, sites, terrain
from .metrics import Inputs

app = FastAPI(title="BOPE Lunar Navigator API", version="0.1",
              description="Sun/Earth geometry, site parameters, feasibility and score for any point on the Moon.")
# The front end runs on another port during development, so the browser needs CORS to be open (read-only API).
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])


@app.exception_handler(ValueError)
def _bad_request(_request, exc: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(FileNotFoundError)
def _missing_data(_request, exc: FileNotFoundError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


# ---------------------------------------------------------------- shared query parameters

Lat = Annotated[float | None, Query(ge=-90, le=90, description="Planetocentric latitude, deg (MOON_ME)")]
Lon = Annotated[float | None, Query(ge=-360, le=360, description="East longitude, deg; -180..180 or 0..360")]
SiteId = Annotated[str | None, Query(description="Catalogue site id (see /api/sites); alternative to lat_deg + lon_deg")]
Start = Annotated[str, Query(description="Window start / landing time, UTC ISO 8601, e.g. 2026-11-15T00:00:00Z")]
End = Annotated[str | None, Query(description="Window end, UTC. Alternative to mission_h")]
MissionH = Annotated[float, Query(gt=0, description="Window length in hours when end_utc is not given")]


def model_inputs(
    obs_height_m: Annotated[float, Query(ge=0, le=1000, description="Height of the observer / array / antenna above the surface, m")] = config.OBS_HEIGHT_M,
    sun_threshold_frac: Annotated[float, Query(ge=0, le=1, description="Visible fraction of the solar disk that counts as sunlit")] = config.SUN_THRESHOLD_FRAC,
    earth_min_elev_deg: Annotated[float, Query(ge=-90, le=90, description="Antenna mask: minimum Earth elevation, deg")] = config.EARTH_MIN_ELEV_DEG,
    load_w: Annotated[float | None, Query(ge=0, description="Average electrical load, W (enables battery and energy-balance parameters)")] = None,
    panel_area_m2: Annotated[float | None, Query(ge=0, description="Sun-tracking solar array area, m^2")] = None,
    panel_efficiency_frac: Annotated[float | None, Query(ge=0, le=1, description="Solar array efficiency, 0..1")] = None,
    use_terrain: Annotated[bool, Query(description="Use the real LOLA terrain (skyline, slope, elevation). false = smooth sphere")] = True,
    position_uncertainty_m: Annotated[float, Query(ge=0, le=5000, description="Landing accuracy, m: parameters are re-evaluated on a ring of this radius (0 = ignore)")] = config.POSITION_UNCERTAINTY_M,
    horizon_uncertainty_deg: Annotated[float, Query(ge=0, le=5, description="Skyline accuracy, deg: the skyline is shifted by +/- this (0 = ignore)")] = config.HORIZON_UNCERTAINTY_DEG,
) -> Inputs:
    return Inputs(obs_height_m, sun_threshold_frac, earth_min_elev_deg, load_w, panel_area_m2, panel_efficiency_frac,
                  use_terrain, position_uncertainty_m, horizon_uncertainty_deg)


def score_weights(
    w_sunlit: Annotated[float, Query(ge=0, description="Weight of sunlit_frac in the score")] = config.SCORE_WEIGHTS["sunlit_frac"],
    w_dark: Annotated[float, Query(ge=0, description="Weight of longest_dark_h")] = config.SCORE_WEIGHTS["longest_dark_h"],
    w_earth: Annotated[float, Query(ge=0, description="Weight of earth_visible_frac")] = config.SCORE_WEIGHTS["earth_visible_frac"],
    w_no_earth: Annotated[float, Query(ge=0, description="Weight of longest_no_earth_h")] = config.SCORE_WEIGHTS["longest_no_earth_h"],
    w_slope: Annotated[float, Query(ge=0, description="Weight of slope_deg (left out when the terrain is not used)")] = config.SCORE_WEIGHTS["slope_deg"],
    w_rock: Annotated[float, Query(ge=0, description="Weight of rock_abundance_frac (lower is better; left out beyond 80 deg)")] = config.SCORE_WEIGHTS["rock_abundance_frac"],
    w_temp: Annotated[float, Query(ge=0, description="Weight of surface_temp_max_k (lower is better)")] = config.SCORE_WEIGHTS["surface_temp_max_k"],
    w_h: Annotated[float, Query(ge=0, description="Weight of h_parameter_m (lower = denser regolith is better; left out beyond 70 deg)")] = config.SCORE_WEIGHTS["h_parameter_m"],
) -> dict:
    return {"sunlit_frac": w_sunlit, "longest_dark_h": w_dark, "earth_visible_frac": w_earth,
            "longest_no_earth_h": w_no_earth, "slope_deg": w_slope,
            "rock_abundance_frac": w_rock, "surface_temp_max_k": w_temp, "h_parameter_m": w_h}


def feasibility_limits(
    min_sunlit_frac: Annotated[float | None, Query(ge=0, le=1, description="Feasible only if sunlit_frac >= this")] = None,
    max_dark_h: Annotated[float | None, Query(ge=0, description="Feasible only if longest_dark_h <= this")] = None,
    min_earth_visible_frac: Annotated[float | None, Query(ge=0, le=1, description="Feasible only if earth_visible_frac >= this")] = None,
    max_no_earth_h: Annotated[float | None, Query(ge=0, description="Feasible only if longest_no_earth_h <= this")] = None,
    max_slope_deg: Annotated[float | None, Query(ge=0, le=90, description="Feasible only if slope_deg <= this (not checked when the terrain is not used)")] = None,
    min_energy_margin_kwh: Annotated[float | None, Query(description="Feasible only if energy_margin_kwh >= this (needs load_w, panel_area_m2, panel_efficiency_frac)")] = None,
    max_rock_abundance_frac: Annotated[float | None, Query(ge=0, le=1, description="Feasible only if rock_abundance_frac <= this (not checked beyond 80 deg)")] = None,
    max_surface_temp_k: Annotated[float | None, Query(ge=0, description="Feasible only if surface_temp_max_k <= this")] = None,
) -> dict:
    return {"min_sunlit_frac": min_sunlit_frac, "max_dark_h": max_dark_h,
            "min_earth_visible_frac": min_earth_visible_frac, "max_no_earth_h": max_no_earth_h,
            "max_slope_deg": max_slope_deg, "min_energy_margin_kwh": min_energy_margin_kwh,
            "max_rock_abundance_frac": max_rock_abundance_frac, "max_surface_temp_k": max_surface_temp_k}


ModelInputs = Annotated[Inputs, Depends(model_inputs)]
Weights = Annotated[dict, Depends(score_weights)]
Limits = Annotated[dict, Depends(feasibility_limits)]


def _site(site_id: str | None, lat: float | None, lon: float | None) -> tuple[str, float, float]:
    """Resolve the site from a catalogue id or from coordinates. Longitude is normalised to -180..180."""
    if site_id is not None and lat is None and lon is None:
        s = sites.get(site_id)
        return s["id"], s["lat_deg"], s["lon_deg"]
    if lat is None or lon is None:
        raise ValueError("give either site_id or both lat_deg and lon_deg")
    return site_id or "custom-point", lat, (lon + 180.0) % 360.0 - 180.0


def _end(start: str, end: str | None, mission_h: float) -> str:
    return end if end is not None else products.end_of_mission(start, mission_h)


# ---------------------------------------------------------------- endpoints

@app.get("/api/health", summary="Is the server running and are the SPICE kernels loaded?")
def health() -> dict:
    eph.load_kernels()
    return {"status": "ok", "kernels": list(config.KERNELS), "frame": config.FRAME,
            "aberration_correction": config.ABCORR, "horizon_source": horizon.source(True),
            "terrain_available": horizon.terrain_available(),
            "maps": {key: terrain.has(key) for key in config.MAPS}}


@app.get("/api/sites", summary="Site catalogue (sites.schema.json)")
def get_sites() -> dict:
    return products.sites_doc()


@app.get("/api/scene", summary="Sub-solar and sub-Earth points, Earth phase (scene.schema.json)")
def get_scene(start_utc: Start, end_utc: End = None, mission_h: MissionH = config.MISSION_H,
              step_s: Annotated[int, Query(ge=1, le=86400)] = config.STEP_S,
              period_id: str = "custom") -> dict:
    return products.scene_doc(period_id, start_utc, _end(start_utc, end_utc, mission_h), step_s)


@app.get("/api/ephemeris", summary="Sun/Earth time series seen from a site (ephemeris.schema.json)")
def get_ephemeris(inp: ModelInputs, start_utc: Start, end_utc: End = None, mission_h: MissionH = config.MISSION_H,
                  lat_deg: Lat = None, lon_deg: Lon = None, site_id: SiteId = None,
                  step_s: Annotated[int, Query(ge=1, le=86400, description="Time step of the series, s")] = config.STEP_S,
                  period_id: str = "custom") -> dict:
    sid, lat, lon = _site(site_id, lat_deg, lon_deg)
    return products.ephemeris_doc(sid, period_id, lat, lon, start_utc, _end(start_utc, end_utc, mission_h), step_s, inp)


@app.get("/api/metrics", summary="Summary metrics and Sun/Earth windows for a site (metrics.schema.json)")
def get_metrics(inp: ModelInputs, start_utc: Start, end_utc: End = None, mission_h: MissionH = config.MISSION_H,
                lat_deg: Lat = None, lon_deg: Lon = None, site_id: SiteId = None,
                calc_step_s: Annotated[int, Query(ge=1, le=3600, description="Internal time step, s (resolution of durations and windows)")] = config.CALC_STEP_S,
                period_id: str = "custom") -> dict:
    sid, lat, lon = _site(site_id, lat_deg, lon_deg)
    return products.metrics_doc(sid, period_id, lat, lon, start_utc, _end(start_utc, end_utc, mission_h), calc_step_s, inp)


@app.get("/api/evaluate", summary="All site parameters + feasibility + score for one site and window")
def get_evaluate(inp: ModelInputs, weights: Weights, limits: Limits, start_utc: Start, end_utc: End = None,
                 mission_h: MissionH = config.MISSION_H, lat_deg: Lat = None, lon_deg: Lon = None, site_id: SiteId = None,
                 calc_step_s: Annotated[int, Query(ge=1, le=3600)] = config.CALC_STEP_S) -> dict:
    _sid, lat, lon = _site(site_id, lat_deg, lon_deg)
    return products.evaluate_doc(lat, lon, start_utc, _end(start_utc, end_utc, mission_h), calc_step_s, inp, weights, limits)


@app.get("/api/area", summary="Score map of a disc around a site: is there a better point nearby?")
def get_area(inp: ModelInputs, weights: Weights, limits: Limits, start_utc: Start, end_utc: End = None,
             mission_h: MissionH = config.MISSION_H, lat_deg: Lat = None, lon_deg: Lon = None, site_id: SiteId = None,
             radius_km: Annotated[float, Query(gt=0, le=500, description="Radius of the search disc, km")] = 5.0,
             spacing_km: Annotated[float | None, Query(gt=0, description="Grid spacing, km (default: radius / 10)")] = None,
             calc_step_s: Annotated[int, Query(ge=1, le=3600)] = config.AREA_CALC_STEP_S) -> dict:
    _sid, lat, lon = _site(site_id, lat_deg, lon_deg)
    return products.area_doc(lat, lon, radius_km, spacing_km or radius_km / 10.0, start_utc,
                             _end(start_utc, end_utc, mission_h), calc_step_s, inp, weights, limits)


@app.get("/api/grid", summary="Score on a whole-Moon lat/lon grid (smooth-sphere horizon, LOLA slope)")
def get_grid(inp: ModelInputs, weights: Weights, limits: Limits, start_utc: Start, end_utc: End = None,
             mission_h: MissionH = config.MISSION_H,
             step_deg: Annotated[float, Query(ge=2, le=30, description="Grid spacing, deg (must divide 180)")] = 4.0,
             calc_step_s: Annotated[int, Query(ge=60, le=3600)] = config.AREA_CALC_STEP_S) -> dict:
    return products.grid_doc(step_deg, start_utc, _end(start_utc, end_utc, mission_h), calc_step_s, inp, weights, limits)


@app.get("/api/matrix", summary="Site x landing-date grid (matrix.schema.json)")
def get_matrix(inp: ModelInputs, weights: Weights, start_utc: Start,
               site_ids: Annotated[str | None, Query(description="Comma-separated catalogue ids; default: all catalogue sites")] = None,
               points: Annotated[str | None, Query(description="Custom points instead of site_ids: 'lat,lon;lat,lon'")] = None,
               n_dates: Annotated[int, Query(ge=1, le=366, description="Number of landing dates")] = 30,
               date_step_h: Annotated[float, Query(gt=0, description="Spacing of the landing dates, h")] = 24.0,
               mission_h: MissionH = config.MISSION_H,
               calc_step_s: Annotated[int, Query(ge=1, le=3600)] = config.AREA_CALC_STEP_S) -> dict:
    if points:
        try:
            pairs = [tuple(float(v) for v in p.split(",")) for p in points.split(";") if p.strip()]
            ids = [f"point-{i + 1}" for i in range(len(pairs))]
            lats, lons = [p[0] for p in pairs], [(p[1] + 180.0) % 360.0 - 180.0 for p in pairs]
        except (ValueError, IndexError):
            raise ValueError("points must look like 'lat,lon;lat,lon'") from None
    else:
        chosen = [sites.get(i.strip()) for i in site_ids.split(",")] if site_ids else sites.SITES
        ids, lats, lons = [s["id"] for s in chosen], [s["lat_deg"] for s in chosen], [s["lon_deg"] for s in chosen]
    return products.matrix_doc(ids, lats, lons, start_utc, n_dates, date_step_h, mission_h, calc_step_s, inp, weights)


@app.get("/api/horizon", summary="Terrain skyline seen from a site, 720 azimuths (horizon.schema.json)")
def get_horizon(lat_deg: Lat = None, lon_deg: Lon = None, site_id: SiteId = None,
                obs_height_m: Annotated[float, Query(ge=0, le=1000, description="Observer height above the surface, m")] = config.OBS_HEIGHT_M) -> dict:
    sid, lat, lon = _site(site_id, lat_deg, lon_deg)
    return products.horizon_doc(sid, lat, lon, obs_height_m)
