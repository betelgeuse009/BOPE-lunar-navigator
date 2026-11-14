# Lunar Navigator API (contract addition, agreed by FE and AERO on 2026-11-14)

A small local Python server (FastAPI) that runs the analysis **on request**, for any point on the Moon and any
user settings. Every response that has a schema in `contracts/schemas/` has exactly that shape, so the front end
can read the API or the static files in `data/` with the same code. The static files stay as the offline fallback.

## Run it (once per machine, from the repo root)

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r analysis/requirements.txt     # Linux/macOS: .venv/bin/python
.venv/Scripts/python.exe -m analysis.download_kernels                    # 45 MB of SPICE kernels from NASA NAIF
.venv/Scripts/python.exe -m analysis.download_maps                       # optional, ~3 GB: LOLA maps for the real terrain
.venv/Scripts/python.exe -m uvicorn analysis.api:app --port 8000
```

- Base URL: `http://localhost:8000/api`
- **Interactive docs with every parameter and a "try it" button: `http://localhost:8000/docs`**
- OpenAPI description (for generating TypeScript types): `http://localhost:8000/openapi.json`
- CORS is open, so a dev server on another port can call it. All endpoints are `GET` and read-only.
- Errors: `422` with `{"detail": "..."}` for bad input, `503` if the kernels (or, for `/api/horizon`, the maps) are missing.

**Terrain.** With the LOLA maps on disk (`data/MAPS.md`) every result uses the real skyline, slope and elevation
(`horizon_source: "lola-terrain"`). Without the maps, or with `use_terrain=false`, the API still works with a smooth
sphere (`horizon_source: "smooth-sphere"`, slope and elevation `null`). `/api/health` reports `terrain_available` and
which maps are present. `python -m analysis.download_maps --all` adds the 3.3 GB 5 m map (finer near-field skyline south of 86.7°S).

## Common query parameters

**Site** (one of the two):
| Parameter | Meaning |
|---|---|
| `lat_deg`, `lon_deg` | Any point. Planetocentric latitude −90..90; east longitude −180..180 (0..360 also accepted) |
| `site_id` | A site from `/api/sites` |

**Time window:**
| Parameter | Default | Meaning |
|---|---|---|
| `start_utc` | required | Window start / landing time, e.g. `2026-11-15T00:00:00Z` |
| `end_utc` | – | Window end. If omitted, `start_utc + mission_h` |
| `mission_h` | 336 | Window length in hours (14 days) |

**Model inputs (the user settings):**
| Parameter | Default | Meaning |
|---|---|---|
| `obs_height_m` | 2 | Height of the solar array / antenna above the terrain (the mast height) |
| `sun_threshold_frac` | 0.5 | Visible fraction of the solar disk that counts as "sunlit" |
| `earth_min_elev_deg` | 0 | Antenna mask: Earth must be at least this high (and half its disk visible) |
| `load_w` | – | Average electrical load. Enables `battery_needed_wh`, `energy_required_kwh` |
| `panel_area_m2`, `panel_efficiency_frac` | – | Sun-tracking array. Enables `energy_generated_kwh`, `energy_margin_kwh` |
| `use_terrain` | true | `false` = ignore the terrain (smooth sphere), to see what the terrain changes |
| `position_uncertainty_m` | 100 | Landing accuracy for the uncertainty: parameters are re-evaluated on a ring of this radius (0 = off) |
| `horizon_uncertainty_deg` | 0.1 | Skyline accuracy for the uncertainty: the skyline is shifted by ± this (0 = off) |

**Score weights** (`/evaluate`, `/area`, `/matrix`): `w_sunlit`, `w_dark`, `w_earth`, `w_no_earth`, `w_slope` (default 1 each, 0 = ignore).

**Requirements = feasibility limits** (`/evaluate`, `/area`; all optional, no limit unless given):
`min_sunlit_frac`, `max_dark_h`, `min_earth_visible_frac`, `max_no_earth_h`, `max_slope_deg`, `min_energy_margin_kwh`.

