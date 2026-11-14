"""Convert NASA SVS CGI Moon Kit maps (https://svs.gsfc.nasa.gov/4720) into web textures.

Display assets only (not analysis data). Credit: NASA's Scientific Visualization Studio.
Inputs (from SVS 4720): lroc_color_poles_4k.tif, ldem_16_uint.tif
Outputs: equirectangular moon_color.jpg + moon_normal.jpg for the sphere, and a south polar cap
(moon_south_color.jpg + moon_south_normal.jpg) in an azimuthal equidistant projection, because an
equirectangular map pinches into streaks at the pole. Cap UV convention must match polarCapUV() in src/scene/geo.ts.
Usage: python3 scripts/textures.py <input_dir> <output_dir>\n(input_dir is searched recursively for the optional LDEM_80S / WAC GeoTIFFs)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

color = Image.open(src / "lroc_color_poles_4k.tif").convert("RGB")
color.save(out / "moon_color.jpg", quality=88, optimize=True)

# Normal map from LOLA heights. The SVS colour maps are smeared poleward of ~70 deg, where our
# sites are, so relief from LOLA (which covers the poles) carries the look there.
# ldem_16_uint: unsigned 16-bit, half-metres (SVS 4720). Equirectangular, row 0 = north.
R_M = 1737400.0
EXAGGERATION = 4.0  # visual only, stated on screen as "relief exaggerated"
h = np.asarray(Image.open(src / "ldem_16_uint.tif"), dtype=np.float32) * 0.5  # metres (offset irrelevant)
rows, cols = h.shape
lat = np.deg2rad(90 - (np.arange(rows) + 0.5) * 180 / rows)[:, None]
dy = np.pi * R_M / rows                                       # metres per row
dx = 2 * np.pi * R_M / cols * np.maximum(np.cos(lat), 0.02)   # metres per column (clamped at poles)
d_east = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / (2 * dx)    # wraps in longitude
d_north = -np.gradient(h, axis=0) / dy                        # rows increase southward


def normal_rgb(d_u, d_v):
    """Tangent-space normal map from height slopes along +u and +v (OpenGL convention, as three.js expects)."""
    n = np.dstack([-d_u * EXAGGERATION, -d_v * EXAGGERATION, np.ones_like(d_u)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))


normal_rgb(d_east, d_north).resize((4096, 2048), Image.LANCZOS).save(out / "moon_normal.jpg", quality=90, optimize=True)

# --- South polar cap: azimuthal equidistant, centred on the pole, radius CAP_DEG of latitude.
# Pixel (col,row) -> X = 2u-1, Y = 2v-1 with u = col/N, v = 1 - row/N (three.js flips Y).
# rho = hypot(X,Y) in 0..1 maps to lat = -90 + rho*CAP_DEG; lon = atan2(Y, X).
# Optional sharper sources (polar stereographic GeoTIFFs, shared by AERO; never committed):
#   LDEM_80S_80MPP_ADJ.tiff  LOLA heights, 80 m/px, 80S-pole (PGDA)      -> relief poleward of 80S
#   WAC_ROI_SOUTH_SUMMER_064P.PYR.TIF  LROC WAC mosaic, ~474 m/px (ASU)  -> imagery for the whole cap
CAP_DEG = 20.0
N = 4096
Image.MAX_IMAGE_PIXELS = None


def sample(img, lat_deg, lon_deg):
    """Bilinear sample of an equirectangular array (row 0 = 90N, col 0 = 180W), wrapping in longitude."""
    H, W = img.shape[:2]
    r = np.clip((90 - lat_deg) / 180 * H - 0.5, 0, H - 1)
    c = ((lon_deg + 180) / 360 * W - 0.5) % W
    return bilinear(img, r, c, wrap=True)


def bilinear(img, r, c, wrap=False):
    H, W = img.shape[:2]
    r = np.clip(r, 0, H - 1)
    c = c % W if wrap else np.clip(c, 0, W - 1)
    r0, c0 = np.floor(r).astype(int), np.floor(c).astype(int)
    r1 = np.minimum(r0 + 1, H - 1)
    c1 = (c0 + 1) % W if wrap else np.minimum(c0 + 1, W - 1)
    fr, fc = (r - r0).astype(np.float32), (c - c0).astype(np.float32)
    if img.ndim == 3:
        fr, fc = fr[..., None], fc[..., None]
    top = img[r0, c0] * (1 - fc) + img[r0, c1] * fc
    bot = img[r1, c0] * (1 - fc) + img[r1, c1] * fc
    return top * (1 - fr) + bot * fr


def polar_stereo(path, lat_deg, lon_deg, block=1):
    """Sample a south polar stereographic GeoTIFF (sphere R, true scale at the pole).
    x = rho sin(lon), y = rho cos(lon), rho = 2R tan(pi/4 + lat/2). Checked against SVS ldem_16: r = 0.997.
    Returns (values, inside-mask). block > 1 box-averages first so the sampling does not alias."""
    im = Image.open(path)
    scale = im.tag_v2[33550][0]
    x0, y0 = im.tag_v2[33922][3], im.tag_v2[33922][4]   # top-left corner, metres
    if block > 1:
        im = im.reduce(block)
        scale *= block
    a = np.asarray(im, dtype=np.float32)
    rho = 2 * R_M * np.tan(np.pi / 4 + np.deg2rad(lat_deg) / 2)
    lon = np.deg2rad(lon_deg)
    c = (rho * np.sin(lon) - x0) / scale - 0.5
    r = (y0 - rho * np.cos(lon)) / scale - 0.5
    inside = (r >= 0) & (r <= a.shape[0] - 1) & (c >= 0) & (c <= a.shape[1] - 1)
    return bilinear(a, r, c), inside


def smoothstep(lat, full_at, zero_at):
    t = np.clip((lat - zero_at) / (full_at - zero_at), 0, 1)
    return t * t * (3 - 2 * t)


X = ((np.arange(N) + 0.5) / N * 2 - 1).astype(np.float32)
XX, YY = np.meshgrid(X, -X)
cap_lat = -90 + np.minimum(np.hypot(XX, YY), 1.0) * CAP_DEG
cap_lon = np.rad2deg(np.arctan2(YY, XX))
px_m = np.deg2rad(CAP_DEG) * R_M / (N / 2)  # metres per pixel (exact along radials)


def cap_normals(hp):
    return np.gradient(hp, axis=1) / px_m, -np.gradient(hp, axis=0) / px_m  # rows go down, +v goes up


d_u, d_v = cap_normals(sample(h, cap_lat, cap_lon))
col = sample(np.asarray(color, dtype=np.float32), cap_lat, cap_lon)

ldem80 = next(iter(sorted(src.glob("**/LDEM_80S_80MPP_ADJ.tif*"))), None)
if ldem80:
    hp, inside = polar_stereo(ldem80, cap_lat, cap_lon, block=2)  # 160 m, close to the cap's ~150 m/px
    w = smoothstep(cap_lat, -80.6, -80.1) * inside              # 80S edge: blend into the SVS relief
    du80, dv80 = cap_normals(hp)
    d_u, d_v = d_u * (1 - w) + du80 * w, d_v * (1 - w) + dv80 * w
    print("cap relief: LOLA 80 m poleward of 80S")

wac = next(iter(sorted(src.glob("**/WAC_ROI_SOUTH_SUMMER*.TIF"))), None)
if wac:
    g, inside = polar_stereo(wac, cap_lat, cap_lon)
    # match the SVS tone near the cap edge so the seam does not show
    ring = (cap_lat > -72) & (cap_lat < -70) & inside
    g = g * (col[..., 0][ring].mean() / g[ring].mean())
    w = (smoothstep(cap_lat, -72.0, -70.5) * inside)[..., None]
    col = col * (1 - w) + g[..., None] * w
    print("cap imagery: LROC WAC south-pole mosaic")

normal_rgb(d_u, d_v).save(out / "moon_south_normal.jpg", quality=88, optimize=True)
Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(out / "moon_south_color.jpg", quality=88, optimize=True)

for f in sorted(out.iterdir()):
    print(f.name, f.stat().st_size // 1024, "KiB")
