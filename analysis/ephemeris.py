"""Sun and Earth seen from a point on the Moon, computed with SPICE (spiceypy).

Conventions (contracts/README.md):
- Moon-fixed frame MOON_ME (DE440 lunar frame kernel), planetocentric latitude, east-positive longitude.
- Azimuth clockwise from local north, elevation from the local tangent plane of the 1737.4 km sphere.
  Terrain is NOT included here: the horizon mask is applied separately (visible_disk_frac).
- Aberration correction LT+S (light time + stellar aberration), times in UTC.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import spiceypy as sp

REPO = Path(__file__).resolve().parents[1]
KERNEL_DIR = REPO / "data" / "raw" / "kernel"
KERNELS = [
    "naif0012.tls",              # leap seconds (UTC <-> ET)
    "pck00011.tpc",              # body radii
    "de440s.bsp",                # Sun, Earth, Moon positions
    "moon_pa_de440_200625.bpc",  # lunar orientation (libration)
    "moon_de440_250416.tf",      # MOON_ME frame definition
]
FRAME = "MOON_ME"
ABCORR = "LT+S"
LAT_CLAMP_DEG = 89.9999  # azimuth is undefined at the exact pole


def load_kernels(kernel_dir: Path = KERNEL_DIR) -> list[str]:
    """Load the five SPICE kernels. Returns their file names (for source.datasets)."""
    sp.kclear()
    for name in KERNELS:
        path = kernel_dir / name
        if not path.exists():
            raise FileNotFoundError(f"missing SPICE kernel {path}")
        sp.furnsh(str(path))
    return list(KERNELS)


def body_radius_km(body: str) -> float:
    """Mean equatorial radius from pck00011.tpc (Moon 1737.4, Earth 6378.1366, Sun 695700)."""
    return float(sp.bodvrd(body, "RADII", 3)[1][0])


def utc_grid(start_utc: str, end_utc: str, step_s: int) -> list[str]:
    """Uniform UTC grid [start, end), ISO 8601 strings ending in Z."""
    fmt = "%Y-%m-%dT%H:%M:%SZ"
    t = datetime.strptime(start_utc, fmt).replace(tzinfo=timezone.utc)
    end = datetime.strptime(end_utc, fmt).replace(tzinfo=timezone.utc)
    out = []
    while t < end:
        out.append(t.strftime(fmt))
        t += timedelta(seconds=step_s)
    return out


def utc_to_et(times_utc: list[str]) -> np.ndarray:
    """UTC strings -> SPICE ephemeris time (TDB seconds past J2000)."""
    return np.array([sp.str2et(t.rstrip("Z")) for t in times_utc])


def site_position_km(lat_deg: float, lon_deg: float, height_m: float = 0.0) -> np.ndarray:
    """Site position in MOON_ME (km) on the reference sphere plus height."""
    lat = max(-LAT_CLAMP_DEG, min(LAT_CLAMP_DEG, lat_deg))
    r = body_radius_km("MOON") + height_m / 1000.0
    return np.array(sp.latrec(r, math.radians(lon_deg), math.radians(lat)))


def topocentric(body: str, ets: np.ndarray, obspos_km: np.ndarray) -> dict[str, np.ndarray]:
    """Distance (km), azimuth and elevation (deg) of `body` seen from a point on the Moon.

    azlcpo gives the topocentric vector (so Earth's ~0.25 deg parallax is included),
    azimuth clockwise from north (azccw=False) and elevation positive up (elplsz=True).
    """
    n = len(ets)
    dist, az, el = np.empty(n), np.empty(n), np.empty(n)
    for i, et in enumerate(ets):
        v, _lt = sp.azlcpo("ELLIPSOID", body, et, ABCORR, False, True, obspos_km, "MOON", FRAME)
        dist[i], az[i], el[i] = v[0], v[1], v[2]
    az_deg = np.degrees(az) % 360.0
    az_deg[az_deg >= 360.0] = 0.0
    return {"dist_km": dist, "az_deg": az_deg, "el_deg": np.degrees(el)}


def angular_radius_deg(radius_km: float, dist_km: np.ndarray) -> np.ndarray:
    return np.degrees(np.arcsin(radius_km / dist_km))


def visible_disk_frac(el_deg: np.ndarray, radius_deg: np.ndarray, horizon_deg=0.0) -> np.ndarray:
    """Fraction of a disk above a horizon that is flat across the disk width.

    x = (el - horizon) / r; area of the circular segment above the line, normalised by the disk area.
    """
    x = np.clip((el_deg - horizon_deg) / radius_deg, -1.0, 1.0)
    return 1.0 - (np.arccos(x) - x * np.sqrt(1.0 - x * x)) / np.pi


def dir_enu(az_deg: np.ndarray, el_deg: np.ndarray) -> np.ndarray:
    """Unit vectors [east, north, up] from azimuth (clockwise from north) and elevation."""
    az, el = np.radians(az_deg), np.radians(el_deg)
    return np.column_stack([np.cos(el) * np.sin(az), np.cos(el) * np.cos(az), np.sin(el)])


def earth_phase_frac(ets: np.ndarray) -> np.ndarray:
    """Illuminated fraction of Earth seen from the Moon's centre: (1 + cos(alpha)) / 2.

    alpha = phase angle at Earth between Earth->Sun and Earth->Moon. Using the Moon's centre instead of
    the site changes alpha by < 0.3 deg, which is negligible for the phase.
    """
    alpha = np.array([sp.phaseq(et, "EARTH", "SUN", "MOON", ABCORR) for et in ets])
    return (1.0 + np.cos(alpha)) / 2.0


def sub_point(body: str, ets: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Planetocentric lat/lon (deg, lon -180..180) of the point on the Moon with `body` at zenith."""
    lat, lon = np.empty(len(ets)), np.empty(len(ets))
    for i, et in enumerate(ets):
        spoint, _, _ = sp.subpnt("INTERCEPT/ELLIPSOID", "MOON", et, FRAME, ABCORR, body)
        _r, lo, la = sp.reclat(spoint)
        lat[i], lon[i] = math.degrees(la), math.degrees(lo)
    return lat, lon
