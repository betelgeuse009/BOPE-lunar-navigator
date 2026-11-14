# Task board

Status: todo · doing · review · done. Update the row when status changes; add new rows at the bottom of a section.

| ID | Task | Owner | Status | Depends on |
|---|---|---|---|---|
| T01 | Repo structure, shared docs, `.gitignore` | FE | review | |
| T02 | Contract v0.1 draft (`contracts/`) | FE | review | |
| T03 | Review and agree contract v0.1 (conventions, file list), reply in LOG | AERO | done | T02 |
| T04 | Create `team/Gabri275.md` (personal file) | AERO | done | |
| T05 | Curated site list `sites.json` with coordinate citations | AERO | todo | T03 |
| T06 | Ephemeris pipeline (SPICE via spiceypy), checked vs SPICE `azlcpo` and vs JPL Horizons (max 0.00003°, tol 0.01°; `docs/validation/horizons.md`) | AERO | done | T03 |
| T07 | Horizon from the LOLA DEMs for any site (`analysis/terrain.py`, `/api/horizon`, `data/samples/horizon/`) | AERO | done | T03 |
| T08 | Metrics + windows per site × period, with the terrain skyline | AERO | done | T06, T07 |
| T09 | `matrix.json` site × landing-date grid (`/api/matrix`, `data/samples/matrix.json`; example sites until T05) | AERO | review | T08 |
| T10 | Scaffold frontend (Vite + React + TS + Tailwind + Zustand) + fixtures matching v0.1 | FE | todo | T02 |
| T11 | Global clock + timeline strip with scrubber | FE | todo | T10 |
| T12 | Horizon panorama (SVG) with Sun/Earth tracks | FE | todo | T10 |
| T13 | Site × date heatmap (main screen) + compare cards (compare: `fe/compare`, up to 4 places, each at its own landing date and hour) | FE | review | T10 |
| T14 | 3D Sun–Earth–Moon geometry view (R3F, schematic scale) | FE | todo | T11 |
| T15 | Check Space Apps rules on pre-event work and AI-use disclosure; note in DECISIONS | FE | todo | |
| T16 | LATER: DSN windows, battery for longest night, mast-height curve | AERO | todo | T08 |
| T17 | Site/date evaluation parameters in `docs/PARAMETERS.md` (name, unit, method, thresholds, source) | AERO | review | T03 |
| T18 | Moon globe view: orbit camera, site markers, date slider recolouring sites | FE | done | T10, T17 |
| T19 | Download scripts: SPICE kernels (`python -m analysis.download_kernels`) and LOLA maps (`python -m analysis.download_maps`, list in `data/MAPS.md`) | AERO | done | |
| T20 | Agree optional contract additions proposed in LOG 2026-11-14 11:44 (distances, angular radius, Earth phase, ENU vectors, `scene/<period>.json`, site extras, multi-res DEM) | Both | done | T03 |
| T21 | Mirror T20 additions in schemas (AERO) and in `frontend/public/fixtures/` (FE) | Both | review | T20 |
| T22 | Uncertainty bands: neighbour ring (100–500 m) + LOLA height-error map → metric `uncertainty` | AERO | todo | T08 |
| T23 | Validate long-term Sun / Earth visibility vs LOLA `AVGVISIB` maps: Sun r = 0.981, Earth r = 0.987 (`docs/validation/avgvisib.md`) | AERO | done | T08 |
| T24 | LATER: map layers (slope, mean illumination, Earth visibility, PSRs) as web PNGs + index file (needs contract addition) | AERO | todo | T07 |
| T25 | Live API for arbitrary coordinates and user settings (`analysis/api.py`, `contracts/API.md`): ephemeris, metrics, scene, matrix, evaluate, area | AERO | review | |
| T26 | LATER: heightmap crop per site (e.g. 20×20 km, same DEM as the horizon masks) for FE 3D terrain (needs contract addition) | AERO | todo | T07 |
| T27 | Front end calls the API (`contracts/API.md`): click any point → `/api/evaluate`; area search → `/api/area` colour gradient; settings panel for the inputs | FE | review | T25 |
| T28 | LOLA terrain in the API: `/api/horizon`, `slope_deg`, `elevation_m`, terrain skyline in every metric, `use_terrain` switch | AERO | review | T07 |
| T29 | Decide how the public demo gets its data: hosted Python server or static fallback only | Both | todo | T25 |
| T30 | Mission profiles (robotic lander / crewed): FE preset UI; AERO cited preset values in PARAMETERS.md | Both | todo | T27 |
| T31 | OPTIONAL: north polar DEMs (`LDEM_80N_80M`, `LDEM_60N_240M`, 225 MB) if north polar sites are wanted | AERO | todo | T28 |
| T32 | JSON Schemas for `/api/evaluate` and `/api/area` (promised to FE) | AERO | todo | T28 |
| T33 | Decide on FE's proposal to manage the Python dependencies with `uv` (LOG 2026-11-14 16:57) | AERO | todo | |
| T34 | Landing hour (UTC) next to the landing date, live mode (`fe/compare`) | FE | review | T27 |
