"""Surface temperature, rock abundance and H-parameter at any point, from Diviner (LRO) maps.

Context values for the regolith at a site, shown next to the altitude and the slope. They are NOT used in the score.
The map layers of the front end (frontend/scripts/layers.py) use the same functions, so a clicked value and the colour
of the layer always agree. Files: data/MAPS.md. Missing files -> values are None (the API shows "n/a").

  Surface temperature   whole Moon: Diviner Global Cumulative Product (PDS LRO-L-DLRE-5-GCP-V1.0, Williams et al. 2017),
                        measured bolometric brightness temperature in 0.5 deg bins x 0.25 h of local time, 2009-2015.
                          maximum = highest value over the local times of the bin;
                          average = mean over the day after filling local-time gaps of up to MAX_GAP_H hours by
                                    linear interpolation (longer gaps: no value).
                        south of 80 S: Diviner Polar Resource Product (LRO-L-DLRE-5-PRP-V2.0, Paige et al.): yearly
                        maximum surface temperature and yearly average 2 cm below the surface, from the Diviner team's
                        thermal model, nearest terrain triangle within 2 km.
  Rock abundance        Diviner GDR level 3 (Bandfield et al. 2011), areal fraction of the surface covered by rocks
                        larger than about 1 m, from night-time temperatures; 128 px/deg, averaged here to 32 px/deg
                        (about 950 m), 80 S to 80 N.
  H-parameter           Hayne et al. 2017 (JGR Planets 122), from Diviner channel 7: the depth over which the regolith
                        density rises from its surface to its deep value, in metres. Smaller H = denser, more
                        conductive near-surface regolith = higher thermal inertia. 128 px/deg, averaged here to
                        32 px/deg, 70 S to 70 N.
"""
from __future__ import annotations

import threading
import warnings
from functools import lru_cache

import numpy as np

from . import config

MAPS = config.MAPS_DIR
DERIVED = MAPS / "derived"
GCP_DIR = MAPS / "temperature/gcp"
GCP_CUBE = MAPS / "temperature/gcp_tbol_cube.npy"
PRP_TAB = MAPS / "temperature/dlre_prp_south.tab"
RA_IMG = MAPS / "regolith/dgdr_ra_avg_cyl_128_img.img"
H_FITS = MAPS / "regolith/hpar_global_128ppd.fits"
MAX_GAP_H = 4
R_M = 1_737_400.0
RA_PPD, RA_MAX_LAT = 32, 80.0
H_PPD_OUT, H_MAX_LAT = 32, 70.0
_LOCK = threading.RLock()

SOURCES = {
    "temperature_global": "Diviner Global Cumulative Product, PDS LRO-L-DLRE-5-GCP-V1.0 (Williams et al. 2017)",
    "temperature_polar": "Diviner Polar Resource Product, PDS LRO-L-DLRE-5-PRP-V2.0 (Paige et al.)",
    "rock_abundance": "Diviner GDR level 3 rock abundance, dgdr_ra_avg_cyl_128 (Bandfield et al. 2011)",
    "h_parameter": "Diviner H-parameter map, hpar_global_128ppd (Hayne et al. 2017)",
}


def _unit(lat, lon):
    la, lo = np.radians(lat), np.radians(lon)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=-1)


# ---------------------------------------------------------------- surface temperature

def _gcp_cube() -> np.ndarray | None:
    """Bolometric temperature (K) by latitude bin (360, north first), longitude bin (720, from -180) and local time (96)."""
    if GCP_CUBE.exists():
        return np.load(GCP_CUBE)
    files = sorted(GCP_DIR.glob("global_cumul_avg_cyl_*.tab"))
    if not files:
        return None
    cube = np.full((360, 720, 96), np.nan, np.float32)
    for f in files:
        t = np.loadtxt(f, delimiter=",", skiprows=1, usecols=(0, 1, 2, 10), dtype=np.float32)
        good = t[:, 3] > 0
        cube[np.floor((90 - t[good, 1]) * 2).astype(int), np.floor((t[good, 0] + 180) * 2).astype(int),
             np.floor(t[good, 2] * 4).astype(int)] = t[good, 3]
    np.save(GCP_CUBE, cube)
    return cube


