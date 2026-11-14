import { describe, expect, it } from 'vitest'
import { elevationRange, trackSegments } from './geometry'

describe('trackSegments', () => {
  it('splits a track where azimuth wraps from 359 to 0', () => {
    const seg = trackSegments([350, 355, 359, 2, 6], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1])
    expect(seg).toHaveLength(2)
    expect(seg[0].points.map((p) => p.az)).toEqual([350, 355, 359])
    expect(seg[1].points.map((p) => p.az)).toEqual([2, 6])
  })
  it('splits where visibility changes, so hidden parts can be drawn faint', () => {
    const seg = trackSegments([10, 11, 12, 13], [1, 1, -1, -1], [1, 0.8, 0, 0])
    expect(seg.map((s) => s.visible)).toEqual([true, false])
    expect(seg[0].points).toHaveLength(2)
  })
  it('counts a disc as visible when at least half of it is above the horizon', () => {
    const seg = trackSegments([10, 11], [0, 0], [0.5, 0.49])
    expect(seg.map((s) => s.visible)).toEqual([true, false])
  })
})

describe('elevationRange', () => {
  it('covers the data with a margin', () => {
    const [lo, hi] = elevationRange([[-1.2, 1.5], [2.5, 4]])
    expect(lo).toBeLessThan(-1.2); expect(hi).toBeGreaterThan(4)
  })
  it('always includes the horizon and at least 6 degrees, so polar tracks stay readable', () => {
    const [lo, hi] = elevationRange([[1.0, 1.6]])
    expect(lo).toBeLessThanOrEqual(0); expect(hi - lo).toBeGreaterThanOrEqual(6)
  })
  it('caps at the zenith and nadir', () => {
    const [lo, hi] = elevationRange([[-88, 89]])
    expect(lo).toBeGreaterThanOrEqual(-90); expect(hi).toBeLessThanOrEqual(90)
  })
})
