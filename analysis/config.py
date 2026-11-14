"""All tunable parameters and constants in one place. Every constant states its source."""
from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
KERNEL_DIR = REPO / "data" / "raw" / "kernel"

# SPICE kernels: file name -> path under the NAIF generic kernels server (URLs checked 2026-11-14).
NAIF_BASE_URL = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels"
KERNELS = {
    "naif0012.tls": "lsk/naif0012.tls",                            # leap seconds (UTC <-> ET)
    "pck00011.tpc": "pck/pck00011.tpc",                            # body radii
    "de440s.bsp": "spk/planets/de440s.bsp",                        # Sun, Earth, Moon positions (1849-2150)
    "moon_pa_de440_200625.bpc": "pck/moon_pa_de440_200625.bpc",    # lunar orientation (libration)
    "moon_de440_250416.tf": "fk/satellites/moon_de440_250416.tf",  # MOON_ME frame definition
}

FRAME = "MOON_ME"         # Mean Earth / Polar Axis, same frame as the LOLA maps
ABCORR = "LT+S"           # light time + stellar aberration
LAT_CLAMP_DEG = 89.9999   # azimuth is undefined at the exact pole

# Total solar irradiance at 1 AU: 1360.8 +/- 0.5 W/m^2 (Kopp & Lean 2011, Geophys. Res. Lett. 38, L01706).
SOLAR_CONSTANT_W_M2 = 1360.8

# Defaults for user-adjustable inputs (agreed in docs/LOG.md 2026-11-14).
STEP_S = 600                # time step of exported series
CALC_STEP_S = 60            # internal step for metrics and windows (resolution of durations: 1 min)
AREA_CALC_STEP_S = 600      # internal step for area searches (many points, so coarser by default)
OBS_HEIGHT_M = 2.0          # observer / solar array / antenna height above the surface
SUN_THRESHOLD_FRAC = 0.5    # a step is "sunlit" if at least this fraction of the solar disk is visible
EARTH_THRESHOLD_FRAC = 0.5  # same for the Earth disk
EARTH_MIN_ELEV_DEG = 0.0    # antenna mask: Earth must also be at least this high
MISSION_H = 14 * 24         # default mission duration for matrix cells and site evaluation

# Request-size guards for the API.
MAX_STEPS = 200_000          # time steps in one request (about 4.5 months at 1 min)
MAX_SITE_STEPS = 6_000_000   # sites x time steps in one area/matrix request
MAX_AREA_POINTS = 2_000

# Default weights of the site score (see docs/PARAMETERS.md). The user can override every one of them.
SCORE_WEIGHTS = {
    "sunlit_frac": 1.0,
    "longest_dark_h": 1.0,
    "earth_visible_frac": 1.0,
    "longest_no_earth_h": 1.0,
    "slope_deg": 1.0,   # only counts once terrain data exists; until then it is left out of the score
}
SLOPE_SCORE_ZERO_DEG = 20.0  # slope where the slope sub-score reaches 0 (a user-adjustable default, not a literature limit)
