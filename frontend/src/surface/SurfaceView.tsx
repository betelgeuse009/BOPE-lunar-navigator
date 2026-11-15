import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { addDays, landingAt } from '../data/load'
import { useSurfaceData } from '../data/useLive'
import { useApp } from '../state/store'
import { AnimationControls } from '../ui/Animation'
import { DEFAULT_ANIMATION, useTicker, type AnimationState } from '../ui/animClock'
import { fmtCoords } from '../ui/format'
import { Help } from '../ui/Help'
import { fmtClock } from '../ui/timeStrip'
import { Compass, ElevationPlot } from './Hud'
import { CardinalMarks, EarthDisc, LookCamera, SkyLights, Stars, SunDisc, Terrain } from './SurfaceScene'
import { STEP_MIN, WINDOW_DAYS, bodyAt, cardinal, nextChange, phaseAt, type BodyNow } from './track'

const fmtIn = (m: number) => {
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = Math.round(m % 60)
  return d ? `${d} d ${h} h` : h ? `${h} h ${mm} min` : `${mm} min`
}
const dayLabel = (dayUtc: string, d: number) => addDays(landingAt(dayUtc, 0), d).slice(0, 10)

// Street-view-like look from the chosen place: a fixed observer who can turn and tilt the view. Sun and Earth move
// along their computed azimuth and elevation (server, SPICE) over WINDOW_DAYS days from the landing day; the skyline
// is the LOLA terrain one (server). The clock is the view's own: it starts at the landing time and does not change it.
export function SurfaceView({ dayUtc }: { dayUtc: string }) {
  const { point, minuteUtc, setSurfaceOpen } = useApp()
  const { eph, hor } = useSurfaceData(dayUtc, WINDOW_DAYS)
  const [tMin, setTMin] = useState(minuteUtc)
  const [view, setView] = useState({ yaw: 0, pitch: 8, fov: 70 })
  const [anim, setAnim] = useState<AnimationState>(DEFAULT_ANIMATION)
  const aimed = useRef(false)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const e = eph.data, h = hor.data
  const tMax = e ? (e.time_utc.length - 1) * STEP_MIN : WINDOW_DAYS * 1440

  useTicker(anim, (step) => setTMin((t) => {
    if (t + step > tMax) { setAnim((a) => ({ ...a, playing: false })); return tMax }
    return t + step
  }))
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setSurfaceOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSurfaceOpen])
  // First look: towards the Earth, the body this navigator is about for communication.
  useEffect(() => {
    if (!e || aimed.current) return
    aimed.current = true
    const earth = bodyAt(e, 'earth', tMin)
    setView((v) => ({ ...v, yaw: earth.az, pitch: Math.max(4, Math.min(earth.el + 4, 60)) }))
  }, [e, tMin])

  const sun = e ? bodyAt(e, 'sun', tMin) : null
  const earth = e ? bodyAt(e, 'earth', tMin) : null
  const phase = e ? phaseAt(e, tMin) : null
  const day = Math.floor(tMin / 1440), tod = tMin % 1440
  const lookAt = (b: BodyNow) => setView((v) => ({ ...v, yaw: b.az, pitch: Math.max(-10, Math.min(b.el, 80)) }))

  const onDown = (ev: React.PointerEvent) => { drag.current = { x: ev.clientX, y: ev.clientY }; ev.currentTarget.setPointerCapture(ev.pointerId) }
  const onMove = (ev: React.PointerEvent) => {
    if (!drag.current) return
    const k = view.fov / ev.currentTarget.clientHeight
    const dx = ev.clientX - drag.current.x, dy = ev.clientY - drag.current.y
    drag.current = { x: ev.clientX, y: ev.clientY }
    setView((v) => ({ ...v, yaw: (v.yaw - dx * k + 360) % 360, pitch: Math.max(-60, Math.min(89, v.pitch + dy * k)) }))
  }
  const onWheel = (ev: React.WheelEvent) => setView((v) => ({ ...v, fov: Math.max(8, Math.min(100, v.fov * (ev.deltaY > 0 ? 1.1 : 1 / 1.1))) }))

  return (
    <div className="surface" role="dialog" aria-modal="true" aria-label="Surface view of the chosen place">
      <div className="surface-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }} onWheel={onWheel}>
        <Canvas camera={{ fov: view.fov, near: 0.1, far: 3000 }} gl={{ antialias: true }}>
          <color attach="background" args={['#000']} />
          <LookCamera {...view} />
          <Stars />
          {sun && earth && (
            <Suspense fallback={null}>
              <SkyLights sun={sun} earth={earth} phase={phase} />
              <SunDisc sun={sun} />
              <EarthDisc earth={earth} sun={sun} />
              {h && <Terrain az={h.azimuth_deg} el={h.horizon_elev_deg} obsHeightM={h.observer_height_m} />}
              <CardinalMarks />
            </Suspense>
          )}
        </Canvas>
      </div>

      <header className="surface-top">
        <h2>Surface view <Help topic="surface-view" /></h2>
        {point && <span className="surface-where">{fmtCoords(point.lat, point.lon)}</span>}
        <span className="surface-hint">Drag to look around · wheel to zoom</span>
        <button type="button" className="surface-close" onClick={() => setSurfaceOpen(false)} aria-label="Close the surface view">Close ✕</button>
      </header>

      {(eph.loading || hor.loading) && !e && <p className="surface-msg">Computing the Sun, the Earth and the skyline for {WINDOW_DAYS} days…</p>}
      {(eph.error || hor.error) && <p className="surface-msg error" role="alert">Could not compute the view: {eph.error ?? hor.error}</p>}

      {e && sun && earth && (
        <aside className="surface-read">
          <p className="surface-time">{dayLabel(dayUtc, day)} {fmtClock(Math.round(tod))} UTC</p>
          {([['sun', 'Sun', sun, e.sun_visible_frac], ['earth', 'Earth', earth, e.earth_visible_frac]] as const).map(([id, name, b, vis]) => {
            const next = nextChange(vis, tMin)
            return (
              <div key={id} className="surface-body">
                <button type="button" className={id} onClick={() => lookAt(b)} title={`Turn the view towards the ${name}`}>{name}</button>
                <span>az {b.az.toFixed(1)}° {cardinal(b.az)} · el {b.el.toFixed(1)}°</span>
                <span className="dim">
                  {b.vis >= 0.995 ? 'in view' : b.vis <= 0.005 ? 'behind the terrain' : `${Math.round(b.vis * 100)} % of the disc in view`}
                  {id === 'earth' && phase !== null ? ` · ${Math.round(phase * 100)} % lit` : ''}
                  {next ? ` · ${id === 'sun' ? (next.kind === 'rise' ? 'sunrise' : 'sunset') : (next.kind === 'rise' ? 'Earthrise' : 'Earthset')} in ${fmtIn(next.inMin)}` : ''}
                </span>
              </div>
            )
          })}
        </aside>
      )}

      <div className="surface-bottom">
        <Compass yaw={view.yaw} sunAz={sun?.az ?? 0} earthAz={earth?.az ?? 0} />
        {e && h && (
          <div className="surface-plots">
            <ElevationPlot eph={e} hor={h} body="sun" tMin={tMin} onSeek={setTMin} />
            <ElevationPlot eph={e} hor={h} body="earth" tMin={tMin} onSeek={setTMin} />
          </div>
        )}
        <div className="surface-time-panel">
          <label className="slider">
            <span>Date</span><output>{dayLabel(dayUtc, day)} (day {day + 1})</output>
            <input type="range" min={0} max={WINDOW_DAYS - 1} step={1} value={Math.min(day, WINDOW_DAYS - 1)}
              onChange={(ev) => setTMin(Math.min(Number(ev.target.value) * 1440 + tod, tMax))} />
          </label>
          <label className="slider">
            <span>Time of day</span><output>{fmtClock(Math.round(tod))} UTC</output>
            <input type="range" min={0} max={1439} step={1} value={Math.round(tod)}
              onChange={(ev) => setTMin(Math.min(day * 1440 + Number(ev.target.value), tMax))} />
          </label>
          <AnimationControls a={anim} set={setAnim} help="animation" compact />
        </div>
      </div>
    </div>
  )
}
