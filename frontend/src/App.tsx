import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { isPreliminary, landingAt, loadAll, loadScene, periodAt, sceneIndexAt } from './data/load'
import type { Scene } from './data/schemas'
import { useApiHealth, useAreaSearch, useEvaluation, useLiveMatrix } from './data/useLive'
import { AreaDots, PointMarkers } from './scene/AreaLayer'
import { CameraFocus } from './scene/CameraFocus'
import { vec3ToLatLon } from './scene/geo'
import { Lights, Moon } from './scene/Moon'
import { SiteMarkers } from './scene/SiteMarkers'
import { SouthCap } from './scene/SouthCap'
import { useApp } from './state/store'
import { metricColor } from './ui/colors'
import { Catalogue } from './ui/Catalogue'
import { ComparePanel } from './ui/ComparePanel'
import { DateRail } from './ui/DateRail'
import { TimeRail } from './ui/TimeRail'
import { metricMeta } from './ui/metrics'
import { EvaluationPanel } from './ui/EvaluationPanel'
import { MissionSettings, NearbySearch, ScoreSettings } from './ui/SettingsPanel'
import { SitePanel } from './ui/SitePanel'

// public/data/ is filled by scripts/sync-data.mjs from data/processed/ (or data/samples/ until AERO publishes)
const DATA_BASE: string = import.meta.env.VITE_DATA_BASE ?? `${import.meta.env.BASE_URL}data/`
type Data = Awaited<ReturnType<typeof loadAll>>

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scene, setScene] = useState<Scene | null>(null)
  const { metric, dateIdx, minuteUtc, mode, point, scaleMode, pins, compareOpen, setMetric, setDateCount, setSelected, setPoint, setCompareOpen } = useApp()
  useApiHealth()

  useEffect(() => {
    loadAll(DATA_BASE)
      .then((d) => { setData(d); setDateCount(d.matrix.landing_dates_utc.length) })
      .catch((e: Error) => setError(e.message))
  }, [setDateCount])

  // Landing time: the chosen date at the chosen time of day (live only; the offline files are computed at 00:00 UTC).
  const landingDate = data?.matrix.landing_dates_utc[dateIdx]
  const landingUtc = landingDate && landingAt(landingDate, mode === 'live' ? minuteUtc : 0)
  // Scene file (sub-solar point over time) for the month that contains the selected landing time.
  const periodId = data && landingUtc && data.manifest.has_scene ? periodAt(data.manifest, landingUtc)?.id : undefined
  useEffect(() => {
    if (!periodId) return setScene(null)
    let live = true
    loadScene(DATA_BASE, periodId).then((s) => live && setScene(s)).catch(() => live && setScene(null))
    return () => { live = false }
  }, [periodId])
  // Live mode: matrix recomputed with the user's settings; otherwise the precomputed file.
  const siteIds = useMemo(() => data?.sites.sites.map((s) => s.id) ?? [], [data])
  const live = useLiveMatrix(data?.matrix ?? null, siteIds)
  const matrix = live.data ?? data?.matrix ?? null
  useEffect(() => {
    if (matrix && !(metric in matrix.cells)) setMetric('both_frac')
  }, [matrix, metric, setMetric])
  const ev = useEvaluation(landingUtc)
  const area = useAreaSearch(landingUtc)

  const i = scene && landingUtc ? sceneIndexAt(scene, landingUtc) : -1
  const subsolar = scene && i >= 0 ? { lat: scene.subsolar_lat_deg[i], lon: scene.subsolar_lon_deg[i] } : null

  const legend = (
    <div className="legend">
      <span>{metricMeta(metric).higherIsBetter ? 'Less' : 'More'}</span>
      <span className="ramp" style={{ background: `linear-gradient(90deg, ${[0, 0.33, 0.66, 1].map(metricColor).join(',')})` }} />
      <span>{metricMeta(metric).higherIsBetter ? 'More' : 'Less'}</span>
      <span className="nodata"><i style={{ background: metricColor(null) }} />No data</span>
    </div>
  )

  // Layout: the globe stays fixed on the left; the chapters scroll on the right
  // (docs/superpowers/specs/2026-11-14-chapters-layout-design.md).
  return (
    <div className="app">
      <div className="stage">
        <Canvas camera={{ position: [1.2, -3.0, 1.45], fov: 35, near: 0.01 }} onPointerMissed={() => setSelected(null)}>
          <color attach="background" args={['#000000']} />
          <Lights subsolar={subsolar} />
          <Suspense fallback={null}>
            <group
              onClick={(e) => {
                if (e.delta > 4 || mode !== 'live') return // a drag, or no API to ask
                e.stopPropagation()
                const [lat, lon] = vec3ToLatLon(e.point.x, e.point.y, e.point.z)
                setPoint({ lat, lon })
                setSelected(null)
              }}
            >
              <Moon />
              <SouthCap />
            </group>
          </Suspense>
          {data && matrix && <SiteMarkers sites={data.sites.sites} matrix={matrix} />}
          {area.data && <AreaDots area={area.data} mode={scaleMode} />}
          {point && <PointMarkers point={point} best={area.data && !area.data.center_is_best ? area.data.best : null} />}
          <OrbitControls makeDefault enablePan={false} minDistance={1.15} maxDistance={6} rotateSpeed={0.5} zoomSpeed={0.7} />
          <CameraFocus point={point} />
        </Canvas>
        <div className="stage-foot">
          {data && matrix && legend}
          <p className="credit">
            Moon imagery: NASA's Scientific Visualization Studio, CGI Moon Kit; south pole: LROC WAC mosaic and LOLA 80 m elevation.
            Relief exaggerated four times.{' '}
            {subsolar
              ? `Sunlight from the Sun's position at landing time (sub-solar point ${subsolar.lat.toFixed(1)}°, ${subsolar.lon.toFixed(1)}°).`
              : 'Lighting is illustrative: no Sun position data for this date.'}
          </p>
        </div>
      </div>

      <main className="chapters">
        <header className="top">
          <h1>Lunar landing site navigator</h1>
          <p className={`mode mode-${mode}`} title={mode === 'live' ? 'Connected to the analysis server: click anywhere on the Moon.' : undefined}>
            {mode === 'live' ? (live.loading ? 'Live analysis: updating…' : 'Live analysis') : mode === 'static' ? 'Offline data' : 'Connecting…'}
          </p>
          {data && matrix && (
            <label className="metric">
              Colour sites by
              <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                {Object.keys(matrix.cells).map((f) => <option key={f} value={f}>{metricMeta(f).label}</option>)}
              </select>
            </label>
          )}
          {data && (
            <button type="button" className="compare-toggle" disabled={pins.length === 0} aria-pressed={compareOpen}
              title={pins.length === 0 ? 'Pin a site or a clicked point with "+ Compare at this date" first.' : undefined}
              onClick={() => setCompareOpen(!compareOpen)}>
              Compare ({pins.length})
            </button>
          )}
          {matrix && isPreliminary(matrix) && (
            <p className="fixture" title={matrix.source.notes}>Preliminary data: {matrix.source.notes}</p>
          )}
        </header>

        {error && <p className="error" role="alert">Could not load the site data. {error}</p>}
        {live.error && <p className="error" role="alert">Live analysis failed: {live.error}. Showing precomputed data.</p>}
        {mode === 'static' && (
          <p className="note">
            Live analysis is off: the analysis server is not running. Start it with <code>npm run api</code> and reload.
            Site colours use the precomputed defaults.
          </p>
        )}

        {data && matrix && (
          <>
            <Chapter n={1} id="where" title="Where to land"
              lead="Pick a known landing site, or click anywhere on the Moon. The globe turns to the place you choose.">
              <Catalogue sites={data.sites.sites} matrix={matrix} />
              <SitePanel sites={data.sites.sites} matrix={matrix} />
            </Chapter>
            <Chapter n={2} id="when" title="When to land"
              lead="The Sun and Earth move slowly across the lunar sky, so the landing date changes everything. Each strip shows the score for each choice.">
              <DateRail matrix={matrix} />
              {landingDate && <TimeRail dateUtc={landingDate} siteIds={siteIds} />}
            </Chapter>
            <Chapter n={3} id="mission" title="What mission"
              lead="A crewed landing needs more than a robot: flat ground, sunlight for the whole stay, Earth in view.">
              <MissionSettings />
            </Chapter>
            <Chapter n={4} id="verdict" title="Can we land there?">
              {point
                ? <EvaluationPanel ev={ev.data} loading={ev.loading} error={ev.error}
                    area={area.data} areaLoading={area.loading} areaError={area.error} />
                : <p className="note">{mode === 'live' ? 'Choose a site in chapter 1 or click on the Moon.' : 'Needs the analysis server (live mode).'}</p>}
              <NearbySearch />
            </Chapter>
            <Chapter n={5} id="score" title="How the score works">
              <ScoreSettings />
            </Chapter>
          </>
        )}
      </main>

      {data && matrix && <ComparePanel matrix={matrix} />}
    </div>
  )
}

function Chapter({ n, id, title, lead, children }: { n: number; id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="chapter" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}><span className="num">{n}</span>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
      {children}
    </section>
  )
}
