# Known landing sites (`data/processed/sites.json`)

Owner: AERO. Static file for the 2D and 3D maps, also served live by `/api/sites`. Built by
`python -m analysis.build --sites` from the catalogue in `analysis/sites.py`; validated by `contracts/validate.py`.
The full precomputed set for these sites (skylines, ephemerides, metrics, matrix) is in `data/processed/`: 160 files, 29.1 MB: sites.json, manifest.json, matrix.json (31 sites x 181 daily landings 2026-11-01..2027-04-30), 31 horizon/, 62 ephemeris/ (~439 kB each), 62 metrics/, 2 scene/.

**Rule: every coordinate has a cited source in the file** (`coord_source`, `coord_source_url`). Nothing is filled in from
memory. Coordinates are planetocentric latitude and east longitude (−180..180), Mean Earth / Polar Axis frame.

## What is in it (31 sites, sources read on 2026-11-14)

| Category (`category`) | Sites | Coordinate source |
|---|---|---|
| `apollo` | Apollo 11, 12, 14, 15, 16, 17 (Lunar Module positions) | [NSSDCA Apollo landing site coordinates](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html): measured on LRO images, Wagner et al. 2017 (Icarus 283) |
| `other` (NASA robotic) | Surveyor 1, 3, 5, 6, 7 | [NSSDCA lunar impact and landing sites](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html) (DE421 ME frame, updated 2025-08-13) |
| `international` | Luna 9, 13, 16, 17, 20, 21, 23, 24 (USSR); Chang'e 3, 4, 5, 6 (China); Chandrayaan-3 (India); SLIM (Japan) | NSSDCA table; Chang'e 4/5/6, Chandrayaan-3 and SLIM from [LROC](https://lroc.im-ldi.com) image measurements, identical to the NSSDCA values |
| `clps` | IM-1 Odysseus, IM-2 Athena, Blue Ghost Mission 1 (landed); IM-3 (planned, Reiner Gamma) | LROC images 1360, 1408, 1407 (identical to NSSDCA); IM-3: target named in the NASA CLPS AGU 2025 poster, marker at the IAU centre of Reiner Gamma ([USGS Gazetteer 4987](https://planetarynames.wr.usgs.gov/Feature/4987)) |
| `commercial` | HAKUTO-R Mission 1 and Mission 2 (ispace, both crashed) | LROC images 1302 and 1456 (impact points) |

Extra fields per site: `status` (landed / crashed / planned), `coord_kind` (landed / impact / region-centre), `agency`,
`country`, `mission_date`, `coord_accuracy_m` where the source states it, `is_region` (true for IM-3), and from the LOLA
maps `elevation_m`, `slope_deg`, `slope_baseline_m`.

Notes:
- Luna 9: NSSDCA marks its position as "from a Pravda report, not confirmed".
- Failed landings are shown where the hardware is (`coord_kind: impact`), with the planned site in `coord_source`.
- IM-3 is a region (the Reiner Gamma swirl is 73 km wide): the marker is the centre of the swirl, not a landing point.

## Independent check

For the sites whose source also states an elevation, our LOLA height at the cited coordinates agrees with it:
Chang'e 4 −5927 / −5930 m, Chang'e 6 −5256 / −5253 m, Chandrayaan-3 532 / 530 m, SLIM −912 / −917 m, IM-1 2579 / 2592 m,
Blue Ghost 1 −3650 / −3650 m, HAKUTO-R M2 −2432 / −2431 m, Chang'e 5 −2570 / −2542 m (coarser 237 m map there).
This confirms the coordinates, the longitude convention and the map reading together (`analysis/tests/test_sites.py`).

## Not included, and why

| Mission / region | Why it is not on the map |
|---|---|
| Artemis III candidate regions (Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, Slater Plain) | NASA's release of 2024-10-28 names the regions but gives **no coordinates**. Using the IAU centre of the namesake crater would be wrong (for example Haworth's floor is in permanent shadow). Needs the official region outlines. |
| Griffin Mission 1 (Astrobotic), Blue Ghost Mission 2 (far side), CP-22 (Mons Mouton region), CS-6 (near Haworth) | Only a region name is published in the CLPS poster, no coordinates. |
| Peregrine Mission 1 (Astrobotic) | Never reached the Moon (propulsion failure). |
| Rovers (Lunokhod 1 and 2, Yutu, Yutu-2) | Listed in NSSDCA as separate positions; the map shows the landers. |