Parameter definitions, formulas and sources: `docs/PARAMETERS.md`.

## Endpoints

| Endpoint | Extra parameters | Returns |
|---|---|---|
| `GET /api/health` | – | status, kernels, `horizon_source`, `terrain_available`, `maps` present |
| `GET /api/sites` | – | `sites.schema.json`: the 31 known landing sites (`data/SITES.md`), with `elevation_m`, `slope_deg` when the maps are present. Same content as the static file `data/processed/sites.json` |
| `GET /api/scene` | `step_s` (600) | `scene.schema.json`: sub-solar / sub-Earth points, Earth phase |
| `GET /api/ephemeris` | site, model inputs, `step_s` (600) | `ephemeris.schema.json` with all optional fields; `*_visible_frac` include the terrain |
| `GET /api/horizon` | site, `obs_height_m` | `horizon.schema.json`: the terrain skyline, 720 azimuths (0.5°), out to 200 km |
| `GET /api/metrics` | site, model inputs, `calc_step_s` (60) | `metrics.schema.json` incl. Sun/Earth windows |
| `GET /api/evaluate` | site, model inputs, weights, limits, `calc_step_s` (60) | all site parameters + requirements check + score (below) |
| `GET /api/area` | site, model inputs, weights, limits, `radius_km` (5), `spacing_km` (radius/10), `calc_step_s` (600) | score map of a disc around the site (below) |
| `GET /api/matrix` | `site_ids` or `points=lat,lon;lat,lon`, `n_dates` (30), `date_step_h` (24), weights, `calc_step_s` (600) | `matrix.schema.json` + a `score` grid |

`period_id` (default `custom`) can be passed to `/scene`, `/ephemeris`, `/metrics` to label the response.
Limits per request: 200 000 time steps; 2 000 area points; 6 000 000 points × steps.

### Speed (AERO's laptop, 2026-11-14, with terrain)

Two things are computed once and then cached in the server's memory:
- **Sun/Earth positions, per calendar month** and time step: about 2 s per month at 1 min. Any landing date inside an
  already-computed month is then free (a 14-day window touches one or two months).
- **The skyline of a point**: about 1 s for a new point (0.1 s away from the pole); 0.01 s per point in `/area`
  (coarser profile: 2° azimuth steps, within 0.1° of the fine one).

| Request | First time | Afterwards |
|---|---|---|
| `/evaluate`, new point, month already computed | 0.7–1.7 s | 0.01–0.07 s |
| `/evaluate`, same point, new landing date in a computed month | – | 0.07 s |
| `/area`, 317 points (5 km radius) | 2–7 s | 0.2 s |
| `/area`, 1257 points (10 km, 0.5 km spacing) | 7 s | not measured |
| `/horizon` | 1.4 s | cached |
| Very first request after the server starts | adds 2–3 s (loading the maps) | – |

With `use_terrain=false` everything is as fast as before (area of 317 points in 0.2 s).

## `GET /api/evaluate`: is this site good for this landing date?

`/api/evaluate?lat_deg=-89.5&lon_deg=-135&start_utc=2026-11-15T00:00:00Z&load_w=100&panel_area_m2=2&panel_efficiency_frac=0.3&max_no_earth_h=100&max_dark_h=70&max_slope_deg=8`

