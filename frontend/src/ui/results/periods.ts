import type { Windows } from '../../data/api'

type Win = Windows['sun_windows'][number]
const H = 3_600_000

// Length of a period in hours (display arithmetic on the server's start and end times).
export const durationH = (w: Win) => (Date.parse(w.end_utc) - Date.parse(w.start_utc)) / H

// "13.5 days" from 48 h up, "5.2 h" below.
export const fmtDuration = (h: number) => (h >= 48 ? `${(h / 24).toFixed(1)} days` : `${h.toFixed(1)} h`)

// How often the periods come back: the mean time between the starts of successive periods (rise to rise). A period
// that starts at the beginning of the list window is cut by it (the body was already up), so its start is not a rise
// and is left out. Null when fewer than two rises are found (always up, never up, or one cycle only).
export function repeatPeriod(list: Win[], windowStartUtc: string): { days: number; n: number } | null {
  const t0 = Date.parse(windowStartUtc)
  const rises = list.map((w) => Date.parse(w.start_utc)).filter((t) => t > t0)
  if (rises.length < 2) return null
  return { days: (rises[rises.length - 1] - rises[0]) / (rises.length - 1) / (24 * H), n: rises.length - 1 }
}
