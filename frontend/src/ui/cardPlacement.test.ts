import { describe, expect, it } from 'vitest'
import { pickCorner } from './cardPlacement'

const area = { x0: 0, y0: 60, x1: 1000, y1: 800 }
describe('card placement', () => {
  it('stays top-left when nothing is under it', () => {
    expect(pickCorner([{ x: 700, y: 500 }], area, 340, 400)).toBe('tl')
  })
  it('moves away from a point the card would cover', () => {
    expect(pickCorner([{ x: 100, y: 200 }], area, 340, 400)).not.toBe('tl')
    expect(pickCorner([{ x: 100, y: 200 }], area, 340, 400)).toBe('br')
  })
  it('keeps both the hovered site and the chosen point free', () => {
    const c = pickCorner([{ x: 100, y: 200 }, { x: 900, y: 700 }], area, 340, 400)
    expect(['tr', 'bl']).toContain(c)
  })
  it('does not jump when two corners are equally good', () => {
    expect(pickCorner([{ x: 500, y: 430 }], area, 340, 300, 'tr')).toBe('tr')
  })
})
