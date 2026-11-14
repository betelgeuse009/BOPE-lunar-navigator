import { describe, expect, it } from 'vitest'
import { latLonToVec3 } from './geo'

describe('latLonToVec3', () => {
  it('puts (0,0) on +x', () => {
    const [x, y, z] = latLonToVec3(0, 0, 1)
    expect(x).toBeCloseTo(1); expect(y).toBeCloseTo(0); expect(z).toBeCloseTo(0)
  })
  it('puts lon 90E on -z', () => {
    expect(latLonToVec3(0, 90, 1)[2]).toBeCloseTo(-1)
  })
  it('puts the south pole on -y', () => {
    expect(latLonToVec3(-90, 123, 1)[1]).toBeCloseTo(-1)
  })
  it('stays finite next to the pole', () => {
    const v = latLonToVec3(-89.9999, 37, 1737.4)
    v.forEach((c) => expect(Number.isFinite(c)).toBe(true))
    expect(v[1]).toBeLessThan(0)
  })
})
