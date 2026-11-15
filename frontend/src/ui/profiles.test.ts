import { describe, expect, it } from 'vitest'
import { PROFILES, profileSettings } from './profiles'

describe('mission profiles', () => {
  it('crewed sets NASA\'s published south-pole landing requirements, each with a source', () => {
    const s = profileSettings('crewed')
    expect(s.missionDays).toBe(6.5)
    expect(s.limits).toEqual({ max_slope_deg: 10, max_dark_h: 0, min_earth_visible_frac: 0.25 })
    for (const c of Object.values(PROFILES.crewed.limits)) expect(c?.source).toMatch(/nasa\.gov/)
  })
  it('robotic switches limits on without inventing values', () => {
    const s = profileSettings('robotic')
    expect(s.limits).toEqual({ max_slope_deg: null, max_dark_h: null, min_earth_visible_frac: null })
    expect(s.missionDays).toBeUndefined()
  })
  it('no limits clears them', () => {
    expect(profileSettings('none').limits).toEqual({})
  })
})

describe('describeViolation', () => {
  it('names the broken limit with the value found and the limit, in display units', async () => {
    const { describeViolation } = await import('./profiles')
    expect(describeViolation({ limit: 'max_slope_deg', parameter: 'slope_deg', value: 13.0759, limit_value: 10 }))
      .toBe('Max landing slope: 13.1° (limit 10°)')
    expect(describeViolation({ limit: 'min_earth_visible_frac', value: 0.1234, limit_value: 0.25 }))
      .toBe('Min Earth in view: 12 % (limit 25 %)')
    expect(describeViolation({ limit: 'max_rock_abundance_frac', value: 0.0047, limit_value: 0.003 }))
      .toBe('Max rock abundance: 0.47 % (limit 0.3 %)')
    expect(describeViolation({ limit: 'max_surface_temp_k', value: 391.26, limit_value: 350 }))
      .toBe('Max surface temperature: 391.3 K (limit 350 K)')
  })
})
