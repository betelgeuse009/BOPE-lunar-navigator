"""Generic, tileable regolith texture for the surface view (public/textures/regolith_*.jpg).

Procedural, not a map of any real place: fractal noise made periodic by building it in Fourier space, plus small
bowl-shaped craters drawn with wrap-around, so the tile repeats without seams. A normal map comes from the same height.
Run from frontend/:  ../.venv/Scripts/python.exe scripts/regolith_texture.py
"""
import numpy as np
from PIL import Image

N = 1024
rng = np.random.default_rng(20261115)

# Fractal (1/f^beta) noise, periodic because it is the inverse FFT of a random spectrum.
k = np.fft.fftfreq(N)[:, None] ** 2 + np.fft.fftfreq(N)[None, :] ** 2
k[0, 0] = 1
spec = (rng.normal(size=(N, N)) + 1j * rng.normal(size=(N, N))) / k ** 0.9
spec[0, 0] = 0
h = np.real(np.fft.ifft2(spec))
h = (h - h.mean()) / h.std()

# Craters: a raised rim and a bowl, power-law sizes (many small, few large), drawn on the torus.
y, x = np.mgrid[0:N, 0:N]
for r in (6 * rng.pareto(1.6, 260) + 4).clip(4, 90):
    cx, cy = rng.uniform(0, N, 2)
    dx = (x - cx + N / 2) % N - N / 2
    dy = (y - cy + N / 2) % N - N / 2
    d = np.hypot(dx, dy) / r
    bowl = np.where(d < 1, (d ** 2 - 1) * 1.2, 0)
    rim = 0.35 * np.exp(-((d - 1) / 0.18) ** 2)
    h += (bowl + rim) * (r / 25) ** 0.6

h = (h - h.min()) / (h.max() - h.min())
# Colour: grey regolith, brightness from height plus fine grain.
grain = rng.normal(0, 0.035, (N, N))
v = np.clip(0.30 + 0.45 * h + grain, 0, 1)
rgb = np.stack([v * 0.97, v * 0.96, v * 0.93], -1)
Image.fromarray((rgb * 255).astype(np.uint8)).save("public/textures/regolith_color.jpg", quality=88)

# Normal map from the height gradient (periodic differences).
s = 6.0
gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * s
gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * s
n = np.stack([-gx, gy, np.ones_like(h)], -1)
n /= np.linalg.norm(n, axis=-1, keepdims=True)
Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8)).save("public/textures/regolith_normal.jpg", quality=90)
print("written public/textures/regolith_color.jpg and regolith_normal.jpg")
