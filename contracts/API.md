# Lunar Navigator API (contract addition, agreed by FE and AERO on 2026-11-14)

A small local Python server (FastAPI) that runs the analysis **on request**, for any point on the Moon and any
user settings. Every response that has a schema in `contracts/schemas/` has exactly that shape, so the front end
can read the API or the static files in `data/` with the same code. The static files stay as the offline fallback.

## Run it (once per machine, from the repo root)

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r analysis/requirements.txt     # Linux/macOS: .venv/bin/python
.venv/Scripts/python.exe -m analysis.download_kernels                    # 45 MB of SPICE kernels from NASA NAIF
.venv/Scripts/python.exe -m uvicorn analysis.api:app --port 8000
```

- Base URL: `http://localhost:8000/api`
- **Interactive docs with every parameter and a "try it" button: `http://localhost:8000/docs`**
- OpenAPI description (for generating TypeScript types): `http://localhost:8000/openapi.json`
- CORS is open, so a dev server on another port can call it. All endpoints are `GET` and read-only.
- Errors: `422` with `{"detail": "..."}` for bad input, `503` if the kernels are missing, `501` for `/api/horizon`.

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
| `obs_height_m` | 2 | Height of the solar array / antenna above the surface (the mast height) |
| `sun_threshold_frac` | 0.5 | Visible fraction of the solar disk that counts as "sunlit" |
| `earth_min_elev_deg` | 0 | Antenna mask: Earth must be at least this high (and half its disk visible) |
| `load_w` | – | Average electrical load. Enables `battery_needed_wh`, `energy_required_kwh` |
| `panel_area_m2`, `panel_efficiency_frac` | – | Sun-tracking array. Enables `energy_generated_kwh`, `energy_margin_kwh` |

**Score weights** (`/evaluate`, `/area`, `/matrix`): `w_sunlit`, `w_dark`, `w_earth`, `w_no_earth`, `w_slope` (default 1 each, 0 = ignore).

**Feasibility limits** (`/evaluate`, `/area`; all optional, no limit unless given):
`min_sunlit_frac`, `max_dark_h`, `min_earth_visible_frac`, `max_no_earth_h`, `max_slope_deg`, `min_energy_margin_kwh`.

Parameter definitions, formulas and sources: `docs/PARAMETERS.md`.

## Endpoints

| Endpoint | Extra parameters | Returns | Typical time |
|---|---|---|---|
| `GET /api/health` | – | status, kernels, horizon model | 2 ms |
| `GET /api/sites` | – | `sites.schema.json` | 2 ms |
| `GET /api/scene` | `step_s` (600) | `scene.schema.json`: sub-solar / sub-Earth points, Earth phase | 0.2 s for 30 d |
| `GET /api/ephemeris` | site, model inputs, `step_s` (600) | `ephemeris.schema.json` with all optional fields | 0.2 s for 30 d |
| `GET /api/metrics` | site, model inputs, `calc_step_s` (60) | `metrics.schema.json` incl. Sun/Earth windows | < 1 s first call, ms after |
| `GET /api/evaluate` | site, model inputs, weights, limits, `calc_step_s` (60) | all site parameters + feasibility + score (below) | < 1 s first call, ms after |
| `GET /api/area` | site, model inputs, weights, limits, `radius_km` (5), `spacing_km` (radius/10), `calc_step_s` (600) | score map of a disc around the site (below) | 0.3 s for 317 points |
| `GET /api/matrix` | `site_ids` or `points=lat,lon;lat,lon`, `n_dates` (30), `date_step_h` (24), weights, `calc_step_s` (600) | `matrix.schema.json` + a `score` grid | 0.3 s |
| `GET /api/horizon` | – | `501` until the LOLA terrain is wired in (T07) | – |

