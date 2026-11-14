# Task board

Status: todo · doing · review · done. Update the row when status changes; add new rows at the bottom of a section.

| ID | Task | Owner | Status | Depends on |
|---|---|---|---|---|
| T01 | Repo structure, shared docs, `.gitignore` | FE | review | |
| T02 | Contract v0.1 draft (`contracts/`) | FE | review | |
| T03 | Review and agree contract v0.1 (conventions, file list), reply in LOG | AERO | todo | T02 |
| T04 | Create `team/Gabri275.md` (personal file) | AERO | todo | |
| T05 | Curated site list `sites.json` with coordinate citations | AERO | todo | T03 |
| T06 | Ephemeris pipeline (SPICE or Horizons), validated vs JPL Horizons | AERO | todo | T03 |
| T07 | Horizon masks from LOLA DEM for the curated sites | AERO | todo | T03 |
| T08 | Metrics + windows per site × period | AERO | todo | T06, T07 |
| T09 | `matrix.json` site × landing-date grid | AERO | todo | T08 |
| T10 | Scaffold frontend (Vite + React + TS + Tailwind + Zustand) + fixtures matching v0.1 | FE | todo | T02 |
| T11 | Global clock + timeline strip with scrubber | FE | todo | T10 |
| T12 | Horizon panorama (SVG) with Sun/Earth tracks | FE | todo | T10 |
| T13 | Site × date heatmap (main screen) + compare cards | FE | todo | T10 |
| T14 | 3D Sun–Earth–Moon geometry view (R3F, schematic scale) | FE | todo | T11 |
| T15 | Check Space Apps rules on pre-event work and AI-use disclosure; note in DECISIONS | FE | todo | |
| T16 | LATER: DSN windows, battery for longest night, mast-height curve | AERO | todo | T08 |
| T17 | Site/date evaluation parameters in `docs/PARAMETERS.md` (name, unit, method, thresholds, source) | AERO | todo | T03 |
| T18 | Moon globe view: orbit camera, site markers, date slider recolouring sites | FE | todo | T10, T17 |
