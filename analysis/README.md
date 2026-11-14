# analysis/: physics and data pipeline (AERO)

Computes where the Sun and the Earth are in the sky of any point on the Moon, and turns that into the site
parameters the navigator shows. Two ways out, same JSON (see `contracts/`):

- **API** (live, any point, any settings): `analysis/api.py` → reference in `contracts/API.md`
- **Static files** (offline fallback): `analysis/build.py` → `data/samples/` (later `data/processed/`)

## Setup (once, from the repo root)

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r analysis/requirements.txt
.venv/Scripts/python.exe -m analysis.download_kernels
```

## Commands (from the repo root)

| What | Command |
|---|---|
| Start the API | `.venv/Scripts/python.exe -m uvicorn analysis.api:app --port 8000` then open http://localhost:8000/docs |
| Rebuild the static sample files | `.venv/Scripts/python.exe -m analysis.build` |
| Check files against the contract | `.venv/Scripts/python.exe contracts/validate.py data/samples` |
| Run the tests | `.venv/Scripts/python.exe -m pytest analysis` |

## Modules

| File | Job |
|---|---|
| `config.py` | Every constant and default in one place, each with its source |
| `ephemeris.py` | SPICE: Sun/Earth vectors in MOON_ME, then az/el/distance for many sites with numpy |
| `horizon.py` | Horizon elevation per azimuth. Now: smooth sphere. Next: LOLA terrain (T07) |
| `visibility.py` | Visible disk fraction, runs and time windows |
| `metrics.py` | Time series per site and the summary parameters (`docs/PARAMETERS.md`) |
| `scoring.py` | Feasibility against user limits and the weighted score |
| `sites.py` | Site catalogue (example points until T05) |
| `products.py` | Builds the contract JSON documents; shared by the API and the static build |
| `api.py` | FastAPI server |
| `build.py` | Writes the static files |
| `download_kernels.py` | Fetches the SPICE kernels into `data/raw/kernel/` |
| `tests/` | Physics checks, cross-check against SPICE `azlcpo`, API responses vs the contract schemas |
| `PLAN.md` | Physics plan, data sources, milestones |

## How the numbers are produced

1. UTC → SPICE time; Moon→Sun and Moon→Earth vectors in the Moon-fixed frame `MOON_ME` (LT+S), once per time grid, cached.
2. Per site: topocentric vector = body − site, projected on local East-North-Up → azimuth, elevation, distance.
3. Apparent radius, visible disk fraction against the horizon, Earth phase.
4. Sunlit / Earth-visible masks → fractions, longest gaps, windows, energy, battery.
5. Feasibility and score from the user's limits and weights.

Step 2 is checked against the SPICE routine `azlcpo` in the tests (agreement better than 0.0001°).
Still to do: cross-check against JPL Horizons, real terrain horizon, uncertainties.
