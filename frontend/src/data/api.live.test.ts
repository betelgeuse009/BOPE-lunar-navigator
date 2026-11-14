// Integration check against AERO's running API. Runs only with LIVE_API=1 (needs `uvicorn analysis.api:app --port 8000`).
import { describe, expect, it } from 'vitest'
import { Area, DEFAULT_SETTINGS, Evaluation, apiAvailable, apiGet, areaSpacingKm, settingsQuery } from './api'
import { parseFile } from './load'
import { Matrix } from './schemas'

const q = { ...settingsQuery(DEFAULT_SETTINGS), start_utc: '2026-11-15T00:00:00Z' }

describe.skipIf(!process.env.LIVE_API)('live API', () => {
  it('answers /health', async () => expect(await apiAvailable()).toBe(true))
  it('/evaluate parses, with score components', async () => {
    const ev = await apiGet('evaluate', { ...q, lat_deg: '-89.5', lon_deg: '-135' }, Evaluation)
    expect(ev.score.value).toBeGreaterThan(0)
    expect(Object.keys(ev.score.components)).toContain('sunlit_frac')
  })
  it('/area at the largest radius stays under the point limit', async () => {
    const a = await apiGet('area', { ...q, lat_deg: '-89.5', lon_deg: '-135', radius_km: '50', spacing_km: String(areaSpacingKm(50)) }, Area)
    expect(a.points.score.length).toBeGreaterThan(100)
    expect(a.points.score.length).toBeLessThanOrEqual(2000)
  })
  it('/matrix parses with the contract loader and carries a score grid', async () => {
    const m = parseFile(Matrix, await apiGet('matrix', { ...q, site_ids: 'example-south-pole,example-near-side', n_dates: '5' }, Matrix.passthrough()), 'matrix')
    expect(m.cells.score).toHaveLength(2)
  })
  it('turns an API error into a readable message', async () => {
    await expect(apiGet('evaluate', { start_utc: 'nope', lat_deg: '0', lon_deg: '0' }, Evaluation)).rejects.toThrow(/evaluate:/)
  })
})
