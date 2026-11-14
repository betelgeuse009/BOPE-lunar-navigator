"""Lunar terrain from the LOLA maps: elevation, slope and the horizon profile seen from a site.

Maps and their checks: data/MAPS.md. Which map is used where:
  elevation / horizon  finest DEM that covers the point: 5 m (south of 86.7 S, near field only), 80 m (south of 80 S),
                       240 m (south of 60 S), 237 m global everywhere else
  slope                official LOLA 80 m slope map south of 80 S; elsewhere computed from the DEM (central differences).
                       Every slope comes with its baseline (the pixel size it was measured over).

Horizon profile (PLAN.md 3.5): from the site, march along 720 azimuths out to 200 km. For a terrain point at surface
distance s and height h, with the observer at height h0 + h_obs:
    theta = s / R,  horizontal = (R + h) sin(theta),  vertical = (R + h) cos(theta) - (R + h0 + h_obs)
    elevation = atan2(vertical, horizontal);   horizon(az) = max over s
With flat terrain this gives exactly the smooth-sphere dip, -acos(R / (R + h_obs)).

All map samples use bilinear interpolation, so the site and the first ray samples lie on the same continuous surface.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from . import config

R_M = 1_737_400.0            # reference sphere of every LOLA product, m
MAX_RANGE_KM = 200.0
NEAR_RANGE_M = 10_000.0      # the 5 m map is used only this close to the site
_LOCK = threading.RLock()    # map readers and caches are shared by the API threads


def _path(key: str):
    return config.MAPS_DIR / config.MAPS[key][0]


def has(key: str) -> bool:
    return _path(key).exists()


def available() -> bool:
    """True when the DEMs needed for any point on the Moon are on disk (the 5 m map and the slope map are optional)."""
    return has("dem_80s_80m") and has("dem_60s_240m") and has("dem_global")


def unit_vectors(lat_deg, lon_deg) -> np.ndarray:
    lat, lon = np.radians(np.asarray(lat_deg, dtype=float)), np.radians(np.asarray(lon_deg, dtype=float))
    return np.stack([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)], axis=-1)


def _bilinear(arr, fr: np.ndarray, fc: np.ndarray, wrap_cols: bool = False) -> np.ndarray:
    """Bilinear interpolation at fractional pixel coordinates (pixel centres at +0.5). Callers pass in-range points."""
    h, w = arr.shape
    r, c = fr - 0.5, fc - 0.5
    r0 = np.clip(np.floor(r).astype(np.int64), 0, h - 2)
    tr = np.clip(r - r0, 0.0, 1.0)
    c0 = np.floor(c).astype(np.int64)
    if wrap_cols:
        tc, c1, c0 = c - c0, (c0 + 1) % w, c0 % w
    else:
        c0 = np.clip(c0, 0, w - 2)
        tc, c1 = np.clip(c - c0, 0.0, 1.0), c0 + 1
    z00, z01 = arr[r0, c0].astype(float), arr[r0, c1].astype(float)
    z10, z11 = arr[r0 + 1, c0].astype(float), arr[r0 + 1, c1].astype(float)
    return (z00 * (1 - tc) + z01 * tc) * (1 - tr) + (z10 * (1 - tc) + z11 * tc) * tr


class PolarMap:
    """South polar stereographic GeoTIFF (x = 2R py / (1 - pz), y = 2R px / (1 - pz), true scale at the pole)."""

    def __init__(self, key: str, tile_m: float | None = None):
        import rasterio
        self.key, self.name = key, _path(key).name
        self._ds = rasterio.open(_path(key))
        self.res = float(self._ds.res[0])
        self.half = float(self._ds.bounds.right)
        self.width, self.height = self._ds.width, self._ds.height
        self._tile_m = tile_m          # None: load the whole map once; else cache square tiles of this size
        self._full = None
        self._tiles: dict[tuple[int, int], np.ndarray] = {}

    @staticmethod
    def xy(p: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        k = 2.0 * R_M / (1.0 - p[..., 2])
        return k * p[..., 1], k * p[..., 0]

    def inside(self, x: np.ndarray, y: np.ndarray) -> np.ndarray:
        lim = self.half - self.res          # keep one pixel of margin for the bilinear stencil
        return (np.abs(x) < lim) & (np.abs(y) < lim)

    def _array(self):
        if self._full is None:
            self._full = self._ds.read(1)
        return self._full

    def _tile(self, ti: int, tj: int) -> np.ndarray:
        if (ti, tj) not in self._tiles:
            if len(self._tiles) >= 16:
                self._tiles.pop(next(iter(self._tiles)))
            from rasterio.windows import Window
            n = int(self._tile_m / self.res)
            self._tiles[(ti, tj)] = self._ds.read(1, window=Window(tj * n, ti * n, n + 1, n + 1), boundless=True,
                                                  fill_value=np.nan)
        return self._tiles[(ti, tj)]

    def sample(self, x: np.ndarray, y: np.ndarray) -> np.ndarray:
        """Bilinear values at map coordinates (m). Points must be `inside`."""
        fc, fr = (x + self.half) / self.res, (self.half - y) / self.res
        with _LOCK:
            if self._tile_m is None:
                return _bilinear(self._array(), fr, fc)
            n = int(self._tile_m / self.res)
            out = np.full(x.shape, np.nan)
            ti = np.clip(np.floor((fr - 0.5) / n).astype(int), 0, None)
            tj = np.clip(np.floor((fc - 0.5) / n).astype(int), 0, None)
            for code in np.unique(ti * 100_000 + tj):
                a, b = divmod(int(code), 100_000)
                m = (ti == a) & (tj == b)
                out[m] = _bilinear(self._tile(a, b), fr[m] - a * n, fc[m] - b * n)
            return out


class GlobalMap:
    """LDEM_128: simple cylindrical, 128 px/deg, columns 0..360 E, raw little-endian int16, height = 0.5 * DN (m)."""

    name, ppd = "LDEM_128.IMG", 128
    res = R_M * np.pi / 180.0 / 128

    def __init__(self):
        self._a = np.memmap(_path("dem_global"), dtype="<i2", mode="r", shape=(180 * self.ppd, 360 * self.ppd))

    def rowcol(self, p: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        lat = np.degrees(np.arcsin(np.clip(p[..., 2], -1.0, 1.0)))
        lon = np.degrees(np.arctan2(p[..., 1], p[..., 0])) % 360.0
        return (90.0 - lat) * self.ppd, lon * self.ppd

    def sample(self, p: np.ndarray) -> np.ndarray:
        fr, fc = self.rowcol(p)
        return 0.5 * _bilinear(self._a, fr, fc, wrap_cols=True)   # columns wrap at the 0/360 seam


@lru_cache(maxsize=None)
def _maps() -> dict:
    with _LOCK:
        m = {"80": PolarMap("dem_80s_80m"), "240": PolarMap("dem_60s_240m"), "global": GlobalMap()}
        if has("dem_87s_5m"):
            m["5"] = PolarMap("dem_87s_5m", tile_m=10_000.0)
        return m


def _polar_order(near: bool) -> list[str]:
    return (["5"] if near and "5" in _maps() else []) + ["80", "240"]


def heights(p: np.ndarray, near: bool = True, used: set | None = None) -> np.ndarray:
    """Terrain height (m above the sphere) at unit vectors `p`, from the finest DEM covering each point.

    `near=False` skips the 5 m map (far field). `used` collects the names of the maps that contributed.
    """
    m = _maps()
    h = np.full(p.shape[:-1], np.nan)
    south = p[..., 2] < -0.5                       # polar stereographic is only used well inside the south
    if south.any():
        x, y = PolarMap.xy(np.where(south[..., None], p, [0.0, 0.0, -1.0]))
        for key in _polar_order(near):
            todo = south & np.isnan(h) & m[key].inside(x, y)
            if todo.any():
                h[todo] = m[key].sample(x[todo], y[todo])
                if used is not None:
                    used.add(key)
    todo = np.isnan(h)
    if todo.any():
        h[todo] = m["global"].sample(p[todo])
        if used is not None:
            used.add("global")
    return h


def finest_resolution_m(p: np.ndarray) -> float:
    """Pixel size of the finest DEM at one point (sets the ray-marching step)."""
    m = _maps()
    if p[2] < -0.5:
        x, y = PolarMap.xy(p)
        for key in _polar_order(True):
            if m[key].inside(x, y):
                return m[key].res
    return float(m["global"].res)


def _layer(key: str) -> dict:
    m = _maps()[key]
    return {"product": m.name, "resolution_m": round(float(m.res), 1)}


# ---------------------------------------------------------------- horizon

@dataclass(frozen=True)
class Horizon:
    az_deg: np.ndarray        # (A,) 0 .. 360 - step
    elev_deg: np.ndarray      # (A,) horizon elevation toward each azimuth
    site_elevation_m: float
    layers: tuple             # DEM layers that contributed, finest first
    max_range_km: float


def _ray_distances(res_near: float, res_far: float, radial: float, max_range_m: float, near_range_m: float) -> np.ndarray:
    """Distances along a ray: step = max(pixel, radial * distance), so the angular sampling stays roughly constant."""
    out, s, res = [], res_near, res_near
    while s < max_range_m:
        out.append(s)
        if res_near < res_far and s >= near_range_m:
            res = res_far
        s += max(res, radial * s)
    return np.array(out)


def march(site_p: np.ndarray, h0: float, obs_height_m: float, az_deg: np.ndarray, s: np.ndarray, sampler) -> np.ndarray:
    """Horizon elevation (deg) per azimuth. `sampler(points (A, M, 3), distances (M,)) -> heights (A, M)`."""
    east = np.cross([0.0, 0.0, 1.0], site_p)
    east /= np.linalg.norm(east)
    north = np.cross(site_p, east)
    az = np.radians(az_deg)
    direction = np.sin(az)[:, None] * east + np.cos(az)[:, None] * north                       # (A, 3)
    theta = s / R_M
    pts = np.cos(theta)[None, :, None] * site_p + np.sin(theta)[None, :, None] * direction[:, None, :]   # (A, M, 3)
    h = sampler(pts, s)
    horizontal = (R_M + h) * np.sin(theta)
    vertical = (R_M + h) * np.cos(theta) - (R_M + h0 + obs_height_m)
    el = np.degrees(np.arctan2(vertical, horizontal))
    return np.nanmax(el, axis=1)


@lru_cache(maxsize=8192)
def _horizon(lat: float, lon: float, obs_height_m: float, az_step_deg: float, radial: float) -> Horizon:
    p = unit_vectors(np.clip(lat, -config.LAT_CLAMP_DEG, config.LAT_CLAMP_DEG), lon)   # east/north undefined at the pole
    with _LOCK:
        h0 = float(heights(p[None, :])[0])
        res_near = finest_resolution_m(p)
        res_far = max(res_near, 80.0) if res_near < 80.0 else res_near
        s = _ray_distances(res_near, res_far, radial, MAX_RANGE_KM * 1000.0, NEAR_RANGE_M)
        used: set = set()

        def sampler(pts, dist):
            near = dist < NEAR_RANGE_M
            out = np.empty(pts.shape[:-1])
            if near.any():
                out[:, near] = heights(pts[:, near], near=True, used=used)
            if (~near).any():
                out[:, ~near] = heights(pts[:, ~near], near=False, used=used)
            return out

        az = np.arange(0.0, 360.0, az_step_deg)
        el = march(p, h0, obs_height_m, az, s, sampler)
    order = [k for k in ("5", "80", "240", "global") if k in used]
    return Horizon(az, el, h0, tuple(_layer(k) for k in order), MAX_RANGE_KM)


def horizon(lat_deg: float, lon_deg: float, obs_height_m: float, fast: bool = False) -> Horizon:
    """Terrain horizon of a site. `fast` uses 2 deg azimuth steps and coarser ray steps (for area searches)."""
    az_step, radial = (2.0, 0.02) if fast else (0.5, 0.005)
    return _horizon(round(float(lat_deg), 6), round(float(lon_deg), 6), round(float(obs_height_m), 3), az_step, radial)


def horizon_at(hz: Horizon, az_deg: np.ndarray) -> np.ndarray:
    """Horizon elevation toward arbitrary azimuths (linear interpolation, periodic in azimuth)."""
    return np.interp(az_deg, hz.az_deg, hz.elev_deg, period=360.0)


# ---------------------------------------------------------------- elevation and slope at points

def elevation_m(lat_deg, lon_deg) -> np.ndarray:
    """Terrain height above the 1737.4 km sphere, from the finest DEM at each point."""
    with _LOCK:
        return heights(unit_vectors(np.atleast_1d(lat_deg), np.atleast_1d(lon_deg)))


def dem_at(lat_deg: float, lon_deg: float) -> dict:
    """Name and pixel size of the finest DEM at one point."""
    used: set = set()
    with _LOCK:
        heights(unit_vectors(lat_deg, lon_deg)[None, :], used=used)
    return _layer(next(k for k in ("5", "80", "240", "global") if k in used))


def _slope_polar(m: PolarMap, x: np.ndarray, y: np.ndarray, p: np.ndarray) -> np.ndarray:
    d = m.res
    gx = (m.sample(x + d, y) - m.sample(x - d, y)) / (2 * d)
    gy = (m.sample(x, y + d) - m.sample(x, y - d)) / (2 * d)
    k = 2.0 / (1.0 - p[..., 2])          # stereographic scale factor: map metres per ground metre
    return np.degrees(np.arctan(np.hypot(gx, gy) * k))


def _slope_global(g: GlobalMap, p: np.ndarray) -> np.ndarray:
    lat = np.arcsin(np.clip(p[..., 2], -1.0, 1.0))
    lon = np.arctan2(p[..., 1], p[..., 0])
    d = g.res / R_M                                      # one pixel of latitude, rad
    dlon = d / np.maximum(np.cos(lat), 1e-3)             # the same ground distance in longitude
    def at(la, lo):
        return g.sample(np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=-1))
    lat_c = np.clip(lat, -np.pi / 2 + d, np.pi / 2 - d)
    gx = (at(lat_c, lon + dlon) - at(lat_c, lon - dlon)) / (2 * g.res)
    gy = (at(lat_c + d, lon) - at(lat_c - d, lon)) / (2 * g.res)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


@lru_cache(maxsize=None)
def _aux(key: str):
    import rasterio
    return rasterio.open(_path(key)) if has(key) else None


def _sample_aux(key: str, lat_deg, lon_deg, scale: float = 1.0) -> np.ndarray:
    """Nearest-pixel values of an auxiliary polar map (slope, error, AVGVISIB); NaN outside it or if the file is missing."""
    lat, lon = np.atleast_1d(lat_deg), np.atleast_1d(lon_deg)
    out = np.full(lat.shape, np.nan)
    ds = _aux(key)
    if ds is None:
        return out
    p = unit_vectors(lat, lon)
    ok = p[..., 2] < -0.5
    x, y = PolarMap.xy(np.where(ok[..., None], p, [0.0, 0.0, -1.0]))
    ok &= (np.abs(x) < ds.bounds.right) & (np.abs(y) < ds.bounds.top)
    with _LOCK:
        vals = np.array([v[0] for v in ds.sample(zip(x[ok], y[ok]))], dtype=float)
    if ds.nodata is not None and not np.isnan(ds.nodata):
        vals[vals == ds.nodata] = np.nan
    out[ok] = vals * scale
    return out


def slope_deg(lat_deg, lon_deg) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Slope at points: (value in deg, baseline in m, source per point).

    Official LOLA 80 m slope map where it exists; otherwise central differences on the finest DEM that is not
    finer than 80 m (so the baseline is 80, 240 or 237 m: never the 5 m map, to stay comparable).
    """
    lat, lon = np.atleast_1d(np.asarray(lat_deg, dtype=float)), np.atleast_1d(np.asarray(lon_deg, dtype=float))
    p = unit_vectors(lat, lon)
    value = _sample_aux("slope_80s_80m", lat, lon)
    baseline = np.where(np.isnan(value), np.nan, 80.0)
    source = np.where(np.isnan(value), "", "LDSM_80S_80MPP_ADJ (official slope map)").astype(object)
    m = _maps()
    with _LOCK:
        south = p[..., 2] < -0.5
        x, y = PolarMap.xy(np.where(south[..., None], p, [0.0, 0.0, -1.0]))
        for key in ("80", "240"):
            todo = np.isnan(value) & south & m[key].inside(x, y)
            if todo.any():
                value[todo] = _slope_polar(m[key], x[todo], y[todo], p[todo])
                baseline[todo], source[todo] = m[key].res, f"computed from {m[key].name}"
        todo = np.isnan(value)
        if todo.any():
            value[todo] = _slope_global(m["global"], p[todo])
            baseline[todo], source[todo] = round(float(m["global"].res), 1), f"computed from {m['global'].name}"
    return value, baseline, list(source)


def height_error_m(lat_deg, lon_deg) -> np.ndarray:
    """LOLA height error (m) south of 80 S; NaN elsewhere."""
    return _sample_aux("dem_err_80s_80m", lat_deg, lon_deg)


def lola_mean_visibility(lat_deg, lon_deg) -> tuple[np.ndarray, np.ndarray]:
    """Long-term mean Sun and Earth visibility (0..1) from the LOLA AVGVISIB maps, south of 85 S; NaN elsewhere."""
    return (_sample_aux("avgvisib_sun", lat_deg, lon_deg, 4e-5), _sample_aux("avgvisib_earth", lat_deg, lon_deg, 4e-5))
