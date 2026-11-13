# Decisions

Short dated entries: decision, why, alternatives rejected. This becomes the "methods / limitations" slide.

## 2026-11-13 · Front end is a static web app (React + TypeScript + Vite)
- Why: easiest to demo (a link, works offline as a static build), largest ecosystem for 2D charts and 3D (React Three Fiber),
  can later become an installable app (PWA / Tauri / Capacitor) without a rewrite.
- Rejected: Python dashboards (Streamlit/Panel/Dash): choppy time scrubbing, weak 3D, blurs the FE/AERO split.
  Svelte: smaller 3D ecosystem. Desktop/mobile-first: packaging cost with no judging benefit.

## 2026-11-13 · Build 2D first, 3D second; 3D is a light schematic, not a terrain engine
- Why: the challenge is judged on rapid comparison and clarity, which the 2D views deliver
  (horizon panorama, site × date heatmap, timeline). The 3D Sun–Earth–Moon view uses true directions
  from the data but schematic distances, to explain the geometry to non-specialists.
- Rejected for now: CesiumJS / Cesium Moon terrain (needs a token and internet, which breaks the offline demo).
  Local LOLA terrain mesh is a possible later addition.

## 2026-11-13 · Contract-first data interface (v0.1 draft)
- Why: FE builds on fixtures without waiting for AERO, and AERO writes Python without touching web code.
  Mismatches show up as validation errors, not as wrong charts.
- Details in `contracts/README.md`. Status: draft until AERO agrees in LOG.
