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

# LOLA / LROC maps: key -> (path under data/raw/maps/, download URL or None, size in bytes).
# URLs and sizes checked 2026-11-14 (HTTP 200, sizes equal to the files AERO downloaded). Details: data/MAPS.md.
MAPS_DIR = REPO / "data" / "raw" / "maps"
_PGDA = "https://pgda.gsfc.nasa.gov/data"
_GDR = "https://imbrium.mit.edu/DATA/LOLA_GDR"
MAPS = {
    "dem_80s_80m":   ("dem/south_pole/LDEM_80S_80MPP_ADJ.tiff", f"{_PGDA}/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF", 189_158_392),
    "dem_60s_240m":  ("dem/south_pole/LDEM_60S_240MPP_ADJ.tiff", f"{_PGDA}/LOLA_20mpp/LDEM_60S_240MPP_ADJ.TIF", 218_961_039),
    "dem_87s_5m":    ("dem/south_pole/ldem_87s_5mpp.tif", f"{_PGDA}/LOLA_5mpp/87S/ldem_87s_5mpp.tif", 3_465_285_714),
    "dem_global":    ("dem/global/LDEM_128.IMG", f"{_GDR}/CYLINDRICAL/IMG/LDEM_128.IMG", 2_123_366_400),
    "dem_global_label": ("dem/global/LDEM_128.LBL", f"{_GDR}/CYLINDRICAL/IMG/LDEM_128.LBL", 5_133),
    "slope_80s_80m": ("slope/LDSM_80S_80MPP_ADJ.tiff", f"{_PGDA}/LOLA_20mpp/LDSM_80S_80MPP_ADJ.TIF", 241_594_035),
    "dem_err_80s_80m": ("uncertainty/LDEM_80S_80MPP_ADJ_ERR.tiff", f"{_PGDA}/LOLA_20mpp/LDEM_80S_80MPP_ADJ_ERR.TIF", 254_808_965),
    "avgvisib_sun":  ("illumination/AVGVISIB_85S_060M_201608.tiff", f"{_PGDA}/MoonIllumination/AVGVISIB_85S_060M_201608.TIF", 33_994_464),
    "avgvisib_earth": ("illumination/AVGVISIB_85S_060M_201608_EARTH.tiff", f"{_PGDA}/MoonIllumination/AVGVISIB_85S_060M_201608_EARTH.TIF", 24_862_958),
    "psr_80s":       ("psr/LPSR_80S_20MPP_ADJ_1km2.csv", f"{_PGDA}/LOLA_20mpp/LPSR_80S_20MPP_ADJ_1km2.CSV", 29_642_968),
    # Display layer only (frontend/scripts/layers.py): Diviner Polar Resource Product, yearly average / maximum temperature.
    "diviner_prp_south": ("temperature/dlre_prp_south.tab",
                          "https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/dlre_prp_south.tab",
                          604_800_210),
    # Background image only (FE). No direct file URL: download by hand from https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_ROI_SOUTH_SUMMER
    "wac_south":     ("imagery/WAC_ROI_SOUTH_SUMMER_064P.PYR.TIF", None, 50_472_972),
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
# Uncertainty model (analysis/uncertainty.py). Both are user inputs; these defaults are AERO's choices, not requirements:
POSITION_UNCERTAINTY_M = 100.0  # landing accuracy: parameters are re-evaluated on a ring of this radius
HORIZON_UNCERTAINTY_DEG = 0.1   # skyline accuracy: the target accuracy of the terrain horizon (PLAN.md 3.5)

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
    "slope_deg": 1.0,   # left out of the score when the terrain maps are missing or use_terrain is off
}
SLOPE_SCORE_ZERO_DEG = 20.0  # slope where the slope sub-score reaches 0 (a user-adjustable default, not a literature limit)
