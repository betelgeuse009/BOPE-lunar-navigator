# Handoff log (append-only)

Newest entry at the bottom. Never edit old entries. Format in CLAUDE.md §5.

## 2026-11-13 · FE
Done: repo structure (team/, docs/, contracts/, data/), contract v0.1 DRAFT in contracts/, validator script, task board, first decisions.
Changed contract: yes (first draft, v0.1)
Needs from AERO: please read contracts/README.md and reply in this LOG with "agree" or the changes you want (task T03).
  Also create your own team/Gabri275.md (T04).
Questions for AERO:
  1. Conventions OK? ME frame lat/lon (east-positive), azimuth clockwise from local north, geometric az/el plus terrain in *_visible_frac.
  2. Time step for ephemeris: 1 h? Period length: one month per file?
  3. Which sites first, and from which sources for the coordinates? (No coordinates go in without a citation.)
  4. Observer height for horizon masks (e.g. 2 m lander deck)? Sunlit threshold: half the solar disk (0.5)?
  5. SPICE (spiceypy) or JPL Horizons API for the ephemeris?
  6. Mission duration for matrix.json cells: 14 days?
Next: scaffold the frontend with fixtures matching v0.1 (T10).
Commits: see `git log fe/kickoff`

## 2026-11-14 11:25 · FE
Done: planning only. FE starts on the first view: an orbit camera around the Moon globe showing the candidate
  landing sites, plus a date/time slider. Moving the slider recolours the sites by how good they are on that date.
Changed contract: no (a terrain addition may be proposed later, see Q3)
Needs from AERO:
  1. NEW (T17): write down the parameters that make a site + date "good" for landing and operations,
     in a new file docs/PARAMETERS.md. For each one: name, unit, how it is computed, a threshold or
     "good/ok/bad" ranges if you have them, and the source. Examples of the kind of thing (your call, not mine):
     sunlit fraction, longest dark period, Earth visible fraction, longest no-Earth period, sun elevation, slope.
     The globe will colour sites with these, so which ones matter most (and how to combine them) is your decision.
  2. Still open: reply "agree" or changes on contract v0.1 (T03), and create team/Gabri275.md (T04).
Questions for AERO:
  1. Which DEM are you downloading (exact product name and resolution)?
  2. Which sites go into sites.json first, with which coordinate sources?
  3. Later: could analysis/ export a small heightmap crop per site (e.g. 20x20 km) so the 3D terrain matches your horizon masks?
Next: FE scaffold + Moon globe with orbit camera and time slider, on fixtures until real files land.
Commits: this entry
