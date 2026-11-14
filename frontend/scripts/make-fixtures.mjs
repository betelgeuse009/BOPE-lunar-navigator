// Generates FAKE data files in contract v0.1 shape into public/fixtures/.
// Nothing here is real: coordinates and values are invented so the UI can be built before AERO's data lands.
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../public/fixtures/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const header = {
  contract_version: '0.1',
  generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  source: {
    datasets: [{ name: 'none (FIXTURE)' }],
    tool: 'frontend/scripts/make-fixtures.mjs',
    notes: 'FIXTURE: invented values for UI development. Not real data.',
  },
}

const sites = [
  ['fixture-a', 'Fixture site A', -89.5, 0],
  ['fixture-b', 'Fixture site B', -88.0, 120],
  ['fixture-c', 'Fixture site C', -86.5, -60],
  ['fixture-d', 'Fixture site D', -85.0, 45],
  ['fixture-e', 'Fixture site E', -84.0, -150],
].map(([id, name, lat_deg, lon_deg]) => ({
  id, name, lat_deg, lon_deg, category: 'other', coord_source: 'FIXTURE, not real',
}))

const DAYS = 31
const start = Date.UTC(2027, 0, 1)
const dates = Array.from({ length: DAYS }, (_, d) => new Date(start + d * 86400e3).toISOString().replace('.000Z', 'Z'))

// smooth, deterministic values in [0, 1]: one lunar-month-ish cycle per site with a phase offset
const wave = (s, d, k) => 0.5 + 0.45 * Math.sin((2 * Math.PI * d) / 29.5 + s * 1.3 + k)
const r3 = (x) => Math.round(x * 1000) / 1000
const grid = (f) => sites.map((_, s) => dates.map((_, d) => f(s, d)))

const sunlit = grid((s, d) => r3(wave(s, d, 0)))
const earth = grid((s, d) => r3(wave(s, d, 2)))
const cells = {
  sunlit_frac: sunlit,
  earth_visible_frac: earth,
  both_frac: grid((s, d) => r3(Math.min(sunlit[s][d], earth[s][d]) * 0.85)),
  longest_dark_h: grid((s, d) => r3((1 - sunlit[s][d]) * 300)),
  longest_no_earth_h: grid((s, d) => r3((1 - earth[s][d]) * 300)),
}
// one "not computed" cell per field, so the UI's no-data state is always exercised
Object.values(cells).forEach((g, i) => { g[i % sites.length][10 + i] = null })

const files = {
  'sites.json': { ...header, sites },
  'matrix.json': {
    ...header,
    site_ids: sites.map((s) => s.id),
    landing_dates_utc: dates,
    mission_duration_h: 336,
    sun_threshold_frac: 0.5,
    cells,
    uncertainty_notes: 'FIXTURE: no uncertainty, values are invented.',
  },
  'manifest.json': {
    ...header,
    periods: [{ id: '2027-01', label: 'January 2027', start_utc: dates[0], end_utc: '2027-02-01T00:00:00Z', step_s: 600 }],
    available: sites.map((s) => ({ site_id: s.id, has_horizon: false, period_ids: [] })),
    has_matrix: true,
  },
}

for (const [name, data] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), JSON.stringify(data, null, 1) + '\n')
  console.log('wrote', name)
}
