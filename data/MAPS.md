# Lunar maps (LOLA / LROC) used by the analysis

Owner: AERO. The files live in `data/raw/maps/` (git-ignored, about 6.6 GB). This page is the shared reference;
it replaces the old `README.txt` that described a `backend/` layout.

- Check what you have: `.venv/Scripts/python.exe -m analysis.download_maps --check`
- Download what is missing: `.venv/Scripts/python.exe -m analysis.download_maps` (add `--all` for the 3.3 GB 5 m map)
- Paths, URLs and sizes in code: `analysis/config.py` (`MAPS`). Do not rename files: the code uses these names.

## Files (checked 2026-11-14: every file opens, georeferencing read from the file itself)

| Path under `data/raw/maps/` | Content | Pixel | Coverage | Values | Source |
|---|---|---|---|---|---|
| `dem/south_pole/LDEM_80S_80MPP_ADJ.tiff` | Height | 80 m | 80°S–pole | float32, m | LOLA, Barker et al., [PGDA 90](https://pgda.gsfc.nasa.gov/products/90) |
| `dem/south_pole/LDEM_60S_240MPP_ADJ.tiff` | Height | 240 m | 60°S–pole | float32, m | LOLA, Barker et al., PGDA 90 |
| `dem/south_pole/ldem_87s_5mpp.tif` | Height (3.3 GB, read windows only) | 5 m | **86.7°S**–pole | float32, m | LOLA 5 m, [PGDA 81](https://pgda.gsfc.nasa.gov/products/81) |
| `dem/global/LDEM_128.IMG` + `.LBL` | Height, whole Moon (keep the `.LBL` next to the `.IMG`) | 237 m | global | int16 × 0.5 + 1 737 400 = **radius** in m; subtract 1 737 400 for height | LOLA GDR `LRO-L-LOLA-4-GDR-V1.0` |
| `slope/LDSM_80S_80MPP_ADJ.tiff` | Slope | 80 m | 80°S–pole | float32, deg | LOLA, Barker et al., PGDA 90 |
| `uncertainty/LDEM_80S_80MPP_ADJ_ERR.tiff` | Height error | 80 m | 80°S–pole | float32, m (0.03–1.1 m) | LOLA, Barker et al., PGDA 90 |
| `illumination/AVGVISIB_85S_060M_201608.tiff` | Mean Sun visibility (long-term average) | 60 m | 85°S–pole | int16 × 4e-5 = fraction 0..1 | LOLA, Mazarico et al. 2011, [PGDA 69](https://pgda.gsfc.nasa.gov/products/69) |
| `illumination/AVGVISIB_85S_060M_201608_EARTH.tiff` | Mean Earth visibility | 60 m | 85°S–pole | int16 × 4e-5 = fraction 0..1 | same |
| `psr/LPSR_80S_20MPP_ADJ_1km2.csv` | Permanently shadowed regions > 1 km² (1531 polygons) | – | 80°S–pole | columns `gid, WKT, area_km2, name`; WKT x/y in m, polar stereographic | LOLA, Barker et al., PGDA 90 |
| `imagery/WAC_ROI_SOUTH_SUMMER_064P.PYR.TIF` | Photo mosaic (background for FE) | 474 m (64 px/deg) | 45°S–pole | uint8 | [LROC WAC](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_ROI_SOUTH_SUMMER) (download by hand) |

Server file names end in `.TIF`; the local copies are saved as `.tiff`. The download script does the same.

## Coordinates

- All maps: reference sphere **R = 1 737 400 m**, Mean Earth / Polar Axis frame (DE421), heights above the sphere.
  DE421 ME and our DE440 `MOON_ME` differ by about 0.5 m.
- Polar maps: polar stereographic, `+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400`, x/y in m. True scale at the pole;
  scale factor k = 2 / (1 + sin|lat|) elsewhere (1.008 at 80°S, 1.07 at 60°S). Use the file's CRS (rasterio) to convert.
- Global map: simple cylindrical, `lon_0 = 180`, columns run 0°E → 360°E. **Seam:** longitude exactly 0° falls one
  pixel outside the grid; the code must wrap longitudes into [0, 360) and the column index modulo the width.

## Consistency checks (2026-11-14)

- Heights agree between products where they overlap: 5 m vs 80 m median −0.1 m (typical |diff| 2.6 m, n = 145);
  240 m vs 80 m median −0.2 m (typical |diff| 5.8 m, n = 169). No offset or unit mismatch.
- Slope computed by us from the 80 m DEM (central differences, stereographic scale corrected) reproduces the official
  80 m slope map: median |diff| 0.10–0.17°, correlation 0.996–0.999 in four 16 km windows (pole, 88°S, 85°S, 82°S).
- Sample point 88°S 60°E: crater floor 3.45 km deep, AVGVISIB Sun = 0.000 (permanent shadow), as expected.

## Which map is used where (`analysis/terrain.py`)

| Need | South of 86.7°S | 80–86.7°S | 60–80°S | Rest of the Moon |
|---|---|---|---|---|
| Horizon, near terrain (≤ 10 km) | 5 m | 80 m | 240 m | 237 m global |
| Horizon, far terrain (to ~200 km) | 80 m | 80 m | 240 m | 237 m global |
| Elevation at the site | 5 m | 80 m | 240 m | 237 m global |
| Slope at the site | official 80 m map | official 80 m map | computed from 240 m | computed from 237 m |
| Needed to run the terrain | optional (`--all`) | required | required | required |
| Height uncertainty | ERR map | ERR map | none | none |
| Validation | AVGVISIB (≥ 85°S) | AVGVISIB (≥ 85°S) | – | – |

**Slope depends on the pixel size it is measured over.** Every slope value is reported with its baseline (80, 240 or
237 m). None of these maps resolves boulders or the metre-scale slopes a lander footpad sees, so slope here is a regional
indicator, not a landing-safety certificate.

## Not downloaded (available on the LOLA archive if needed)

Checked on `https://imbrium.mit.edu/DATA/LOLA_GDR/` on 2026-11-14:
- North pole, same idea as the south-pole set: `POLAR/IMG/LDEM_80N_80M.IMG` (110 MB), `LDEM_60N_240M.IMG` (115 MB),
  `LDEM_875N_5M.IMG` (1.7 GB), slope `LDSM_85N_40M.IMG` (110 MB). Needed only if north polar sites matter.
- Global 512 px/deg (~59 m): `CYLINDRICAL/IMG/LDEM_512_*` in 16 tiles of 2 GB (32 GB). Not worth it: away from the poles
  the Sun is high, so 237 m is enough for the horizon.
- Global slope `CYLINDRICAL/IMG/LDSM_16.IMG`: ~1.9 km pixels, too coarse for landing; we compute slope from the DEMs instead.
