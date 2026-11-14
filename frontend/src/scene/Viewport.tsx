import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import type { Area } from '../data/api'
import type { Matrix, Site } from '../data/schemas'
import { useApp } from '../state/store'
import { metricColor } from '../ui/colors'
import { metricMeta } from '../ui/metrics'
import { AreaDots, PointMarkers } from './AreaLayer'
import { CameraFocus } from './CameraFocus'
import { vec3ToLatLon } from './geo'
import { Lights, Moon } from './Moon'
import { SiteMarkers } from './SiteMarkers'
import { SouthCap } from './SouthCap'

// Centre of the workbench: the Moon, what is drawn on it, and the controls that belong to the view.
export function Viewport({ sites, matrix, area, subsolar, updating }: {
  sites: Site[] | null; matrix: Matrix | null; area: Area | null
  subsolar: { lat: number; lon: number } | null; updating: boolean
}) {
  const { metric, mode, point, scaleMode, pins, compareOpen, setMetric, setSelected, setPoint, setCompareOpen } = useApp()
  return (
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
        {sites && matrix && <SiteMarkers sites={sites} matrix={matrix} />}
        {area && <AreaDots area={area} mode={scaleMode} />}
        {point && <PointMarkers point={point} best={area && !area.center_is_best ? area.best : null} />}
        <OrbitControls makeDefault enablePan={false} minDistance={1.15} maxDistance={6} rotateSpeed={0.5} zoomSpeed={0.7} />
        <CameraFocus point={point} />
      </Canvas>

      <header className="stage-top">
        <h1>Lunar Landing Site Navigator</h1>
        <p className={`mode mode-${mode}`} title={mode === 'live' ? 'Connected to the analysis server: click anywhere on the Moon.' : undefined}>
          {mode === 'live' ? (updating ? 'Live, updating' : 'Live') : mode === 'static' ? 'Offline' : 'Connecting'}
        </p>
        {matrix && (
          <button type="button" className="compare-toggle" disabled={pins.length === 0} aria-pressed={compareOpen}
            title={pins.length === 0 ? 'Add places with "Compare at this date" first.' : undefined}
            onClick={() => setCompareOpen(!compareOpen)}>
            Compare {pins.length > 0 ? pins.length : ''}
          </button>
        )}
      </header>

      <div className="stage-foot">
        {matrix && (
          <div className="legend-row">
            <label className="metric">
              <span>Colour sites by</span>
              <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                {Object.keys(matrix.cells).map((f) => <option key={f} value={f}>{metricMeta(f).label}</option>)}
              </select>
            </label>
            <div className="legend">
              <span>{metricMeta(metric).higherIsBetter ? 'Less' : 'More'}</span>
              <span className="ramp" style={{ background: `linear-gradient(90deg, ${[0, 0.33, 0.66, 1].map(metricColor).join(',')})` }} />
              <span>{metricMeta(metric).higherIsBetter ? 'More' : 'Less'}</span>
              <span className="nodata"><i style={{ background: metricColor(null) }} />No data</span>
            </div>
          </div>
        )}
        <p className="credit">
          Moon imagery: NASA's Scientific Visualization Studio, CGI Moon Kit; south pole: LROC WAC mosaic and LOLA 80 m elevation.
          Relief exaggerated four times.{' '}
          {subsolar
            ? `Sunlight from the Sun's position at landing time (sub-solar point ${subsolar.lat.toFixed(1)}°, ${subsolar.lon.toFixed(1)}°).`
            : 'Lighting is illustrative: no Sun position data for this date.'}
        </p>
      </div>
    </div>
  )
}
