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

export function formatValue(v: number | null, field: string): string {
  if (v === null) return 'no data'
  if (field === 'score') return v.toFixed(2)
  return metricMeta(field).unit === 'h' ? `${Math.round(v)} h` : `${Math.round(v * 100)} %`
}
