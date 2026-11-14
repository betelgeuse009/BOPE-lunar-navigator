import type { Weights } from '../data/api'

// The scored factors and how each becomes a 0..1 sub-score. Wording follows docs/PARAMETERS.md §4 (AERO).
export const FACTORS: { key: keyof Weights; api: string; label: string; rule: string }[] = [
  { key: 'sunlit', api: 'sunlit_frac', label: 'Sunlight', rule: 'Share of the mission with the Sun up. More sunlight, more power.' },
  { key: 'dark', api: 'longest_dark_h', label: 'Longest night', rule: '1 minus the longest stretch without Sun, as a share of the mission. A shorter night needs a smaller battery.' },
  { key: 'earth', api: 'earth_visible_frac', label: 'Earth in view', rule: 'Share of the mission with Earth above the horizon: time for a direct radio link.' },
  { key: 'noEarth', api: 'longest_no_earth_h', label: 'Longest blackout', rule: '1 minus the longest stretch without Earth, as a share of the mission. Fewer hours out of contact.' },
]
