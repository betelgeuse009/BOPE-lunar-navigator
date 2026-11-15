import type { Area, Ephemeris, Evaluation, Horizon } from '../../data/api'
import { SPREAD_KM, useDayStrip, useHorizon, useNearbySpread, usePointDays } from '../../data/useLive'
import { landingDay, useApp } from '../../state/store'
import { fmtH, fmtPct } from '../format'
import { Row, Rows } from './Rows'
import { terrainBlocking, type Blocking } from './why'

const deg = (v: number) => `${v.toFixed(1)}°`
const sector = (s: [number, number]) => (Math.round(s[0]) === Math.round(s[1]) ? `azimuth ${Math.round(s[0])}°` : `azimuth ${Math.round(s[0])}° to ${Math.round(s[1])}°`)
const sc = (v: number | null | undefined) => (v == null ? 'n/a' : v.toFixed(2))

// "Why it changes": how much the result moves with the landing date and time and with the place, and what in the
// sky and the terrain makes it so. Values from the server (strips, uncertainty ring, /api/area, ephemeris, skyline).
export function WhyBlock({ ev, eph }: { ev: Evaluation; eph: Ephemeris | null }) {
  const { dateIdx, minuteUtc } = useApp()
  const first = useApp((s) => s.stripStart ?? s.staticDates[0])
  const day = useApp(landingDay)
  const days = usePointDays(first).data
  const strip = useDayStrip(day).data
  const spread = useNearbySpread(ev.window.start_utc)
  const hor = useHorizon().data

  const dayScores = days?.cells.score?.[0] ?? null
  const k = Math.round(minuteUtc / 10), hours = strip?.cells.score?.[0] ?? null
  const comp = ev.uncertainty_model?.components ?? {}, ring = ev.uncertainty_model?.position_uncertainty_m
  const pos = (key: string, f: (v: number) => string) => {
    const v = comp[key]?.position
    return v == null ? null : `± ${f(v)}`
  }
  const sun = eph && hor && terrainBlocking(eph.sun_az_deg, eph.sun_el_deg, eph.sun_visible_frac, hor.azimuth_deg, hor.horizon_elev_deg)
  const earth = eph && hor && terrainBlocking(eph.earth_az_deg, eph.earth_el_deg, eph.earth_visible_frac, hor.azimuth_deg, hor.horizon_elev_deg)
  const parts = [
    ['sunlight', pos('sunlit_frac', fmtPct)], ['longest night', pos('longest_dark_h', fmtH)],
    ['Earth in view', pos('earth_visible_frac', fmtPct)], ['longest blackout', pos('longest_no_earth_h', fmtH)],
  ].filter(([, v]) => v)
  // Changes that round to zero are named together as "no change".
  const moved = parts.filter(([, v]) => !/^± 0 /.test(v!)), still = parts.filter(([, v]) => /^± 0 /.test(v!)).map(([n]) => n)
  const posText = [...moved.map(([n, v]) => `${n} ${v}`), ...(still.length ? [`no change for ${still.join(' and ')}`] : [])].join('; ')

  return (
    <>
      <Reasons sun={sun} earth={earth} />
      <Rows title="Landing date and time">
        <Row label="1 day earlier / later" help="sensitivity">
          {dayScores ? `${sc(dayScores[dateIdx - 1])} / ${sc(dayScores[dateIdx + 1])} (now ${sc(ev.score.value)})` : '…'}
        </Row>
        <Row label="1 hour earlier / later" help="sensitivity">
          {hours ? `${sc(hours[k - 6])} / ${sc(hours[k + 6])}` : '…'}
        </Row>
        <Row label="Over the 30 days of the strip" help="sensitivity">
          {dayScores ? rangeText(dayScores) : '…'}
        </Row>
      </Rows>
      <Rows title="Place">
        <Row label={`Moving ${ring ?? 100} m (landing accuracy)`} help="uncertainty">
          {posText || 'no change found'}
        </Row>
        <Row label={`Anywhere within ${SPREAD_KM} km`} help="sensitivity">
          {spread.data ? spreadText(spread.data) : spread.error ? 'n/a' : '…'}
        </Row>
      </Rows>
      {eph && hor && <Panorama eph={eph} hor={hor} />}
    </>
  )
}

function rangeText(v: (number | null)[]): string {
  const known = v.filter((x): x is number => x != null)
  return known.length ? `score ${Math.min(...known).toFixed(2)} to ${Math.max(...known).toFixed(2)}` : 'n/a'
}

