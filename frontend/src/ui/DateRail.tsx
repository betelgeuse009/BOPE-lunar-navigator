import { cellValue } from '../data/load'
import type { Matrix } from '../data/schemas'
import { usePointDays } from '../data/useLive'
import { LIVE_RANGE, landingDay, useApp } from '../state/store'
import { spread } from './colors'
import { Help } from './Help'
import { goodness } from './metrics'

const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// Landing day: a calendar to jump to any date, and a slider over the days that follow it. The slider's track is a
// strip of days, coloured by the chosen place's value on each day (neutral until a place is chosen).
export function DateRail({ matrix }: { matrix: Matrix }) {
  const { dateIdx, metric, mode, staticDates, setDateIdx, setStripStart } = useApp()
  const day = useApp(landingDay)?.slice(0, 10) ?? ''
  const live = mode === 'live'
  const [min, max] = live ? LIVE_RANGE : [staticDates[0]?.slice(0, 10), staticDates[staticDates.length - 1]?.slice(0, 10)]
  // Live: the strip restarts at the chosen day. Offline: only the precomputed days can be chosen.
  const pick = (v: string) => {
    if (!v || v < min || v > max) return
    if (live) return setStripStart(`${v}T00:00:00Z`)
    const i = staticDates.findIndex((d) => d.startsWith(v))
    if (i >= 0) setDateIdx(i)
  }
  const dates = matrix.landing_dates_utc
  const point = useApp((s) => s.point)
  const days = usePointDays(point ? dates[0] : undefined).data
  const best = dates.map((_, d) => (days && point
    ? goodness(cellValue(days, days.site_ids[0], days.cells[metric] ? metric : 'score', d), metric, days.mission_duration_h)
    : null))
  const strip = spread(best) // the days of the strip use the whole palette
  return (
    <div className="rail">
      <div className="rail-head">
        <span><label htmlFor="landing-date">Landing date</label> <Help topic="landing-time" /></span>
        <input id="landing-day" type="date" className="day" aria-label="Landing date (calendar)" value={day} min={min} max={max}
          onChange={(e) => pick(e.target.value)} />
      </div>
      <div className="rail-track">
        <div className="rail-cells" aria-hidden>
          {best.map((v, d) => (
            <span key={d} className={d === dateIdx ? 'on' : ''} style={{ background: strip.color(v) }} />
          ))}
        </div>
        <input
          id="landing-date"
          type="range"
          min={0}
          max={Math.max(dates.length - 1, 0)}
          step={1}
          value={dateIdx}
          onChange={(e) => setDateIdx(Number(e.target.value))}
          aria-valuetext={day}
        />
      </div>
      <div className="rail-ends">
        <span>{fmt.format(new Date(dates[0]))}</span>
        <span>{fmt.format(new Date(dates[dates.length - 1]))}</span>
      </div>
    </div>
  )
}
