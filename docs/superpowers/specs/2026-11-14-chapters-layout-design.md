# Chapters layout: sticky globe + scrolling chapters (FE)

**Why.** Everything sat on one screen: settings, results, two rails and the header covered the globe, and the south
pole (our main region) was hidden under the rails. Asked by Erdeniz on 2026-11-14.

**Goals.** The globe is always fully visible and uncovered. The page reads as a story for the public (where, when,
what mission, verdict, how the score works) and stays a fast tool for planners (every control one scroll away).
Clicked or chosen places are easy to find on the globe.

**Non-goals.** No new physics, no new API calls, no change to the data contract. Horizon panorama and the
site images come in later steps (the catalogue cards get an image slot now).

**Approaches considered.**
- *Sticky globe + scroll chapters* (chosen by Erdeniz): globe fixed on the left, chapters scroll on the right;
  mobile: globe on top, chapters below.
- *Full-screen slides*: one view per screen; the globe disappears on most slides, which breaks the link between a
  number and its place.
- *Globe first + drawers*: smallest change, but drawers still cover the globe when open.

**Design.**
- Left: `.stage` (sticky, full height, ~55 % width) with the canvas, a small legend + credit at its bottom edge.
  The camera turns to face a chosen place (smooth fly-to) so it is never behind the Moon or off screen.
- Right: `main.chapters`, scrolls. Header (title, live/offline, colour-by, Compare) on top, then:
  1. **Where**: catalogue cards (filter All / Crewed / Robotic; name, type, agency, date, score colour) + details of
     the chosen site. Clicking a card = choosing that site (live: evaluates it, as a globe click does).
  2. **When**: landing date rail + landing time rail.
  3. **Mission**: mission type and minimum requirements; surface stay; mast height.
  4. **Verdict**: evaluation of the chosen place (score, requirements, numbers ± uncertainty, nearby search).
  5. **How the score works**: explanation and weights.
- Compare stays an overlay table opened from the header.
- Components are reused as they are; `SettingsPanel` is split into its parts so each chapter holds one.

**Left to the builder.** Exact widths, chapter spacing, card size; mobile breakpoint (≤ 900 px: stacked).
