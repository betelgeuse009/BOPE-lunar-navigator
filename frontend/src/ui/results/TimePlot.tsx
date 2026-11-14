import { useState } from 'react'
import type { Ephemeris } from '../../data/api'
import { useApp } from '../../state/store'
import { Help } from '../Help'
import { downloadText, ephemerisCsv } from './csv'

// One quantity at a time, Sun and Earth on the same axis (same unit). Display only: the values are the server's.
const QUANTITIES = [
  { id: 'el', label: 'Elevation above the horizontal', unit: '°', sun: 'sun_el_deg', earth: 'earth_el_deg', scale: 1, fixed: null, wraps: false },
  { id: 'az', label: 'Azimuth, clockwise from north', unit: '°', sun: 'sun_az_deg', earth: 'earth_az_deg', scale: 1, fixed: [0, 360], wraps: true },
  { id: 'vis', label: 'Visible part of the disc', unit: ' %', sun: 'sun_visible_frac', earth: 'earth_visible_frac', scale: 100, fixed: [0, 100], wraps: false },
] as const

// Series colours: lower steps of the app's Sun amber and Earth blue, checked for colour-blind separation on black.
const SUN = '#b88228', EARTH = '#5596cd'
const W = 400, H = 220, L = 40, R = 46, T = 10, B = 26
const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const timeFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

// Round tick values that cover [lo, hi] in about four steps.
function ticks(lo: number, hi: number): number[] {
  const raw = (hi - lo) / 4 || 1
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!
  const out = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6))
  return out
}

export function TimePlot({ data, loading, error }: { data: Ephemeris | null; loading: boolean; error: string | null }) {
  const point = useApp((s) => s.point)
  const [qid, setQid] = useState<(typeof QUANTITIES)[number]['id']>('el')
  const [hover, setHover] = useState<number | null>(null)
  if (error) return <p className="error-inline">{error}</p>
  if (!data) return <p className="note">{loading ? 'Computing…' : 'Choose a place to plot its sky over the stay.'}</p>

  const q = QUANTITIES.find((x) => x.id === qid)!
  const n = data.time_utc.length
  const sun = data[q.sun].map((v) => v * q.scale), earth = data[q.earth].map((v) => v * q.scale)
  let lo = q.fixed?.[0] ?? Math.min(0, ...sun, ...earth), hi = q.fixed?.[1] ?? Math.max(0, ...sun, ...earth)
  if (!q.fixed) { const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad }
  const x = (i: number) => L + ((W - L - R) * i) / Math.max(n - 1, 1)
  const y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo))
  // An azimuth that passes north jumps between 360 and 0: lift the pen there instead of drawing across the chart.
  const path = (s: number[]) => s.map((v, i) => `${i === 0 || (q.wraps && Math.abs(v - s[i - 1]) > 180) ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const xt = [0, 1, 2, 3, 4].map((k) => Math.round(((n - 1) * k) / 4))
  // Name each line at its right end; keep the two names apart when the lines end close together.
  let ys = y(sun[n - 1]), ye = y(earth[n - 1])
  if (Math.abs(ys - ye) < 12) { const mid = (ys + ye) / 2, up = ys <= ye ? -6 : 6; ys = mid + up; ye = mid - up }
  const fmt = (v: number) => `${v.toFixed(q.id === 'vis' ? 0 : 1)}${q.unit}`
  const name = point ? `sky_${point.lat.toFixed(3)}_${point.lon.toFixed(3)}_${data.time_utc[0].slice(0, 16).replace(':', '')}Z.csv` : 'sky.csv'

  return (
    <div className={`plot${loading ? ' stale' : ''}`}>
      <label className="plot-pick">
        <span>Quantity <Help topic="time-series" /></span>
        <select value={qid} onChange={(e) => setQid(e.target.value as typeof qid)}>
          {QUANTITIES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </label>
      <p className="plot-legend" aria-hidden>
        <span><i style={{ background: SUN }} />Sun</span><span><i style={{ background: EARTH }} />Earth</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${q.label} of the Sun and the Earth over the stay`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const f = ((e.clientX - r.left) / r.width * W - L) / (W - L - R)
          setHover(Math.round(Math.min(Math.max(f, 0), 1) * (n - 1)))
        }}
        onPointerLeave={() => setHover(null)}>
        {ticks(lo, hi).map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={v === 0 && q.id === 'el' ? 'plot-zero' : 'plot-grid'} />
            <text x={L - 6} y={y(v) + 3.5} textAnchor="end">{v}{q.unit.trim() === '°' ? '°' : ''}</text>
          </g>
        ))}
        {xt.map((i, k) => <text key={k} x={x(i)} y={H - 8} textAnchor={k === 0 ? 'start' : k === 4 ? 'end' : 'middle'}>{dayFmt.format(new Date(data.time_utc[i]))}</text>)}
        <path d={path(sun)} stroke={SUN} className="plot-line" />
        <path d={path(earth)} stroke={EARTH} className="plot-line" />
        <text x={W - R + 6} y={ys + 3.5} className="plot-name">Sun</text>
        <text x={W - R + 6} y={ye + 3.5} className="plot-name">Earth</text>
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="plot-cross" />
            <circle cx={x(hover)} cy={y(sun[hover])} r={4} fill={SUN} className="plot-dot" />
            <circle cx={x(hover)} cy={y(earth[hover])} r={4} fill={EARTH} className="plot-dot" />
          </g>
        )}
      </svg>
      <p className="plot-read" aria-live="off">
        {hover === null
          ? 'Move over the chart to read the values.'
          : <>{timeFmt.format(new Date(data.time_utc[hover]))} UTC<span><i style={{ background: SUN }} />Sun {fmt(sun[hover])}</span><span><i style={{ background: EARTH }} />Earth {fmt(earth[hover])}</span></>}
      </p>
      <button type="button" className="pin" onClick={() => downloadText(name, ephemerisCsv(data))}>Download CSV</button>
      <Help topic="time-series" />
    </div>
  )
}
