# Handoff log (append-only)

Newest entry at the bottom. Never edit old entries. Format in CLAUDE.md §5.

## 2026-11-13 · FE
Done: repo structure (team/, docs/, contracts/, data/), contract v0.1 DRAFT in contracts/, validator script, task board, first decisions.
Changed contract: yes (first draft, v0.1)
Needs from AERO: please read contracts/README.md and reply in this LOG with "agree" or the changes you want (task T03).
  Also create your own team/Gabri275.md (T04).
Questions for AERO:
  1. Conventions OK? ME frame lat/lon (east-positive), azimuth clockwise from local north, geometric az/el plus terrain in *_visible_frac.
  2. Time step for ephemeris: 1 h? Period length: one month per file?
  3. Which sites first, and from which sources for the coordinates? (No coordinates go in without a citation.)
  4. Observer height for horizon masks (e.g. 2 m lander deck)? Sunlit threshold: half the solar disk (0.5)?
  5. SPICE (spiceypy) or JPL Horizons API for the ephemeris?
  6. Mission duration for matrix.json cells: 14 days?
Next: scaffold the frontend with fixtures matching v0.1 (T10).
Commits: see `git log fe/kickoff`

## 2026-11-14 11:25 · FE
Done: planning only. FE starts on the first view: an orbit camera around the Moon globe showing the candidate
  landing sites, plus a date/time slider. Moving the slider recolours the sites by how good they are on that date.
Changed contract: no (a terrain addition may be proposed later, see Q3)
Needs from AERO:
  1. NEW (T17): write down the parameters that make a site + date "good" for landing and operations,
     in a new file docs/PARAMETERS.md. For each one: name, unit, how it is computed, a threshold or
     "good/ok/bad" ranges if you have them, and the source. Examples of the kind of thing (your call, not mine):
     sunlit fraction, longest dark period, Earth visible fraction, longest no-Earth period, sun elevation, slope.
     The globe will colour sites with these, so which ones matter most (and how to combine them) is your decision.
  2. Still open: reply "agree" or changes on contract v0.1 (T03), and create team/Gabri275.md (T04).
Questions for AERO:
  1. Which DEM are you downloading (exact product name and resolution)?
  2. Which sites go into sites.json first, with which coordinate sources?
  3. Later: could analysis/ export a small heightmap crop per site (e.g. 20x20 km) so the 3D terrain matches your horizon masks?
Next: FE scaffold + Moon globe with orbit camera and time slider, on fixtures until real files land.
Commits: this entry

## 2026-11-14 11:44 · AERO
Done: team/Gabri275.md (T04, already on main). Physics/data plan in analysis/PLAN.md (datasets with URLs, algorithms,
  milestones, validation). Replies to both your entries (T03), the output format AERO will produce, and proposals below.
Changed contract: no (proposals below; nothing in contracts/ edited)

Answers to your kickoff questions (T03):
  1. Conventions: agree. Precisions: frame = MOON_ME from the DE440 lunar frame kernel (~0.5 m from the DE421 ME frame of the
     LOLA maps); planetocentric latitude; heights relative to the 1737.4 km sphere; elevation from the sphere's local tangent
     plane; latitude clamped to ±89.9999° (azimuth undefined at the exact pole), stated in source.notes.
  2. Ephemeris step 10 min (step_s = 600), one calendar month per file. Window start/end (rise/set) refined by bisection to
     ±1 min, so they are more precise than the step. ~4320 steps per file.
  3. Sites (T05): past landings (Apollo etc.), Artemis III candidate regions (centre point), others TBD. A site only goes in
     sites.json with a citation; no coordinates yet.
  4. Observer height 2 m (parameter). Sun threshold 0.5. Earth uses the same 0.5 disk threshold plus an antenna minimum
     elevation, default 0°.
  5. SPICE via spiceypy (azlcpo, cross-checked by a manual ENU projection), validated against the JPL Horizons API, tol 0.01°.
  6. Mission duration for matrix cells: 14 d is fine as the default.

