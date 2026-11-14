"""Convert NASA SVS CGI Moon Kit maps (https://svs.gsfc.nasa.gov/4720) into web textures.

Display assets only (not analysis data). Credit: NASA's Scientific Visualization Studio.
Inputs (from SVS 4720): lroc_color_poles_4k.tif, ldem_16_uint.tif
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
n = np.dstack([-d_east * EXAGGERATION, -d_north * EXAGGERATION, np.ones_like(h)])
n /= np.linalg.norm(n, axis=2, keepdims=True)
rgb = ((n * 0.5 + 0.5) * 255).astype(np.uint8)  # OpenGL convention (+green = north = +v), as three.js expects
Image.fromarray(rgb).resize((4096, 2048), Image.LANCZOS).save(out / "moon_normal.jpg", quality=90, optimize=True)

for f in sorted(out.iterdir()):
    print(f.name, f.stat().st_size // 1024, "KiB")
