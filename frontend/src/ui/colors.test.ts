import { describe, expect, it } from 'vitest'
import { NO_DATA, metricColor } from './colors'

describe('metricColor', () => {
  it('uses the no-data grey for null', () => {
    expect(metricColor(null)).toBe(NO_DATA)
  })
  it('distinguishes low from high', () => {
    expect(metricColor(0)).not.toBe(metricColor(1))
  })
  it('clamps out-of-range values', () => {
    expect(metricColor(-1)).toBe(metricColor(0))
    expect(metricColor(2)).toBe(metricColor(1))
  })
})
