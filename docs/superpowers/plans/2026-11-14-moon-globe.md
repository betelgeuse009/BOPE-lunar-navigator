# Moon Globe View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Orbitable textured Moon with south-pole site markers coloured by a landing-date slider, reading contract-v0.1 fixtures.

**Architecture:** Vite static app in `frontend/`. Loaders fetch `manifest.json`, `sites.json`, `matrix.json` from a base URL and validate them with zod mirrors of the v0.1 schemas. A Zustand store holds the selected date index, metric and site. R3F renders the Moon and markers; plain DOM renders slider, legend and site card.

**Tech Stack:** Vite, React 18, TypeScript, @react-three/fiber, @react-three/drei, three, zustand, zod, vitest. Python + Pillow for one-off texture conversion.

**Spec:** `docs/superpowers/specs/2026-11-14-moon-globe-design.md`

## Global Constraints
- Contract v0.1: `contract_version` must equal `"0.1"`; mismatch is a visible error.
- Offline: no runtime network calls except to same-origin static files. No tokens.
- No physics in FE. Only lat/lon → xyz placement (display geometry).
- Fixture data must show a visible `FIXTURE` badge (driven by `source.notes` containing `FIXTURE`).
- Texture credit: "NASA's Scientific Visualization Studio" (SVS 4720), shown on screen.
- `null` metric values render grey and read "no data", never 0.
- Data base URL: `import.meta.env.VITE_DATA_BASE ?? '/fixtures/'`.

## Review Focus
- Matrix cell `null` → grey marker + "no data" in card (test in Task 3).
- `contract_version` "0.2" or missing → loader throws with readable message (test in Task 3).
- Site in `sites.json` missing from `matrix.site_ids` → marker shown grey, no crash (test in Task 3: `cellValue` returns null).
- Latitude near −90 (e.g. −89.9999) → finite xyz on the south side (test in Task 2).
- Slider at first/last index → no out-of-range read (store clamps; test in Task 4).

---

### Task 1: Scaffold + fixtures

**Files:**
- Create: `frontend/` via `npm create vite@latest frontend -- --template react-ts`, trimmed of demo content
- Create: `frontend/scripts/make-fixtures.mjs` → writes `frontend/public/fixtures/{manifest,sites,matrix}.json`
- Modify: `frontend/package.json` scripts: `test` = `vitest run`, `fixtures` = `node scripts/make-fixtures.mjs`

Fixture content: 5 sites `fixture-a`..`fixture-e`, lat in [−89.5, −84], lon spread around, `coord_source: "FIXTURE, not real"`, category `other`. Matrix: 31 daily landing dates from `2027-01-01T00:00:00Z`, `mission_duration_h` 336, `sun_threshold_frac` 0.5, cells `sunlit_frac`, `earth_visible_frac`, `both_frac` (≤ min of the two), `longest_dark_h`, `longest_no_earth_h`, smooth deterministic values (sin of date + site offset, no Math.random), one `null` per field. `source.notes` contains `FIXTURE`.

- [ ] Step 1: scaffold, install deps, `npm run build` passes.
- [ ] Step 2: write generator, run it; verify `python contracts/validate.py frontend/public/fixtures` → all OK.
- [ ] Step 3: commit `feat(fe): scaffold vite app and v0.1 fixtures`.

### Task 2: Geometry helper

**Files:** Create `frontend/src/scene/geo.ts`, test `frontend/src/scene/geo.test.ts`

**Produces:** `latLonToVec3(latDeg: number, lonDeg: number, r: number): [number, number, number]` — three.js Y-up: y = r·sin(lat), x = r·cos(lat)·cos(lon), z = −r·cos(lat)·sin(lon).

- [ ] Tests: (0,0,1) → [1,0,0]; (−90,any,1) → y = −1; (−89.9999, 37, 1737.4) all finite, y < 0; (0,90,1) → z ≈ −1.
- [ ] Implement, tests pass, commit `feat(fe): lat/lon to scene coordinates`.

### Task 3: Loaders

**Files:** Create `frontend/src/data/schemas.ts`, `frontend/src/data/load.ts`, test `frontend/src/data/load.test.ts`

**Produces:**
- zod schemas `Manifest`, `Sites`, `Matrix` (+ inferred types) mirroring the JSON Schemas' required fields.
- `parseFile<T>(schema, json: unknown, name: string): T` — throws `Error("<name>: contract_version X, expected 0.1")` or zod issues joined.
- `loadAll(base: string): Promise<{manifest, sites, matrix}>`.
- `cellValue(matrix, siteId: string, field: string, dateIdx: number): number | null`.
- `isFixture(header): boolean` — `source.notes` includes `FIXTURE`.

- [ ] Tests: generated fixtures parse; version "0.2" throws containing "expected 0.1"; `cellValue` on a null cell → null; unknown site → null.
- [ ] Implement, tests pass, commit `feat(fe): contract v0.1 loaders`.

### Task 4: Store

**Files:** Create `frontend/src/state/store.ts`, test `frontend/src/state/store.test.ts`

**Produces:** `useApp` (zustand) with `dateIdx`, `dateCount`, `metric` (default `'both_frac'`), `hoveredSite: string|null`, `selectedSite: string|null`, and setters `setDateIdx(i)` (clamped to [0, dateCount−1]), `setDateCount(n)`, `setMetric(m)`, `setHovered(id)`, `setSelected(id)`.

- [ ] Tests: clamp below 0 and above count−1.
- [ ] Implement, pass, commit `feat(fe): app store`.

### Task 5: Textures

**Files:** Create `frontend/scripts/textures.py` (args: input dir, output dir), outputs `frontend/public/textures/moon_color.jpg` (4096×2048), `moon_height.png` (2048×1024, 16-bit → 8-bit normalised).
Inputs downloaded by hand/curl from svs.gsfc.nasa.gov/4720 into a git-ignored `frontend/.textures-src/`: `lroc_color_poles_4k.tif`, `ldem_16_uint.tif`.

- [ ] Download, convert, check files open and total < 10 MB; commit outputs + script + `.gitignore` line, `chore(fe): moon textures from SVS CGI Moon Kit`.

### Task 6: Globe scene + UI

**Files:** Create `frontend/src/scene/Moon.tsx` (sphere r=1, colour map + displacement/bump from height map, directional low sun + faint ambient), `frontend/src/scene/SiteMarkers.tsx` (one small sphere per site at `latLonToVec3(lat, lon, 1.002)`, colour from metric scale, pointer events → store), `frontend/src/ui/{DateSlider,MetricPicker,Legend,SiteCard,Badges}.tsx`, `frontend/src/ui/colors.ts` (`metricColor(v: number|null): string`, null → grey), `frontend/src/App.tsx`, `frontend/src/styles.css` (tokens, black bg).
OrbitControls: camera starts below the south pole looking up at it (position ≈ [0, −2.2, 1.2]), min distance 1.2, max 6, no pan.

- [ ] Test `metricColor(null)` is the grey token, `metricColor(0)` ≠ `metricColor(1)`.
- [ ] Build passes; dev server serves page; commit `feat(fe): moon globe with site markers and landing-date slider`.
- [ ] Manual check by user in browser: markers at pole, slider recolours, hover card, FIXTURE + credit visible.
