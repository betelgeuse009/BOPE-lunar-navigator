"""Map layers for the viewer: NASA maps (data/raw/maps, see data/MAPS.md) redrawn as transparent web images.

Display assets only. Values are read from the maps and coloured; the only computed layers are the slope outside the
south pole (central differences on the LOLA altitude map) and the whole-Moon long-term visibility (made by
analysis/global_visibility.py). Every layer has:
  <key>_global.png  whole Moon, simple cylindrical, longitude -180..180, 0.125 deg per pixel
  <key>_south.png   south polar cap out to CAP_DEG from the pole, finer data where it exists (pole-centred,
                    polarCapUV in src/scene/geo.ts), for the globe
  <key>_strip.png   the same cap as a flat strip for the 2D map
Colours: one scale per layer for all three images. Skewed quantities (altitude, slope, temperature) are coloured by
their distribution: the palette is spread over the 2nd, 25th, 50th, 75th and 98th percentile of the whole-Moon values
(area-weighted), so every part of the palette is used. The breakpoints go to src/data/layers.json for the legend.
Usage (from frontend/): ../.venv/Scripts/python.exe scripts/layers.py   (needs rasterio, numpy, pillow, scipy)
"""
import csv
import json
import re
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageDraw
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.warp import transform as warp
from scipy.spatial import cKDTree

REPO = Path(__file__).resolve().parents[2]
MAPS = REPO / "data/raw/maps"
OUT = Path(__file__).resolve().parents[1] / "public/layers"
OUT.mkdir(parents=True, exist_ok=True)
R = 1737400.0
CAP_DEG = 10            # polar layers reach 80 S, the limit of the 80 m maps
N = 2048                # cap image size: 20 deg across -> about 300 m per pixel
GW, GH = 2880, 1440     # whole-Moon image: 0.125 deg per pixel (3.8 km at the equator)
SW, SH = 7200, 200      # flat strip of the cap
ALPHA = 215
# Same sequential scale as the app (src/ui/colors.ts): violet -> blue -> teal -> pale gold.
STOPS = np.array([[0x3B, 0x1F, 0x5C], [0x2A, 0x6F, 0x97], [0x2F, 0xB3, 0x9A], [0xF2, 0xE0, 0x8A]], dtype=np.float32)
QUANTILES = [2, 25, 50, 75, 98]


def colour(values, breaks, valid):
    """RGBA image: the palette is spread evenly over `breaks` (2 values = linear scale); transparent outside `valid`."""
    t = np.interp(values, breaks, np.linspace(0, 1, len(breaks))) * (len(STOPS) - 1)
    i = np.minimum(t.astype(int), len(STOPS) - 2)
    f = (t - i)[..., None]
    rgb = STOPS[i] * (1 - f) + STOPS[i + 1] * f
    a = np.where(valid, ALPHA, 0)[..., None]
    return Image.fromarray(np.dstack([rgb, a]).astype(np.uint8), "RGBA")


def breaks_of(grid, valid, decimals):
    """Area-weighted percentiles of a whole-Moon grid (rows are latitudes), made strictly increasing."""
    lat = np.radians(90 - (np.arange(grid.shape[0]) + 0.5) * 180 / grid.shape[0])
    keep = valid & (np.random.default_rng(1).random(grid.shape) < np.cos(lat)[:, None])
    b = np.round(np.percentile(grid[keep], QUANTILES), decimals)
    for k in range(1, len(b)):
        b[k] = max(b[k], b[k - 1] + 10.0 ** -decimals)
    return [float(x) for x in b]


def global_latlon(w=GW, h=GH):
    lon = -180 + 360 * (np.arange(w) + 0.5) / w
    lat = 90 - 180 * (np.arange(h) + 0.5) / h
    return np.meshgrid(lon, lat)[::-1]                # lat, lon


def cap_latlon():
    """Latitude and longitude (deg) of every pixel of the cap image, and the mask of pixels inside the cap."""
    c = (np.arange(N) + 0.5) / N
    u, v = np.meshgrid(2 * c - 1, 1 - 2 * c)          # image row 0 is v = +1 (texture top)
    rho = np.hypot(u, v)
    return -90 + CAP_DEG * rho, np.degrees(np.arctan2(v, u)), rho <= 1


GEO = CRS.from_proj4(f"+proj=longlat +R={R} +no_defs")


