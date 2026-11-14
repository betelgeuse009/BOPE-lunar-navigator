# analysis/: physics and data pipeline (AERO)

Computes where the Sun and the Earth are in the sky of any point on the Moon, and turns that into the site
parameters the navigator shows. Two ways out, same JSON (see `contracts/`):

- **API** (live, any point, any settings): `analysis/api.py` → reference in `contracts/API.md`
- **Static files** (offline fallback): `analysis/build.py` → `data/processed/` (31 known sites) and `data/samples/` (3 example points)

## Setup (once, from the repo root)

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r analysis/requirements.txt
.venv/Scripts/python.exe -m analysis.download_kernels
.venv/Scripts/python.exe -m analysis.download_maps        # LOLA maps, ~3 GB (+3.3 GB with --all); only for terrain
```

## Commands (from the repo root)

| What | Command |
|---|---|
| Start the API | `.venv/Scripts/python.exe -m uvicorn analysis.api:app --port 8000` then open http://localhost:8000/docs |
| Rebuild the static files | `.venv/Scripts/python.exe -m analysis.build` (31 sites → `data/processed/`, several minutes); `--sites` only `sites.json`; `--samples` the 3 example points |
| Check files against the contract | `.venv/Scripts/python.exe contracts/validate.py data/samples` |
| Run the tests | `.venv/Scripts/python.exe -m pytest analysis` |
| Check the terrain against the LOLA visibility maps | `.venv/Scripts/python.exe -m analysis.validate_avgvisib` (about 2.5 min, needs the maps) |
| Cross-check against JPL Horizons | `.venv/Scripts/python.exe -m analysis.validate_horizons` (add `--refresh` to query Horizons again) |

## Modules

| File | Job |
|---|---|
| `config.py` | Every constant and default in one place, each with its source |
| `ephemeris.py` | SPICE: Sun/Earth vectors in MOON_ME, then az/el/distance for many sites with numpy |
| `terrain.py` | LOLA maps: elevation, slope (official map or computed from the DEM), skyline by ray marching |
| `horizon.py` | Horizon elevation per azimuth: LOLA terrain when the maps are on disk, smooth sphere otherwise |
| `visibility.py` | Visible disk fraction, runs and time windows |
| `metrics.py` | Time series per site and the summary parameters (`docs/PARAMETERS.md`) |
| `scoring.py` | Feasibility against user limits and the weighted score |
| `uncertainty.py` | ± of every parameter: landing-position ring and skyline accuracy |
| `sites.py` | Catalogue of 31 known landing sites with cited coordinates (`data/SITES.md`) + the 3 example points |
| `products.py` | Builds the contract JSON documents; shared by the API and the static build |
| `api.py` | FastAPI server |
| `build.py` | Writes the static files |
| `download_kernels.py` | Fetches the SPICE kernels into `data/raw/kernel/` |
| `download_maps.py` | Checks / fetches the LOLA maps into `data/raw/maps/` (list: `data/MAPS.md`) |
| `validate_horizons.py` | Compares our API with JPL Horizons; caches the replies, writes the report |
| `validate_avgvisib.py` | Compares our terrain skyline with NASA's LOLA long-term visibility maps; writes the report |
| `tests/` | Physics checks, cross-check against SPICE `azlcpo` and JPL Horizons, terrain (synthetic + real maps), API responses vs the contract schemas |
| `PLAN.md` | Physics plan, data sources, milestones |

## How the numbers are produced

1. UTC → SPICE time; Moon→Sun and Moon→Earth vectors in the Moon-fixed frame `MOON_ME` (LT+S), once per time grid, cached.
2. Per site: topocentric vector = body − site, projected on local East-North-Up → azimuth, elevation, distance.
3. Apparent radius, visible disk fraction against the horizon (LOLA terrain skyline, or smooth sphere), Earth phase.
4. Sunlit / Earth-visible masks → fractions, longest gaps, windows, energy, battery.
5. Feasibility and score from the user's limits and weights.

Step 2 is checked against the SPICE routine `azlcpo` in the tests (agreement better than 0.0001°).
Step 2 is also checked against **JPL Horizons** (5 sites x 2 bodies x 12 instants, max difference 0.00003°):
`python -m analysis.validate_horizons` writes `docs/validation/horizons.md`; `tests/test_horizons.py` repeats it offline
from the cached replies in `data/validation/horizons/`.

The terrain skyline (step 3) is checked against NASA's LOLA long-term visibility maps: Sun r = 0.981, Earth r = 0.987 over
150 random polar points (`docs/validation/avgvisib.md`). The tests that need the maps are skipped when the maps are missing.

Performance: Sun/Earth vectors are cached per calendar month, the skyline per point.

Uncertainties (`uncertainty.py`): landing-position ring + skyline shift, see `docs/PARAMETERS.md` §6.