```json
{
  "contract_version": "0.1", "generated_at": "2026-11-14T16:49:34Z", "source": { "...": "as in every file" },
  "site": {"lat_deg": -89.5, "lon_deg": -135.0, "obs_height_m": 2.0},
  "window": {"start_utc": "2026-11-15T00:00:00Z", "end_utc": "2026-11-29T00:00:00Z", "duration_h": 336.0, "calc_step_s": 60},
  "inputs": {"obs_height_m": 2.0, "sun_threshold_frac": 0.5, "earth_min_elev_deg": 0.0, "load_w": 100.0, "panel_area_m2": 2.0, "panel_efficiency_frac": 0.3, "use_terrain": true, "position_uncertainty_m": 100.0, "horizon_uncertainty_deg": 0.1, "weights": {"sunlit_frac": 1.0, "longest_dark_h": 1.0, "earth_visible_frac": 1.0, "longest_no_earth_h": 1.0, "slope_deg": 1.0}, "limits": {"min_sunlit_frac": null, "max_dark_h": 70.0, "min_earth_visible_frac": null, "max_no_earth_h": 100.0, "max_slope_deg": 8.0, "min_energy_margin_kwh": null}},
  "terrain": {"used": true, "horizon_source": "lola-terrain", "dem_product": "ldem_87s_5mpp.tif", "dem_resolution_m": 5.0, "horizon_layers": [{"product": "ldem_87s_5mpp.tif", "resolution_m": 5.0}, {"product": "LDEM_80S_80MPP_ADJ.tiff", "resolution_m": 80.0}], "horizon_max_range_km": 200.0, "slope_source": "LDSM_80S_80MPP_ADJ (official slope map)", "slope_baseline_m": 80.0, "height_error_m": 0.079},
  "horizon_source": "lola-terrain", "terrain_available": true,
  "parameters": {
    "sunlit_frac":                       {"value": 0.8058, "uncertainty": 0.1969},
    "longest_dark_h":                    {"value": 65.2667, "uncertainty": 66.1552},
    "hours_to_first_dark_h":             {"value": 0.0, "uncertainty": 0.0},
    "mean_sun_el_when_lit_deg":          {"value": 1.195, "uncertainty": 0.0333},
    "sun_el_min_deg":                    {"value": 1.0417, "uncertainty": 0.0033},
    "sun_el_max_deg":                    {"value": 1.5758, "uncertainty": 0.0032},
    "sun_energy_tracking_kwh_m2":        {"value": 376.5824, "uncertainty": 92.0996},
    "mean_irradiance_w_m2":              {"value": 1120.781, "uncertainty": 274.1061},
    "earth_visible_frac":                {"value": 0.7918, "uncertainty": 0.0001},
    "longest_no_earth_h":                {"value": 69.9667, "uncertainty": 0.05},
    "hours_to_first_earth_loss_h":       {"value": 0.0, "uncertainty": 0.0},
    "mean_earth_el_when_visible_deg":    {"value": 3.9313, "uncertainty": 0.0026},
    "earth_el_min_deg":                  {"value": -3.89, "uncertainty": 0.0033},
    "earth_el_max_deg":                  {"value": 5.9212, "uncertainty": 0.0033},
    "both_frac":                         {"value": 0.7918, "uncertainty": 0.1827},
    "energy_generated_kwh":              {"value": 225.9494, "uncertainty": 55.2598},
    "energy_required_kwh":               {"value": 33.6, "uncertainty": 0.0},
    "energy_margin_kwh":                 {"value": 192.3494, "uncertainty": 55.2598},
    "battery_needed_wh":                 {"value": 6526.6667, "uncertainty": 6615.5249},
    "slope_deg":                         {"value": 13.0759, "uncertainty": 4.6354},
    "elevation_m":                       {"value": 1758.9, "uncertainty": 28.3},
    "lola_mean_sun_visibility_frac":     {"value": 0.4411, "uncertainty": null},
    "lola_mean_earth_visibility_frac":   {"value": 0.5772, "uncertainty": null}
  },
  "uncertainty_model": { "position_uncertainty_m": 100.0, "horizon_uncertainty_deg": 0.1,
                         "method": "...",
                         "components": {
                           "sunlit_frac": {"position": 0.1969, "horizon": 0.0025, "range": [0.6091, 0.8356]},
                           "longest_dark_h": {"position": 66.15, "horizon": 0.8333, "range": [55.25, 131.35]},
                           "battery_needed_wh": {"position": 6615.0, "horizon": 83.3333, "range": [5525.0, 13135.0]},
                           "elevation_m": {"position": 28.3452, "horizon": 0.0, "height_error": 0.0788, "range": [1730.5298, 1785.3654]},
                           "...": "one entry per parameter" } },
  "feasible": false,
  "requirements_violated": 1,
  "violations": [{"limit": "max_slope_deg", "parameter": "slope_deg", "value": 13.0759, "limit_value": 8.0}],
  "not_checked": [],
  "requirements_at_risk": ["max_dark_h"],
  "requirements_violated_within_uncertainty": 1,
  "score": { "value": 0.7082, "uncertainty": 0.0927, "components": { "...": "sub-score and weight per parameter" } }
}
```