def sample_raster(path, lat, lon, decimate=1):
    """Values of any georeferenced map (GeoTIFF or PDS label) at lat/lon, nearest pixel. NaN outside or no data."""
    with rasterio.open(path) as src:
        h, w = src.height // decimate, src.width // decimate
        data = src.read(1, out_shape=(h, w), resampling=Resampling.average).astype(np.float32)
        tr = src.transform * src.transform.scale(src.width / w, src.height / h)
        nodata, pixel_m, crs = src.nodata, abs(src.transform.a), src.crs
        scale, offset = (src.scales[0] or 1.0), (src.offsets[0] or 0.0)
    xs, ys = warp(GEO, crs, lon.ravel().tolist(), lat.ravel().tolist())
    col, row = (~tr) * (np.array(xs), np.array(ys))
    col, row = np.floor(col).astype(int), np.floor(row).astype(int)
    ok = (col >= 0) & (col < w) & (row >= 0) & (row < h)
    out = np.full(lat.size, np.nan, dtype=np.float32)
    out[ok] = data[row[ok], col[ok]]
    if nodata is not None and not np.isnan(nodata):
        out[out == nodata] = np.nan
    return (out * scale + offset).reshape(lat.shape), pixel_m


def unit(la, lo):
    la, lo = np.radians(la), np.radians(lo)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=-1)


meta = {"cap_deg": CAP_DEG, "strip_deg": CAP_DEG, "quantiles": QUANTILES}
glat, glon = global_latlon()
lat, lon, inside = cap_latlon()
ALL = np.ones(glat.shape, bool)


def save(key, kind, img):
    name = f"{key}_{kind}.png"
    img.save(OUT / name, optimize=True)
    meta[key][kind if kind != "south" else "cap"] = f"layers/{name}"


