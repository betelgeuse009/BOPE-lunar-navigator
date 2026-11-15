import type { Weights } from '../data/api'
import type { TopicId } from '../docs/topics'

// The scored factors and how each becomes a 0..1 sub-score. Wording follows docs/PARAMETERS.md §4 (AERO).
export const FACTORS: { key: keyof Weights; api: string; label: string; rule: string; help: TopicId }[] = [
  { key: 'sunlit', api: 'sunlit_frac', label: 'Sunlight', rule: 'Share of the mission with the Sun up. More sunlight, more power.', help: 'sunlight' },
  { key: 'dark', api: 'longest_dark_h', label: 'Longest night', rule: '1 minus the longest stretch without Sun, as a share of the mission. A shorter night needs a smaller battery.', help: 'longest-night' },
  { key: 'earth', api: 'earth_visible_frac', label: 'Earth in view', rule: 'Share of the mission with Earth above the horizon: time for a direct radio link.', help: 'earth-in-view' },
  { key: 'noEarth', api: 'longest_no_earth_h', label: 'Longest blackout', rule: '1 minus the longest stretch without Earth, as a share of the mission. Fewer hours out of contact.', help: 'longest-blackout' },
  { key: 'slope', api: 'slope_deg', label: 'Landing slope', rule: '1 minus the LOLA slope / 20°, floored at 0. Flatter ground is safer to land on. The 20° scale is the analysis team\'s display choice, not a published lander limit.', help: 'slope' },
  // Regolith factors (Diviner), off by default. Linear from 1 at the whole-Moon 2nd percentile to 0 at the 98th
  // (analysis/config.py REGOLITH_SCORE_RANGES); left out where the map has no value.
  { key: 'rock', api: 'rock_abundance_frac', label: 'Rock abundance', rule: '1 at 0.13 % of the ground covered by rocks, 0 at 1.01 % (the least and most rocky 2 % of the Moon). Fewer rocks, fewer hazards. Not mapped beyond 80°.', help: 'rock-abundance' },
  { key: 'temp', api: 'surface_temp_max_k', label: 'Max surface temperature', rule: '1 at 260 K, 0 at 395 K (the coolest and hottest 2 % of the Moon). A cooler peak is a smaller thermal load.', help: 'surface-temperature' },
  { key: 'hpar', api: 'h_parameter_m', label: 'H-parameter', rule: '1 at 5.0 cm, 0 at 8.9 cm (2nd and 98th percentile). Smaller H = denser, firmer near-surface regolith. Not mapped beyond 70°.', help: 'h-parameter' },
]
