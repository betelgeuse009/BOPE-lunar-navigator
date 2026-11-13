# BOPE Lunar Navigator: shared team brief

NASA Space Apps Challenge 2026 · challenge: **Lunar Landing Site Navigator**
Hackathon: Sat Nov 14 – Sun Nov 15, 2026. Submission deadline is on the official schedule (check it).

This file is read by **every** Claude Code session in this repo, for both teammates.
It defines who we are, who owns what, and how our two Claude sessions stay in sync through git.
Personal context lives in `team/<github-username>.md`. Read the one for the current user.
Follow the karpathy-guidelines.md
---

## 1. Who is working with you (do this first in every session)

Two people, two separate Claude Code sessions, one repo.

| GitHub username | Role | Background | Personal file |
|---|---|---|---|
| `betelgeuse009` | Front end + integration ("FE") | Computer engineering MSc, comfortable with git | `team/betelgeuse009.md` |
| Gabri275 | Analysis + physics model ("AERO") | Aerospace engineering MSc, **new to git/GitHub** | `team/Gabri275.md` |

At the start of every session:
1. Run `git config user.name` and `gh api user -q .login` (if `gh` is set up) to identify the user.
   If it is unclear, ask: "Are you the front-end or the aerospace teammate?"
2. Read that person's `team/*.md` file.
3. Run the **Session start** routine in section 5.

If the user is AERO, you are also their **git operator**: you run every git/GitHub command for them
and explain it in one plain sentence. Never ask them to type git commands themselves.

## 2. The challenge (official text goes here)
<!-- Paste the official Summary / Objectives / Considerations / Resources from
     spaceappschallenge.org. This section is the source of truth for scope. -->

Working summary: build an intuitive tool that lets mission planners, educators and the public compare
lunar landing sites and dates quickly. It visualizes Sun and Earth positions relative to the local horizon
to assess power-generation potential and direct-to-Earth communication windows.

Where we plan to stand out (to be confirmed together; many teams already do the basic horizon + ephemeris):
- Earth being above the horizon ≠ a usable link. Model ground-station availability (DSN visibility).
- Survival: longest dark period → battery energy needed to survive it.
- Mast-height trade: how much sunlight a solar array on a mast of height h gains.
Every number shown must have a stated source and uncertainty.

## 3. Who owns what (this is what prevents merge conflicts)

| Path | Owner | Rule |
|---|---|---|
| `analysis/` | AERO | Python/notebooks: ephemeris, horizon masks, power/comm/battery models |
| `data/processed/` | AERO | Output files the front end reads. Must match `contracts/` |
| `data/raw/` | AERO | Big downloads. **Git-ignored**, never committed |
| `frontend/` | FE | The web app |
| `frontend/public/fixtures/` | FE | Fake data with the same shape as the contracts, so FE never waits on AERO |
| `contracts/` | **Both** | Data interface (JSON Schemas + README). Change only by agreement (see §6) |
| `docs/` | **Both** | `TASKS.md`, `LOG.md`, `DECISIONS.md`. Append-only where noted |
| `team/` | Each person edits only their own file |

Rule for Claude: **do not edit files owned by the other teammate.** If a change is needed there,
write it as a request in `docs/LOG.md` (section 5) and in `docs/TASKS.md`.

## 4. Branches and merging (kept deliberately simple)

- `main` always runs. Nobody commits directly to `main`.
- FE works on short branches `fe/<topic>` → Pull Request → merge.
- AERO works on one long-lived branch `aero` (no branch juggling for a git beginner).
  AERO's Claude commits and pushes to `aero` and keeps one open PR `aero → main` updated.
  FE reviews and merges it (squash merge is fine).
- Before starting work and before pushing: `git pull --rebase origin main` into the working branch.
  If a rebase conflict appears in an AERO session, stop and tell AERO in plain words. Do not force anything.
  Then write a LOG entry so FE can help.
- Never use `git push --force` on `main`. Never rewrite someone else's commits.
- Never commit secrets (Cesium ion token, API keys). They go in `.env.local`, which is git-ignored.

### Commit messages
Format: `<type>(<area>): <what changed>`, for example:
- `feat(fe): horizon panorama view with sun/earth tracks`
- `data(aero): horizon masks for 5 south-pole sites (LOLA 20 m)`
- `contract(both): add battery_wh field to metrics v0.2`
- `docs(log): end-of-session handoff`

