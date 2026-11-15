import { cellValue } from '../data/load'
import type { Matrix } from '../data/schemas'
import { spread } from './colors'
// How each matrix field is labelled and turned into a 0..1 "goodness" for colouring.
// Display mapping only; the values themselves come from AERO's files.
type Meta = { label: string; unit: 'frac' | 'h'; higherIsBetter: boolean }

const META: Record<string, Meta> = {
  score: { label: 'Overall score', unit: 'frac', higherIsBetter: true },
  both_frac: { label: 'Sunlight and Earth in view', unit: 'frac', higherIsBetter: true },
  sunlit_frac: { label: 'Time in sunlight', unit: 'frac', higherIsBetter: true },
  earth_visible_frac: { label: 'Time with Earth in view', unit: 'frac', higherIsBetter: true },
  longest_dark_h: { label: 'Longest darkness', unit: 'h', higherIsBetter: false },
  longest_no_earth_h: { label: 'Longest without Earth', unit: 'h', higherIsBetter: false },
}

export const metricMeta = (field: string): Meta =>
  META[field] ?? { label: field, unit: 'frac', higherIsBetter: true }

export function goodness(v: number | null, field: string, missionDurationH: number): number | null {
  if (v === null) return null
  const m = metricMeta(field)
  const t = m.unit === 'h' ? v / missionDurationH : v
  return m.higherIsBetter ? t : 1 - t
}

// Colour of every catalogue site for one metric and date, stretched between the worst and the best site so the
// differences show. `worst` and `best` are the raw values behind the two ends of the colour bar.
export function siteScale(matrix: Matrix, field: string, dateIdx: number) {
  const raw = matrix.site_ids.map((id) => cellValue(matrix, id, field, dateIdx))
  const good = raw.map((v) => goodness(v, field, matrix.mission_duration_h))
  const s = spread(good)
  const pick = (g: number | null) => raw[good.indexOf(g)] ?? null
  return { color: (siteId: string) => s.color(good[matrix.site_ids.indexOf(siteId)] ?? null), worst: pick(s.lo), best: pick(s.hi) }
}

export function formatValue(v: number | null, field: string): string {
  if (v === null) return 'no data'
  if (field === 'score') return v.toFixed(2)
  return metricMeta(field).unit === 'h' ? `${Math.round(v)} h` : `${Math.round(v * 100)} %`
}

// Which body a parameter is about, so the UI can mark Sun numbers amber and Earth numbers blue.
export function domain(field: string): 'sun' | 'earth' | undefined {
  if (/earth/.test(field)) return 'earth'
  if (/sun|dark|lit/.test(field)) return 'sun'
  return undefined
}