Timings measured on AERO's laptop, 2026-11-14. The first request for a new time window computes the Sun/Earth
positions (about 2 s per month at 1 min) and caches them; every other site in the same window is then instant.
Limits per request: 200 000 time steps; 2 000 area points; 6 000 000 points × steps.

`period_id` (default `custom`) can be passed to `/scene`, `/ephemeris`, `/metrics` to label the response.

## `GET /api/evaluate`: is this site good for this landing date?

`/api/evaluate?lat_deg=-89.5&lon_deg=-135&start_utc=2026-11-15T00:00:00Z&load_w=100&panel_area_m2=2&panel_efficiency_frac=0.3&max_no_earth_h=100&max_slope_deg=8`

```json
{
  "contract_version": "0.1", "generated_at": "2026-11-14T13:18:11Z", "source": { "...": "as in every file" },
  "site": { "lat_deg": -89.5, "lon_deg": -135.0, "obs_height_m": 2.0 },
  "window": { "start_utc": "2026-11-15T00:00:00Z", "end_utc": "2026-11-29T00:00:00Z", "duration_h": 336.0, "calc_step_s": 60 },
  "inputs": { "obs_height_m": 2.0, "sun_threshold_frac": 0.5, "earth_min_elev_deg": 0.0, "load_w": 100.0,
              "panel_area_m2": 2.0, "panel_efficiency_frac": 0.3,
              "weights": { "sunlit_frac": 1.0, "longest_dark_h": 1.0, "earth_visible_frac": 1.0, "longest_no_earth_h": 1.0, "slope_deg": 1.0 },
              "limits": { "min_sunlit_frac": null, "max_dark_h": null, "min_earth_visible_frac": null,
                          "max_no_earth_h": 100.0, "max_slope_deg": 8.0, "min_energy_margin_kwh": null } },
  "horizon_source": "smooth-sphere", "terrain_available": false,
  "parameters": {
    "sunlit_frac":                    { "value": 1.0,      "uncertainty": null },
    "longest_dark_h":                 { "value": 0.0,      "uncertainty": null },
    "hours_to_first_dark_h":          { "value": null,     "uncertainty": null },
    "mean_sun_el_when_lit_deg":       { "value": 1.207,    "uncertainty": null },
    "sun_el_min_deg":                 { "value": 1.0417,   "uncertainty": null },
    "sun_el_max_deg":                 { "value": 1.5758,   "uncertainty": null },
    "sun_energy_tracking_kwh_m2":     { "value": 467.3445, "uncertainty": null },
    "mean_irradiance_w_m2":           { "value": 1390.9063, "uncertainty": null },
    "earth_visible_frac":             { "value": 0.7918,   "uncertainty": null },
    "longest_no_earth_h":             { "value": 69.9667,  "uncertainty": null },
    "hours_to_first_earth_loss_h":    { "value": 0.0,      "uncertainty": null },
    "mean_earth_el_when_visible_deg": { "value": 3.9316,   "uncertainty": null },
    "earth_el_min_deg":               { "value": -3.8897,  "uncertainty": null },
    "earth_el_max_deg":               { "value": 5.9214,   "uncertainty": null },
    "both_frac":                      { "value": 0.7918,   "uncertainty": null },
    "energy_generated_kwh":           { "value": 280.4067, "uncertainty": null },
    "energy_required_kwh":            { "value": 33.6,     "uncertainty": null },
    "energy_margin_kwh":              { "value": 246.8067, "uncertainty": null },
    "battery_needed_wh":              { "value": 0.0,      "uncertainty": null },
    "slope_deg":                      { "value": null,     "uncertainty": null },
    "elevation_m":                    { "value": null,     "uncertainty": null }
  },
  "feasible": true,
  "violations": [],
  "not_checked": ["max_slope_deg"],
  "score": { "value": 0.8959,
             "components": { "sunlit_frac": { "score": 1.0, "weight": 1.0 }, "longest_dark_h": { "score": 1.0, "weight": 1.0 },
                             "earth_visible_frac": { "score": 0.7918, "weight": 1.0 }, "longest_no_earth_h": { "score": 0.7918, "weight": 1.0 },
                             "slope_deg": { "score": null, "weight": 1.0 } } }
}
```

