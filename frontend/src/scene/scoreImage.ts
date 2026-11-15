import type { Area, ScoreGrid } from '../data/api'
import { metricColor } from '../ui/colors'
import { LAYER_STRIP_DEG, SCORE_MAP } from './layers'

// Images of the "Score for your settings" layer, drawn in the browser from the server's numbers. Colours are
// stretched between the lowest and the highest score of the layer (`range`), so the whole palette is used.
const paint = (s: number, [lo, hi]: [number, number]) => metricColor(hi > lo ? (s - lo) / (hi - lo) : 1)

// Whole Moon: one pixel per grid cell (rows north to south, columns -180 to 180), simple cylindrical.
export function scoreGridImage(g: ScoreGrid, range: [number, number]): string {
  const canvas = document.createElement('canvas')
  canvas.width = g.lon_deg.length; canvas.height = g.lat_deg.length
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  g.score.forEach((row, r) => row.forEach((s, c) => {
    if (s === null) return
    ctx.fillStyle = paint(s, range)
    ctx.fillRect(c, r, 1, 1)
  }))
  return canvas.toDataURL()
}

// The finer disc around the south pole redrawn as a flat strip (0.5 deg of longitude by 0.25 deg of latitude per
// pixel). The server's grid is square in km around the pole: north = toward longitude 0, east = toward 90 E.
export function scoreStrip(a: Area, range: [number, number]): string {
  const sp = SCORE_MAP.spacingKm, w = 720, h = LAYER_STRIP_DEG * 4
  const byCell = new Map<string, number | null>()
  a.points.lat_deg.forEach((lat, i) => {
    const d = (90 + lat) * 30.32, lon = (a.points.lon_deg[i] * Math.PI) / 180
    byCell.set(`${Math.round((d * Math.sin(lon)) / sp)},${Math.round((d * Math.cos(lon)) / sp)}`, a.points.score[i])
  })
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  for (let r = 0; r < h; r++) {
    const d = (LAYER_STRIP_DEG * (1 - (r + 0.5) / h)) * 30.32 // km from the pole (30.32 km per degree)
    for (let c = 0; c < w; c++) {
      const lon = ((-180 + (360 * (c + 0.5)) / w) * Math.PI) / 180
      const s = byCell.get(`${Math.round((d * Math.sin(lon)) / sp)},${Math.round((d * Math.cos(lon)) / sp)}`)
      if (s == null) continue
      ctx.fillStyle = paint(s, range)
      ctx.fillRect(c, r, 1, 1)
    }
  }
  return canvas.toDataURL()
}
