import type { Evaluation, Windows } from '../../data/api'
import { Help } from '../Help'
import { Status } from '../Status'
import { useWarn } from '../useWarn'
import { countdownText } from './countdownText'

const whenFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
const H = 3_600_000

// Top of the Results pane: time left before sunset and Earthset (the operational numbers), then the stay as two bars
// with the periods in view shaded, so the order of events is visible at a glance. Values from /api/evaluate and
// /api/metrics; nothing is computed here except positions on the bar.
export function Countdown({ ev, windows }: { ev: Evaluation; windows: Windows | null }) {
  const warn = useWarn(ev)
  const p = ev.parameters, stay = ev.window.duration_h
  const t0 = Date.parse(ev.window.start_utc)
  const at = (h: number) => whenFmt.format(new Date(t0 + h * H))
  const line = (body: 'sun' | 'earth', loss: string, gain: string) => {
    const toLoss = p[loss]?.value ?? null, toGain = p[gain]?.value
    return (
      <p className={`countdown-line ${body}`}>
        <span className="cd-icon" aria-hidden>{body === 'sun' ? '☀' : '◐'}</span>
        <strong>{countdownText(body, toLoss, toGain, stay)}</strong>
        {toLoss != null && toLoss > 0 && <small>{at(toLoss)} UTC</small>}
        {toLoss === 0 && toGain != null && <small>{at(toGain)} UTC</small>}
        <Status v={warn(loss)} />
      </p>
    )
  }
  return (
    <div className="countdown">
      <h3 className="rows-title">Time left in view <Help topic="countdowns" /></h3>
      {line('sun', 'hours_to_first_dark_h', 'hours_to_first_sun_h')}
      {line('earth', 'hours_to_first_earth_loss_h', 'hours_to_first_earth_h')}
      {windows && <StayBars windows={windows} t0={t0} stayH={stay} />}
    </div>
  )
}

// The stay from landing (left) to the end (right): one bar per body, filled where it is in view.
function StayBars({ windows, t0, stayH }: { windows: Windows; t0: number; stayH: number }) {
  const x = (iso: string) => Math.min(Math.max((Date.parse(iso) - t0) / H / stayH, 0), 1) * 100
  const days = Math.floor(stayH / 24)
  const bar = (list: Windows['sun_windows'], y: number, cls: string) => (
    <g className={cls}>
      <rect x="0" y={y} width="100" height="7" className="track" />
      {list.map((w) => <rect key={w.start_utc} x={x(w.start_utc)} y={y} width={Math.max(x(w.end_utc) - x(w.start_utc), 0.3)} height="7" />)}
    </g>
  )
  return (
    <figure className="stay-bars">
      <svg viewBox="0 0 100 20" preserveAspectRatio="none" role="img"
        aria-label={`Stay of ${days} days: ${windows.sun_windows.length} sunlit periods, ${windows.earth_windows.length} periods with the Earth in view`}>
        {bar(windows.sun_windows, 1, 'sun')}
        {bar(windows.earth_windows, 12, 'earth')}
        {Array.from({ length: days + 1 }, (_, d) => <line key={d} x1={(d * 24 / stayH) * 100} x2={(d * 24 / stayH) * 100} y1="0" y2="20" className="day" />)}
      </svg>
      <figcaption><span>landing</span><span className="key"><i className="sun" />Sun <i className="earth" />Earth in view</span><span>+{days} d</span></figcaption>
    </figure>
  )
}