@lru_cache(maxsize=1)
def temperature_grids() -> tuple[np.ndarray, np.ndarray] | None:
    """Global (maximum, daily average) surface temperature in K on the 0.5 deg grid; NaN where not available."""
    cache = DERIVED / "temperature_gcp.npz"
    if cache.exists():
        z = np.load(cache)
        return z["tmax"], z["tmean"]
    cube = _gcp_cube()
    if cube is None:
        return None
    seen = np.isfinite(cube)
    with np.errstate(all="ignore"):
        tmax = np.where(seen.any(axis=2), np.nanmax(np.where(seen, cube, -1), axis=2), np.nan).astype(np.float32)
    tmean = np.full((360, 720), np.nan, np.float32)
    hours = np.arange(96)
    for r, c in zip(*np.nonzero(seen.sum(axis=2) >= 96 // (MAX_GAP_H * 4))):
        k = np.flatnonzero(seen[r, c])
        if np.diff(np.append(k, k[0] + 96)).max() <= MAX_GAP_H * 4:
            tmean[r, c] = np.interp(hours, k, cube[r, c, k], period=96).mean()
    DERIVED.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(cache, tmax=tmax, tmean=tmean)
    return tmax, tmean


@lru_cache(maxsize=1)
def polar_temperature():
    """(KD-tree of triangle centres, yearly average K, yearly maximum K) of the south polar product, or None."""
    cache = DERIVED / "prp_south.npy"
    if cache.exists():
        t = np.load(cache)
    elif PRP_TAB.exists():
        t = np.loadtxt(PRP_TAB, delimiter=",", skiprows=1, usecols=(9, 10, 12, 13), dtype=np.float32)
        t = t[(t[:, 2] > 0) & (t[:, 3] > 0)]                                  # lon, lat, yearly average, yearly maximum
        DERIVED.mkdir(parents=True, exist_ok=True)
        np.save(cache, t)
    else:
        return None
    from scipy.spatial import cKDTree
    return cKDTree(_unit(t[:, 1], t[:, 0])), t[:, 2], t[:, 3]


def temperature_k(lat, lon) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """(maximum, average, source) at points. South of 80 S the polar product, elsewhere the global one."""
    lat, lon = np.atleast_1d(np.asarray(lat, float)), np.atleast_1d(np.asarray(lon, float))
    tmax, tavg = np.full(lat.shape, np.nan), np.full(lat.shape, np.nan)
    src = [""] * lat.size
    with _LOCK:
        g = temperature_grids()
        if g is not None:
            r = np.clip(np.floor((90 - lat) * 2).astype(int), 0, 359)
            c = np.floor((((lon + 180) % 360)) * 2).astype(int) % 720
            tmax, tavg = g[0][r, c].astype(float), g[1][r, c].astype(float)
            src = [SOURCES["temperature_global"] + ": measured, maximum and daily mean over local time"] * lat.size
        polar = lat < -80
        p = polar_temperature() if polar.any() else None
        if p is not None:
            tree, avg, mx = p
            d, i = tree.query(_unit(lat[polar], lon[polar]))
            ok = d * R_M < 2000
            idx = np.flatnonzero(polar)[ok]
            tmax[idx], tavg[idx] = mx[i[ok]], avg[i[ok]]
            for j in idx:
                src[j] = SOURCES["temperature_polar"] + ": thermal model, yearly maximum and yearly average 2 cm deep"
    return tmax, tavg, src


# ---------------------------------------------------------------- rock abundance

@lru_cache(maxsize=1)
def rock_grid() -> np.ndarray | None:
    """Rock abundance (fraction), float32, rows 80 N -> 80 S, columns 0 E -> 360 E, 32 px/deg: mean of the valid
    128 px/deg values of each 4 x 4 block of the PDS map (DN x 0.001, missing -32768)."""
    cache = DERIVED / "rock_abundance_32ppd.npy"
    if cache.exists():
        return np.load(cache, mmap_mode="r")
    if not RA_IMG.exists():
        return None
    raw = np.memmap(RA_IMG, dtype="<i2", mode="r", shape=(int(2 * RA_MAX_LAT * 128), 360 * 128))
    rows, cols = raw.shape[0] // 4, raw.shape[1] // 4
    out = np.full((rows, cols), np.nan, np.float32)
    for r0 in range(0, rows, 256):
        r1 = min(r0 + 256, rows)
        band = np.asarray(raw[r0 * 4:r1 * 4], dtype=np.float32)
        band[band == -32768] = np.nan
        with np.errstate(all="ignore"), warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)          # all-NaN blocks stay NaN
            out[r0:r1] = np.nanmean(band.reshape(r1 - r0, 4, cols, 4), axis=(1, 3)) * 0.001
    DERIVED.mkdir(parents=True, exist_ok=True)
    np.save(cache, out)
    return np.load(cache, mmap_mode="r")


def rock_abundance_frac(lat, lon) -> np.ndarray:
    lat, lon = np.atleast_1d(np.asarray(lat, float)), np.atleast_1d(np.asarray(lon, float))
    out = np.full(lat.shape, np.nan)
    g = rock_grid()
    if g is None:
        return out
    ok = np.abs(lat) < RA_MAX_LAT
    r = np.floor((RA_MAX_LAT - lat[ok]) * RA_PPD).astype(int)
    c = np.floor((lon[ok] % 360) * RA_PPD).astype(int) % g.shape[1]
    out[ok] = g[r, c]
    return out


# ---------------------------------------------------------------- H-parameter

def _fits_header(path, offset: int = 0) -> tuple[dict, int]:
    """Keywords of the FITS header starting at `offset` and the byte offset where its data starts."""
    head, n = {}, offset
    with open(path, "rb") as f:
        f.seek(offset)
        while True:
            block = f.read(2880).decode("ascii", "replace")
            n += 2880
            for i in range(0, 2880, 80):
                card = block[i:i + 80]
                key = card[:8].strip()
                if key == "END":
                    return head, n
                if card[8:10] == "= ":
                    head[key] = card[10:].split("/")[0].strip().strip("'").strip()


@lru_cache(maxsize=1)
def h_grid() -> np.ndarray | None:
    """H-parameter (m), float32, rows 70 N -> 70 S, columns -180 -> 180, 32 px/deg (mean of the 128 px/deg values)."""
    cache = DERIVED / "hpar_32ppd.npy"
    if cache.exists():
        return np.load(cache, mmap_mode="r")
    if not H_FITS.exists():
        return None
    # The file: an empty primary header, then the image extension HPARAM (int16, BSCALE/BZERO), then the LATITUDE
    # and LONGITUDE extensions with the grid-point coordinates (70 N -> 70 S, -180 -> 180 E).
    head, start = _fits_header(H_FITS, 2880)
    assert head.get("EXTNAME") == "HPARAM", head
    ny, nx = int(head["NAXIS2"]), int(head["NAXIS1"])
    scale, zero = float(head.get("BSCALE", 1.0)), float(head.get("BZERO", 0.0))
    blank = int(head["BLANK"]) if "BLANK" in head else None
    raw = np.memmap(H_FITS, dtype=">i2", mode="r", offset=start, shape=(ny, nx))
    f = 128 // H_PPD_OUT
    rows, cols = (ny - 1) // f, (nx - 1) // f                    # grid points include both edges: drop the last one
    out = np.full((rows, cols), np.nan, np.float32)
    for r0 in range(0, rows, 256):
        r1 = min(r0 + 256, rows)
        band = np.asarray(raw[r0 * f:r1 * f, :cols * f], dtype=np.float32)
        bad = band == blank if blank is not None else np.zeros(band.shape, bool)
        band = band * scale + zero
        band[bad] = np.nan
        with np.errstate(all="ignore"), warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)          # all-NaN blocks stay NaN
            out[r0:r1] = np.nanmean(band.reshape(r1 - r0, f, cols, f), axis=(1, 3))
    DERIVED.mkdir(parents=True, exist_ok=True)
    np.save(cache, out)
    return np.load(cache, mmap_mode="r")