function spreadText(a: Area): string {
  const [lo, hi] = a.score_range
  const best = a.best && !a.center_is_best ? `; best ${a.best.dist_km.toFixed(1)} km away, bearing ${Math.round(a.best.bearing_deg)}°` : '; this place is the best'
  return `score ${lo.toFixed(2)} to ${hi.toFixed(2)}${best}`
}

// The reasons in words, from the tracks and the skyline.
function Reasons({ sun, earth }: { sun: Blocking | null; earth: Blocking | null }) {
  if (!sun || !earth) return <p className="note">Reading the sky and the skyline…</p>
  const items: string[] = []
  if (sun.maxElDeg < 10) items.push(`The Sun never climbs higher than ${deg(sun.maxElDeg)} here: it skims the horizon, so a hill a few degrees high, or a move of a few hundred metres, can switch the sunlight on or off.`)
  if (sun.hiddenFrac >= 0.01 && sun.hiddenAz) items.push(`For ${fmtPct(sun.hiddenFrac)} of the stay the Sun is above the flat horizon but hidden by terrain, toward ${sector(sun.hiddenAz)}, where the skyline rises to ${deg(sun.skylineMaxDeg ?? 0)}.`)
  if (earth.maxElDeg < 10 && earth.maxElDeg > -10) items.push(`The Earth stays within ${deg(Math.abs(earth.maxElDeg))} of the horizon: it hardly moves in this sky and only the Moon's librations raise and lower it over weeks, so a small ridge decides whether the radio link is possible.`)
  if (earth.hiddenFrac >= 0.01 && earth.hiddenAz) items.push(`For ${fmtPct(earth.hiddenFrac)} of the stay the Earth is above the flat horizon but hidden by terrain, toward ${sector(earth.hiddenAz)}, where the skyline rises to ${deg(earth.skylineMaxDeg ?? 0)}.`)
  if (earth.maxElDeg <= -10) items.push('The Earth never rises here (far side): no direct radio link at any date.')
  if (!items.length) items.push('The Sun and the Earth rise well above the terrain here, so small changes of place or date move the results little; the date still sets where in the 29.5-day lunar day the stay falls.')
  return <ul className="why-reasons">{items.map((t) => <li key={t}>{t}</li>)}</ul>
}

// 360° panorama: the terrain skyline (grey) with the paths of the Sun and the Earth over the stay; bright where the
// body is in view, faint where the terrain or the horizon hides it.
function Panorama({ eph, hor }: { eph: Ephemeris; hor: Horizon }) {
  const els = [...eph.sun_el_deg, ...eph.earth_el_deg, ...hor.horizon_elev_deg]
  const top = Math.min(Math.max(3, ...els.filter((e) => e < 90)) + 1, 90), bottom = Math.max(-4, Math.min(...hor.horizon_elev_deg) - 1)
  const W = 360, Hh = 100, y = (e: number) => ((top - e) / (top - bottom)) * Hh
  const h0 = y(hor.horizon_elev_deg[0])
  const sky = `M0 ${h0} ` + hor.azimuth_deg.map((a, i) => `L${a} ${y(hor.horizon_elev_deg[i])}`).join(' ') + ` L360 ${h0} L360 ${Hh} L0 ${Hh} Z`
  const every = Math.max(1, Math.floor(eph.time_utc.length / 500))
  const dots = (az: number[], el: number[], vis: number[], cls: string) => az.flatMap((a, i) => (i % every || el[i] < bottom || el[i] > top ? []
    : [<circle key={`${cls}${i}`} cx={a} cy={y(el[i])} r="0.9" className={`${cls}${vis[i] >= 0.5 ? '' : ' hidden'}`} />]))
  return (
    <figure className="panorama">
      <svg viewBox={`0 0 ${W} ${Hh}`} preserveAspectRatio="none" role="img" aria-label="Skyline of the place with the paths of the Sun and the Earth over the stay">
        <path d={sky} className="terrain" />
        <line x1="0" x2="360" y1={y(0)} y2={y(0)} className="flat" />
        {dots(eph.sun_az_deg, eph.sun_el_deg, eph.sun_visible_frac, 'sun')}
        {dots(eph.earth_az_deg, eph.earth_el_deg, eph.earth_visible_frac, 'earth')}
      </svg>
      <figcaption>
        <span>N</span><span>E</span><span>S</span><span>W</span><span>N</span>
      </figcaption>
      <p className="note">Skyline (grey) seen from the mast, {deg(bottom)} to {deg(top)} of elevation (stretched); dashed line: flat horizon.
        Dots every {every * 10} min: <span className="k-sun">Sun</span>, <span className="k-earth">Earth</span>; faint where hidden.</p>
    </figure>
  )
}
