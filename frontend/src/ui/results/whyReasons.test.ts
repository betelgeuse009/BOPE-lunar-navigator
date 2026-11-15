import { describe, expect, it } from 'vitest'
import { circularSpan, skylineAt, terrainBlocking } from './whyReasons'

describe('why it changes', () => {
  it('finds the smallest compass arc, also across north', () => {
    expect(circularSpan([110, 120, 160])).toEqual([110, 160])
    expect(circularSpan([350, 10, 5])).toEqual([350, 10])
    expect(circularSpan([])).toBeNull()
  })
  it('interpolates the skyline between samples, periodic', () => {
    const az = [0, 90, 180, 270], el = [0, 2, 4, 2]
    expect(skylineAt(az, el, 45)).toBe(1)
    expect(skylineAt(az, el, 315)).toBe(1)
  })
  it('measures how much of the stay terrain hides a body that is above the flat horizon', () => {
    const az = [100, 120, 140, 200], el = [1, 1.5, 1, -1], vis = [1, 0, 0, 0]
    const b = terrainBlocking(az, el, vis, [0, 90, 180, 270], [0, 2, 3, 1])
    expect(b.upFrac).toBe(0.75)
    expect(b.hiddenFrac).toBe(0.5)
    expect(b.hiddenAz).toEqual([120, 140])
    expect(b.maxElDeg).toBe(1.5)
    expect(b.skylineMaxDeg).toBeCloseTo(2 + (140 - 90) / 90, 6)
  })
})