Answers to your 11:25 questions:
  1. DEM (nothing downloaded yet; product names to verify before download, list + URLs in analysis/PLAN.md §2.2):
     multi-resolution LOLA from NASA PGDA: LDEM_80S_80MPP_ADJ (80 m, 80°S–pole) as the main product,
     ldem_87s_5mpp (5 m, only near sites beyond 87°S), LDEM_60S_240MPP_ADJ (240 m, 60°S–pole), LDEM_128 (~237 m, global).
  2. Sites: see answer 3 above.
  3. Heightmap crop per site: feasible from the same DEM as the horizon masks, so terrain and horizon agree. Added as T26 (LATER);
     let's define the format when you need it.
  T17 (docs/PARAMETERS.md): noted, it's my next documentation task. Most candidates already exist as v0.1 metrics
     (sunlit_frac, longest_dark_h, earth_visible_frac, longest_no_earth_h, both_frac); I'll add slope and the good/ok/bad ranges.

Output format AERO will deliver (all v0.1 files, as in contracts/README.md):
  - ephemeris/<site>_<period>.json: time_utc + sun/earth az, el, visible_frac (required fields). Until the real horizon (M3)
    is done, visible_frac uses a flat 0° horizon, stated in source.notes, and manifest has_horizon = false.
  - horizon/<site>.json: 720 values (0.5° az step), terrain out to ~200 km, observer 2 m, multi-resolution DEM as above.
  - metrics/<site>_<period>.json: sunlit_frac, earth_visible_frac, both_frac, longest_dark_h, longest_no_earth_h, plus
    sun_windows / earth_windows (use them for "next sunset / Earthset in X h"). Uncertainty = null until T22
    (neighbour ring + LOLA error map → ± values).
  - sites.json, matrix.json, manifest.json as in the schemas.

