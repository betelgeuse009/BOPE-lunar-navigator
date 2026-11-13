# Teammate: betelgeuse009: front end + integration (FE)

## Who I am : my name is Erdeniz Esmeli
- Computer engineering MSc student. Comfortable with git, Linux, Python, C++, ROS 2, OpenCV, CARLA;
  doing the web front end for this project.
- Career goal: robotics. Frame the work so it reads as planning/perception/simulation engineering
  (state, time, frames, uncertainty), not just a website.
- I also maintain the repo: I review and merge my teammate's `aero → main` PR and help him with git trouble.

## How to work with me
- Be direct and technical. Short explanations, no hand-holding on git.
- Propose before building anything large; I decide the architecture.
- Front end only: I don't edit `analysis/`. If I need something from AERO, write it in `docs/LOG.md` / `TASKS.md`.
- Build against fixtures in `frontend/public/fixtures/` that match `contracts/`, so I'm never blocked on AERO.

## Front-end architecture (idea only, no implementation yet)

### Principles
1. **Display, don't compute.** All physics (ephemeris, horizons, power, comms) comes from `data/processed/`.
   The front end only interpolates between precomputed time samples for smooth playback.
2. **One clock.** A single global `time_utc` (plus selected site and period) drives every view:
   3D scene lighting, sky panorama, timelines and metrics. Scrubbing time updates everything at once.
3. **Contract-first.** Typed loaders validate files against `contracts/` (with a version check);
   if data is missing, show a clear "no data" state, never silent fake numbers.
4. **Offline demo.** Static build plus static data; no server required for the MVP. An optional API comes later.

### Candidate stack (to confirm)
- Vite + React + TypeScript
- three.js via @react-three/fiber + drei for 3D; `postprocessing` for tone mapping
- Terrain: NASA-AMMOS `3d-tiles-renderer` with Cesium Moon tiles (needs a Cesium ion token in `.env.local`),
  **or** a local LOLA heightmap mesh per site (simpler, offline). Decide at kickoff.
- State: Zustand (clock, selection, layer toggles)
- 2D charts/timelines: visx or Recharts; SVG/canvas for the horizon panorama
- Validation: zod schemas generated from or mirroring `contracts/`
- Tests: Vitest for loaders/interpolation; Playwright smoke test of the demo flow

### Views (each a module subscribing to the shared clock/store)
1. **Site picker / overview**: south-pole map (polar projection; equirectangular smears at the pole) with candidate sites.
2. **Site 3D view**: local terrain, Sun and Earth sight lines that turn dashed/grey when blocked by the horizon;
   directional light from the data's Sun vector. Moon look: black sky, hard shadows, low grazing sun.
3. **Sky panorama**: 360° horizon profile with Sun and Earth tracks over the period: the "why" view.
4. **Timeline strip**: hour-by-hour states (power+comms / power only / comms only / neither) with a scrubber.
5. **Compare board**: 2–4 site+date cards side by side with the key metrics and their uncertainty.
6. **Trade panels** (our differentiators, if AERO models them): DSN-available windows, battery for the longest night,
   sunlight vs mast height.
7. **Provenance panel**: datasets, versions, assumptions, limitations, read from file metadata.

### Folder sketch (front end only)
```
frontend/
  src/
    data/        loaders, zod schemas, interpolation, contract version check
    state/       clock + selection store
    views/       Overview, Site3D, SkyPanorama, Timeline, Compare, Trades, Provenance
    scene/       three.js pieces: terrain, sun/earth markers, sight lines, lighting
    ui/          shared components, layout, theme
  public/
    fixtures/    fake data matching contracts (FE-owned)
```
Real data is read from `data/processed/` (copied or symlinked into the build at build time; decide at kickoff).

### Order of work (once the hackathon starts)
1. Agree on contract v0.1 with AERO; write fixtures.
2. Clock + store + Timeline + Sky panorama on fixtures (proves the whole data path).
3. Site 3D view; then Compare board.
4. Swap fixtures for AERO's real files; polish visuals; trade panels if the data exists.
5. Demo flow + recording; offline build check.
