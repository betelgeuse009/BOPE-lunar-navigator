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
| weights `w_*` | 1 each; 0 for `w_rock`, `w_temp`, `w_h` | Importance of each scored parameter |
| limits `min_*`, `max_*` | none | Hard requirements; a site that violates one is "not feasible" |

## 2. Parameters

`lit` = Sun visible fraction ≥ `sun_threshold_frac`. `comm` = Earth visible fraction ≥ 0.5 and Earth elevation ≥ `earth_min_elev_deg`.
Visible fraction = part of the disk above the horizon (circular-segment formula, `analysis/visibility.py`).

| Parameter | Unit | How it is computed | Why it matters |
|---|---|---|---|
| `sunlit_frac` | 0..1 | share of the window with `lit` | power availability |
| `longest_dark_h` | h | longest continuous period without `lit` | battery sizing, thermal survival |
| `hours_to_first_dark_h` | h | time left before sunset: from landing to the first dark step (0 = dark at landing, `null` = never dark) | operations planning, power window |
| `hours_to_first_sun_h` | h | time to sunrise: from landing to the first sunlit step (0 = Sun already up, `null` = no sunrise in the window) | landing in darkness: how long on batteries |
| `mean_sun_el_when_lit_deg`, `sun_el_min_deg`, `sun_el_max_deg` | deg | Sun elevation statistics | array pointing (vertical arrays at the poles), shadows |
| `sun_energy_tracking_kwh_m2` | kWh/m² | ∫ S₀ · (1 AU / d)² · Sun visible fraction · dt | energy reaching 1 m² that always faces the Sun |
| `mean_irradiance_w_m2` | W/m² | the same, divided by the window length | average power density |
| `earth_visible_frac` | 0..1 | share of the window with `comm` | direct-to-Earth link availability |
| `longest_no_earth_h` | h | longest continuous period without `comm` | longest communication blackout |
| `hours_to_first_earth_loss_h` | h | time left before Earthset: from landing to the first step without `comm` (0 = no Earth at landing, `null` = never lost) | communication window |
| `hours_to_first_earth_h` | h | time to Earthrise: from landing to the first step with `comm` (0 = Earth already up, `null` = never visible) | first contact after landing |
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
| `max_rock_abundance_frac` | `rock_abundance_frac` ≤ limit (not checked beyond 80°, where the map has no value) |
| `max_surface_temp_k` | `surface_temp_max_k` ≤ limit |
| `max_h_parameter_m` | `h_parameter_m` ≤ limit (not checked beyond 70°, where the map has no value; no published landing threshold) |

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
| `rock_abundance_frac` (`w_rock`) | (x₀ − x)/(x₀ − x₁) clipped to 0..1, x₁ = 0.0013, x₀ = 0.0101. Left out beyond 80° |
| `surface_temp_max_k` (`w_temp`) | same rule, x₁ = 260 K, x₀ = 395 K |
| `h_parameter_m` (`w_h`) | same rule, x₁ = 0.0499 m, x₀ = 0.0886 m. Left out beyond 70° |

**score = Σ wᵢ · sᵢ / Σ wᵢ** over the available parameters with weight > 0. Default weights: 1 each, except the three
regolith factors (0: the default score is unchanged by them). Regolith ends x₁ (sub-score 1) and x₀ (sub-score 0) are the
whole-Moon, area-weighted 2nd and 98th percentiles of each Diviner map (`config.REGOLITH_SCORE_RANGES`), lower is better
for all three. This is our choice (no published landing threshold exists, §10): fewer rocks = fewer hazards, cooler peak =
smaller thermal load, smaller H = denser near-surface regolith (Hayne et al. 2017), taken as firmer footing.
A weight of 0 removes a parameter (for example `w_earth=0&w_no_earth=0` for a mission with a relay satellite).
The 20° slope scale is a display default chosen by AERO, adjustable in `analysis/config.py`; it is not a published limit.

For the globe colouring: use `score` (0..1) from `/api/matrix` (site × date), `/api/evaluate` (one site) or `/api/area`
(disc around a site). To show what drives the score, use `score.components`.

## 5. Limits of the current numbers