Types: `feat`, `fix`, `data`, `model`, `contract`, `docs`, `chore`, `test`.
One logical change per commit. Commit small and often: a commit is a save point.

## 5. How our two Claude sessions talk: `docs/LOG.md`

Neither Claude can see the other's conversation. **Git history plus `docs/LOG.md` are the shared memory.**

### Session start (every time)
1. `git fetch && git pull --rebase origin main` (on the user's working branch).
2. Read the last ~10 entries of `docs/LOG.md`, the open items in `docs/TASKS.md`,
   and `git log --oneline -15 origin/main origin/aero`.
3. Tell the user in 3–5 lines: what the other teammate did since last time, anything they asked of us,
   and what is next for this user.

### Session end, or when the user says "sync", "save", "share" or "I'm done"
1. Commit the work (message format above) and push the working branch.
2. If AERO: make sure the `aero → main` PR exists and is updated (`gh pr create` / it updates automatically).
3. Append **one** entry to the end of `docs/LOG.md` (never edit old entries):

```
## 2026-11-14 15:40 · AERO
Done: horizon masks for 5 sites in data/processed/horizon/ (contract v0.1)
Changed contract: no
Needs from FE: nothing
Questions for FE: should the timeline step be 1 h or 30 min?
Next: earth visibility + DSN station windows
Commits: a1b2c3d, d4e5f6a
```

4. Update the status of the relevant tasks in `docs/TASKS.md`.
5. Commit the LOG/TASKS update (`docs(log): …`) and push.

The user can also say **"send a message to my teammate: …"**. Write it as a LOG entry and push.
That is our async chat, and it stays in history.

### Plain-word command map (for AERO especially)
| User says | Claude does |
|---|---|
| "start" / "what's new" | Session start routine |
| "save" | Commit current work with a good message (no push) |
| "sync" / "share" | Pull → commit → push → update PR → LOG entry |
| "undo my last change" | `git revert` (never reset published history); explain what was undone |
| "what changed?" | Summarize `git diff` / `git log` in plain language |
| "I'm stuck with git" | Diagnose with `git status`, fix safely, explain in one sentence |

## 6. The data contract: how AERO's model meets FE's interface

The front end **never computes physics**. It only displays files produced by `analysis/`.
That separation is what lets AERO work in Python without touching the web code.

- Files are plain JSON/CSV in `data/processed/`, described by JSON Schemas in `contracts/`.
- Every file carries `"contract_version"`, `"generated_at"`, `"source"` (datasets + versions) and units in field names
  (`elev_deg`, `time_utc`, `energy_wh`).
- Contract changes: propose in LOG → other teammate agrees in LOG → bump version →
  update the schema + FE fixtures in the same PR. Backwards-compatible additions (new optional fields) need no agreement.

Initial contract idea (v0.1, to be agreed at kickoff):
- `sites.json`: id, name, lat/lon, source of the coordinates
- `horizon/<site>.json`: azimuth grid (deg) → horizon elevation (deg), DEM product + resolution
- `ephemeris/<site>_<period>.json`: time series of Sun and Earth az/el (topocentric), source (SPICE/Horizons)
- `metrics/<site>_<period>.json`: % sunlit, % Earth-visible, % both, longest gaps, (later) DSN windows, battery need, mast-height curve

## 7. Shared docs (create at kickoff if missing)
- `docs/TASKS.md`: task board. Columns: ID · task · owner (FE/AERO) · status (todo/doing/review/done) · depends on.
- `docs/LOG.md`: append-only handoff log (section 5).
- `docs/DECISIONS.md`: short dated entries: decision, why, alternatives rejected. Becomes the "methods/limitations" slide.

## 8. Ground rules for Claude (both sessions)
- Do not fabricate data, constants, product IDs or citations. Unknown → TODO in the file and a question in LOG.
- Ask before changing architecture, adding a dependency the other teammate must install, or touching `contracts/`.
- Validate against references: ephemeris vs JPL Horizons, horizon vs published illumination studies. Record results in `DECISIONS.md`.
- Keep the demo runnable offline (precomputed data, no live API needed).
- Check the Space Apps rules on pre-event work and on disclosing AI use. Note it in `DECISIONS.md`.