- A `null` value means "not available": the input it needs was not given (`load_w`, panel) or the terrain data is
  not wired in yet (`slope_deg`, `elevation_m`). Show it as "n/a", never as 0.
- `feasible` is `false` when at least one limit is violated; each violation lists the limit, the parameter, its value
  and the limit value. Limits that could not be checked are listed in `not_checked`.
- `score.value` is 0..1 (1 = best). `components` shows each sub-score so the UI can explain the score.

## `GET /api/area`: is there a better point nearby?

`/api/area?lat_deg=-89.5&lon_deg=-135&start_utc=2026-11-15T00:00:00Z&radius_km=5&spacing_km=1`

Evaluates a square grid of points inside a circle around the clicked site. **Index 0 is always the clicked point.**

```json
{
  "contract_version": "0.1", "generated_at": "...", "source": { "...": "..." },
  "center": { "lat_deg": -89.5, "lon_deg": -135.0, "obs_height_m": 2.0 },
  "radius_km": 5.0, "spacing_km": 1.0,
  "window": { "start_utc": "2026-11-15T00:00:00Z", "end_utc": "2026-11-29T00:00:00Z", "duration_h": 336.0, "calc_step_s": 600 },
  "inputs": { "...": "same as /evaluate" },
  "horizon_source": "smooth-sphere", "terrain_available": false,
  "points": {
    "lat_deg":  [-89.5, -89.66489, -89.61885, "... 81 values"],
    "lon_deg":  [-135.0, -135.0, -150.04434, "..."],
    "east_km":  [0.0, 0.0, -3.0, "..."],
    "north_km": [0.0, -5.0, -4.0, "..."],
    "score":    [0.89583, 0.89831, 0.89583, "..."],
    "feasible": [true, true, true, "..."],
    "parameters": { "sunlit_frac": ["..."], "longest_dark_h": ["..."], "earth_visible_frac": ["..."],
                    "longest_no_earth_h": ["..."], "both_frac": ["..."], "sun_energy_tracking_kwh_m2": ["..."],
                    "energy_margin_kwh": ["..."], "battery_needed_wh": ["..."], "slope_deg": ["..."] }
  },
  "score_range": [0.8916, 0.9000],
  "center_score": 0.8958, "center_feasible": true, "center_is_best": false,
  "best": { "index": 17, "lat_deg": -89.5778, "lon_deg": -116.79369, "score": 0.9000, "feasible": true,
            "score_gain": 0.0042, "dist_km": 5.0, "bearing_deg": 126.9 }
}
```

- `points.*` are parallel arrays. `east_km` / `north_km` are offsets from the clicked point in its local
  East-North plane: use them to draw the disc; use `lat_deg` / `lon_deg` to place points on the globe.
- Colour gradient: map `points.score` between `score_range[0]` and `score_range[1]`.
- `best` is the highest-scoring **feasible** point (highest-scoring point if none is feasible).
  `center_is_best` is `true` when no point beats the clicked one by more than 0.0001.
- **Until the terrain is wired in, neighbouring points differ very little** (here 0.892..0.900): over a few km only the
  Sun/Earth geometry changes. The real differences (ridges vs craters) will appear with the LOLA horizon and slope.

## Known limits (2026-11-14)

- Horizon model is a smooth sphere: terrain is ignored. `/api/health` and every evaluation report `terrain_available`.
- `slope_deg` and `elevation_m` are `null`. All `uncertainty` values are `null`.
- Numbers are cross-checked against SPICE's own `azlcpo` routine (agreement better than 0.0001°) but **not yet against JPL Horizons**.
- `/api/sites` returns three example points, not landing sites, until the curated list exists (T05).
