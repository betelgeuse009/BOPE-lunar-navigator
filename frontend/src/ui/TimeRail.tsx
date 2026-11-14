import { useDayStrip } from '../data/useLive'
import { useApp } from '../state/store'
import { metricColor } from './colors'
import { formatValue, goodness } from './metrics'
import { STRIP_STEP_MIN, fmtClock, relativeToDay } from './timeStrip'
import { Help } from './Help'

// Landing time of day, 1 min steps. The strip behind it is sampled every 10 min (cheap: one /api/matrix call per day)
// and coloured relative to that day. Live mode only: the offline files exist for 00:00 UTC landings.
export function TimeRail({ dateUtc, siteIds }: { dateUtc: string; siteIds: string[] }) {
  const { minuteUtc, setMinuteUtc, mode, metric } = useApp()
  const live = mode === 'live'
  const strip = useDayStrip(dateUtc, siteIds)
  const day = strip.data
  const field = day && metric in day.cells ? metric : 'score'
  // Per 10-min slot: the best place's goodness (for the colour) and its value in real units (for the label).
  const best = day
    ? day.landing_dates_utc.map((_, t) => {
        let g: number | null = null, v: number | null = null
        for (let i = 0; i < day.site_ids.length; i++) {
          const x = day.cells[field]?.[i]?.[t] ?? null
          const gx = goodness(x, field, day.mission_duration_h)
          if (gx !== null && (g === null || gx > g)) { g = gx; v = x }
        }
        return { g, v }
      })
    : []
  const rel = relativeToDay(best.map((b) => b.g))
  const worstV = best.find((b) => b.g === rel.min)?.v ?? null
  const bestV = best.find((b) => b.g === rel.max)?.v ?? null
  const value = live ? minuteUtc : 0
  const on = Math.floor(value / STRIP_STEP_MIN)

  return (
    <div className={`rail rail-time${strip.loading ? ' stale' : ''}`}>
      <div className="rail-head">
        <span><label htmlFor="landing-time">Landing time</label> <Help topic="landing-time" /></span>
        <output htmlFor="landing-time">{fmtClock(value)} UTC</output>
        {!live && <span className="note-inline">Start the analysis server to choose the time; offline data is for 00:00 UTC.</span>}
        {strip.error && <span className="error-inline">{strip.error}</span>}
      </div>
      <div className="rail-track">
        <div className="rail-cells" aria-hidden>
          {(rel.scaled.length ? rel.scaled : Array.from({ length: (24 * 60) / STRIP_STEP_MIN }, () => null)).map((v, t) => (
            <span key={t} className={t === on ? 'on' : ''} style={{ background: metricColor(v) }} />
          ))}
        </div>
        <input id="landing-time" type="range" min={0} max={24 * 60 - 1} step={1} value={value} disabled={!live}
          onChange={(e) => setMinuteUtc(Number(e.target.value))} aria-valuetext={`${fmtClock(value)} UTC`} />
      </div>
      <div className="rail-ends">
        <span>00:00</span>
        <span>
          {rel.min !== null
            ? `Worst ${formatValue(worstV, field)}, best ${formatValue(bestV, field)}`
            : live && !strip.error ? 'Computing the day…' : ''}
        </span>
        <span>23:59</span>
      </div>
    </div>
  )
}
