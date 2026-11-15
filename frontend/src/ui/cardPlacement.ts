import type { ScreenArea } from '../scene/labels'

// Where a floating card goes so it does not cover what the user looks at: the corner of the free part of the view
// (`area`, without header and controls) whose card rectangle stays farthest from every point to keep visible.
export type Corner = 'tl' | 'tr' | 'bl' | 'br'
export type Pt = { x: number; y: number }
const GAP = 16

export function cornerRect(c: Corner, area: ScreenArea, w: number, h: number): ScreenArea {
  const x0 = c[1] === 'l' ? area.x0 + GAP : area.x1 - GAP - w
  const y0 = c[0] === 't' ? area.y0 + 8 : area.y1 - 8 - h
  return { x0, y0, x1: x0 + w, y1: y0 + h }
}

// Distance from a point to a rectangle (0 inside).
const dist = (p: Pt, r: ScreenArea) => Math.hypot(Math.max(r.x0 - p.x, 0, p.x - r.x1), Math.max(r.y0 - p.y, 0, p.y - r.y1))

export function pickCorner(avoid: Pt[], area: ScreenArea, w: number, h: number, current: Corner = 'tl'): Corner {
  if (!avoid.length) return current
  const score = (c: Corner) => Math.min(...avoid.map((p) => dist(p, cornerRect(c, area, w, h))))
  const order: Corner[] = [current, 'tl', 'tr', 'bl', 'br'] // the current corner wins ties, so the card does not jump
  return order.reduce((best, c) => (score(c) > score(best) + 1 ? c : best), current)
}
