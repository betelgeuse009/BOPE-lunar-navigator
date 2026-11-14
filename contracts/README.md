# Data contract v0.1 (agreed by FE and AERO in docs/LOG.md, 2026-11-14)

This folder defines the files that `analysis/` (AERO, Python) writes to `data/processed/`
and that `frontend/` (FE, web) reads. The front end never computes physics; it only displays these files.
The machine-checkable rules are the JSON Schemas in `schemas/`. This page explains them in plain words.

## Files

| File in `data/processed/` | Schema | What it holds | Feeds which view |
|---|---|---|---|
| `manifest.json` | `manifest.schema.json` | Which periods exist and which site × period files are available. The FE loads this first | everything |
| `sites.json` | `sites.schema.json` | Curated site list: id, name, lat/lon, category, citation for coordinates | map, site picker |
| `horizon/<site_id>.json` | `horizon.schema.json` | Terrain horizon elevation for every azimuth | horizon panorama, polar sky plot |
| `ephemeris/<site_id>_<period_id>.json` | `ephemeris.schema.json` | Time series of Sun/Earth az/el plus how much of each disk is above the terrain | panorama tracks, timeline, 3D |
| `metrics/<site_id>_<period_id>.json` | `metrics.schema.json` | Summary numbers with uncertainty, plus sun and Earth windows (start/end) | compare cards, countdowns |
| `matrix.json` | `matrix.schema.json` | Metrics for every site × landing date | main heatmap |
| `scene/<period_id>.json` (optional) | `scene.schema.json` | Site-independent time series: sub-solar and sub-Earth points, Earth phase | 3D globe lighting |

Optional fields added 2026-11-14 (T20, agreed in LOG; no version bump because they are optional):
- ephemeris: `sun_dist_km`, `earth_dist_km`, `sun_radius_deg`, `earth_radius_deg`, `earth_phase_frac`, `sun_dir_enu`, `earth_dir_enu`
- metrics: `earth_min_elev_deg` · sites: `elevation_m`, `slope_deg`, `is_region`, `mission_date`
- horizon: `dem.layers` (multi-resolution DEM) · manifest: `has_scene`

Sample files computed from the real SPICE kernels for three example points (not landing sites) are in `data/samples/`.
They are valid against these schemas, so FE can copy them into `frontend/public/fixtures/`.

## Rules every file follows
- Header fields: `contract_version` (`"0.1"`), `generated_at` (UTC ISO 8601 with `Z`), `source`
  (`datasets` with name/version/url, `tool` = script@commit, `notes` = assumptions/limitations).
- Units are in field names: `_deg`, `_utc`, `_h`, `_m`, `_wh`, `_frac` (0..1, not percent).
- IDs are kebab-case (`shackleton-rim`, `2027-01`). File names join site and period with `_`, so IDs never contain `_`.
- Time series are **parallel arrays** of equal length, one entry per step (compact, easy with numpy: `arr.tolist()`).
- Every number shown to users is `{ "value": x, "uncertainty": ±y }`. Use `null` for "not estimated yet". Never invent a value.
- Fields marked LATER in the schemas are optional and can be added without bumping the version.

## Conventions (please confirm, AERO)
- **Coordinates:** selenographic lat/lon in the Mean Earth / Polar Axis (ME) frame, longitude east-positive, −180..180.
- **Topocentric frame:** local East-North-Up at the site. Azimuth in degrees **clockwise from local north**
  (the direction toward the lunar north pole), 0 ≤ az < 360. Elevation is measured from the local
  horizontal plane (ellipsoid/sphere normal, not terrain slope).
- **Ephemeris az/el are geometric:** terrain is ignored. Terrain enters only through `*_visible_frac`,
  which AERO computes by comparing the disk against the horizon mask. No atmosphere, so no refraction.
- **Aberration correction** is stated in the file (`LT+S` recommended for apparent directions).
- **Sunlit** means `sun_visible_frac ≥ sun_threshold_frac` (the threshold is stated in each metrics/matrix file).
- **Matrix cell** = metrics over `[landing_date, landing_date + mission_duration_h]`.

## Changing the contract
- Adding an optional field: just do it, and mention it in the LOG.
- Renaming, removing, or changing meaning or units: propose in `docs/LOG.md`, the other teammate agrees there,
  bump `contract_version`, and update the schemas and `frontend/public/fixtures/` in the same PR.

## Validating a file (AERO)
```bash
pip install jsonschema referencing
python contracts/validate.py data/processed
```
