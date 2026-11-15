# Navigator audit: every value on screen, its source and how it was checked

Made 2026-11-15 (FE session) by going through the Mission setup pane, the Results pane, the map layers and the viewer.
For each item: where the number comes from, the documentation page behind its "?" / (i), and how it was validated.

Status:
- **Validated**: compared with an independent reference, result recorded (file named).
- **Checked**: a sanity check or unit test against a published value, not a full comparison.
- **Read**: shown as read from a published dataset; nothing computed by us (the dataset's own validation applies).
- **Definition**: our own definition (score, verdict...): nothing to validate against; formula documented.
- **Open**: not validated yet. Listed at the end as work to do.

Automatic checks of the documentation (`frontend/src/docs/topics.test.ts`, runs with `npm test`): every one of the 49 pages
has at least one reference, every [n] citation points to an existing reference, every "see also" link exists.
Pages whose only references were our own documents were reviewed: 8 describe our own computations (score weights, verdict,
nearby search, countdowns, plot over time, site colours, score layer, animation) and keep internal references; 3 described
external conventions or data and now cite them (coordinates: LRO/LGCWG 2008; mast height: Gläser et al. 2014; site
record: NSSDCA, LROC).

## Results pane

| Item | Source / method | Page | Status |
|---|---|---|---|
| Sun and Earth azimuth, elevation (at landing, lowest, highest, mean) | JPL DE440 via SPICE, MOON_ME, LT+S (`analysis/ephemeris.py`) | sun-position, earth-position, sun-elevation | **Validated**: vs JPL Horizons, 5 sites x 2 bodies x 12 instants, max 0.00069° as served, tolerance 0.01° (`docs/validation/horizons.md`) |
| Sun and Earth distance | same | sun-position, earth-position | **Validated**: range within 0.18 km of Horizons (same file) |
| Angular radius | IAU radii / distance | sun-position, earth-position | **Validated** through the distance (same file) |
| Right ascension, declination | SPICE, J2000, from the Moon's centre | ra-dec | **Validated**: vs JPL Horizons (LOG 2026-11-15 02:13, DECISIONS.md) |
| Earth illuminated part (phase) | Sun-Earth-Moon geometry (`analysis/ephemeris.py`) | earth-position | **Open**: not compared with Horizons' illuminated fraction yet |
| Visible part of the disc, sunlight, Earth in view, both together | terrain skyline from LOLA DEMs + disc geometry (`analysis/horizon.py`, `visibility.py`) | sunlight, earth-in-view, both-in-view | **Validated** (long-term): 150 points south of 85.5° S vs NASA AVGVISIB maps, r = 0.982 (Sun), 0.996 (Earth), mean abs difference 1.2 % / 0.6 % (`docs/validation/avgvisib.md`). Mission-window values use the same pipeline |
| Longest night, longest blackout, first sunset / sunrise / Earthset / Earthrise | runs of the lit / in-view series, 60 s step | longest-night, longest-blackout, countdowns | **Checked**: unit tests on synthetic series (`analysis/tests/test_physics.py`); inherits the visibility validation above |
| Sunlit periods, periods with Earth in view, their lengths | `/api/metrics` windows; length = end − start | visibility-windows | **Checked**: same series as above |
| Repeats every (new) | autocorrelation of the in-view series over 90 days (`frontend/src/ui/results/periods.ts`) | visibility-windows | **Checked** 2026-11-15 on 4 places: Sun 29.5–29.6 d away from the pole (synodic month 29.53 d, Meeus 1998), 30.2 d at 89.45° S (terrain); Earth 27.2 d near the pole (draconic month 27.21 d), 26.2–28.1 d elsewhere |
| Mean irradiance, energy on a Sun-tracking surface | S0 = 1360.8 W/m² (Kopp & Lean 2011) × (1 AU / d)² × visible disc | solar-energy | **Open**: no external comparison; constant and formula cited |
| NASA long-term visibility | read from AVGVISIB maps (Mazarico et al. 2011) | nasa-visibility | **Read** |
| Slope, altitude, map height error | LOLA maps (LDEM/LDSM, Barker et al. PGDA 90; LDEM_128) | slope, elevation | **Read**; whole-Moon slope computed by central differences, matches the API method (`analysis/terrain.py`) |
| Rock abundance, surface temperature (max, average), H-parameter | Diviner maps (`analysis/regolith.py`) | rock-abundance, surface-temperature, h-parameter | **Checked**: equator maximum ~396 K vs ~390 K (Williams et al. 2017); median H 7.05 cm vs ~7 cm (Hayne et al. 2017); Tycho floor 13.8 % vs Apollo 11 mare 0.6 % rocks (`analysis/tests/test_regolith.py`) |
| Score, sub-scores, weights (now 8 factors) | weighted mean, `analysis/scoring.py` | score, score-weights | **Definition**. Regolith factor ends = whole-Moon 2nd / 98th percentile, our choice (PARAMETERS.md §4) |
| Requirements verdict, at risk, not checked | `analysis/scoring.py`, `uncertainty.py` | verdict, requirements, uncertainty | **Definition**; published limit values cited on the landing-criteria page |
| ± uncertainties | ring of 8 points at 100 m + skyline ± 0.1° (`analysis/uncertainty.py`) | uncertainty | **Definition** of the method; the 0.1° skyline accuracy is our target, not measured (PARAMETERS.md §6) |
| Nearby search: best point, scores in the area | `/api/area`, fast skyline (2° azimuth steps) | nearby-search | **Checked**: fast profile within 0.04° median of the fine one at the pole example (contracts/API.md) |
| Site record | `data/processed/sites.json`, coordinates from NSSDCA / LROC (data/SITES.md) | site-record, known-sites | **Read** (cited per site) |

## Mission setup pane

| Item | Source / method | Page | Status |
|---|---|---|---|
| Place: latitude, longitude (new) | typed, MOON_ME, planetocentric, east-positive | coordinates | **Checked**: unit tests of the parser (`frontend/src/ui/place.test.ts`) |
| Landing date and time, calendar range 1850–2149 | de440s.bsp span | landing-time | **Read** (kernel coverage) |
| Animation, rollover into the next month (new) | `frontend/src/ui/animClock.ts` | animation | **Checked**: unit tests (`animClock.test.ts`) |
| Mission type presets | NASA Artemis III requirements (NTRS 20250009323), NASA 2022 release | mission-type, landing-criteria | **Read** (quoted with source) |
| Surface stay, mast height | user inputs | surface-stay, mast-height | Mast height: **Open**: compare our 2 m vs 10 m sunlight gain with Gläser et al. 2014 (92.27 % → 95.65 % at Connecting Ridge) |
| Score weights, requirements | user inputs | score-weights, requirements | **Definition** |

## Viewer

| Item | Source / method | Page | Status |
|---|---|---|---|
| Globe lighting, Sun / Earth in the sky | sub-solar / sub-Earth points from the API | views | **Validated** through the ephemeris (horizons.md) |
| Map layers: altitude, slope, PSR, Sun/Earth visibility (cap), temperature, rock, H | read from NASA / PDS maps (`frontend/scripts/layers.py`) | layer-* | **Read** |
| Whole-Moon long-term visibility | our smooth-sphere computation (`analysis/global_visibility.py`) | layer-visibility | **Open**: compare with AVGVISIB in the 85–90° S overlap (terrain-free vs terrain, so only away from relief) |
| Colour bar ends (new) | exact min / max drawn, ± from the dataset: altitude ± 1 m (Smith et al. 2017), slope ± 0.2° (propagated), H ± 1 cm (Hayne et al. 2017 §3.3.3) | layer-* | **Checked**: written by the script from the drawn values. Temperature and rock: no ± (no published single value found). Temperature, rock, H images: still on the older p2/p98 scale until `layers.py` runs on AERO's PC (marked ≤ / ≥) |
| Whole-Moon slope near the poles (fixed) | east-west baseline ≥ 237 m | layer-slope | **Checked**: maximum went from 84.1° (pole-row artifact, 89.94° S) to 40.0° (80 m polar map, crater walls); next highest whole-Moon value 35.4° |
| Labels (new) | IAU / USGS Gazetteer of Planetary Nomenclature, 2 023 adopted names | labels | **Checked** visually: names on their craters (Schickard, Wargentin, Phocylides, maria) on the globe; 2D labels constant 13 px, no overlaps |
| Score layer | `/api/grid` smooth sphere + `/api/area` at the pole | layer-score | **Definition** (same score) |

## Open items (work to do)

1. Earth phase vs JPL Horizons illuminated fraction (AERO).
2. Mast height: reproduce the Gläser et al. 2014 2 m / 10 m comparison at Connecting Ridge (needs their exact coordinates from the paper; AERO).
3. Whole-Moon visibility vs AVGVISIB in the overlap band (AERO).
4. Irradiance / energy: compare with a published polar illumination energy study (AERO).
5. Absolute accuracy of the Diviner GCP / PRP temperatures, for the ± at the colour bar ends (AERO; Williams et al. 2017 full text).
6. Re-run `frontend/scripts/layers.py` on the PC with the Diviner maps, so temperature, rock and H get exact colour bar ends.
