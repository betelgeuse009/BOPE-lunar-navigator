import type { Windows } from '../../data/api'

type Win = Windows['sun_windows'][number]
const H = 3_600_000

// Length of a period in hours (display arithmetic on the server's start and end times).
export const durationH = (w: Win) => (Date.parse(w.end_utc) - Date.parse(w.start_utc)) / H

// "13.5 days" from 48 h up, "5.2 h" below.
export const fmtDuration = (h: number) => (h >= 48 ? `${(h / 24).toFixed(1)} days` : `${h.toFixed(1)} h`)

// Lags searched for the repeat period, days: monthly cycles only (documented in the visibility-windows topic).
export const REPEAT_LAG_DAYS: [number, number] = [10, 45]
// Below this autocorrelation the in-view pattern is not regular enough to call it a cycle.
export const REPEAT_MIN_R = 0.5

// How often the in-view pattern comes back: the lag (1 h resolution) at which the in-view / not-in-view series over
// [startUtc, startUtc + days] best matches itself shifted (highest autocorrelation). Short interruptions by a ridge do
// not count as new cycles, unlike counting rises. Null when the body is always or never in view, or no lag reaches
// REPEAT_MIN_R.
export function repeatPeriod(list: Win[], startUtc: string, days: number): { days: number; r: number } | null {
  const t0 = Date.parse(startUtc), n = Math.round(days * 24)
  const x = new Float64Array(n)
  for (const w of list) {
    const a = Math.max(0, Math.ceil((Date.parse(w.start_utc) - t0) / H)), b = Math.min(n, Math.floor((Date.parse(w.end_utc) - t0) / H) + 1)
    for (let i = a; i < b; i++) x[i] = 1
  }
  const mean = x.reduce((s, v) => s + v, 0) / n
  const v = x.map((y) => y - mean)
  const variance = v.reduce((s, y) => s + y * y, 0) / n
  if (variance < 1e-9) return null
  let best = { lag: 0, r: -Infinity }
  for (let lag = REPEAT_LAG_DAYS[0] * 24; lag <= Math.min(REPEAT_LAG_DAYS[1] * 24, n - 1); lag++) {
    let s = 0
    for (let i = 0; i + lag < n; i++) s += v[i] * v[i + lag]
    const r = s / (n - lag) / variance
    if (r > best.r) best = { lag, r }
  }
  return best.r >= REPEAT_MIN_R ? { days: best.lag / 24, r: best.r } : null
}