- **`requirements_violated`** is the 0/1 flag for the user's requirements: **1 = at least one limit is not respected,
  0 = all respected** (also 0 when the user set no limit). `feasible` is the same fact as true/false (`feasible = !requirements_violated`).
  `violations` lists each broken limit with the value found; `not_checked` lists limits that could not be judged
  (for example `max_slope_deg` when the terrain is not used).
- A `null` value means "not available": the input it needs was not given (`load_w`, panel) or the terrain is not used
  (`slope_deg`, `elevation_m`). Show it as "n/a", never as 0.
- `terrain` says what the terrain values are based on, so the UI can state it: the DEM at the site, the DEM layers used
  for the skyline, where the slope comes from and over which baseline (80, 240 or 237 m), the LOLA height error.
- **Uncertainties** (`/evaluate` and the `metrics` documents): each `uncertainty` is a ± bound in the parameter's unit from
  two sources: the **landing position** (largest change over 8 points on a ring of radius `position_uncertainty_m`) and the
  **skyline accuracy** (largest change when the skyline is shifted by ± `horizon_uncertainty_deg`), combined as
  sqrt(position² + horizon²). `elevation_m` also includes the LOLA height error. `uncertainty_model.components` gives
  both parts and the **`range` [lowest, highest]** actually found: show the range when ± would leave the physical limits
  (here `longest_dark_h` = 65.2667 ± 66.1552 h, range [55.25, 131.35]: one point 100 m away is dark much longer).
- **`requirements_at_risk`**: limits that are respected at the point itself but broken somewhere within the uncertainty
  (here `max_dark_h`). **`requirements_violated_within_uncertainty`** = 1 if a limit is broken at the point or at risk.
- `score.uncertainty`: the same ± for the score.
- `lola_mean_*_visibility_frac`: NASA's long-term average for this spot (LOLA AVGVISIB maps, south of 85°S), for context
  next to our value for the chosen dates. Only present when the terrain is used.
- `score.value` is 0..1 (1 = best). `components` shows each sub-score so the UI can explain the score.
  With terrain the slope sub-score is included; without it, it is `null` and left out.

## `GET /api/area`: is there a better point nearby?

`/api/area?lat_deg=-89.5&lon_deg=-135&start_utc=2026-11-15T00:00:00Z&radius_km=5&max_slope_deg=10`

Evaluates a square grid of points inside a circle around the clicked site. **Index 0 is always the clicked point.**

