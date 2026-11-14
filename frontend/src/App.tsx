import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { isPreliminary, loadAll, loadScene, periodAt, sceneIndexAt } from './data/load'
import type { Scene } from './data/schemas'
import { useApiHealth, useAreaSearch, useEvaluation, useLiveMatrix } from './data/useLive'
import { AreaDots, PointMarkers } from './scene/AreaLayer'
import { vec3ToLatLon } from './scene/geo'
import { Lights, Moon } from './scene/Moon'
import { SiteMarkers } from './scene/SiteMarkers'
import { SouthCap } from './scene/SouthCap'
import { useApp } from './state/store'
import { metricColor } from './ui/colors'
import { ComparePanel } from './ui/ComparePanel'
import { DateRail } from './ui/DateRail'
import { metricMeta } from './ui/metrics'
import { EvaluationPanel } from './ui/EvaluationPanel'
import { SettingsPanel } from './ui/SettingsPanel'
import { SitePanel } from './ui/SitePanel'

// public/data/ is filled by scripts/sync-data.mjs from data/processed/ (or data/samples/ until AERO publishes)
const DATA_BASE: string = import.meta.env.VITE_DATA_BASE ?? `${import.meta.env.BASE_URL}data/`
type Data = Awaited<ReturnType<typeof loadAll>>

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scene, setScene] = useState<Scene | null>(null)
  const { metric, dateIdx, mode, point, scaleMode, pins, compareOpen, setMetric, setDateCount, setSelected, setPoint, setCompareOpen } = useApp()
  useApiHealth()

  useEffect(() => {
    loadAll(DATA_BASE)
      .then((d) => { setData(d); setDateCount(d.matrix.landing_dates_utc.length) })
      .catch((e: Error) => setError(e.message))
  }, [setDateCount])

  // Scene file (sub-solar point over time) for the month that contains the selected landing date.
  const landingUtc = data?.matrix.landing_dates_utc[dateIdx]
  const periodId = data && landingUtc && data.manifest.has_scene ? periodAt(data.manifest, landingUtc)?.id : undefined
  useEffect(() => {
    if (!periodId) return setScene(null)
    let live = true
    loadScene(DATA_BASE, periodId).then((s) => live && setScene(s)).catch(() => live && setScene(null))
    return () => { live = false }
  }, [periodId])
  // Live mode: matrix recomputed with the user's settings; otherwise the precomputed file.
  const live = useLiveMatrix(data?.matrix ?? null)
  const matrix = live.data ?? data?.matrix ?? null
  useEffect(() => {
    if (matrix && !(metric in matrix.cells)) setMetric('both_frac')
  }, [matrix, metric, setMetric])
  const ev = useEvaluation(landingUtc)
  const area = useAreaSearch(landingUtc)

  const i = scene && landingUtc ? sceneIndexAt(scene, landingUtc) : -1
  const subsolar = scene && i >= 0 ? { lat: scene.subsolar_lat_deg[i], lon: scene.subsolar_lon_deg[i] } : null

  return (
    <div className="app">
      <Canvas camera={{ position: [0.9, -2.3, 1.1], fov: 35, near: 0.01 }} onPointerMissed={() => setSelected(null)}>
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
        <OrbitControls enablePan={false} minDistance={1.15} maxDistance={6} rotateSpeed={0.5} zoomSpeed={0.7} />
      </Canvas>

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

      {data && matrix && (
        <>
          <SettingsPanel />
          {point
            ? <EvaluationPanel ev={ev.data} loading={ev.loading} error={ev.error}
                area={area.data} areaLoading={area.loading} areaError={area.error} />
            : <SitePanel sites={data.sites.sites} matrix={matrix} />}
          <ComparePanel matrix={matrix} />
          {live.error && <p className="error" role="alert">Live analysis failed: {live.error}. Showing precomputed data.</p>}
          <footer className="bottom">
            <DateRail matrix={matrix} />
            <div className="legend">
              <span>{metricMeta(metric).higherIsBetter ? 'Less' : 'More'}</span>
              <span className="ramp" style={{ background: `linear-gradient(90deg, ${[0, 0.33, 0.66, 1].map(metricColor).join(',')})` }} />
              <span>{metricMeta(metric).higherIsBetter ? 'More' : 'Less'}</span>
              <span className="nodata"><i style={{ background: metricColor(null) }} />No data</span>
            </div>
            <p className="credit">
              Moon imagery: NASA's Scientific Visualization Studio, CGI Moon Kit; south pole: LROC WAC mosaic and LOLA 80 m elevation.
              Relief exaggerated four times.{' '}
              {subsolar
                ? `Sunlight from the Sun's position at landing time (sub-solar point ${subsolar.lat.toFixed(1)}°, ${subsolar.lon.toFixed(1)}°).`
                : 'Lighting is illustrative: no Sun position data for this date.'}
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
