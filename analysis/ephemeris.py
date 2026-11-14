"""Sun and Earth seen from points on the Moon, computed with SPICE (spiceypy).

Conventions (contracts/README.md):
- Moon-fixed frame MOON_ME, planetocentric latitude, east-positive longitude.
- Azimuth clockwise from local north, elevation from the local tangent plane of the 1737.4 km sphere.
  Terrain is NOT included here (see horizon.py and visibility.py).
- Aberration correction LT+S, times in UTC.

How it works (the vector form of the astronomical triangle):
1. SPICE gives the Moon->Sun and Moon->Earth vectors in MOON_ME for every time step. They do not depend on
   the site, so they are computed once per time grid and cached.
2. For each site: topocentric vector = body vector - site position (this includes the ~0.26 deg Earth parallax).
3. Project it on the local East-North-Up axes: az = atan2(E, N), el = asin(U / |r|).
Steps 2-3 are plain numpy, so thousands of sites cost almost nothing. `topocentric_azlcpo` does the same with
the SPICE routine azlcpo and is kept as an independent cross-check (see tests).
"""
from __future__ import annotations

import math
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

import numpy as np
import spiceypy as sp

from . import config

_FMT = "%Y-%m-%dT%H:%M:%SZ"
_LOCK = threading.RLock()   # CSPICE is not thread-safe; the API serves requests from several threads
_loaded = False


def load_kernels(kernel_dir: Path = config.KERNEL_DIR) -> None:
    """Load the SPICE kernels once. Raises FileNotFoundError with a hint if one is missing."""
    global _loaded
    with _LOCK:
        if _loaded:
            return
        sp.kclear()
        for name in config.KERNELS:
            path = kernel_dir / name
            if not path.exists():
                raise FileNotFoundError(f"missing SPICE kernel {path}. Run: python -m analysis.download_kernels")
            sp.furnsh(str(path))
        _loaded = True


def body_radius_km(body: str) -> float:
    """Equatorial radius from pck00011.tpc (Moon 1737.4, Earth 6378.1366, Sun 695700 km)."""
    load_kernels()
    with _LOCK:
        return float(sp.bodvrd(body, "RADII", 3)[1][0])


def parse_utc(text: str) -> datetime:
    """Accepts 2026-11-15T00:00:00Z, also without seconds or with +00:00. Always returns UTC."""
    t = datetime.fromisoformat(text.strip().replace("Z", "+00:00"))
    return t.replace(tzinfo=timezone.utc) if t.tzinfo is None else t.astimezone(timezone.utc)


def format_utc(t: datetime) -> str:
    return t.strftime(_FMT)


def utc_grid(start_utc: str, end_utc: str, step_s: int) -> list[str]:
    """Uniform UTC grid [start, end), ISO 8601 strings ending in Z."""
    t, end = parse_utc(start_utc), parse_utc(end_utc)
    out = []
    while t < end:
        out.append(format_utc(t))
        t += timedelta(seconds=step_s)
    return out


@dataclass(frozen=True)
class BodyVectors:
    """Site-independent geometry on a time grid. Arrays are read-only (the object is cached)."""
    times_utc: tuple[str, ...]
    step_s: int
    sun_km: np.ndarray            # (T, 3) Moon centre -> Sun in MOON_ME
    earth_km: np.ndarray          # (T, 3) Moon centre -> Earth in MOON_ME
    earth_phase_frac: np.ndarray  # (T,) illuminated fraction of Earth seen from the Moon

    def __len__(self) -> int:
        return len(self.times_utc)


@lru_cache(maxsize=16)
def body_vectors(start_utc: str, end_utc: str, step_s: int) -> BodyVectors:
    """Moon->Sun and Moon->Earth vectors in MOON_ME (LT+S) and Earth phase for a UTC grid. Cached."""
    load_kernels()
    times = utc_grid(start_utc, end_utc, step_s)
    n = len(times)
    sun, earth, phase = np.empty((n, 3)), np.empty((n, 3)), np.empty(n)
    with _LOCK:
        for i, t in enumerate(times):
            et = sp.str2et(t[:-1])
            sun[i] = sp.spkpos("SUN", et, config.FRAME, config.ABCORR, "MOON")[0]
            earth[i] = sp.spkpos("EARTH", et, config.FRAME, config.ABCORR, "MOON")[0]
            # Phase angle at Earth between Earth->Sun and Earth->Moon; k = (1 + cos(alpha)) / 2.
            phase[i] = (1.0 + math.cos(sp.phaseq(et, "EARTH", "SUN", "MOON", config.ABCORR))) / 2.0
    for a in (sun, earth, phase):
        a.setflags(write=False)
    return BodyVectors(tuple(times), step_s, sun, earth, phase)


