"""Horizon seen from a site: the elevation angle below which the sky is blocked, toward any azimuth.

Two models:
- "lola-terrain": the real skyline from the LOLA DEMs (analysis/terrain.py). Used when the maps are on disk
  (data/MAPS.md) and the request does not switch it off.
- "smooth-sphere": no terrain. The horizon is the edge of a perfect 1737.4 km sphere seen from `obs_height_m`,
  slightly below 0 deg: dip = acos(R / (R + h)) (0.087 deg at 2 m, 0.194 deg at 10 m).
The terrain formula reduces exactly to the smooth-sphere dip when the terrain is flat.
"""
from __future__ import annotations

import numpy as np

from . import terrain

SMOOTH, TERRAIN = "smooth-sphere", "lola-terrain"
MOON_RADIUS_M = terrain.R_M


def terrain_available() -> bool:
    return terrain.available()


def source(use_terrain: bool) -> str:
    return TERRAIN if use_terrain and terrain_available() else SMOOTH


def dip_deg(obs_height_m: float) -> float:
    """Angle of the smooth-sphere horizon below the local horizontal plane, in degrees (>= 0)."""
    return float(np.degrees(np.arccos(MOON_RADIUS_M / (MOON_RADIUS_M + max(obs_height_m, 0.0)))))


def horizon_deg(lat_deg, lon_deg, az_deg: np.ndarray, obs_height_m: float, use_terrain: bool = True,
                fast: bool = False, offset_deg: float = 0.0) -> np.ndarray:
    """Horizon elevation (deg) toward the azimuths `az_deg` (N sites x T steps). Same shape as `az_deg`.

    `offset_deg` raises (or lowers) the whole skyline: used to propagate the skyline accuracy into the metrics.
    """
    if source(use_terrain) == SMOOTH:
        return np.full(np.shape(az_deg), -dip_deg(obs_height_m) + offset_deg)
    lat, lon = np.atleast_1d(lat_deg), np.atleast_1d(lon_deg)
    out = np.empty(np.shape(az_deg))
    for i in range(lat.size):
        out[i] = terrain.horizon_at(terrain.horizon(lat[i], lon[i], obs_height_m, fast), az_deg[i])
    return out + offset_deg
