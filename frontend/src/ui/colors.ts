// Sequential scale for a 0..1 "goodness" value: dark violet (poor) → teal → pale gold (good).
// Hour-valued metrics are normalised by the caller before colouring.
export const NO_DATA = '#5b5f66'

const STOPS: [number, number, number][] = [
  [0x3b, 0x1f, 0x5c],
  [0x2a, 0x6f, 0x97],
  [0x2f, 0xb3, 0x9a],
  [0xf2, 0xe0, 0x8a],
]

export function metricColor(v: number | null): string {
  if (v === null) return NO_DATA
  const t = Math.min(1, Math.max(0, v)) * (STOPS.length - 1)
  const i = Math.min(Math.floor(t), STOPS.length - 2)
  const f = t - i
  const rgb = STOPS[i].map((c, k) => Math.round(c + (STOPS[i + 1][k] - c) * f))
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
}

// Colours that use the whole palette: the values of one set (the sites on one date, the days of the calendar strip)
// are stretched between the lowest and the highest of the set. `range` is what the legend prints.
export function spread(values: (number | null)[]): { color: (v: number | null) => string; lo: number | null; hi: number | null } {
  const ok = values.filter((v): v is number => v !== null)
  const lo = ok.length ? Math.min(...ok) : null, hi = ok.length ? Math.max(...ok) : null
  return { lo, hi, color: (v) => metricColor(v === null || lo === null || hi === null ? v : hi > lo ? (v - lo) / (hi - lo) : 1) }
}

// Area-search colours. 'absolute': the score itself (0..1, honest default while terrain is missing).
// 'relative': stretched to the range found in this disc, to spot the best patch nearby.
export type ScaleMode = 'absolute' | 'relative'
export function areaColor(score: number | null, range: [number, number], mode: ScaleMode): string {
  if (score === null || mode === 'absolute') return metricColor(score)
  const [lo, hi] = range
  return metricColor(hi > lo ? (score - lo) / (hi - lo) : 1)
}
