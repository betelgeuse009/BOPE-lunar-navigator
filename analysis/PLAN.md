# AERO analysis plan (physics, data sources, algorithms)

Owner: AERO (Gabri275). Source: Gabriele's research session with Claude on 2026-11-13, adapted to this repo
(static files in `data/processed/` per `contracts/`, big downloads in `data/raw/`, git-ignored).
**URLs and file names below come from that research and are not verified yet.** Check each one before use
and record the dataset name and version in each output file's `source.datasets`.

The question the tool answers: *"If I land here, on this date, how much energy will I have and when can I talk
to Earth? What changes if I move the date or the site?"* South pole first, but the method must work anywhere on the Moon.

## 1. Conventions (match `contracts/README.md`)

| Quantity | Convention |
|---|---|
| Lunar frame | `MOON_ME` (Mean Earth / Polar Axis) from the DE440 lunar frame kernel. Agrees to ~0.5 m with the DE421 ME frame used by the LOLA products. Do not use `IAU_MOON` or `MOON_PA` for output. |
| Latitude | Planetocentric, deg, −90..+90. Clamp to ±89.9999° (azimuth undefined at the exact pole), documented in `source.notes`. |
| Longitude | East-positive, deg, −180..+180 in output (LOLA polar products use 0..360: normalise). |
| Heights | m relative to the reference sphere R = 1737.4 km |
| Time | UTC ISO 8601 with `Z` in files. SPICE works in ET/TDB internally (`str2et` / `et2utc`). |
| Azimuth | Clockwise from local north (N=0, E=90, S=180, W=270) |
| Elevation | From the local tangent plane of the sphere (not the terrain slope). Terrain enters only through the horizon mask. |
| Distances | km for celestial bodies, m on the surface |
| Aberration correction | `LT+S` |

## 2. Data sources (download to `data/raw/`, never commit)

### 2.1 SPICE kernels (~45 MB total) → `data/raw/kernel/`
| File | Content |
|---|---|
| `de440s.bsp` | Sun, Earth, Moon positions (1849–2150) |
| `moon_pa_de440_200625.bpc` | Lunar orientation over time (libration) |
| `moon_de440_250416.tf` | Lunar frame definitions incl. `MOON_ME` (file verified present and valid 2026-11-14) |
| `naif0012.tls` | Leap seconds |
| `pck00011.tpc` | Body constants (radii) |

Download: `python -m analysis.download_kernels` (URLs verified 2026-11-14).

### 2.2 Maps → `data/raw/maps/`
All 11 maps are downloaded and checked (2026-11-14). File list, paths, units, coverage, sources, consistency checks
and which map is used where: **`data/MAPS.md`**. Check or download: `python -m analysis.download_maps [--check]`.

For FE (3D globe textures): NASA SVS "CGI Moon Kit", https://svs.gsfc.nasa.gov/4720

## 3. Physics and algorithms

1. **Sun/Earth az/el.** `spiceypy.azlcpo(method="ELLIPSOID", target, et, abcorr="LT+S", azccw=False, elplsz=True,
   obspos, obsctr="MOON", obsref="MOON_ME")` with `obspos = latrec(R_km + h_km, lon_rad, lat_rad)`.
   Also a manual version for teaching and cross-checking: `spkpos` in MOON_ME minus site position, projected on local ENU.
   Earth parallax reaches ~0.25°, so use the topocentric vector, not a far-body formula.
2. **Angular radius.** `asin(R_body / distance)`, radii from `pck00011.tpc` (`bodvrd`).
3. **Earth phase seen from the Moon.** `k = (1 + cos α) / 2`, α = angle at Earth's centre between Earth→Sun and Earth→observer.
4. **Sub-solar / sub-Earth points.** MOON_ME lat/lon with the body at zenith: terminator and body placement on the 3D globe.
5. **Horizon mask (M3).** For az = 0..359.5° (0.5° step, 720 values), march along the ray to ~200 km and keep the max angle.
   Exact spherical geometry for a point at surface distance s and height h:
   θ = s/R, horizontal = (R+h)·sin θ, vertical = (R+h)·cos θ − (R + h₀ + h_obs), elevation = atan2(vertical, horizontal).
   Multi-resolution: 5 m within 10–20 km (sites beyond 87°S), then 80 m to 80°S, 240 m to 60°S, `LDEM_128` elsewhere;
   ray step follows the local resolution. Observer height default 2 m. Target accuracy ~0.1°.
6. **Visible disk fraction.** `x = (el − h_horizon(az)) / r_ang`; x ≥ 1 → 1; x ≤ −1 → 0;
   else `1 − (acos(x) − x·sqrt(1 − x²)) / π`. Assumes a flat horizon across the disk width.
   Before M3: flat 0° horizon, stated in `source.notes`, and `has_horizon: false` in the manifest.
7. **Events.** Rise/set = `visible_frac` crossing a threshold (default 0.5). Earth also gets an antenna minimum elevation
   (default 0°). Detect on the coarse step, refine by bisection to ±1 min.
8. **Metrics over a window.** Sunlit fraction, longest continuous night (battery sizing), Earth-visible fraction,
   longest comm blackout, Sun-and-Earth fraction, next sunset / Earthset.
9. **Uncertainty (M6).** Recompute on a ring of neighbouring points (100–500 m) and use the `_ERR` map → min–max bands.
   At the pole a 0.1° horizon error can shift a sunset by hours.
10. **Distances and paths (last, optional).** Great-circle distance; least-cost path on a grid (cost from distance and slope).

## 4. Physics notes worth showing in the UI
- In the Moon-fixed frame the Earth stays almost still in the sky (a few degrees of libration wobble);
  the Sun goes around once every ~29.5 days.
- At the pole the Sun circles the horizon at a few degrees of elevation.
- Directions in any 3D view come from the data; distances are not to scale (say so on screen).

## 5. Milestones
1. **M1 Ephemeris basics.** Load kernels, Sun/Earth az/el for one site and instant (`azlcpo` + manual ENU), CLI, Horizons check, pytest.
2. **M2 Time series → contract files.** Vectorised series, angular radius, Earth phase, sub-solar/sub-Earth points,
   flat-horizon `ephemeris/` and `metrics/` files that pass `contracts/validate.py`, download script.
3. **M3 Real horizon.** Multi-resolution horizon masks, visible fraction, refined events, metrics.
4. **M4 Sites.** `sites.json` with verified citations; site × date `matrix.json`.
5. **M5 Map layers.** GeoTIFF → web PNG with legend and coverage (needs a contract addition).
6. **M6 Uncertainty.** Min–max bands for events and metrics.
7. **M7 Tools.** Distances and least-cost path (optional).

A live API for arbitrary coordinates (FastAPI) is now part of the architecture (agreed 2026-11-14, see
`docs/DECISIONS.md`): `analysis/api.py`, reference in `contracts/API.md`. It returns the same JSON shapes as the
contract files; the static files remain as the offline fallback. Code layout and commands: `analysis/README.md`.

## 6. Validation
- **JPL Horizons API** `https://ssd.jpl.nasa.gov/api/horizons.api` with `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`,
  `SITE_COORD='lonE,lat,alt_km'`, `COMMAND='10'` (Sun) or `'399'` (Earth), `QUANTITIES='4'`. Tolerance 0.01°.
- **Sanity checks:** at the pole the Sun stays a few degrees from the horizon; from mid near side (e.g. Apollo 11)
  Earth is always high; from mid far side Earth is never visible.
- **Long-term means** vs the `AVGVISIB` maps (M3).
- Record all results in `docs/DECISIONS.md`.
