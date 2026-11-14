import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, areaSpacingKm, settingsQuery } from './api'

describe('settingsQuery', () => {
  it('maps settings to the API query parameters (contracts/API.md)', () => {
    const q = settingsQuery({ ...DEFAULT_SETTINGS, missionDays: 7, obsHeightM: 10, weights: { sunlit: 1, dark: 0.5, earth: 0, noEarth: 2 } })
    expect(q).toEqual({ mission_h: '168', obs_height_m: '10', w_sunlit: '1', w_dark: '0.5', w_earth: '0', w_no_earth: '2' })
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
