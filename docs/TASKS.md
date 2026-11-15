# Task board

Status: todo · doing · review · done. Update the row when status changes; add new rows at the bottom of a section.

| ID | Task | Owner | Status | Depends on |
|---|---|---|---|---|
| T01 | Repo structure, shared docs, `.gitignore` | FE | review | |
| T02 | Contract v0.1 draft (`contracts/`) | FE | review | |
| T03 | Review and agree contract v0.1 (conventions, file list), reply in LOG | AERO | done | T02 |
| T04 | Create `team/Gabri275.md` (personal file) | AERO | done | |
| T05 | Known landing sites with cited coordinates: 31 sites in `data/processed/sites.json` and `/api/sites` (`data/SITES.md`); Artemis III regions pending official coordinates | AERO | review | T03 |
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
| T22 | Metric uncertainties: landing-position ring + skyline accuracy, `requirements_at_risk` (`analysis/uncertainty.py`, PARAMETERS §6) | AERO | review | T08 |
| T23 | Validate long-term Sun / Earth visibility vs LOLA `AVGVISIB` maps: Sun r = 0.981, Earth r = 0.987 (`docs/validation/avgvisib.md`) | AERO | done | T08 |
| T24 | LATER: map layers (slope, mean illumination, Earth visibility, PSRs) as web PNGs + index file (needs contract addition) | AERO | todo | T07 |
| T25 | Live API for arbitrary coordinates and user settings (`analysis/api.py`, `contracts/API.md`): ephemeris, metrics, scene, matrix, evaluate, area | AERO | review | |
| T26 | LATER: heightmap crop per site (e.g. 20×20 km, same DEM as the horizon masks) for FE 3D terrain (needs contract addition) | AERO | todo | T07 |
| T27 | Front end calls the API (`contracts/API.md`): click any point → `/api/evaluate`; area search → `/api/area` colour gradient; settings panel for the inputs | FE | review | T25 |
| T28 | LOLA terrain in the API: `/api/horizon`, `slope_deg`, `elevation_m`, terrain skyline in every metric, `use_terrain` switch | AERO | review | T07 |
| T29 | Public demo data: static set for the 31 sites precomputed in `data/processed/` (AERO, done). Still open: host a Python server or static only | Both | doing | T25 |
| T30 | Mission profiles (robotic lander / crewed): FE preset UI done (`fe/requirements`, crewed values cited from NASA NTRS 20250009323); AERO reviews values for PARAMETERS.md | Both | review | T27 |
| T31 | OPTIONAL: north polar DEMs (`LDEM_80N_80M`, `LDEM_60N_240M`, 225 MB) if north polar sites are wanted | AERO | todo | T28 |
| T32 | JSON Schemas for `/api/evaluate` and `/api/area` (promised to FE) | AERO | todo | T28 |
| T33 | Decide on FE's proposal to manage the Python dependencies with `uv` (LOG 2026-11-14 16:57) | AERO | todo | |
| T34 | Landing time slider (1 min) with a 10-min score strip for the day, live mode (`fe/requirements`) | FE | review | T27 |
| T35 | Show the known landing sites (`data/processed/sites.json` / `/api/sites`) on the 3D globe and the 2D map, styled by `category` and `status` (site panel + live colours done in `fe/requirements`; marker styling next) | FE | doing | T05 |
| T36 | Artemis III candidate regions on the map: find official region outlines or coordinates (NASA gives names only) | AERO | todo | T05 |
| T37 | `/api/health` says whether the terrain is used (and which maps are missing), so the FE can warn before showing smooth-sphere numbers | AERO | todo | T28 |
| T38 | Feedback batch (FE): lat/lon boxes, animation rollover, Sun/Earth period lengths + repeat period, Labels switch, exact colour bar ends with ±, regolith factors in score/requirements, navigator audit (`fe/feedback-batch`) | FE | review | |
| T39 | Re-run `frontend/scripts/layers.py` with the Diviner maps (temperature, rock, H get exact colour bar ends) and run `analysis/tests` with the regolith maps | AERO | todo | T38 |
| T40 | Open validation items in `docs/validation/navigator-audit.md`: Earth phase vs Horizons, mast height vs Gläser et al. 2014, whole-Moon visibility vs AVGVISIB overlap, irradiance, Diviner temperature accuracy | AERO | todo | T38 |
| T41 | Intuitiveness batch (FE): warning badges + default bands, countdown banner, mission card placement, search bar + A/B compare, "Why it changes", "Moon vs Earth" (`fe/ux-warnings`) | FE | review | T38 |
