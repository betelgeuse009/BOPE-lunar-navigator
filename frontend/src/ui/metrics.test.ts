import { describe, expect, it } from 'vitest'
import { formatValue, goodness } from './metrics'

describe('goodness', () => {
  it('passes fractions through', () => expect(goodness(0.7, 'both_frac', 336)).toBeCloseTo(0.7))
  it('inverts hour metrics over the mission duration', () => expect(goodness(84, 'longest_dark_h', 336)).toBeCloseTo(0.75))
  it('keeps null as null', () => expect(goodness(null, 'both_frac', 336)).toBeNull())
})

describe('formatValue', () => {
  it('formats fractions as percent and hours as h', () => {
    expect(formatValue(0.456, 'sunlit_frac')).toBe('46 %')
    expect(formatValue(41.6, 'longest_dark_h')).toBe('42 h')
    expect(formatValue(null, 'sunlit_frac')).toBe('no data')
  })
})

describe('domain', () => {
  it('sorts parameters into Sun and Earth', async () => {
    const { domain } = await import('./metrics')
    expect(['sunlit_frac', 'longest_dark_h', 'hours_to_first_dark_h', 'mean_sun_el_when_lit_deg'].map(domain)).toEqual(['sun', 'sun', 'sun', 'sun'])
    expect(['earth_visible_frac', 'longest_no_earth_h', 'hours_to_first_earth_loss_h'].map(domain)).toEqual(['earth', 'earth', 'earth'])
    expect(['slope_deg', 'elevation_m', 'score', 'both_frac'].map(domain)).toEqual([undefined, undefined, undefined, undefined])
  })
})
