import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { isPreliminary, loadAll, loadScene, periodAt, sceneIndexAt } from './data/load'
import type { Scene } from './data/schemas'
import { Lights, Moon } from './scene/Moon'
import { SiteMarkers } from './scene/SiteMarkers'
import { SouthCap } from './scene/SouthCap'
import { useApp } from './state/store'
import { metricColor } from './ui/colors'
import { DateRail } from './ui/DateRail'
import { metricMeta } from './ui/metrics'
import { SitePanel } from './ui/SitePanel'

// public/data/ is filled by scripts/sync-data.mjs from data/processed/ (or data/samples/ until AERO publishes)
const DATA_BASE: string = import.meta.env.VITE_DATA_BASE ?? `${import.meta.env.BASE_URL}data/`
type Data = Awaited<ReturnType<typeof loadAll>>

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scene, setScene] = useState<Scene | null>(null)
  const { metric, dateIdx, setMetric, setDateCount, setSelected } = useApp()

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
  const i = scene && landingUtc ? sceneIndexAt(scene, landingUtc) : -1
  const subsolar = scene && i >= 0 ? { lat: scene.subsolar_lat_deg[i], lon: scene.subsolar_lon_deg[i] } : null

  return (
    <div className="app">
      <Canvas camera={{ position: [0.9, -2.3, 1.1], fov: 35, near: 0.01 }} onPointerMissed={() => setSelected(null)}>
        <color attach="background" args={['#000000']} />
        <Lights subsolar={subsolar} />
        <Suspense fallback={null}>
          <Moon />
          <SouthCap />
        </Suspense>
        {data && <SiteMarkers sites={data.sites.sites} matrix={data.matrix} />}
        <OrbitControls enablePan={false} minDistance={1.15} maxDistance={6} rotateSpeed={0.5} zoomSpeed={0.7} />
      </Canvas>

      <header className="top">
        <h1>Lunar landing site navigator</h1>
        {data && (
          <label className="metric">
            Colour sites by
            <select value={metric} onChange={(e) => setMetric(e.target.value)}>
              {Object.keys(data.matrix.cells).map((f) => <option key={f} value={f}>{metricMeta(f).label}</option>)}
            </select>
          </label>
        )}
        {data && isPreliminary(data.matrix) && (
          <p className="fixture" title={data.matrix.source.notes}>Preliminary data: {data.matrix.source.notes}</p>
        )}
      </header>

      {error && <p className="error" role="alert">Could not load the site data. {error}</p>}

      {data && (
        <>
          <SitePanel sites={data.sites.sites} matrix={data.matrix} />
          <footer className="bottom">
            <DateRail matrix={data.matrix} />
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
