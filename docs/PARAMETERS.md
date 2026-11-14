# Site evaluation parameters (T17)

Owner: AERO. Status: **v0 proposal, implemented in `analysis/` and served by the API** (`contracts/API.md`).
Gabriele confirms or changes the weights and defaults; nothing here is a requirement taken from the literature
unless a source is given.

What makes a site + landing date good: **power** (sunlight on the solar array), **survival** (the longest time
without Sun, which sizes the battery), **communication** (direct line of sight to Earth) and **terrain** (slope, as a regional
landing-safety indicator). Each parameter is computed over the mission window `[landing, landing + mission_h]`.

## 1. User inputs (settings in the navigator)

| Input | Default | Meaning |
|---|---|---|
| `mission_h` | 336 (14 d) | Length of the surface mission |
| `obs_height_m` | 2 | Height of the solar array and antenna above the surface (mast height) |
| `sun_threshold_frac` | 0.5 | Fraction of the solar disk that must be visible to count as "sunlit" |
| `earth_min_elev_deg` | 0 | Antenna mask: minimum Earth elevation for a link |
| `load_w` | none | Average electrical load, also during darkness |
| `panel_area_m2`, `panel_efficiency_frac` | none | Sun-tracking solar array |
| weights `w_*` | 1 each | Importance of each scored parameter |
| limits `min_*`, `max_*` | none | Hard requirements; a site that violates one is "not feasible" |

## 2. Parameters

`lit` = Sun visible fraction ≥ `sun_threshold_frac`. `comm` = Earth visible fraction ≥ 0.5 and Earth elevation ≥ `earth_min_elev_deg`.
Visible fraction = part of the disk above the horizon (circular-segment formula, `analysis/visibility.py`).

| Parameter | Unit | How it is computed | Why it matters |
|---|---|---|---|
| `sunlit_frac` | 0..1 | share of the window with `lit` | power availability |
| `longest_dark_h` | h | longest continuous period without `lit` | battery sizing, thermal survival |
| `hours_to_first_dark_h` | h | time from landing to the first dark step (`null` = never dark) | operations planning |
| `mean_sun_el_when_lit_deg`, `sun_el_min_deg`, `sun_el_max_deg` | deg | Sun elevation statistics | array pointing (vertical arrays at the poles), shadows |
| `sun_energy_tracking_kwh_m2` | kWh/m² | ∫ S₀ · (1 AU / d)² · Sun visible fraction · dt | energy reaching 1 m² that always faces the Sun |
| `mean_irradiance_w_m2` | W/m² | the same, divided by the window length | average power density |
| `earth_visible_frac` | 0..1 | share of the window with `comm` | direct-to-Earth link availability |
| `longest_no_earth_h` | h | longest continuous period without `comm` | longest communication blackout |
| `hours_to_first_earth_loss_h` | h | time from landing to the first step without `comm` | operations planning |
| `mean_earth_el_when_visible_deg`, `earth_el_min_deg`, `earth_el_max_deg` | deg | Earth elevation statistics | antenna pointing, link margin near the horizon |
| `both_frac` | 0..1 | share of the window with `lit` and `comm` together | time for powered, commandable operations |
| `energy_generated_kwh` | kWh | `sun_energy_tracking_kwh_m2 · panel_area_m2 · panel_efficiency_frac` | needs the panel inputs |
| `energy_required_kwh` | kWh | `load_w · window length` | needs `load_w` |
| `energy_margin_kwh` | kWh | generated − required | positive = the array covers the load over the window |
| `battery_needed_wh` | Wh | `load_w · longest_dark_h` | energy to bridge the longest night (no depth-of-discharge or margin factors) |
| `slope_deg` | deg | South of 80°S: official LOLA 80 m slope map. Elsewhere: computed from the DEM by central differences (240 m map for 60–80°S, 237 m global map elsewhere). The baseline and source are reported in `terrain` | landing safety, rover mobility |
| `elevation_m` | m | LOLA height above the 1737.4 km sphere, bilinear, from the finest DEM at the point (5 / 80 / 240 / 237 m). Uncertainty = LOLA height-error map south of 80°S | context; also sets the observer's position |
| `lola_mean_sun_visibility_frac`, `lola_mean_earth_visibility_frac` | 0..1 | NASA's long-term average for the spot (LOLA AVGVISIB maps, south of 85°S) | context next to our value for the chosen dates |

