import { describe, expect, it } from 'vitest'
import { scaleLabels } from './layers'

const f = (v: number) => v.toFixed(1)
describe('colour bar labels', () => {
  it('prints the exact lowest and highest value, with the uncertainty when there is one', () => {
    expect(scaleLabels({ breaks: [-9045, -1800, -600, 1100, 10720.5], data_min: -9045, data_max: 10720.5, end_uncertainty: 1 }, f, (u) => `${u} m`))
      .toEqual(['-9045.0 ± 1 m', '-600.0', '10720.5 ± 1 m'])
  })
  it('uses the midpoint on a linear scale and no ± without a source', () => {
    expect(scaleLabels({ breaks: [0, 60.8], data_min: 0, data_max: 60.8 }, f)).toEqual(['0.0', '30.4', '60.8'])
  })
  it('marks ends that are not the real extremes (older percentile scale)', () => {
    expect(scaleLabels({ breaks: [260, 347, 374, 387, 395], data_min: 51.3, data_max: 439, end_uncertainty: 1 }, f, String))
      .toEqual(['≤ 260.0', '374.0', '≥ 395.0'])
    expect(scaleLabels({ breaks: [0.0013, 0.0023, 0.0029, 0.0035, 0.0101], data_max: 0.677 }, f)).toEqual(['≤ 0.0', '0.0', '≥ 0.0'])
  })
})