- **Terrain is included** when the LOLA maps are on disk: the skyline is ray-marched over the DEMs out to 200 km
  (`analysis/terrain.py`), target accuracy 0.1°. Checked against NASA's long-term LOLA visibility maps at 150 random
  points south of 85.5°S with NASA's definition (any part of the disk visible): Sun r = 0.982 (mean difference +0.010),
  Earth r = 0.996 (+0.005). Our `sunlit_frac` / `earth_visible_frac` use a stricter rule (at least half the disk), so they
  are lower than NASA's long-term maps by construction. `docs/validation/avgvisib.md`.
  Without the maps (or with `use_terrain=false`) the horizon is a smooth sphere seen from `obs_height_m`
  (dip = acos(R / (R + h)): 0.087° at 2 m), and polar results are optimistic.
- **Slope is a regional indicator.** It is measured over 80, 240 or 237 m; no lunar map resolves boulders or the
  metre-scale slopes a footpad sees. Slopes from the coarser maps come out smoother than from the 80 m map.
- The visible disk fraction assumes the skyline is flat across the disk width (0.5° for the Sun, 1.9° for the Earth).
- Limb darkening is ignored: a half-hidden solar disk counts as half the light.
- Durations have the resolution of the internal time step (`calc_step_s`, default 60 s).
- Uncertainties: see section 6.
- Sun/Earth directions agree with JPL Horizons to 0.00003° (tolerance 0.01°): `docs/validation/horizons.md`.
- Not yet included: ground-station (DSN) availability, thermal environment, permanently shadowed regions.

## 6. Uncertainty (`analysis/uncertainty.py`)

Every parameter from `/api/evaluate` (and every metric in the `metrics` documents) has an `uncertainty`: a ± bound in its
own unit, from two user inputs:

| Input | Default | What it represents | How it is propagated |
|---|---|---|---|
| `position_uncertainty_m` | 100 m | Landing accuracy: the lander does not touch down on the exact point | parameters re-evaluated at 8 points on a ring of this radius; position term = largest change |
| `horizon_uncertainty_deg` | 0.1° | Accuracy of the terrain skyline (our target accuracy) | skyline shifted by ± this; horizon term = largest change |

uncertainty = sqrt(position² + horizon²); `elevation_m` adds the LOLA height error in quadrature. `range` gives the lowest
and highest value found, which stays within the physical limits (a ± can suggest impossible values such as a negative
night length). Both defaults are AERO's choices, not requirements: set `position_uncertainty_m` to the lander's landing
accuracy. A limit that holds at the point but breaks within the uncertainty is reported in `requirements_at_risk`.

What it does not include: errors in the Sun/Earth directions (below 0.0001°, checked against JPL Horizons), DEM artefacts
beyond the height-error map, and the flat-skyline approximation across the disk width.

## 7. Right ascension and declination (API)

`sun_ra_deg`, `sun_dec_deg`, `earth_ra_deg`, `earth_dec_deg` in `/api/ephemeris` and `/api/scene`: direction of the body seen
from the centre of the Moon, J2000 (ICRF) axes, LT+S. RA = atan2(y, x) mod 360°, Dec = asin(z / |r|). Selenocentric, so the
same for every site. Validation and the size of the aberration term: `contracts/API.md`.

## 8. Map layers (display; `frontend/scripts/layers.py`, wording in `frontend/src/scene/layers.ts`)

Wording: **altitude** = height of the surface above the 1737.4 km sphere; **elevation** = angle of the Sun or the Earth above
the local horizontal. API field names are unchanged (`elevation_m` is the altitude, `*_el_deg` are elevation angles).

