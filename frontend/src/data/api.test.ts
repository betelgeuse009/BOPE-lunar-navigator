import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, areaSpacingKm, limitsQuery, settingsQuery } from './api'

describe('settingsQuery', () => {
  it('maps settings to the API query parameters (contracts/API.md)', () => {
    const q = settingsQuery({ ...DEFAULT_SETTINGS, missionDays: 7, obsHeightM: 10, weights: { sunlit: 1, dark: 0.5, earth: 0, noEarth: 2, slope: 3 } })
    expect(q).toEqual({ mission_h: '168', obs_height_m: '10', w_sunlit: '1', w_dark: '0.5', w_earth: '0', w_no_earth: '2', w_slope: '3' })
  })
})

describe('limitsQuery', () => {
  it('sends only the limits that are on and have a value', () => {
    expect(limitsQuery({ ...DEFAULT_SETTINGS, limits: { max_slope_deg: 10, max_dark_h: null, min_earth_visible_frac: 0.25 } }))
      .toEqual({ max_slope_deg: '10', min_earth_visible_frac: '0.25' })
  })
})

describe('areaSpacingKm', () => {
  it('keeps the disc under the API limit of 2000 points', () => {
    for (const r of [1, 5, 20, 100]) {
      const s = areaSpacingKm(r)
      expect(Math.PI * (r / s) ** 2).toBeLessThan(2000)
    }
  })
})
