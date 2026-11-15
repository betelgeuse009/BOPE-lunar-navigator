"""Map layers for the viewer: LOLA maps (data/raw/maps, see data/MAPS.md) redrawn as transparent web images.

Display assets only. Values are read from the maps and coloured; nothing is modelled here. The colour range of each
layer and the pixel size of the source are written to src/data/layers.json so the legend states them.
Polar layers use the same pole-centred projection as the south cap texture (polarCapUV in src/scene/geo.ts),
out to CAP_DEG degrees from the pole. The global elevation layer is simple cylindrical, longitude -180..180.
Usage (from frontend/): uv run --with rasterio --with numpy --with pillow python scripts/layers.py
"""
import csv
import json
import re
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageDraw
from rasterio.enums import Resampling

MAPS = Path(__file__).resolve().parents[2] / "data/raw/maps"
OUT = Path(__file__).resolve().parents[1] / "public/layers"
OUT.mkdir(parents=True, exist_ok=True)
R = 1737400.0
CAP_DEG = 10   # polar layers reach 80 S, the limit of the 80 m maps
N = 2048       # cap image size: 20 deg across -> about 300 m per pixel
ALPHA = 215
# Same sequential scale as the app (src/ui/colors.ts): violet -> blue -> teal -> pale gold.
STOPS = np.array([[0x3B, 0x1F, 0x5C], [0x2A, 0x6F, 0x97], [0x2F, 0xB3, 0x9A], [0xF2, 0xE0, 0x8A]], dtype=np.float32)


def colour(values, lo, hi, valid):
    """RGBA image of `values` on the scale lo..hi; pixels outside `valid` are transparent."""
    t = np.clip((values - lo) / (hi - lo), 0, 1) * (len(STOPS) - 1)
    i = np.minimum(t.astype(int), len(STOPS) - 2)
    f = (t - i)[..., None]
    rgb = STOPS[i] * (1 - f) + STOPS[i + 1] * f
    a = np.where(valid, ALPHA, 0)[..., None]
    return Image.fromarray(np.dstack([rgb, a]).astype(np.uint8), "RGBA")


def cap_latlon():
    """Latitude and longitude (deg) of every pixel of the cap image, and the mask of pixels inside the cap."""
    c = (np.arange(N) + 0.5) / N
    u, v = np.meshgrid(2 * c - 1, 1 - 2 * c)          # image row 0 is v = +1 (texture top)
    rho = np.hypot(u, v)
    return -90 + CAP_DEG * rho, np.degrees(np.arctan2(v, u)), rho <= 1


def sample_polar(path, lat, lon, decimate):
    """Values of a south polar stereographic map (lon_0 = 0, true scale at the pole) at lat/lon. NaN outside."""
    with rasterio.open(path) as src:
        h, w = src.height // decimate, src.width // decimate
        data = src.read(1, out_shape=(h, w), resampling=Resampling.average).astype(np.float32)
        tr = src.transform * src.transform.scale(src.width / w, src.height / h)
        nodata, pixel_m = src.nodata, abs(src.transform.a)
    r = 2 * R * np.tan(np.radians(90 + lat) / 2)
    x, y = r * np.sin(np.radians(lon)), r * np.cos(np.radians(lon))
    col, row = (~tr) * (x, y)
    col, row = np.floor(col).astype(int), np.floor(row).astype(int)
    ok = (col >= 0) & (col < w) & (row >= 0) & (row < h)
    out = np.full(lat.shape, np.nan, dtype=np.float32)
    out[ok] = data[row[ok], col[ok]]
    if nodata is not None:
        out[out == nodata] = np.nan
    return out, pixel_m


meta = {"cap_deg": CAP_DEG}
lat, lon, inside = cap_latlon()