# ---- Altitude: global 237 m map (LDEM_128), and the 80 m south-pole map on the cap.
dn = np.memmap(MAPS / "dem/global/LDEM_128.IMG", dtype="<i2", mode="r", shape=(23040, 46080))
alt = np.roll(np.asarray(dn[8::16, 8::16], dtype=np.float32) * 0.5, GW // 2, axis=1)     # m above the 1737.4 km sphere
b = breaks_of(alt, ALL, -2)
meta["altitude"] = {"breaks": b, "unit": "m", "global_pixel_m": 237, "data_min": float(alt.min()), "data_max": float(alt.max())}
save("altitude", "global", colour(alt, b, ALL))
z, px = sample_raster(MAPS / "dem/south_pole/LDEM_80S_80MPP_ADJ.tiff", lat, lon, 3)
meta["altitude"]["cap_pixel_m"] = px
save("altitude", "south", colour(np.nan_to_num(z), b, inside & np.isfinite(z)))

# ---- Slope. Whole Moon: computed here from LDEM_128 by central differences over one 237 m pixel (east-west spacing
# shrinks with cos(latitude)), then averaged to the image pixel. South of 80 S: the official LOLA 80 m slope map.
res = R * np.pi / 180 / 128
slope = np.empty((GH, GW), dtype=np.float32)
for r0 in range(0, 23040, 1024):                                             # bands of 1024 rows = 64 image rows
    a, b_ = max(r0 - 1, 0), min(r0 + 1025, 23040)
    band = np.asarray(dn[a:b_], dtype=np.float32) * 0.5
    gy = np.gradient(band, res, axis=0)
    coslat = np.cos(np.radians(90 - (np.arange(a, b_) + 0.5) / 128))[:, None]
    gx = (np.roll(band, -1, axis=1) - np.roll(band, 1, axis=1)) / (2 * res * np.maximum(coslat, 1e-3))
    n = min(1024, 23040 - r0)                                                # the last band is shorter
    s_ = np.degrees(np.arctan(np.hypot(gx, gy)))[r0 - a:r0 - a + n]
    slope[r0 // 16:r0 // 16 + n // 16] = s_.reshape(n // 16, 16, GW, 16).mean(axis=(1, 3))
slope = np.roll(slope, GW // 2, axis=1)
b = breaks_of(slope, ALL, 1)
meta["slope"] = {"breaks": b, "unit": "deg", "global_pixel_m": 237, "data_max": float(slope.max())}
save("slope", "global", colour(slope, b, ALL))
s, px = sample_raster(MAPS / "slope/LDSM_80S_80MPP_ADJ.tiff", lat, lon, 3)
meta["slope"]["cap_pixel_m"] = px
save("slope", "south", colour(np.nan_to_num(s), b, inside & np.isfinite(s)))

# ---- Long-term Sun and Earth visibility. Whole Moon: our own computation on a smooth sphere
# (analysis/global_visibility.py, 2 deg grid). South of 85 S: NASA's AVGVISIB maps (terrain included).
# Linear 0..100 % scale: the value is a share of time.
vis = json.loads((REPO / "data/processed/layers/visibility_global.json").read_text())
for key, field, name in (("sun_visibility", "sun_frac", "AVGVISIB_85S_060M_201608.tiff"),
                         ("earth_visibility", "earth_frac", "AVGVISIB_85S_060M_201608_EARTH.tiff")):
    grid = np.array(vis[field], dtype=np.float32)
    big = np.asarray(Image.fromarray(grid).resize((GW, GH), Image.BILINEAR))
    meta[key] = {"breaks": [0.0, 100.0], "unit": "%", "global_step_deg": vis["step_deg"],
                 "global_min": float(grid.min() * 100), "global_max": float(grid.max() * 100),
                 "global_mean": float((grid * np.cos(np.radians(np.array(vis["lat_deg"])))[:, None]).sum()
                                      / (np.cos(np.radians(np.array(vis["lat_deg"]))).sum() * grid.shape[1]) * 100)}
    save(key, "global", colour(big, [0, 1], ALL))
    f, px = sample_raster(MAPS / "illumination" / name, lat, lon, 4)       # scale 4e-5 applied by the reader
    ok = inside & np.isfinite(f) & (lat <= -85)
    meta[key].update(cap_pixel_m=px, cap_max=float(np.nanmax(f[ok]) * 100))
    save(key, "south", colour(np.nan_to_num(f), [0, 1], ok))

# ---- Permanently shadowed regions. Both poles from NASA's 240 m maps (LPSR_65N / LPSR_65S, poleward of 65 deg);
# on the south cap the finer outlines larger than 1 km2 (LPSR_80S_20MPP_ADJ).
PSR_RGBA = (0x6F, 0xB1, 0xE6, 230)
hl, hlon = global_latlon(GW * 2, GH * 2)                                      # 2x finer, then keep a pixel if any part is shadowed
psr = np.zeros(hl.shape, bool)
for pole, band in (("N", hl[:, 0] > 65), ("S", hl[:, 0] < -65)):
    v, _ = sample_raster(MAPS / f"psr/LPSR_65{pole}_240M_201608.LBL", hl[band], hlon[band])
    psr[band] = np.nan_to_num(v) > 0.5
psr = psr.reshape(GH, 2, GW, 2).any(axis=(1, 3))
img = np.zeros((GH, GW, 4), np.uint8)
img[psr] = PSR_RGBA
meta["psr"] = {"global_pixel_m": 240}
save("psr", "global", Image.fromarray(img, "RGBA"))
csv.field_size_limit(2**31 - 1)   # sys.maxsize overflows a C long on Windows
cap_img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
draw = ImageDraw.Draw(cap_img)


def to_px(ring):
    xy = np.array(ring.replace(",", " ").split(), dtype=np.float64).reshape(-1, 2)
    la = -90 + 2 * np.degrees(np.arctan(np.hypot(xy[:, 0], xy[:, 1]) / (2 * R)))
    lo_ = np.arctan2(xy[:, 0], xy[:, 1])
    rho = (90 + la) / CAP_DEG
    return list(zip((0.5 + 0.5 * rho * np.cos(lo_)) * N, (0.5 - 0.5 * rho * np.sin(lo_)) * N))


count, area = 0, 0.0
with open(MAPS / "psr/LPSR_80S_20MPP_ADJ_1km2.csv", newline="") as fh:
    for rec in csv.DictReader(fh):
        count += 1
        area += float(rec["area_km2"])
        for poly in re.findall(r"\(\(.*?\)\)", rec["WKT"]):
            rings = re.findall(r"\(([^()]+)\)", poly)
            draw.polygon(to_px(rings[0]), fill=PSR_RGBA)
            for hole in rings[1:]:
                draw.polygon(to_px(hole), fill=(0, 0, 0, 0))
meta["psr"].update(count=count, area_km2=round(area))
save("psr", "south", cap_img)

# ---- Surface temperature.
# Whole Moon: Diviner Global Cumulative Product (PDS LRO-L-DLRE-5-GCP-V1.0, Williams et al. 2017): measured bolometric
# brightness temperature in bins of 0.5 deg and 0.25 h of local time, all nadir data July 2009 - April 2015.
#   maximum = highest value over the local times of a bin; mean = average over the day after filling gaps of up to
#   4 h of local time by interpolation (bins with a longer gap are left blank).
# South cap: Diviner Polar Resource Product (LRO-L-DLRE-5-PRP-V2.0, Paige et al.): yearly maximum surface temperature
# and yearly average 2 cm below the surface, calculated by the Diviner team's thermal model, on terrain triangles.
CACHE = MAPS / "temperature/gcp_tbol_cube.npy"                              # parsed tables, to rerun in seconds
if CACHE.exists():
    cube = np.load(CACHE)
else:
    cube = np.full((360, 720, 96), np.nan, np.float32)                       # latitude, longitude, local time
    for f in sorted((MAPS / "temperature/gcp").glob("global_cumul_avg_cyl_*.tab")):
        t = np.loadtxt(f, delimiter=",", skiprows=1, usecols=(0, 1, 2, 10), dtype=np.float32)
        good = t[:, 3] > 0
        cube[np.floor((90 - t[good, 1]) * 2).astype(int), np.floor((t[good, 0] + 180) * 2).astype(int),
             np.floor(t[good, 2] * 4).astype(int)] = t[good, 3]
        print(f.name, flush=True)
    np.save(CACHE, cube)
seen = np.isfinite(cube)
with np.errstate(all="ignore"):
    tmax = np.where(seen.any(axis=2), np.nanmax(np.where(seen, cube, -1), axis=2), np.nan).astype(np.float32)
# Mean over the day: gaps of up to MAX_GAP_H hours of local time are filled by linear interpolation (periodic);
# bins with a longer gap have no trustworthy daily mean and stay blank.
MAX_GAP_H = 4
tmean = np.full((360, 720), np.nan, np.float32)
hours = np.arange(96)
for r_, c_ in zip(*np.nonzero(seen.sum(axis=2) >= 96 // (MAX_GAP_H * 4))):
    k = np.flatnonzero(seen[r_, c_])
    if np.diff(np.append(k, k[0] + 96)).max() <= MAX_GAP_H * 4:
        tmean[r_, c_] = np.interp(hours, k, cube[r_, c_, k], period=96).mean()
prp = np.loadtxt(MAPS / "temperature/dlre_prp_south.tab", delimiter=",", skiprows=1, usecols=(9, 10, 12, 13), dtype=np.float32)
prp = prp[(prp[:, 2] > 0) & (prp[:, 3] > 0)]                                 # lon, lat, yearly average, yearly maximum
dist, idx = cKDTree(unit(prp[:, 1], prp[:, 0])).query(unit(lat, lon).reshape(-1, 3))
near = (dist.reshape(lat.shape) * R < 2000) & inside
idx = idx.reshape(lat.shape)
for key, grid, col_ in (("temperature_max", tmax, 3), ("temperature_avg", tmean, 2)):
    ok = np.isfinite(grid)
    b = breaks_of(np.nan_to_num(grid), ok, 0)
    big = np.asarray(Image.fromarray(np.nan_to_num(grid)).resize((GW, GH), Image.BILINEAR))
    okbig = np.asarray(Image.fromarray(ok.astype(np.uint8) * 255).resize((GW, GH), Image.NEAREST)) > 0
    v = prp[idx, col_]
    meta[key] = {"breaks": b, "unit": "K", "global_bin_deg": 0.5, "covered_frac": float(ok.mean()), "max_gap_h": MAX_GAP_H,
                 "data_min": float(np.nanmin(grid)), "data_max": float(np.nanmax(grid)),
                 "cap_triangles": int(len(prp)), "cap_min": float(v[near].min()), "cap_max": float(v[near].max())}
    save(key, "global", colour(big, b, okbig))
    save(key, "south", colour(v, b, near))

# ---- Flat-map strips: every cap again as a simple cylindrical strip (longitude -180..180 across, latitude
# -90+CAP_DEG at the top to -90 at the bottom), for the 2D map. Resampled from the cap images above.
sl = -90 + CAP_DEG * (1 - (np.arange(SH) + 0.5) / SH)
so = -180 + 360 * (np.arange(SW) + 0.5) / SW
so, sl = np.meshgrid(so, sl)
rho = (90 + sl) / CAP_DEG
cx = np.clip(((0.5 + 0.5 * rho * np.cos(np.radians(so))) * N).astype(int), 0, N - 1)
cy = np.clip(((0.5 - 0.5 * rho * np.sin(np.radians(so))) * N).astype(int), 0, N - 1)
for key, m in meta.items():
    if isinstance(m, dict) and "cap" in m:
        cap = np.asarray(Image.open(OUT.parent / m["cap"]).convert("RGBA"))
        save(key, "strip", Image.fromarray(cap[cy, cx], "RGBA"))

(Path(__file__).resolve().parents[1] / "src/data/layers.json").write_text(json.dumps(meta, indent=1) + "\n")
print(json.dumps(meta, indent=1))