| Layer | Whole Moon | South of 80° S (finer) | Computed or read |
|---|---|---|---|
| Altitude | LOLA LDEM_128, 237 m | LDEM_80S_80MPP_ADJ, 80 m | read |
| Slope | central differences on LDEM_128 over one 237 m pixel, slope = atan(√((∂z/∂x)² + (∂z/∂y)²)), east-west spacing × cos(lat), averaged to the 3.8 km image pixel | official LOLA 80 m slope map | computed / read |
| Sun, Earth visibility (long term) | `analysis/global_visibility.py`: share of time with any part of the disc above a smooth-sphere horizon (observer 2 m), 2° grid, 2020–2038 every 6 h | NASA AVGVISIB (terrain, south of 85° S) | computed / read |
| Permanently shadowed regions | NASA LPSR_65N_240M and LPSR_65S_240M (240 m, poleward of 65°) | LPSR_80S_20MPP_ADJ outlines > 1 km² | read |
| Surface temperature, maximum | Diviner GCP (Williams et al. 2017): highest bolometric brightness temperature over the local times of each 0.5° bin | Diviner PRP: yearly maximum (thermal model) | read (max over local time) |
| Surface temperature, average | Diviner GCP: mean over the day; unobserved local times filled by linear interpolation for gaps ≤ 4 h, longer gaps left blank | Diviner PRP: yearly average 2 cm deep | read (mean over local time) |
| Day and night at landing time | smooth sphere, from the sub-solar point: sin h = sin φ sin φs + cos φ cos φs cos(λ − λs) | – | computed in the browser |
| Score for your settings | `/api/grid`, 4° cells, smooth-sphere horizon + LOLA slope | `/api/area` around the pole, 15 km, terrain skyline | computed live |

Colour scales (same palette everywhere): altitude, slope and temperature are coloured **by distribution**: the palette is
spread evenly over the 2nd, 25th, 50th, 75th and 98th area-weighted percentile of the whole-Moon map, so each colour
covers a quarter of the surface. Visibility is linear 0–100 %. Site markers, the calendar strip and the score layer are
stretched between the lowest and highest value of the set shown; the two ends are printed next to the bar.

## 9. Regolith values (`analysis/regolith.py`; scored only with a weight > 0, see §4)

| Parameter | Unit | Source and method | Coverage |
|---|---|---|---|
| `surface_temp_max_k` | K | Diviner GCP (Williams et al. 2017): highest bolometric brightness temperature over local time in the 0.5° bin; south of 80°S Diviner PRP yearly maximum (thermal model), nearest triangle within 2 km | whole Moon |
| `surface_temp_avg_k` | K | Diviner GCP: mean over the day, local-time gaps ≤ 4 h filled by linear interpolation; south of 80°S PRP yearly average 2 cm deep | whole Moon (blank where gaps > 4 h) |
| `rock_abundance_frac` | 0..1 | Bandfield et al. 2011: areal fraction of rocks > ~1 m from night-time temperatures; 128 px/deg map averaged to 32 px/deg (0.95 km) | 80°S–80°N |
| `h_parameter_m` | m | Hayne et al. 2017: ρ(z) = ρd − (ρd − ρs)·exp(−z/H), fitted to Diviner channel 7; averaged to 32 px/deg. Smaller H = denser near-surface regolith = higher thermal inertia | 70°S–70°N |

Checks: equator maximum ~396 K (Williams et al. report ~390 K); global median H 7.05 cm (Hayne et al.: ~7 cm); Tycho floor
rock abundance 13.8 % vs Apollo 11 mare 0.6 % (`analysis/tests/test_regolith.py`).

## 10. Landing criteria with a published source (used in the documentation pages)

| Criterion | Value | Source |
|---|---|---|
| General slope of the landing area | < 2° | Apollo Site Selection Board 1968, in J. Uri, "50 Years Ago: Lunar Landing Sites Selected", NASA JSC, 2018 |
| Sun angle during the approach | 7°–20° behind the LM | same |
| Approach path | no large hills, tall cliffs or deep craters | same |
| Smoothness | relatively few craters | same |
| Location | within 6° of the south pole | NASA, "Key Artemis III Landing Requirements", NTRS 20250009323 (2025) |
| Landing slope | < 10° over 100 m | same |
| EVA slope | < 20° over 2 km | same |
| Communication | direct with Earth, no relay; areas with Earth visibility < 25 % excluded | same |
| Surface lighting | lit for the whole stay; areas with solar visibility < 5 % excluded | same |
| Approach lighting | beneficial | same |
| Landing accuracy | within 100 m of the target | same |
| Touchdown | slope < 10°, no hazards > 30 cm | Getchius et al. 2022, "Hazard Detection And Avoidance For The Nova-C Lander", arXiv:2204.00660 |

No published numeric landing limit was found for rock abundance, surface temperature or the H-parameter; they stay
context values. The front end shows these criteria on each layer page and on the page "Landing criteria".
