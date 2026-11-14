import { describe, expect, it } from 'vitest'
import { NO_DATA, areaColor, metricColor } from './colors'

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

describe('areaColor', () => {
  it('absolute scale uses the score itself', () => {
    expect(areaColor(0.9, [0.88, 0.9], 'absolute')).toBe(metricColor(0.9))
  })
  it('relative scale stretches the range to the full ramp', () => {
    expect(areaColor(0.88, [0.88, 0.9], 'relative')).toBe(metricColor(0))
    expect(areaColor(0.9, [0.88, 0.9], 'relative')).toBe(metricColor(1))
  })
  it('handles a flat range and missing scores', () => {
    expect(areaColor(0.5, [0.5, 0.5], 'relative')).toBe(metricColor(1))
    expect(areaColor(null, [0, 1], 'absolute')).toBe(NO_DATA)
  })
})
