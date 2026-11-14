# Teammate: Gabri275: orbital mechanics + lunar environment (AERO)

## Who I am: my name is Gabriele Pisciotta
- MSc student in Space Engineering at Politecnico di Milano. Before that: BSc in Aerospace Engineering
  (and the first semester of the MSc) at Politecnico di Torino.
- In this project I work on the physics: orbital mechanics (Sun and Earth positions seen from the lunar surface)
  and the lunar environment (terrain horizons, illumination, Earth visibility, later power/comms/battery).
  I own `analysis/` and `data/processed/`.
- Background: three years in Team H2politO's Autonomous Driving division (Shell Eco-marathon Autonomous
  Urban Concept, competed in 2024 and 2025), division leader in 2024/25.
- Tools: Python, MATLAB/Simulink, Linux, ROS 2. Git: I know the basics, but I'm new to the GitHub workflow
  (branches, pull requests, rebase) and to VS Code and Claude Code.
- Career goal: GNC and spacecraft autonomy. Frame my work so it reads as space-systems engineering
  (reference frames, time systems, geometry, uncertainty, validation against references), not just data processing.

## How to work with me
- Language: I may talk to you in Italian, but always reply in English, also in chat (Erdeniz often reads
  along). Everything written into the repo (code, comments, docs, LOG entries, commit messages) is in English.
- Be direct and technical on physics and maths. I'm an engineer, so don't simplify the science.
- Git, GitHub, VS Code, Claude Code: you are my git operator (CLAUDE.md §1). Run the commands for me and
  explain each one in one plain sentence. Never ask me to type git commands. If something goes wrong
  (for example a rebase conflict), stop and tell me in plain words. Then write a LOG entry so Erdeniz can help.
- Propose before building anything large. I decide the modelling approach (methods, assumptions, datasets).
- Analysis only: I don't edit `frontend/`. If I need something from FE, write it in `docs/LOG.md` / `TASKS.md`.
- Contract-first: everything I produce goes in `data/processed/` and must pass
  `python contracts/validate.py data/processed` before it is pushed.
- Never invent constants, coordinates, dataset IDs or citations. Unknown → TODO in the file and a question in LOG.

## Analysis architecture (idea only, no implementation yet)

### Principles
1. **Compute once, offline.** All physics runs in Python ahead of time and lands in `data/processed/` as JSON.
   The demo never needs a live API.
2. **Every number has a frame and a time system.** State them explicitly: ME frame for lat/lon, local
   East-North-Up for az/el, UTC in files, aberration correction stated.
3. **Every number has a source and an uncertainty.** `{ "value", "uncertainty" }`, `null` if not estimated yet.
4. **Validate against references.** Ephemeris vs JPL Horizons; illumination vs published south-pole studies.
   Record the results in `docs/DECISIONS.md`.

### Candidate stack (to confirm)
- Python + numpy
- Ephemeris: spiceypy with NAIF kernels, **or** the JPL Horizons API (decide in T03)
- Terrain: LOLA DEM (product and resolution to choose) → horizon mask per site
- `jsonschema` (via `contracts/validate.py`) to check outputs

### Folder sketch (analysis only)
```
analysis/
  ephemeris/   Sun and Earth az/el per site and period
  horizon/     horizon masks from the DEM
  metrics/     sunlit / Earth-visible fractions, windows, longest gaps, matrix
  trades/      LATER: DSN windows, battery for the longest night, mast-height curve
  notebooks/   exploration and validation plots
```

### Order of work (once the hackathon starts)
1. Answer FE's contract questions and agree on v0.1 (T03).
2. Curated site list with coordinate citations (T05).
3. Ephemeris pipeline, validated against JPL Horizons (T06).
4. Horizon masks from LOLA (T07).
5. Metrics and windows per site × period (T08), then `matrix.json` (T09).
6. Differentiators if time allows (T16): DSN availability, battery for the longest night, mast-height trade.
