import type { Ephemeris } from '../../data/api'

// The time series as a CSV table: one row per time step, one column per quantity the server sent. Units are in the
// column names (contract convention). Values are written exactly as received.
const COLUMNS = ['sun_az_deg', 'sun_el_deg', 'sun_visible_frac', 'sun_dist_km', 'sun_radius_deg',
  'earth_az_deg', 'earth_el_deg', 'earth_visible_frac', 'earth_dist_km', 'earth_radius_deg', 'earth_phase_frac'] as const

export function ephemerisCsv(e: Ephemeris): string {
  const cols = COLUMNS.filter((c) => e[c])
  const lines = [['time_utc', ...cols].join(',')]
  e.time_utc.forEach((t, i) => lines.push([t, ...cols.map((c) => e[c]![i])].join(',')))
  return lines.join('\n') + '\n'
}

export function downloadText(name: string, text: string, type = 'text/csv') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