# ---- Elevation: global 237 m map, and the 80 m south-pole map on the cap. One colour range for both.
dn = np.memmap(MAPS / "dem/global/LDEM_128.IMG", dtype="<i2", mode="r", shape=(23040, 46080))
glob = np.asarray(dn[8::16, 8::16], dtype=np.float32) * 0.5          # metres above the 1737.4 km sphere
glob = np.roll(glob, glob.shape[1] // 2, axis=1)                      # columns 0..360 E -> -180..180
lo, hi = (float(round(p, -2)) for p in np.percentile(glob, [1, 99]))
colour(glob, lo, hi, np.ones(glob.shape, bool)).save(OUT / "elevation_global.png", optimize=True)
z, px = sample_polar(MAPS / "dem/south_pole/LDEM_80S_80MPP_ADJ.tiff", lat, lon, 3)
colour(np.nan_to_num(z), lo, hi, inside & np.isfinite(z)).save(OUT / "elevation_south.png", optimize=True)
meta["elevation"] = {"range": [lo, hi], "unit": "m", "global": "layers/elevation_global.png", "cap": "layers/elevation_south.png",
                     "global_pixel_m": 237, "cap_pixel_m": px, "data_min": float(glob.min()), "data_max": float(glob.max())}

# ---- Slope: official LOLA 80 m slope map, south of 80 S.
s, px = sample_polar(MAPS / "slope/LDSM_80S_80MPP_ADJ.tiff", lat, lon, 3)
colour(np.nan_to_num(s), 0, 30, inside & np.isfinite(s)).save(OUT / "slope_south.png", optimize=True)
meta["slope"] = {"range": [0, 30], "unit": "deg", "cap": "layers/slope_south.png", "cap_pixel_m": px}

# ---- Long-term Sun and Earth visibility (AVGVISIB), south of 85 S. Stored as int16 * 4e-5 = fraction of time.
for key, name in (("sun_visibility", "AVGVISIB_85S_060M_201608.tiff"), ("earth_visibility", "AVGVISIB_85S_060M_201608_EARTH.tiff")):
    f, px = sample_polar(MAPS / "illumination" / name, lat, lon, 4)
    f = f * 4e-5
    ok = inside & np.isfinite(f) & (lat <= -85)
    colour(np.nan_to_num(f), 0, 1, ok).save(OUT / f"{key}_south.png", optimize=True)
    meta[key] = {"range": [0, 100], "unit": "%", "cap": f"layers/{key}_south.png", "cap_pixel_m": px, "data_max": float(np.nanmax(f[ok]) * 100)}

# ---- Permanently shadowed regions larger than 1 km2 (polygons in polar stereographic metres).
csv.field_size_limit(2**31 - 1)   # sys.maxsize overflows a C long on Windows
img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)


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
            draw.polygon(to_px(rings[0]), fill=(0x6F, 0xB1, 0xE6, 200))
            for hole in rings[1:]:
                draw.polygon(to_px(hole), fill=(0, 0, 0, 0))
img.save(OUT / "psr_south.png", optimize=True)
meta["psr"] = {"cap": "layers/psr_south.png", "count": count, "area_km2": round(area)}

(Path(__file__).resolve().parents[1] / "src/data/layers.json").write_text(json.dumps(meta, indent=1) + "\n")
print(json.dumps(meta, indent=1))

# ---- Surface temperature: Diviner Polar Resource Product (PDS LRO-L-DLRE-5-PRP-V2.0, Paige et al.), south pole.
# A table of terrain triangles with the yearly average temperature (2 cm below the surface) and the yearly maximum
# surface temperature, both calculated by the Diviner team's thermal model. Each cap pixel takes the nearest triangle.
PRP = MAPS / "temperature/dlre_prp_south.tab"
if PRP.exists():
    from scipy.spatial import cKDTree
    t = np.loadtxt(PRP, delimiter=",", skiprows=1, usecols=(9, 10, 12, 13), dtype=np.float32)   # lon, lat, avg, max
    t = t[(t[:, 2] > 0) & (t[:, 3] > 0)]

    def unit(la, lo):
        la, lo = np.radians(la), np.radians(lo)
        return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=-1)

    dist, idx = cKDTree(unit(t[:, 1], t[:, 0])).query(unit(lat, lon).reshape(-1, 3))
    near = (dist.reshape(lat.shape) * R < 2000) & inside                       # within 2 km of a triangle centre
    idx = idx.reshape(lat.shape)
    for key, col_, label in (("temperature_max", 3, "yearly maximum"), ("temperature_avg", 2, "yearly average")):
        v = t[idx, col_]
        lo_, hi_ = (float(round(p, -1)) for p in np.percentile(v[near], [1, 99]))
        colour(v, lo_, hi_, near).save(OUT / f"{key}_south.png", optimize=True)
        meta[key] = {"range": [lo_, hi_], "unit": "K", "cap": f"layers/{key}_south.png", "triangles": int(len(t)),
                     "data_min": float(v[near].min()), "data_max": float(v[near].max()),
                     "north_limit_deg": float(t[:, 1].max())}

# ---- Flat-map strips: every polar layer again as a simple cylindrical strip (longitude -180..180 across,
# latitude -90+CAP_DEG at the top to -90 at the bottom), for the 2D map. Resampled from the cap images above.
SW, SH = 7200, 200
sl = -90 + CAP_DEG * (1 - (np.arange(SH) + 0.5) / SH)                # row 0 = northern edge of the cap
so = -180 + 360 * (np.arange(SW) + 0.5) / SW
so, sl = np.meshgrid(so, sl)
rho = (90 + sl) / CAP_DEG
cx = np.clip(((0.5 + 0.5 * rho * np.cos(np.radians(so))) * N).astype(int), 0, N - 1)
cy = np.clip(((0.5 - 0.5 * rho * np.sin(np.radians(so))) * N).astype(int), 0, N - 1)
for key, m in meta.items():
    if isinstance(m, dict) and "cap" in m:
        cap = np.asarray(Image.open(OUT.parent / m["cap"]).convert("RGBA"))
        Image.fromarray(cap[cy, cx], "RGBA").save(OUT / f"{key}_strip.png", optimize=True)
        m["strip"] = f"layers/{key}_strip.png"
meta["strip_deg"] = CAP_DEG

(Path(__file__).resolve().parents[1] / "src/data/layers.json").write_text(json.dumps(meta, indent=1) + "\n")
print(json.dumps(meta, indent=1))
