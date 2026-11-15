import { describe, expect, it } from 'vitest'
import { assess } from './warnings'

const none = { limits: {}, profile: 'none' as const }

describe('warning levels', () => {
  it('red only for a broken requirement, amber when at risk, green when met', () => {
    expect(assess('slope_deg', 12, { ...none, limits: { max_slope_deg: 10 } })?.level).toBe('bad')
    expect(assess('slope_deg', 8, { ...none, limits: { max_slope_deg: 10 }, atRisk: ['max_slope_deg'] })?.level).toBe('warn')
    expect(assess('slope_deg', 8, { ...none, limits: { max_slope_deg: 10 } })?.level).toBe('ok')
    expect(assess('sunlit_frac', 0.4, { ...none, limits: { min_sunlit_frac: 0.5 } })?.text).toMatch(/at least 50 %/)
  })
  it('default bands give amber, never red, before any requirement', () => {
    expect(assess('slope_deg', 12, none)?.level).toBe('warn')
    expect(assess('slope_deg', 4, none)?.level).toBe('ok')
    expect(assess('hours_to_first_dark_h', 0, none)?.level).toBe('warn')     // dark at landing
    expect(assess('hours_to_first_dark_h', null, none)?.level).toBe('ok')    // never during the stay
    expect(assess('score', 0.3, none)?.level).toBe('warn')
  })
  it('a requirement replaces the default band', () => {
    expect(assess('slope_deg', 12, { ...none, limits: { max_slope_deg: 15 } })?.level).toBe('ok')
  })
  it('the crewed band for nights applies only to crewed missions; unknown fields get nothing', () => {
    expect(assess('longest_dark_h', 5, none)).toBeNull()
    expect(assess('longest_dark_h', 5, { ...none, profile: 'crewed' })?.level).toBe('warn')
    expect(assess('elevation_m', 100, none)).toBeNull()
    expect(assess('slope_deg', undefined, none)).toBeNull()
  })
  it('a requirement on a value the server could not give is not checked (amber)', () => {
    expect(assess('rock_abundance_frac', null, { ...none, limits: { max_rock_abundance_frac: 0.01 } })?.level).toBe('warn')
  })
})
