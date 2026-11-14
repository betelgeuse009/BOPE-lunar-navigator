"""Horizon seen from a site: the elevation angle below which the sky is blocked, for every azimuth.

CURRENT MODEL: smooth sphere, no terrain. The horizon is the geometric edge of a perfect 1737.4 km sphere seen
from `obs_height_m` above it, which lies slightly BELOW 0 deg (the "dip"): dip = acos(R / (R + h)).
  h = 2 m -> 0.087 deg, h = 10 m -> 0.194 deg. This is why a taller mast sees the Sun longer even without terrain.

NEXT (T07): replace `horizon_deg` with the real profile from the LOLA DEMs (ray marching, see PLAN.md 3.5).
That formula reduces exactly to this dip when the terrain is flat, so nothing else has to change.
"""
from __future__ import annotations

import numpy as np

SOURCE = "smooth-sphere"      # becomes the DEM product name once terrain is used
TERRAIN_AVAILABLE = False
MOON_RADIUS_M = 1_737_400.0   # reference sphere of the LOLA products (same value as pck00011.tpc)


def dip_deg(obs_height_m: float) -> float:
    """Angle of the smooth-sphere horizon below the local horizontal plane, in degrees (>= 0)."""
    return float(np.degrees(np.arccos(MOON_RADIUS_M / (MOON_RADIUS_M + max(obs_height_m, 0.0)))))


def horizon_deg(lat_deg, lon_deg, az_deg: np.ndarray, obs_height_m: float) -> np.ndarray:
    """Horizon elevation (deg) toward each azimuth in `az_deg`. Same shape as `az_deg`.

    lat/lon are unused by the smooth-sphere model; they are in the signature for the terrain version.
    """
    return np.full(np.shape(az_deg), -dip_deg(obs_height_m))