def site_positions_km(lat_deg, lon_deg, height_m: float = 0.0) -> np.ndarray:
    """Positions (N, 3) in MOON_ME of points on the reference sphere plus height. Latitude is clamped near the poles."""
    lat = np.radians(np.clip(np.atleast_1d(np.asarray(lat_deg, dtype=float)), -config.LAT_CLAMP_DEG, config.LAT_CLAMP_DEG))
    lon = np.radians(np.atleast_1d(np.asarray(lon_deg, dtype=float)))
    r = body_radius_km("MOON") + height_m / 1000.0
    return r * np.column_stack([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])


def enu_axes(pos_km: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Local East, North, Up unit vectors (N, 3 each) at positions on the sphere."""
    up = pos_km / np.linalg.norm(pos_km, axis=1, keepdims=True)
    east = np.cross([0.0, 0.0, 1.0], up)
    east /= np.linalg.norm(east, axis=1, keepdims=True)
    north = np.cross(up, east)
    return east, north, up


def topocentric(body_km: np.ndarray, pos_km: np.ndarray) -> dict[str, np.ndarray]:
    """Distance (km), azimuth and elevation (deg) of a body from N sites over T steps. Arrays are (N, T)."""
    east, north, up = enu_axes(pos_km)
    r = body_km[None, :, :] - pos_km[:, None, :]            # (N, T, 3) site -> body
    dist = np.linalg.norm(r, axis=2)
    e = np.einsum("ntk,nk->nt", r, east)
    n = np.einsum("ntk,nk->nt", r, north)
    u = np.einsum("ntk,nk->nt", r, up)
    az = np.degrees(np.arctan2(e, n)) % 360.0
    az[az >= 360.0] = 0.0
    return {"dist_km": dist, "az_deg": az, "el_deg": np.degrees(np.arcsin(np.clip(u / dist, -1.0, 1.0)))}


def topocentric_azlcpo(body: str, times_utc, lat_deg: float, lon_deg: float, height_m: float = 0.0) -> dict[str, np.ndarray]:
    """Same as `topocentric` for one site, using the SPICE routine azlcpo. Slower; an independent cross-check."""
    load_kernels()
    obspos = site_positions_km(lat_deg, lon_deg, height_m)[0]
    dist, az, el = (np.empty(len(times_utc)) for _ in range(3))
    with _LOCK:
        for i, t in enumerate(times_utc):
            v, _lt = sp.azlcpo("ELLIPSOID", body, sp.str2et(t[:-1]), config.ABCORR, False, True, obspos, "MOON", config.FRAME)
            dist[i], az[i], el[i] = v[0], math.degrees(v[1]) % 360.0, math.degrees(v[2])
    return {"dist_km": dist, "az_deg": az, "el_deg": el}


def angular_radius_deg(radius_km: float, dist_km: np.ndarray) -> np.ndarray:
    return np.degrees(np.arcsin(radius_km / dist_km))


def dir_enu(az_deg: np.ndarray, el_deg: np.ndarray) -> np.ndarray:
    """Unit vectors [east, north, up] from azimuth (clockwise from north) and elevation; shape (..., 3)."""
    az, el = np.radians(az_deg), np.radians(el_deg)
    return np.stack([np.cos(el) * np.sin(az), np.cos(el) * np.cos(az), np.sin(el)], axis=-1)


def sub_point_deg(body_km: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Planetocentric lat/lon (deg, lon -180..180) of the point on the Moon that has the body at zenith.

    On a sphere this is simply the direction of the Moon->body vector.
    """
    d = body_km / np.linalg.norm(body_km, axis=1, keepdims=True)
    return np.degrees(np.arcsin(d[:, 2])), np.degrees(np.arctan2(d[:, 1], d[:, 0]))
