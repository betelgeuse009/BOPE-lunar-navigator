// Pure helpers for the horizon panorama (display only; positions come from AERO's ephemeris).

export type TrackPoint = { az: number; el: number; i: number }
export type Segment = { visible: boolean; points: TrackPoint[] }

// "Visible" uses the same rule as the contract's sun threshold default: at least half the disc above the horizon.
const VISIBLE_FRAC = 0.5

// Cut a Sun or Earth track into drawable pieces: a new piece starts where the azimuth wraps around
// 360 -> 0 (or back) and where the body goes from visible to hidden or back.
export function trackSegments(az: number[], el: number[], visibleFrac: number[]): Segment[] {
  const out: Segment[] = []
  let cur: Segment | null = null
  for (let i = 0; i < az.length; i++) {
    const visible = visibleFrac[i] >= VISIBLE_FRAC
    const wrapped = cur && Math.abs(az[i] - cur.points[cur.points.length - 1].az) > 180
    if (!cur || cur.visible !== visible || wrapped) {
      cur = { visible, points: [] }
      out.push(cur)
    }
    cur.points.push({ az: az[i], el: el[i], i })
  }
  return out
}

// Vertical range for the chart: the data plus a margin, always including the horizon (0 deg) and spanning
// at least 6 deg so a polar Sun circling at 1-2 deg is still readable. Clamped to the nadir/zenith.
export function elevationRange(series: number[][]): [number, number] {
  let lo = 0, hi = 0
  for (const s of series) for (const v of s) { if (v < lo) lo = v; if (v > hi) hi = v }
  const pad = Math.max(1, (hi - lo) * 0.08)
  lo -= pad; hi += pad
  if (hi - lo < 6) { const mid = (hi + lo) / 2; lo = mid - 3; hi = mid + 3 }
  return [Math.max(-90, lo), Math.min(90, hi)]
}
