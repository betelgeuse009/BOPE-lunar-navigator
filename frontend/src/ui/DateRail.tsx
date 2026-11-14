import { cellValue } from '../data/load'
import type { Matrix } from '../data/schemas'
import { useApp } from '../state/store'
import { metricColor } from './colors'
import { Help } from './Help'
import { goodness } from './metrics'

const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// Landing-date slider whose track is a strip of days, each coloured by the best site's score that day.
export function DateRail({ matrix }: { matrix: Matrix }) {
  const { dateIdx, metric, setDateIdx } = useApp()
  const dates = matrix.landing_dates_utc
  const best = dates.map((_, d) => {
    const vals = matrix.site_ids
      .map((id) => goodness(cellValue(matrix, id, metric, d), metric, matrix.mission_duration_h))
      .filter((v): v is number => v !== null)
    return vals.length ? Math.max(...vals) : null
  })
  return (
    <div className="rail">
      <div className="rail-head">
        <span><label htmlFor="landing-date">Landing date</label> <Help topic="landing-time" /></span>
        <output htmlFor="landing-date">{fmt.format(new Date(dates[dateIdx]))}</output>
      </div>
      <div className="rail-track">
        <div className="rail-cells" aria-hidden>
          {best.map((v, d) => (
            <span key={d} className={d === dateIdx ? 'on' : ''} style={{ background: metricColor(v) }} />
          ))}
        </div>
        <input
          id="landing-date"
          type="range"
          min={0}
          max={dates.length - 1}
          step={1}
          value={dateIdx}
          onChange={(e) => setDateIdx(Number(e.target.value))}
          aria-valuetext={fmt.format(new Date(dates[dateIdx]))}
        />
      </div>
      <div className="rail-ends">
        <span>{fmt.format(new Date(dates[0]))}</span>
        <span>Each day shows the best site for a {+(matrix.mission_duration_h / 24).toFixed(1)}-day mission landing then</span>
        <span>{fmt.format(new Date(dates[dates.length - 1]))}</span>
      </div>
    </div>
  )
}