Proposed OPTIONAL additions (backwards compatible; OK if I add them to the schemas and you mirror them in fixtures? T20/T21):
  - ephemeris: sun_dist_km, earth_dist_km, sun_radius_deg, earth_radius_deg (true angular size for the panorama),
    earth_phase_frac (illuminated fraction of Earth), sun_dir_enu / earth_dir_enu (unit vectors in local East-North-Up,
    to orient the Earth's lit side in the panorama).
  - NEW file scene/<period_id>.json (site-independent, useful for your globe view T18): time_utc, subsolar_lat_deg/lon_deg,
    subearth_lat_deg/lon_deg (terminator and Sun/Earth placement), earth_phase_frac.
  - metrics: earth_min_elev_deg (the antenna mask used).
  - sites: elevation_m, slope_deg (from LOLA), is_region (true for Artemis candidate regions given by a centre point),
    mission_date.
  - horizon dem: optional layers [{product, resolution_m, max_range_km}] to describe the multi-resolution DEM.

Needs from FE: reply "agree" (or changes) to the answers above and the optional additions.
Questions for FE:
  1. The original AERO plan had a live Python API (FastAPI) so users could pick ANY point on the Moon. That breaks the static,
     offline demo, so I'm keeping it out of v0.1. Do you want it later as optional (T25, same JSON shapes), or curated sites only?
  2. Is ~4320 steps per monthly ephemeris file OK for size (a few hundred kB with 3-decimal rounding)? Otherwise 30 min.
  3. Physics hints for the globe: in the Moon-fixed sky the Earth barely moves (a few degrees of libration) while the Sun goes
     around in ~29.5 d; at the pole the Sun circles the horizon at a few degrees. Distances in 3D are not to scale (say so on screen).
     Moon textures for 3D: NASA SVS CGI Moon Kit (link in analysis/PLAN.md §2.2).
Next: T17 parameters doc, T19 download script, then M1: Sun/Earth az/el for one site + Horizons check (T06).
Commits: see PR aero → main

## 2026-11-14 12:32 · AERO
Done: read FE 12:17 (thanks, T03 closed). T20 additions are now in the schemas (all optional, v0.1 kept):
  ephemeris sun/earth_dist_km, sun/earth_radius_deg, earth_phase_frac, sun/earth_dir_enu; metrics earth_min_elev_deg;
  sites elevation_m, slope_deg, is_region, mission_date; horizon dem.layers; manifest has_scene; NEW scene.schema.json
  (validate.py maps scene/ too). contracts/README.md updated.
  SAMPLE DATA for you in data/samples/ (17 files, all pass contracts/validate.py), computed from the real SPICE kernels:
  - 3 example points (NOT landing sites): example-south-pole (-89.5, -135), example-near-side (0, 0), example-far-side (0, 180)
  - periods 2026-11 and 2026-12, 10 min step: ephemeris/, metrics/ (with sun/earth windows), scene/ (sub-solar and sub-Earth
    points + Earth phase for the globe), matrix.json (landing every day of Nov 2026, 14 d missions), sites.json, manifest.json.
  Sanity checks pass: pole Sun el 1-2 deg; near side Earth el 81-86 deg; far side Earth never up; sub-Earth point wobbles ±7 deg.
  Limits (also in each file's source.notes): flat 0 deg horizon (terrain ignored, so the pole shows 100% sunlit in Nov),
  windows at 10 min resolution, uncertainty null, not yet cross-checked against JPL Horizons (next AERO task).
  Regenerate: .venv/Scripts/python.exe analysis/make_samples.py (needs the kernels in data/raw/kernel/).
Changed contract: yes, optional additions only (agreed in T20)
Needs from FE: nothing. Copy data/samples/ into frontend/public/fixtures/ if useful (T21).
Questions for FE: none
Next: M1 for real: JPL Horizons cross-check of the ephemeris (T06), then T17 docs/PARAMETERS.md.
Commits: 3c1d991 (contract), 75e9b74 (ephemeris module), and the data/log commits in PR aero → main

## 2026-11-14 13:40 · FE
Done: globe view merged to main (#8): orbit camera, site markers coloured by a matrix field, landing-date slider whose
  track shows the best site per day, site card. Runs on FE fixtures. South pole: pole-centred cap texture
  (azimuthal equidistant to 70°S, from SVS ldem_16) because equirectangular maps streak at the pole.
Changed contract: no
Read AERO 12:32 + data/samples/: thanks, matrix.json and scene/ already cover what the globe needs. FE will switch the
  globe to data/samples/ next (T21) and use scene/ sub-solar points for real lighting.
Notes for AERO:
  - Your Drive maps/README.txt still describes the old backend/API layout (backend/data/maps/, "frontend reads through the API").
    The repo uses data/raw/ and static files. Worth updating so nobody follows the old paths.
  - FE agrees with the README rule: FE does not process the science GeoTIFFs. For T24 the most useful layers for the globe are
    the WAC south-pole mosaic and AVGVISIB Sun/Earth, as web PNGs with projection, extent and pixel size in an index file.
Needs from AERO: nothing new (T17 PARAMETERS.md still the one the colouring waits for).
Questions for AERO: none
Next: globe on data/samples/, real Sun lighting from scene/.
Commits: 92eef37, 10cea06 (in #8)

## 2026-11-14 14:25 · AERO
Done: API-first, as agreed in person today (decision recorded in docs/DECISIONS.md; replaces "no live API in v0.1").
  - LIVE API: analysis/api.py (FastAPI). Reference for you: contracts/API.md. Interactive docs at http://localhost:8000/docs.
    Endpoints: /api/health, /sites, /scene, /ephemeris, /metrics, /matrix (same shapes as the contract schemas, tested against
    them), plus two new ones:
      /api/evaluate  one site + window + user settings → 21 site parameters, feasible yes/no with violations, score 0..1
      /api/area      disc around a clicked point → parallel arrays (lat, lon, east_km, north_km, score, feasible, parameters),
                     score_range for the colour gradient, best point, center_is_best. Index 0 = the clicked point.
    User settings are query parameters: obs_height_m (mast), sun_threshold_frac, earth_min_elev_deg, load_w, panel_area_m2,
    panel_efficiency_frac, weights w_*, limits min_*/max_*. Any lat/lon on the Moon, or site_id.
  - Speed (measured): evaluate/metrics in ms once a time window is cached (first call < 1 s for 14 d at 1 min);
    area 317 points 0.3 s, 1257 points 0.7 s; ephemeris 30 d 0.2 s.
  - T17: docs/PARAMETERS.md (parameters, formulas, sources, feasibility limits, score). v0, Gabriele may still tune weights.
  - analysis/ is now a package: config, ephemeris, horizon, visibility, metrics, scoring, sites, products, api, build,
    download_kernels, tests (36 pass). How to run everything: analysis/README.md.
  - data/samples/ rebuilt with the new code (python -m analysis.build); still 17 files, all valid. matrix.json now also has
    a "score" grid (default weights) for the globe colouring.
To run the API on your machine (once):
    python -m venv .venv
    .venv/Scripts/python.exe -m pip install -r analysis/requirements.txt      (Linux/macOS: .venv/bin/python)
    .venv/Scripts/python.exe -m analysis.download_kernels                     (45 MB from NASA NAIF, URLs verified)
    .venv/Scripts/python.exe -m uvicorn analysis.api:app --port 8000
Changed contract: yes, additions only. New contracts/API.md (the API itself; evaluate and area responses are documented there
  with real examples, no JSON Schema yet). Existing schemas unchanged; contract stays v0.1.
Changed since the 12:32 samples (values differ slightly):
  - Horizon model is now "smooth-sphere": the horizon sits at -acos(R/(R+h)) (-0.087 deg at 2 m) instead of flat 0 deg, so the
    mast height already has an effect. Metrics are computed at 1 min (series still exported at 10 min).
  - source.datasets now carries the NAIF URL of each kernel.
Limits you should show or know:
  - Terrain is NOT in yet: slope_deg and elevation_m are null, /api/horizon returns 501, terrain_available=false in every
    evaluation. Without terrain, neighbouring points in /api/area differ very little (e.g. score 0.892..0.900 over 5 km).
    The gradient will become meaningful with the LOLA horizon and slope (T28).
  - null means "not available", never 0. All uncertainties are null.
  - Checked against SPICE azlcpo (< 3e-5 deg), NOT yet against JPL Horizons (T06).
  - /api/sites still returns the three example points (T05 open).
Needs from FE: T27: call /api/evaluate on click and /api/area for the gradient; settings panel for the inputs.
  Tell me if a response shape is awkward for the globe and I will change it now, while it is cheap.
Questions for FE:
  1. Public demo (T29): hosted Python server, or static fallback only for the judges' link?
  2. Your Drive maps/README note (13:40): noted, I will fix the old backend paths when the LOLA download script lands (T19).
Next: JPL Horizons cross-check (T06), then LOLA terrain: horizon, slope, elevation (T07/T28), then curated sites (T05).
Commits: see PR aero → main

## 2026-11-14 14:50 · FE
Done: read AERO 14:25, contracts/API.md, docs/PARAMETERS.md, DECISIONS. Ran the API locally on Linux (pip deps + your
  download_kernels): works as documented. Measured here: evaluate 1.4 s first call, area 317 pts 0.36 s, matrix 4 points x 60
  dates 0.76 s, CORS open. Thanks, the shapes look easy to use.
  Official challenge text + our reading now in docs/CHALLENGE.md (my 14:03 entry never reached main; this replaces it).
  FE branch fe/real-samples: globe on your data/samples + real Sun lighting from scene/; south-pole cap built from your
  LDEM_80S_80MPP_ADJ + WAC mosaic (projection checked: vs SVS ldem_16 r=0.997, WAC vs AVGVISIB r=0.60).
Changed contract: no
Next for FE (T27): API client with a health check; live mode when the API answers, static data/ fallback otherwise
  (controls that need the API are disabled and say why). Click on the globe -> /evaluate; radius slider -> /area; settings panel.
Notes / requests:
  1. CREW: Erdeniz wants crewed missions considered, not only robotic. FE plans "mission profile" presets (robotic lander /
     crewed) that only fill your existing inputs (mission_h, limits like max_dark_h, max_no_earth_h, weights). Could you add
     to PARAMETERS.md a crewed preset with cited values (e.g. Artemis III surface-stay length and lighting/comm needs)?
     FE will not invent them. Later, crew-specific parameters you might add: Sun elevation/azimuth at landing time (approach
     lighting), EVA lighting.
  2. /area colour scale: API.md says map score between score_range. Without terrain that range is tiny (0.887-0.904 over 10 km),
     so a full gradient would make 0.02 look like good vs bad. FE will colour on the absolute 0..1 scale by default with a
     clearly labelled "relative" option. OK for you?
  3. evaluate/area have no JSON Schema yet; FE writes zod types from API.md. A schema (or OpenAPI types) would let
     validate.py and FE check them. Not urgent.
  4. /area limit: radius 20 km at 0.5 km spacing returns 422 (> 2000 points). FE will cap spacing from radius (spacing >= radius/22).
Questions for AERO: T29 (hosted server vs static-only for the judges' link): Erdeniz answers separately.
Commits: fe/real-samples 91eba2b, 5c79543

## 2026-11-14 15:20 · AERO
Done: T06 closed. Our API agrees with JPL Horizons: max 0.000026 deg at full precision, 0.0007 deg as served (rounding to
  0.001 deg); tolerance 0.01 deg. 5 sites x Sun/Earth x 12 instants. Report docs/validation/horizons.md, decision in
  DECISIONS.md. New: analysis/validate_horizons.py, analysis/tests/test_horizons.py (offline, from cached replies in
  data/validation/horizons/), 37 tests pass. Every file/response note now says "cross-checked against JPL Horizons".
  data/samples/ rebuilt only to carry the new note (numbers unchanged).
Changed contract: no
Replies to FE 14:50:
  1. Crewed preset: yes, I will add it to PARAMETERS.md, but only with cited values (surface-stay length and any lighting /
     comm requirements from published Artemis III documents). Until I find sources the crewed preset stays empty; not invented.
     Approach-lighting parameters (Sun el/az at landing) are cheap to add later.
  2. /area colours on the absolute 0..1 scale by default, with a labelled "relative" option: agreed. That is the honest
     default while terrain is missing.
  3. JSON Schema for /evaluate and /area: agreed, I will add evaluate.schema.json and area.schema.json (additions only).
  4. /area cap (spacing >= radius/22): fine. Tell me if you need a bigger point limit.
Needs from FE: nothing.
Questions for FE: none.
Next: LOLA terrain into the API: horizon profile, slope, elevation (T07/T28); then the crewed preset sources (T30).
Commits: see PR aero -> main

## 2026-11-14 16:10 · FE
Done (branch fe/api-hybrid, PR coming): T27 first version. On start the app calls /api/health: "Live analysis" if it answers,
  "Offline data" (data/ files) otherwise. Live: site colours from /api/matrix with the user's settings (default colour = score);
  click anywhere on the Moon (or a site) -> /api/evaluate panel with the score breakdown (sub-score, weight, share) and key
  numbers; radius slider (1-50 km, spacing radius/20) -> /api/area dots + best-point ring; absolute 0..1 colours by default,
  "relative to this area" toggle. Settings: mission length, mast height, the four weights. "How the score works" panel
  explains the score in plain words from your PARAMETERS.md §4.
  Integration test frontend/src/data/api.live.test.ts runs against your server with LIVE_API=1 (5/5 pass here).
Changed contract: no
Needs from AERO: nothing new. When evaluate/area schemas land, FE will switch its zod types to them.
Questions for AERO: none
Next: limits (feasibility) in the settings panel, mission profiles when the crewed preset has sources (T30).
Commits: fe/api-hybrid

## 2026-11-14 15:59 · AERO
Done: read FE 16:10 (great, thanks). Maps checked and documented, ready for the terrain work (T28):
  - All 11 LOLA/LROC maps downloaded by Gabriele and checked: every file opens, same 1737.4 km sphere and polar stereographic
    projection, heights agree between products (5 m vs 80 m median -0.1 m; 240 m vs 80 m median -0.2 m).
  - NEW data/MAPS.md (shared reference: paths, units, coverage, sources, checks, which map is used where). It replaces the
    old maps README with the backend/ paths you flagged at 13:40.
  - NEW analysis/download_maps.py: --check reports what you have; without flags it downloads what is missing
    (~3 GB, plus 3.3 GB with --all). URLs and sizes verified today. You already have the 80 m DEM; you only need the rest
    if you run the terrain API yourself once T28 lands.
  - Decision (DECISIONS.md): slope = official 80 m map south of 80°S, computed from the DEM elsewhere. Our slope from the 80 m
    DEM reproduces the official map (median |diff| 0.10-0.17°, r = 0.996-0.999). No extra maps for now; north polar set is
    optional (T31).
Changed contract: no
Heads-up for T28 (coming next): slope_deg and elevation_m will become numbers instead of null, with the DEM baseline
  reported (80/240/237 m); /api/horizon will return a real profile (horizon.schema.json); /api/area scores will start to
  vary across ridges and craters.
Needs from FE: nothing.
Questions for FE: none
Next: T28 terrain in the API (horizon profile, slope, elevation), then evaluate/area JSON Schemas.
Commits: see PR aero -> main


## 2026-11-14 16:57 · FE
Re-sent: my 15:30 (uv proposal) and 15:55 (date-slider bug + caching request) entries were lost when a LOG merge
  conflict was resolved on GitHub (PR #16 merged without them). Their full text, unchanged, is below. Also: the FE entry
  stamped "16:10" was written at about 15:10.
Read AERO 15:59: thanks, data/MAPS.md and the slope check (r = 0.996-0.999) are great. FE waits for T28.
Changed contract: no
---- original 15:30 entry ----
Proposal for AERO (your folder, your decision): manage the analysis Python dependencies with uv (https://docs.astral.sh/uv/).
  Why:
  - One lockfile (uv.lock) pins exact versions of numpy, spiceypy, fastapi, uvicorn..., so your Windows machine, Erdeniz's
    Linux machine and a hosted server for the judges' link (T29) run identical packages. requirements.txt is unpinned today.
  - No venv/pip steps and no python3-venv system package: `uv sync` creates .venv, `uv run ...` uses it. Same commands on
    Windows and Linux (no .venv/Scripts vs .venv/bin difference).
  - Fast installs, and hosting gets simpler (`uv sync --frozen` in a container).
  What it would look like:
  - pyproject.toml at the repo root (or analysis/pyproject.toml), dependencies moved from analysis/requirements.txt,
    pytest/httpx as a dev group; `uv lock` writes uv.lock (committed). Python >= 3.11 as your README says.
  - Commands become: `uv sync`, `uv run python -m analysis.download_kernels`, `uv run uvicorn analysis.api:app --port 8000`,
    `uv run pytest analysis`. Install uv on Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`.
  - requirements.txt can stay for a while (or be generated with `uv export`) so nothing breaks during the switch.
  Meanwhile, without touching your files: FE added `npm run api` (frontend/package.json) =
    `uv run --with-requirements analysis/requirements.txt uvicorn analysis.api:app --port 8000`, which works with your
    current requirements.txt. If you adopt the full setup, FE switches that script to `uv run uvicorn ...`.
Changed contract: no
Needs from AERO: yes/no on the uv proposal (and who does it: you, or FE prepares the pyproject.toml as a PR for you to review).
Questions for AERO: see above.
Commits: fe/api-hybrid 074baf4 (npm run api)
---- original 15:55 entry ----
Bug found while testing the API from the globe (Erdeniz): after moving the landing-date slider, scores stopped updating,
  even for new clicks. Root cause, measured here: every new landing date is a new time window, and /evaluate needs ~2.7 s
  for a new window; FE sent one request per slider step, the server cannot cancel them, so a 15-date drag queued
  ~40 s of work and the next click answered after 53 s. Your numbers were right all along (checked 4 dates x 4 points).
  FE fix (fe/api-hybrid dee7c48): at most one request in flight per panel; newer ones replace each other.
Request for AERO (performance, your call how): make a new landing date cheap. Idea: cache the Sun/Earth vectors on a fixed
  grid (for example per calendar month at calc_step_s) and slice any window out of it, instead of caching per exact
  [start, end]. Then dragging through 30 dates in the same month would cost one computation, not 30.
  Even better for the slider: an /evaluate variant that takes several start dates in one call (like /matrix does for points).
Changed contract: no
Needs from AERO: the caching change above (or tell me it is not feasible).
Questions for AERO: none
Commits: fe/api-hybrid dee7c48

## 2026-11-14 17:08 · AERO
Done: read FE 16:57 (both re-sent entries). T28 terrain is in the API, your caching request is done.
  TERRAIN (needs the maps: python -m analysis.download_maps; without them the API falls back to the smooth sphere):
  - Every metric now uses the real LOLA skyline (ray marching to 200 km, 5 m / 80 m / 240 m / 237 m layers).
    horizon_source = "lola-terrain" or "smooth-sphere"; new query parameter use_terrain (default true).
  - /api/horizon works (horizon.schema.json, 720 azimuths): the real silhouette for the panorama.
  - /api/evaluate: slope_deg and elevation_m are numbers now; elevation has an uncertainty (LOLA height error);
    new "terrain" block (DEM used, skyline layers, slope source and baseline 80/240/237 m); two context parameters
    lola_mean_sun_visibility_frac / lola_mean_earth_visibility_frac (NASA long-term maps, south of 85 S).
    The slope sub-score is now part of the score.
  - /api/area: points.parameters gains elevation_m; scores now vary for real (e.g. 0.06..0.90 over 5 km at the pole example,
    best point 1.1 km away), so a relative colour scale is meaningful again.
  - /api/sites: elevation_m and slope_deg filled. data/samples/ rebuilt with terrain: 20 files, now with horizon/<site>.json
    and has_horizon = true.
  NEW FLAG (Gabriele's request): requirements_violated = 1 if at least one user limit is not respected, else 0.
    In /evaluate (top level) and /area (points.requirements_violated, center_requirements_violated, best.requirements_violated).
    feasible stays (it is the opposite), so nothing breaks on your side.
  YOUR CACHING REQUEST: done. Sun/Earth vectors are cached per calendar month, so a new landing date in a computed month
    costs ~0.07 s instead of ~2.7 s (14 d at 1 min; first request of a new month ~2 s per month). Numbers unchanged (test).
    A multi-date /evaluate is not needed for now; tell me if the slider still feels slow.
  Speed with terrain: new point 0.7-1.7 s then ms; /area 317 points 2-7 s first time, 0.2 s after (skylines are cached
    per point); 1257 points 7 s. First request after server start adds 2-3 s (map loading).
  Validation: skyline vs NASA LOLA long-term visibility maps, 150 random polar points: Sun r = 0.981, Earth r = 0.987
    (docs/validation/avgvisib.md). 57 tests pass (the ones that need the maps are skipped without them).
Changed contract: additions only (API.md rewritten for the terrain: use_terrain, /api/horizon, terrain block,
  requirements_violated). Schemas unchanged.
Behaviour changes to check in FE:
  1. Numbers change when the maps are present (terrain on by default). slope_deg / elevation_m no longer null.
  2. /api/horizon no longer answers 501; it answers 503 if the maps are missing.
  3. /area is slower the first time for a new area (2-7 s); the "one request in flight" logic you added is the right fit.
Needs from FE: nothing.
Questions for FE: none.
Answer on uv (T33): Gabriele decides; I will reply in the next entry.
Next: JSON Schemas for evaluate/area (T32), curated sites (T05), crewed preset sources (T30), uncertainties (T22).
Commits: see PR aero -> main

## 2026-11-14 17:27 · FE
Read AERO 17:08: terrain, /api/horizon, requirements_violated and the monthly cache: thank you, all great.
Done (branch fe/compare, PR coming):
  - T13 comparison: pin a catalogue site or a clicked point ("+ Compare at this date"), up to 4; the header
    "Compare (n)" opens a side-by-side table. Each column keeps its own landing date and hour, so it compares sites
    and dates. Live: one /api/evaluate per column with the current settings; offline: matrix values for catalogue sites.
    Best value per row marked; mean Sun elevation and elevation are not ranked (no agreed "better" direction).
    Shows elevation ± your LOLA height error and which horizon was used.
  - T34 landing hour: hour picker (00-23 UTC) next to the landing date. Drives /evaluate, /area, the live /matrix
    (start_utc = first date at that hour) and the Sun lighting. Disabled offline (data/ files are at 00:00 UTC).
  - Three FE fixes that were only local are in the same PR (request runner per mount, lint, readable header).
Changed contract: no
Needs from AERO: nothing new. The real catalogue (T05) is what makes the comparison useful for the demo:
  Apollo, CLPS targets, Chang'e, Chandrayaan-3, Artemis III candidate regions.
Questions for AERO: does /api/matrix accept a start_utc that is not at 00:00 (FE now sends e.g. 13:00:00Z)?
Next (FE): slope as the 5th factor in the score breakdown + remove the stale "terrain not included" text,
  then the horizon panorama on /api/horizon (T12), then limits + robotic/crewed (T30).
Commits: fe/compare 3de453f, b844d75 (+ 142fb64, 53c24cf, fd0eb07)
