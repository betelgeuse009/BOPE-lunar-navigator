import { describe, expect, it } from 'vitest'
import { relativeToDay } from './timeStrip'

describe('relativeToDay', () => {
  it('stretches the day between its worst (0) and best (1) value and reports the range', () => {
    const r = relativeToDay([0.9, 0.95, 1.0])
    r.scaled.forEach((v, i) => expect(v).toBeCloseTo([0, 0.5, 1][i], 12))
    expect([r.min, r.max]).toEqual([0.9, 1.0])
  })
  it('keeps gaps as no data', () => {
    expect(relativeToDay([0.2, null, 0.4]).scaled).toEqual([0, null, 1])
  })
  it('puts a flat day in the middle instead of dividing by zero', () => {
    expect(relativeToDay([0.7, 0.7]).scaled).toEqual([0.5, 0.5])
  })
  it('has no range without data', () => {
    expect(relativeToDay([null]).min).toBeNull()
  })
})
