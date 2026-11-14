import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { isFixture, loadAll } from './data/load'
import { Lights, Moon } from './scene/Moon'
import { SiteMarkers } from './scene/SiteMarkers'
import { SouthCap } from './scene/SouthCap'
import { useApp } from './state/store'
import { metricColor } from './ui/colors'
import { DateRail } from './ui/DateRail'
import { metricMeta } from './ui/metrics'
import { SitePanel } from './ui/SitePanel'

const DATA_BASE: string = import.meta.env.VITE_DATA_BASE ?? `${import.meta.env.BASE_URL}fixtures/`
type Data = Awaited<ReturnType<typeof loadAll>>

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { metric, setMetric, setDateCount, setSelected } = useApp()

  useEffect(() => {
    loadAll(DATA_BASE)
      .then((d) => { setData(d); setDateCount(d.matrix.landing_dates_utc.length) })
      .catch((e: Error) => setError(e.message))
  }, [setDateCount])

  return (
    <div className="app">
      <Canvas camera={{ position: [0.9, -2.3, 1.1], fov: 35, near: 0.01 }} onPointerMissed={() => setSelected(null)}>
        <color attach="background" args={['#000000']} />
        <Lights />
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
        {data && isFixture(data.matrix) && (
          <p className="fixture" title={data.matrix.source.notes}>Sample data, not real measurements</p>
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
              Moon imagery: NASA's Scientific Visualization Studio, CGI Moon Kit. Relief from LOLA elevation, exaggerated four times.
              Lighting is illustrative, not the Sun's position on the chosen date.
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