def h_parameter_m(lat, lon) -> np.ndarray:
    lat, lon = np.atleast_1d(np.asarray(lat, float)), np.atleast_1d(np.asarray(lon, float))
    out = np.full(lat.shape, np.nan)
    g = h_grid()
    if g is None:
        return out
    ok = np.abs(lat) < H_MAX_LAT
    r = np.clip(np.floor((H_MAX_LAT - lat[ok]) * H_PPD_OUT).astype(int), 0, g.shape[0] - 1)
    c = np.floor(((lon[ok] + 180) % 360) * H_PPD_OUT).astype(int) % g.shape[1]
    out[ok] = g[r, c]
    return out


# ---------------------------------------------------------------- all values at one point

def point_values(lat: float, lon: float) -> dict:
    """The regolith context values at one point (None where not mapped or the file is missing) and their sources."""
    tmax, tavg, tsrc = temperature_k(lat, lon)
    ra, h = rock_abundance_frac(lat, lon)[0], h_parameter_m(lat, lon)[0]

    def num(v):
        return None if v is None or np.isnan(v) else float(v)

    return {
        "values": {"surface_temp_max_k": num(tmax[0]), "surface_temp_avg_k": num(tavg[0]),
                   "rock_abundance_frac": num(ra), "h_parameter_m": num(h)},
        "sources": {"temperature": tsrc[0] or None,
                    "rock_abundance": SOURCES["rock_abundance"] if num(ra) is not None else None,
                    "h_parameter": SOURCES["h_parameter"] if num(h) is not None else None},
    }
