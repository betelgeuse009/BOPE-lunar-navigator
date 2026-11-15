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

## 2026-11-14 · Maps: south-pole LOLA set + global 237 m; slope computed from the DEMs where no slope map exists
- The 11 maps in `data/MAPS.md` are downloaded and checked: all open, same sphere (1737.4 km) and polar stereographic
  projection; heights agree between products (5 m vs 80 m median -0.1 m, 240 m vs 80 m median -0.2 m).
- Slope: use the official LOLA 80 m slope map south of 80°S; elsewhere compute slope from the DEM (central differences,
  stereographic scale factor). Check: our slope from the 80 m DEM reproduces the official map, median |diff| 0.10-0.17°,
  correlation 0.996-0.999 (four 16 km windows). Every slope is reported with its baseline (80/240/237 m).
- Why not download a slope map: the LOLA archive has no slope map from 80°S to the north pole at a useful resolution
  (global `LDSM_16` is ~1.9 km per pixel; polar slope maps only above 75° and 85°). Computing it is consistent, already
  validated, and costs no download.
- Coverage: no more maps for now. The challenge centres on the south pole, which is fully covered (5 m / 80 m / 240 m).
  Mid-latitudes use the 237 m global map: the Sun is high there, so the horizon needs little detail.
  Optional later: north polar set `LDEM_80N_80M` + `LDEM_60N_240M` (225 MB) if north polar sites are wanted.
  Rejected: global 512 px/deg tiles (32 GB) for little gain.
- Limitation: no map resolves metre-scale slopes or boulders; slope is a regional indicator, not landing safety.

## 2026-11-14 · Terrain in the API: skyline by ray marching over the LOLA DEMs
- Method (`analysis/terrain.py`): from the site, 720 azimuths (0.5°), samples out to 200 km with step =
  max(pixel, 0.5% of the distance); elevation angle with the exact spherical geometry of PLAN.md §3.5; bilinear
  sampling. Layers: 5 m map within 10 km (south of 86.7°S), then 80 m, 240 m, 237 m global, finest available first.
  The observer stands on the terrain (sphere + terrain height + mast height).
- Area searches use a coarser profile (2° azimuth, 2% steps): within 0.1° of the fine one, about 10 ms per point.
- Slope: official 80 m LOLA map south of 80°S, otherwise central differences on the 240 m or 237 m DEM; baseline reported.
- Validation: (1) flat synthetic terrain reproduces the smooth-sphere dip, a synthetic wall the analytic angle (tests);
  (2) vs NASA's LOLA long-term visibility maps (Mazarico et al. 2011) at 150 random points south of 85.5°S over 18.6 years:
  Sun r = 0.981, mean difference −0.005, mean abs 0.016; Earth r = 0.987, mean difference −0.037; 26 of 26 permanently
  shadowed points agree (`docs/validation/avgvisib.md`). The Earth bias is not explained yet.
- Fallback: without the maps, or with `use_terrain=false`, the smooth-sphere horizon is used and reported
  (`horizon_source`). The 5 m map and the slope map are optional; the three DEMs (80 m, 240 m, global) are required.
- Limits: slope is regional (80–240 m baseline), not landing safety; metric uncertainties still not estimated.

## 2026-11-14 · Requirements verdict as a 0/1 flag
- `/api/evaluate` and `/api/area` return `requirements_violated`: 1 = at least one user limit is not respected,
  0 = all respected. `feasible` (true/false) stays, with the opposite meaning, because FE already uses it.

## 2026-11-14 · Sun/Earth vectors cached per calendar month
- Why: FE measured ~2.7 s for every new landing date (cache was per exact time window), which stalled the date slider.
- Now any window on the midnight grid is cut out of cached months: a new date in a computed month costs ~0.07 s
  (14 d at 1 min). Numbers are identical to a direct computation (test).

