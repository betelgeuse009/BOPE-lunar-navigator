"""Convert NASA SVS CGI Moon Kit maps (https://svs.gsfc.nasa.gov/4720) into web textures.

Display assets only (not analysis data). Credit: NASA's Scientific Visualization Studio.
Inputs (from SVS 4720): lroc_color_poles_4k.tif, ldem_16_uint.tif
Outputs: equirectangular moon_color.jpg + moon_normal.jpg for the sphere, and a south polar cap
(moon_south_color.jpg + moon_south_normal.jpg) in an azimuthal equidistant projection, because an
equirectangular map pinches into streaks at the pole. Cap UV convention must match polarCapUV() in src/scene/geo.ts.
Usage: python3 scripts/textures.py <input_dir> <output_dir>
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
CAP_DEG = 20.0
N = 2048


def sample(img, lat_deg, lon_deg):
    """Bilinear sample of an equirectangular array (row 0 = 90N, col 0 = 180W), wrapping in longitude."""
    H, W = img.shape[:2]
    r = np.clip((90 - lat_deg) / 180 * H - 0.5, 0, H - 1)
    c = ((lon_deg + 180) / 360 * W - 0.5) % W
    r0, c0 = np.floor(r).astype(int), np.floor(c).astype(int)
    r1, c1 = np.minimum(r0 + 1, H - 1), (c0 + 1) % W
    fr, fc = r - r0, c - c0
    if img.ndim == 3:
        fr, fc = fr[..., None], fc[..., None]
    top = img[r0, c0] * (1 - fc) + img[r0, c1] * fc
    bot = img[r1, c0] * (1 - fc) + img[r1, c1] * fc
    return top * (1 - fr) + bot * fr


X = (np.arange(N) + 0.5) / N * 2 - 1
Y = 1 - (np.arange(N) + 0.5) / N * 2
XX, YY = np.meshgrid(X, Y)
cap_lat = -90 + np.minimum(np.hypot(XX, YY), 1.0) * CAP_DEG
cap_lon = np.rad2deg(np.arctan2(YY, XX))

hp = sample(h, cap_lat, cap_lon)
px_m = np.deg2rad(CAP_DEG) * R_M / (N / 2)  # metres per pixel (exact along radials)
d_u = np.gradient(hp, axis=1) / px_m
d_v = -np.gradient(hp, axis=0) / px_m        # rows go down, +v goes up
normal_rgb(d_u, d_v).save(out / "moon_south_normal.jpg", quality=90, optimize=True)

col = sample(np.asarray(color, dtype=np.float32), cap_lat, cap_lon)
Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(out / "moon_south_color.jpg", quality=88, optimize=True)

for f in sorted(out.iterdir()):
    print(f.name, f.stat().st_size // 1024, "KiB")
