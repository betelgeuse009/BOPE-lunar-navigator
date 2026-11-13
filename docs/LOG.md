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