## 2026-11-14 · The Earth difference against NASA's LOLA maps is a definition difference, not an error
- The AVGVISIB PDS labels (imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/*.LBL) define the value as "the percentage of
  timesteps where each pixel was sunlit (by any fraction of the ... disc)". We compared our time-averaged visible disk
  fraction, which is smaller by construction, more so for the 1.9° Earth disk than for the 0.5° Sun.
- With NASA's definition: Earth r = 0.996, mean difference +0.005 (was −0.037); Sun r = 0.982, +0.010
  (`docs/validation/avgvisib.md`, which now reports all three definitions).
- Kept our metrics as they are (sunlit / Earth-visible = at least half the disk, as agreed in T03); the docs state that
  NASA's long-term maps use the looser "any part" rule.

## 2026-11-14 · Uncertainty model: landing-position ring + skyline accuracy
- ± = sqrt(position² + horizon²): position = largest change over 8 points at `position_uncertainty_m` (default 100 m),
  horizon = largest change for a ± `horizon_uncertainty_deg` skyline shift (default 0.1°). Both are user inputs; the
  defaults are AERO's choices. Also returned: [min, max] range, `requirements_at_risk`, score uncertainty.
- Why: at the pole the dominant uncertainty is where exactly the lander ends up (shadows change within 100 m) and the
  skyline accuracy (the Sun grazes it). Sun/Earth directions (< 0.0001°) are negligible in comparison.
- Rejected: Monte Carlo over the DEM error map (slow, and the height error 0.03–1 m is small next to the position effect).
- Not computed per point in `/area` or per cell in `/matrix` (cost x 11); there the grid shows the spatial variation.

## 2026-11-14 · Known landing sites: cited coordinates only
- 31 sites (Apollo, Surveyor, Luna, Chang'e, Chandrayaan-3, SLIM, CLPS, ispace) from NASA NSSDCA tables and LROC image
  measurements; the modern landers agree between the two sources. Our LOLA elevation at the cited coordinates matches the
  sources' stated elevations within 30 m (test). File: `data/processed/sites.json`; list and exclusions: `data/SITES.md`.
- Excluded: Artemis III regions and future CLPS targets without published coordinates (only names are public).
  IM-3 is shown at the IAU centre of Reiner Gamma, flagged as a region.
- Contract: optional site fields added (`status`, `coord_kind`, `coord_source_url`, `coord_accuracy_m`, `agency`,
  `country`, `slope_baseline_m`).

## 2026-11-14 · Precomputed static set for the 31 known sites
- `data/processed/` now holds the full contract set for the 31 sites (160 files, 29.1 MB: sites.json, manifest.json, matrix.json (31 sites x 181 daily landings 2026-11-01..2027-04-30), 31 horizon/, 62 ephemeris/ (~439 kB each), 62 metrics/, 2 scene/), with the terrain skyline and
  uncertainties, so the front end works without the Python server (public demo link, T29).
- Time series only for Nov and Dec 2026 (10 min steps, ENU vectors left out to halve the size); the landing-date matrix
  covers six months of daily landings so seasonal changes are visible offline. Any other date needs the live API.
- Rebuild with `python -m analysis.build` only when the model changes: every rebuild adds the files again to the git history.

## 2026-11-15 · Area searches and the uncertainty ring do not read the 5 m map
- Found while checking the merged front end: `/area` with a 50 km radius at the pole took 252 s the first time and 21 s
  when cached, because ~1300 points spread over 100 km read the 3.3 GB 5 m map in 16 MB tiles, about a hundred per request.
- Now the coarse profile (area points, uncertainty ring) and their elevations use the 80 m map and coarser; single-site
  evaluations and `/api/horizon` keep the 5 m near field. Result: 15.6 s first time (including map loading), 1.2 s after.
- Cost: at the pole example the coarse skyline differs from the fine one by 0.04° median, 0.8° at most (near relief).
  Acceptable for an area colour map; the clicked point itself is always evaluated with the fine profile.

## 2026-11-15 · Map layers on the 2D map and the globe; surface temperature from Diviner
- Layers (picker under the view, with an (i) that states the source or the calculation of each): slope, elevation,
  long-term Sun and Earth visibility, permanently shadowed regions, surface temperature (yearly maximum, yearly average),
  day/night at landing time, score for the user's settings. Polar image layers are drawn on the globe cap and, on the
  flat map, as a strip from 80 S to the pole (`frontend/scripts/layers.py`).
- Temperature source (new): Diviner Polar Resource Product, PDS LRO-L-DLRE-5-PRP-V2.0 (Paige et al., UCLA): yearly average
  (2 cm deep) and yearly maximum surface temperature per terrain triangle, calculated by the Diviner team's thermal model.
  A display layer only: it is a yearly figure, not the temperature on the landing date, and the analysis does not use it.
- Day/night line: smooth sphere, from the sub-solar point; terrain shadows are not in this layer (the metrics have them).
- Score map: one `/api/area` request centred on the south pole (300 km radius, 15 km spacing): 12 s first time, 0.9 s after.
- Not available: Artemis III candidate regions (no coordinates published); shown disabled in the picker with the reason.

## 2026-11-15 · Whole-Moon map layers, distribution-based colour scales, altitude vs elevation, RA/Dec
- Every map layer now covers the whole Moon, with the finer south-pole data on top. New sources: Diviner GCP (global
  measured temperature, Williams et al. 2017), LPSR_65N/65S (shadowed regions at both poles). Slope outside the south
  pole is computed from LDEM_128; long-term visibility outside the NASA polar maps is computed by us on a smooth sphere
  (`analysis/global_visibility.py`). Table of what is read and what is computed: `docs/PARAMETERS.md` §8.
- Honest limits: the global temperature (measured, by local time) and the polar one (modelled, yearly) are different
  products, so a step can show at 80° S; the global "average" fills local-time gaps up to 4 h by interpolation and is blank elsewhere; the global
  visibility and the global score ignore the terrain (0.3 s per skyline on the global map makes a grid impractical).
- Colour scales: skewed layers are coloured by distribution (percentile breakpoints), sets of values (sites, calendar
  strip, score layer) are stretched between their extremes, printed on the bar. Palette unchanged.
- Wording: altitude = surface height, elevation = angle above the horizon. Only labels and texts changed; the API field
  `elevation_m` keeps its name (contract).
- RA/Dec of the Sun and the Earth from the Moon's centre added to `/api/ephemeris` and `/api/scene` (J2000, LT+S);
  LT-only values match JPL Horizons astrometric RA/Dec to 1e-6 deg.
- New endpoint `/api/grid` (whole-Moon score grid).

## 2026-11-15 · Regolith context: surface temperature, rock abundance, H-parameter
- Shown under the altitude for a clicked point and as whole-Moon layers, from Diviner products (Williams et al. 2017,
  Paige et al., Bandfield et al. 2011, Hayne et al. 2017). Context only: not part of the score or the requirements,
  because there is no sourced threshold for them yet.
- H-parameter shown as the measure of thermal inertia: Hayne et al. mapped H, not a single thermal inertia (it would
  depend on temperature); the documentation explains the relation.
- Coverage is the products' own: rock abundance 80°S–80°N, H 70°S–70°N; poleward nothing is drawn and "not mapped" is shown.
- The layers and the clicked values use the same reader (`analysis/regolith.py`), so they agree.

## 2026-11-15 · Documentation: every layer and view has a page with formulas, sources and landing criteria
- The (i) of each map layer, "Info on views" and the site-colour (i) now open documentation pages (new category "Map layers",
  plus "Views", "Site colours", "Landing criteria"). Each layer page states the data, the formula used to make the image,
  the colour scale and the published landing criteria that apply.
- Criteria are taken only from verified sources: Apollo Site Selection Board criteria (NASA, Uri 2018), NASA Key Artemis III
  Landing Requirements (NTRS 20250009323), Nova-C design criteria (Getchius et al. 2022). Where no source gives a number
  (rock abundance, temperature, H-parameter) the page says so.
- Audit of all 45 pages: every citation points to an existing reference; formulas added where missing (longest night,
  longest blackout, both in view, countdowns, mean Sun elevation, altitude, NASA visibility, rock abundance, temperature).

## 2026-11-15 · Surface view: real directions and skyline, display-only ground and light
- New "Surface" button in the viewer header (enabled once a place is chosen and the server is live) opens a full-window,
  street-level view from the place. Sun and Earth azimuth/elevation, angular size, visible fraction and Earth lit fraction
  all come from the server (/api/ephemeris, every 10 min for 30 days from the landing day); the skyline is /api/horizon
  (LOLA, 720 azimuths, observer height from Mission setup). The front end only interpolates linearly between samples.
- Only directions and angular sizes are real: the skyline is a wall at a fixed distance raised to the skyline elevation,
  Sun and Earth sit beyond it with r = D tan(rho). A body below the skyline is hidden by the wall, consistent with the
  server's visible fraction.
- Display only, stated in the documentation: procedural regolith texture (scripts/regolith_texture.py, not the place),
  decorative stars, ground brightness (sunlight scaled by the visible solar disc, weak earthshine, faint ambient so the
  night ground stays visible). The Earth's own rotation is not modelled.
- The view has its own clock (starts at the landing time, does not change it). Rejected: driving the navigator's landing
  time from the view, which would send a full re-evaluation per animation step.
- Time animation (play, speed in steps/s, time step) in the surface view and in Mission setup; the latter moves the landing
  time of the whole navigator (whole days offline).
- Fix: the date and time strips were coloured at start-up with the best catalogue site before any place was chosen; they
  now stay neutral until a place is chosen and then show that place's values.
