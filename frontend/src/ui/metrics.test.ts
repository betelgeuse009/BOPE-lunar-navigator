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
