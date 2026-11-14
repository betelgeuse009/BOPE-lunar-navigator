"""Site parameters: from Sun/Earth geometry to the numbers a mission analyst compares.

`site_series` computes the time series for N sites at once; `summarize` reduces one site over one time window
to the parameters documented in docs/PARAMETERS.md.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np

from . import config, ephemeris as eph, horizon, terrain, visibility as vis

AU_KM = 149_597_870.7  # astronomical unit, exact by definition (IAU 2012 Resolution B2)


@dataclass(frozen=True)
class Inputs:
    """User-adjustable model inputs. None means "not given": the parameters that need it come back as null."""
    obs_height_m: float = config.OBS_HEIGHT_M
    sun_threshold_frac: float = config.SUN_THRESHOLD_FRAC
    earth_min_elev_deg: float = config.EARTH_MIN_ELEV_DEG
    load_w: float | None = None                # average electrical load to keep alive (also in the dark)
    panel_area_m2: float | None = None         # Sun-tracking solar array area
    panel_efficiency_frac: float | None = None  # sunlight -> electricity, 0..1
    use_terrain: bool = True                   # real LOLA skyline, slope and elevation (if the maps are on disk)
    position_uncertainty_m: float = config.POSITION_UNCERTAINTY_M    # landing accuracy (uncertainty model)
    horizon_uncertainty_deg: float = config.HORIZON_UNCERTAINTY_DEG  # skyline accuracy (uncertainty model)
    fast_horizon: bool = False                 # internal: coarser horizon profile, used for area searches
    horizon_offset_deg: float = 0.0            # internal: skyline shifted up/down to propagate its accuracy

    def as_dict(self) -> dict:
        d = asdict(self)
        d.pop("fast_horizon")
        d.pop("horizon_offset_deg")
        return d


def site_series(bv: eph.BodyVectors, lat_deg, lon_deg, inp: Inputs) -> dict[str, np.ndarray]:
    """Time series for N sites over the grid of `bv`. Arrays are (N, T), except the per-site terrain values (N,)."""
    lat, lon = np.atleast_1d(np.asarray(lat_deg, dtype=float)), np.atleast_1d(np.asarray(lon_deg, dtype=float))
    use_terrain = horizon.source(inp.use_terrain) == horizon.TERRAIN
    nan = np.full(lat.shape, np.nan)
    if use_terrain:
        elevation = terrain.elevation_m(lat, lon)
        slope, slope_baseline, slope_source = terrain.slope_deg(lat, lon)
        height_error = terrain.height_error_m(lat, lon)
    else:
        elevation, slope, slope_baseline, slope_source, height_error = nan, nan, nan, [""] * lat.size, nan
    # The observer stands on the terrain: radius = sphere + terrain height + mast height.
    pos = eph.site_positions_km(lat, lon, inp.obs_height_m + (elevation if use_terrain else 0.0))
    sun, earth = eph.topocentric(bv.sun_km, pos), eph.topocentric(bv.earth_km, pos)
    sun_rad = eph.angular_radius_deg(eph.body_radius_km("SUN"), sun["dist_km"])
    earth_rad = eph.angular_radius_deg(eph.body_radius_km("EARTH"), earth["dist_km"])

    def skyline(az):
        return horizon.horizon_deg(lat, lon, az, inp.obs_height_m, inp.use_terrain, inp.fast_horizon,
                                   inp.horizon_offset_deg)

    sun_vis = vis.visible_disk_frac(sun["el_deg"], sun_rad, skyline(sun["az_deg"]))
    earth_vis = vis.visible_disk_frac(earth["el_deg"], earth_rad, skyline(earth["az_deg"]))
    return {
        "terrain": use_terrain, "elevation_m": elevation, "slope_deg": slope, "slope_baseline_m": slope_baseline,
        "slope_source": slope_source, "height_error_m": height_error,
        "sun_az_deg": sun["az_deg"], "sun_el_deg": sun["el_deg"], "sun_dist_km": sun["dist_km"],
        "sun_radius_deg": sun_rad, "sun_visible_frac": sun_vis,
        "earth_az_deg": earth["az_deg"], "earth_el_deg": earth["el_deg"], "earth_dist_km": earth["dist_km"],
        "earth_radius_deg": earth_rad, "earth_visible_frac": earth_vis,
        "lit": sun_vis >= inp.sun_threshold_frac,
        "comm": (earth_vis >= config.EARTH_THRESHOLD_FRAC) & (earth["el_deg"] >= inp.earth_min_elev_deg),
        # Sunlight on a surface facing the Sun: inverse-square law times the visible part of the disk
        # (limb darkening ignored: a half-hidden disk is counted as half the light).
        "irradiance_w_m2": config.SOLAR_CONSTANT_W_M2 * (AU_KM / sun["dist_km"]) ** 2 * sun_vis,
    }


def _mean_or_none(values: np.ndarray, mask: np.ndarray) -> float | None:
    return float(values[mask].mean()) if mask.any() else None


def _num(v) -> float | None:
    return None if v is None or np.isnan(v) else float(v)


def summarize(series: dict[str, np.ndarray], i: int, sl: slice, step_s: int, inp: Inputs) -> dict[str, float | None]:
    """Parameters of site `i` over the time slice `sl`. Durations have the resolution of `step_s`."""
    lit, comm = series["lit"][i, sl], series["comm"][i, sl]
    sun_el, earth_el = series["sun_el_deg"][i, sl], series["earth_el_deg"][i, sl]
    window_h = lit.size * step_s / 3600.0
    energy_kwh_m2 = float(series["irradiance_w_m2"][i, sl].sum()) * step_s / 3.6e6
    longest_dark_h = vis.longest_run_h(~lit, step_s)

    generated = required = margin = battery = None
    if inp.panel_area_m2 is not None and inp.panel_efficiency_frac is not None:
        generated = energy_kwh_m2 * inp.panel_area_m2 * inp.panel_efficiency_frac
    if inp.load_w is not None:
        required = inp.load_w * window_h / 1000.0
        battery = inp.load_w * longest_dark_h          # Wh needed to bridge the longest dark period
    if generated is not None and required is not None:
        margin = generated - required

    return {
        "sunlit_frac": float(lit.mean()),
        "longest_dark_h": longest_dark_h,
        "hours_to_first_dark_h": vis.hours_to_first(~lit, step_s),
        "mean_sun_el_when_lit_deg": _mean_or_none(sun_el, lit),
        "sun_el_min_deg": float(sun_el.min()), "sun_el_max_deg": float(sun_el.max()),
        "sun_energy_tracking_kwh_m2": energy_kwh_m2,
        "mean_irradiance_w_m2": energy_kwh_m2 * 1000.0 / window_h,
        "earth_visible_frac": float(comm.mean()),
        "longest_no_earth_h": vis.longest_run_h(~comm, step_s),
        "hours_to_first_earth_loss_h": vis.hours_to_first(~comm, step_s),
        "mean_earth_el_when_visible_deg": _mean_or_none(earth_el, comm),
        "earth_el_min_deg": float(earth_el.min()), "earth_el_max_deg": float(earth_el.max()),
        "both_frac": float((lit & comm).mean()),
        "energy_generated_kwh": generated, "energy_required_kwh": required, "energy_margin_kwh": margin,
        "battery_needed_wh": battery,
        # Terrain parameters from the LOLA maps; null when the terrain is not used or the maps are missing.
        "slope_deg": _num(series["slope_deg"][i]), "elevation_m": _num(series["elevation_m"][i]),
        "window_h": window_h,
    }