Sources and constants:
- Sun/Earth directions: JPL DE440 ephemeris and lunar orientation via SPICE, frame `MOON_ME`, correction LT+S (kernel list in every file's `source`).
- S₀ = 1360.8 ± 0.5 W/m² at 1 AU (Kopp & Lean 2011, *Geophys. Res. Lett.* 38, L01706). 1 AU = 149 597 870.7 km (IAU 2012).
- Body radii from `pck00011.tpc`: Sun 695 700 km, Earth 6378.1366 km, Moon 1737.4 km.

## 3. Feasibility (hard limits)

A site is **feasible** when it meets every limit the user has set:

| Limit | Rule |
|---|---|
| `min_sunlit_frac` | `sunlit_frac` ≥ limit |
| `max_dark_h` | `longest_dark_h` ≤ limit |
| `min_earth_visible_frac` | `earth_visible_frac` ≥ limit |
| `max_no_earth_h` | `longest_no_earth_h` ≤ limit |
| `max_slope_deg` | `slope_deg` ≤ limit (if the terrain is not used it cannot be judged and is reported in `not_checked`) |
| `min_energy_margin_kwh` | `energy_margin_kwh` ≥ limit |

The API returns the verdict twice: `feasible` (true/false) and **`requirements_violated`** (0/1: 1 = at least one limit
is not respected), plus the list of `violations`.

No limit is set by default: the limits depend on the lander (battery, slope tolerance, link needs), so the user chooses them.

## 4. Score (the cost function for the colour gradient)

Each scored parameter becomes a sub-score from 0 (worst) to 1 (best):

| Parameter | Sub-score |
|---|---|
| `sunlit_frac` | the value itself |
| `longest_dark_h` | 1 − longest_dark_h / window length (1 = never dark, 0 = dark the whole window) |
| `earth_visible_frac` | the value itself |
| `longest_no_earth_h` | 1 − longest_no_earth_h / window length |
| `slope_deg` | 1 − slope / 20°, floored at 0. Left out of the score when the terrain is not used |

**score = Σ wᵢ · sᵢ / Σ wᵢ** over the available parameters with weight > 0. Default weights: 1 each.
A weight of 0 removes a parameter (for example `w_earth=0&w_no_earth=0` for a mission with a relay satellite).
The 20° slope scale is a display default chosen by AERO, adjustable in `analysis/config.py`; it is not a published limit.

For the globe colouring: use `score` (0..1) from `/api/matrix` (site × date), `/api/evaluate` (one site) or `/api/area`
(disc around a site). To show what drives the score, use `score.components`.

## 5. Limits of the current numbers

- **Terrain is included** when the LOLA maps are on disk: the skyline is ray-marched over the DEMs out to 200 km
  (`analysis/terrain.py`), target accuracy 0.1°. Checked against NASA's long-term LOLA visibility maps at 150 random
  points south of 85.5°S: Sun r = 0.981 (mean difference −0.005), Earth r = 0.987 (mean difference −0.037, not
  explained yet; possibly a different definition of "visible" for the wide Earth disk). `docs/validation/avgvisib.md`.
  Without the maps (or with `use_terrain=false`) the horizon is a smooth sphere seen from `obs_height_m`
  (dip = acos(R / (R + h)): 0.087° at 2 m), and polar results are optimistic.
- **Slope is a regional indicator.** It is measured over 80, 240 or 237 m; no lunar map resolves boulders or the
  metre-scale slopes a footpad sees. Slopes from the coarser maps come out smoother than from the 80 m map.
- The visible disk fraction assumes the skyline is flat across the disk width (0.5° for the Sun, 1.9° for the Earth).
- Limb darkening is ignored: a half-hidden solar disk counts as half the light.
- Durations have the resolution of the internal time step (`calc_step_s`, default 60 s).
- Uncertainties of the metrics are not estimated yet (`null`); only `elevation_m` has one. Planned: neighbouring points +
  LOLA height-error map (T22).
- Sun/Earth directions agree with JPL Horizons to 0.00003° (tolerance 0.01°): `docs/validation/horizons.md`.
- Not yet included: ground-station (DSN) availability, thermal environment, permanently shadowed regions.
