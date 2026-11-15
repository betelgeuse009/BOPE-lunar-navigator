import { useMemo } from 'react'
import type { Ephemeris, Horizon } from '../data/api'
import { STEP_MIN, cardinal } from './track'

// Compass: the ring turns with the view so that the top is the direction looked at; Sun and Earth sit at their azimuths.
export function Compass({ yaw, sunAz, earthAz }: { yaw: number; sunAz: number; earthAz: number }) {
  const mark = (az: number, r: number) => {
    const a = ((az - yaw) * Math.PI) / 180
    return { cx: 50 + r * Math.sin(a), cy: 50 - r * Math.cos(a) }
  }
  const head = ((Math.round(yaw) % 360) + 360) % 360
  return (
    <div className="compass" aria-label={`Looking towards ${head} degrees, ${cardinal(yaw)}`}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="44" className="ring" />
        {Array.from({ length: 36 }, (_, i) => {
          const a = ((i * 10 - yaw) * Math.PI) / 180, r1 = i % 9 === 0 ? 34 : 39
          return <line key={i} x1={50 + r1 * Math.sin(a)} y1={50 - r1 * Math.cos(a)} x2={50 + 44 * Math.sin(a)} y2={50 - 44 * Math.cos(a)} className="tick" />
        })}
        {['N', 'E', 'S', 'W'].map((c, i) => {
          const p = mark(i * 90, 26)
          return <text key={c} x={p.cx} y={p.cy} className={c === 'N' ? 'north' : ''} textAnchor="middle" dominantBaseline="central">{c}</text>
        })}
        <circle {...mark(sunAz, 44)} r="5" className="sun-dot" />
        <circle {...mark(earthAz, 44)} r="5" className="earth-dot" />
        <path d="M50 1 54 9H46z" className="heading" />
      </svg>
      <p>{head}° {cardinal(yaw)}</p>
    </div>
  )
}

// Elevation of one body over the whole window, with the terrain skyline in the body's direction (dashed) and the
// periods in view shaded (at least half of the disc above the skyline). Clicking moves the clock there.
export function ElevationPlot({ eph, hor, body, tMin, onSeek }: {
  eph: Ephemeris; hor: Horizon; body: 'sun' | 'earth'; tMin: number; onSeek: (tMin: number) => void
}) {
  const W = 320, H = 92, PAD_L = 30, PAD_B = 14
  const g = useMemo(() => {
    const el = body === 'sun' ? eph.sun_el_deg : eph.earth_el_deg
    const az = body === 'sun' ? eph.sun_az_deg : eph.earth_az_deg
    const vis = body === 'sun' ? eph.sun_visible_frac : eph.earth_visible_frac
    const n = el.length, nh = hor.horizon_elev_deg.length
    const sky = az.map((a) => hor.horizon_elev_deg[Math.round((((a % 360) + 360) % 360) / (360 / nh)) % nh])
    let lo = Math.min(...el, ...sky), hi = Math.max(...el, ...sky)
    const pad = Math.max(1, (hi - lo) * 0.08); lo -= pad; hi += pad
    const x = (k: number) => PAD_L + (k / (n - 1)) * (W - PAD_L - 2)
    const y = (v: number) => 2 + (1 - (v - lo) / (hi - lo)) * (H - PAD_B - 4)
    const every = Math.max(1, Math.floor(n / 600))
    const line = (v: number[]) => v.filter((_, k) => k % every === 0 || k === n - 1)
      .map((val, j) => `${x(Math.min(j * every, n - 1)).toFixed(1)},${y(val).toFixed(1)}`).join(' ')
    const bands: [number, number][] = []
    let s = -1
    for (let k = 0; k <= n; k++) {
      const up = k < n && vis[k] >= 0.5
      if (up && s < 0) s = k
      if (!up && s >= 0) { bands.push([x(s), x(k - 1)]); s = -1 }
    }
    const ticks: number[] = []
    for (let v = Math.ceil(lo / 5) * 5; v <= hi; v += (hi - lo) > 40 ? 20 : (hi - lo) > 15 ? 10 : 5) ticks.push(v)
    return { n, x, y, el: line(el), sky: line(sky), bands, ticks, zero: lo < 0 && hi > 0 ? y(0) : null }
  }, [eph, hor, body])
  const days = Math.round((g.n * STEP_MIN) / 1440)
  const cx = g.x(Math.min(tMin / STEP_MIN, g.n - 1))
  const seek = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const f = ((e.clientX - r.left) / r.width * W - PAD_L) / (W - PAD_L - 2)
    onSeek(Math.round(Math.min(Math.max(f, 0), 1) * (g.n - 1)) * STEP_MIN)
  }
  return (
    <figure className={`elev-plot ${body}`}>
      <figcaption><span className={body}>{body === 'sun' ? 'Sun' : 'Earth'}</span> elevation, {days} days<i>shaded: in view · dashed: skyline</i></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} onPointerDown={seek} role="img"
        aria-label={`${body === 'sun' ? 'Sun' : 'Earth'} elevation over ${days} days; click to move the time`}>
        {g.bands.map(([a, b], i) => <rect key={i} x={a} y={0} width={Math.max(b - a, 1)} height={H - PAD_B} className="band" />)}
        {Array.from({ length: days }, (_, d) => <line key={d} x1={g.x((d * 1440) / STEP_MIN)} x2={g.x((d * 1440) / STEP_MIN)} y1={H - PAD_B} y2={H - PAD_B + (d % 5 ? 2 : 4)} className="axis" />)}
        {g.ticks.map((v) => <g key={v}><line x1={PAD_L} x2={W} y1={g.y(v)} y2={g.y(v)} className="grid" /><text x={PAD_L - 4} y={g.y(v)} textAnchor="end" dominantBaseline="central">{v}°</text></g>)}
        {g.zero !== null && <line x1={PAD_L} x2={W} y1={g.zero} y2={g.zero} className="zero" />}
        <polyline points={g.sky} className="sky" />
        <polyline points={g.el} className="el" />
        <line x1={cx} x2={cx} y1={0} y2={H - PAD_B} className="cursor" />
        <text x={PAD_L} y={H - 2} className="day">day 1</text>
        <text x={W} y={H - 2} textAnchor="end" className="day">day {days}</text>
      </svg>
    </figure>
  )
}