```json
{
  "contract_version": "0.1", "generated_at": "...", "source": { "...": "..." },
  "center": { "lat_deg": -89.5, "lon_deg": -135.0, "obs_height_m": 2.0 },
  "radius_km": 5.0, "spacing_km": 0.5,
  "window": { "start_utc": "2026-11-15T00:00:00Z", "end_utc": "2026-11-29T00:00:00Z", "duration_h": 336.0, "calc_step_s": 600 },
  "inputs": { "...": "same as /evaluate" },
  "horizon_source": "lola-terrain", "terrain_available": true,
  "terrain": { "...": "same block as /evaluate, for the clicked point" },
  "points": {
    "lat_deg":  [-89.5, "... 317 values"],
    "lon_deg":  [-135.0, "..."],
    "east_km":  [0.0, "..."],
    "north_km": [0.0, "..."],
    "score":    [0.70813, "..."],
    "feasible": [false, "..."],
    "requirements_violated": [1, "..."],
    "parameters": { "sunlit_frac": ["..."], "longest_dark_h": ["..."], "earth_visible_frac": ["..."],
                    "longest_no_earth_h": ["..."], "both_frac": ["..."], "sun_energy_tracking_kwh_m2": ["..."],
                    "energy_margin_kwh": ["..."], "battery_needed_wh": ["..."], "slope_deg": ["..."], "elevation_m": ["..."] }
  },
  "score_range": [0.061, 0.895],
  "center_score": 0.708, "center_feasible": false, "center_requirements_violated": 1, "center_is_best": false,
  "best": { "index": 196, "lat_deg": -89.46677, "lon_deg": -136.77204, "score": 0.8953, "feasible": true,
            "requirements_violated": 0, "score_gain": 0.1872, "dist_km": 1.118, "bearing_deg": 333.4 }
}
```

- `points.*` are parallel arrays. `east_km` / `north_km` are offsets from the clicked point in its local
  East-North plane: use them to draw the disc; use `lat_deg` / `lon_deg` to place points on the globe.
- `points.requirements_violated` is the 0/1 flag per point (here 146 of the 317 points break the 10° slope limit).
- `best` is the highest-scoring point **that respects all requirements** (highest-scoring point if none does).
  `center_is_best` is `true` when no point beats the clicked one by more than 0.0001.
- With terrain the scores vary strongly over a few km (here 0.06..0.90: ridges vs crater walls), so a gradient between
  `score_range[0]` and `score_range[1]` is meaningful. Without terrain the range is tiny (about 0.01).

## `GET /api/horizon`: the skyline of a site

`/api/horizon?lat_deg=-89.5&lon_deg=-135&obs_height_m=2` returns `horizon.schema.json`: `azimuth_deg` (0, 0.5, … 359.5,
clockwise from north) and `horizon_elev_deg` (the elevation below which the sky is blocked), plus
`dem: { product, resolution_m, max_range_km, layers }`. Draw it as the terrain silhouette in the panorama; a body is
visible when its elevation is above the skyline at its azimuth (the API already applies this in `*_visible_frac`).

## Validation

- Sun/Earth az/el/range vs **JPL Horizons**: largest difference 0.00003° at full precision, 0.0007° as served
  (az/el rounded to 0.001°); tolerance 0.01°. `docs/validation/horizons.md`.
- Terrain skyline vs NASA's **LOLA long-term visibility maps** at 150 random points south of 85.5°S, using NASA's own
  definition ("any fraction of the disc" visible): Sun r = 0.982, mean difference +0.010; Earth r = 0.996, mean
  difference +0.005; all 26 permanently shadowed points agree. (The earlier −0.037 for the Earth came from comparing
  our time-averaged *visible fraction* with NASA's *any part visible*.)
  `docs/validation/avgvisib.md`.
- Slope computed from the DEM vs the official LOLA slope map: median difference 0.10–0.17°, r = 0.996–0.999.

## Known limits (2026-11-14)

- Slope is measured over 80 m (south of 80°S), 240 m (60–80°S) or 237 m (elsewhere): a regional indicator. No map
  resolves boulders or metre-scale slopes, so it is not a landing-safety certificate.
- Away from the south pole the skyline uses the 237 m global map (fine there: the Sun is high). North polar sites would
  need the north polar DEMs (not downloaded).
- Uncertainties are given by `/evaluate` and the `metrics` documents, not per point in `/area` or per cell in `/matrix`
  (there the grid itself shows how the values vary).
- `/evaluate` and `/area` responses have no JSON Schema yet (documented here by example).
- The Artemis III candidate regions are not in `/api/sites`: NASA has published no coordinates for them (`data/SITES.md`).
