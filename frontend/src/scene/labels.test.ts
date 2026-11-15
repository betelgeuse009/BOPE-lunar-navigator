import { describe, expect, it } from 'vitest'
import { MIN_FEATURE_PX, parseNames, placeLabels } from './labels'

const VIEW = { x0: 0, y0: 0, x1: 800, y1: 600 }

describe('labels', () => {
  it('gives point features a minimum size', () => {
    const n = parseNames({ source: '', generated_at: '', fields: [], names: [['Statio Shiv Shakti', -69.4, 32.3, 0, 'ST'], ['Tycho', -43.3, -11.2, 85.3, 'AA']] })
    expect(n[0].dKm).toBe(5)
    expect(n[1].dKm).toBe(85.3)
  })
  it('keeps the larger feature when two names overlap, and drops features too small on screen', () => {
    const c = [
      { i: 0, name: 'Mare Imbrium', x: 100, y: 100, px: 300 },
      { i: 1, name: 'Plato', x: 105, y: 102, px: 80 },          // overlaps Mare Imbrium
      { i: 2, name: 'Copernicus', x: 300, y: 300, px: 60 },
      { i: 3, name: 'Tiny', x: 500, y: 500, px: MIN_FEATURE_PX - 1 },
    ]
    expect(placeLabels(c, VIEW)).toEqual([0, 2])
  })
  it('leaves out names that would cross the edge of the view, and stops at the maximum', () => {
    expect(placeLabels([{ i: 0, name: 'Grimaldi', x: 2, y: 50, px: 100 }], VIEW)).toEqual([])
    expect(placeLabels([{ i: 0, name: 'Grimaldi', x: 400, y: 590, px: 100 }], { ...VIEW, y1: 560 })).toEqual([]) // under the controls
    const many = Array.from({ length: 10 }, (_, i) => ({ i, name: 'A', x: 50 + i * 40, y: 50, px: 100 }))
    expect(placeLabels(many, VIEW, 3)).toEqual([0, 1, 2])
  })
})
