# Decisions

Short dated entries: decision, why, alternatives rejected. This becomes the "methods / limitations" slide.

## 2026-11-13 · Front end is a static web app (React + TypeScript + Vite)
- Why: easiest to demo (a link, works offline as a static build), largest ecosystem for 2D charts and 3D (React Three Fiber),
  can later become an installable app (PWA / Tauri / Capacitor) without a rewrite.
- Rejected: Python dashboards (Streamlit/Panel/Dash): choppy time scrubbing, weak 3D, blurs the FE/AERO split.
  Svelte: smaller 3D ecosystem. Desktop/mobile-first: packaging cost with no judging benefit.

## 2026-11-13 · Build 2D first, 3D second; 3D is a light schematic, not a terrain engine
- Why: the challenge is judged on rapid comparison and clarity, which the 2D views deliver
  (horizon panorama, site × date heatmap, timeline). The 3D Sun–Earth–Moon view uses true directions
  from the data but schematic distances, to explain the geometry to non-specialists.
- Rejected for now: CesiumJS / Cesium Moon terrain (needs a token and internet, which breaks the offline demo).
  Local LOLA terrain mesh is a possible later addition.

## 2026-11-13 · Contract-first data interface (v0.1 draft)
- Why: FE builds on fixtures without waiting for AERO, and AERO writes Python without touching web code.
  Mismatches show up as validation errors, not as wrong charts.
- Details in `contracts/README.md`. Status: draft until AERO agrees in LOG.

## 2026-11-14 · API-first: live Python API for any point, static files kept as fallback
- Decision (FE + AERO, in person): AERO serves the analysis through a local FastAPI server (`analysis/api.py`,
  reference in `contracts/API.md`). The front end calls it for arbitrary points, user settings (mast height, thresholds,
  load, panel, weights, limits), site evaluation and the area search around a clicked point.
  This replaces the earlier "curated sites only, static files" position (LOG 2026-11-14 12:17).
- Why: the navigator should let a mission analyst click anywhere and change the inputs; that cannot be precomputed.
  Sun/Earth vectors do not depend on the site, so they are computed once per time window and cached; the per-site part
  is numpy. Measured: evaluation in milliseconds, 317-point area in 0.3 s, 1257 points in 0.7 s.
- Kept: every response has the shape of the contract schemas, and `analysis/build.py` writes the same documents as
  static files (`data/samples/`), so the demo still works without the server.
- Costs: FE needs Python, `analysis/requirements.txt` and the kernels (`python -m analysis.download_kernels`).
  A public demo needs either a hosted Python server or the static fallback.
- Rejected: thresholds applied in the front end (splits the metric logic in two places); presets only (no free points).

## 2026-11-14 · Ephemeris method: SPICE vectors + numpy projection, checked against azlcpo
- Decision: Moon→Sun/Earth vectors from `spkpos` in `MOON_ME` with LT+S, then topocentric vector = body − site,
  projected on local East-North-Up. Observer-specific aberration differences are neglected.
- Validation: agrees with the SPICE routine `azlcpo` to better than 3e-5 deg in elevation and azimuth over Nov 2026 at
  five sites (pole, near side, far side, mid-latitudes); automated in `analysis/tests/test_physics.py`.
  Tolerance target is 0.01 deg. **Cross-check against JPL Horizons still to do (T06).**
- Rejected: `azlcpo` per site and step (same numbers, but too slow for area searches).

## 2026-11-14 · Horizon model until terrain exists: smooth sphere with observer dip
- Decision: horizon elevation = −acos(R / (R + h)) (0.087 deg at 2 m, 0.19 deg at 10 m) instead of a flat 0 deg.
- Why: it is the exact no-terrain limit of the planned LOLA horizon formula, and it makes the mast-height input
  meaningful already. Limitation: polar results are optimistic until the LOLA terrain is wired in (T07).

## 2026-11-14 · Site score and feasibility are driven only by user inputs
- Decision: feasibility = user-set limits (none by default); score = weighted mean of 0..1 sub-scores
  (`docs/PARAMETERS.md`). No requirement threshold is hard-coded.
- Why: limits depend on the lander (battery, slope tolerance, link needs). We do not have sourced "good/ok/bad" ranges,
  so we do not invent them. Solar constant 1360.8 W/m² from Kopp & Lean (2011).

## 2026-11-14 · Ephemeris validated against JPL Horizons (T06)
- Result: PASS. 5 sites (south pole, 85°S, near-side centre, far-side centre, 45°N) x Sun and Earth x 12 instants over
  Nov-Dec 2026. Largest angular difference 0.000026° at full precision, 0.0007° as served by the API (az/el rounded to
  0.001°). Tolerance 0.01°. Range differences up to 0.18 km (relative 5e-7, irrelevant for apparent size).
- Horizons setup (from its reply header): DE441, MEAN_ME frame, 1737.4 km sphere, airless apparent az/el with light time,
  gravitational deflection and stellar aberration. Ours: DE440s, MOON_ME, LT+S. The residual (~0.1 arcsec, Earth only)
  is not isolated; candidates are DE441 vs DE440s and the light deflection we do not model. It is 400x below tolerance.
- Reproducible: `python -m analysis.validate_horizons` (raw replies cached in `data/validation/horizons/`, report in
  `docs/validation/horizons.md`); `analysis/tests/test_horizons.py` reruns it offline in every test run.
- Not covered by this check: terrain (horizon, slope), which has its own validation plan (vs LOLA `AVGVISIB`, T23).
