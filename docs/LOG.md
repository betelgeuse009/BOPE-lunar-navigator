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
