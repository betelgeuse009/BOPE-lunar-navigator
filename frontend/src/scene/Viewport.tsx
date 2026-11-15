import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import type { Area, ScoreGrid } from '../data/api'
import type { Matrix, Site } from '../data/schemas'
import { useApp } from '../state/store'
import { metricColor } from '../ui/colors'
import { formatValue, metricMeta, siteScale } from '../ui/metrics'
import { MissionCard } from '../ui/MissionCard'
import { AreaDots, PointMarkers } from './AreaLayer'
import { CameraFocus } from './CameraFocus'
import { CameraReset } from './CameraReset'
import { Hint } from '../ui/Hint'
import { vec3ToLatLon } from './geo'
import { LayerOverlay } from './LayerOverlay'
import { LAYERS, UNAVAILABLE, layerById, type LayerId } from './layers'
import { Map2D } from './Map2D'
import { scoreGridImage } from './scoreImage'
import { Lights, Moon } from './Moon'
import { SiteMarkers } from './SiteMarkers'
import { Sky } from './Sky'
import { FAR, HOME, TYPICAL_EARTH_KM, TYPICAL_SUN_KM } from './view'
import { SouthCap } from './SouthCap'

// Centre of the workbench: the Moon, what is drawn on it, and the controls that belong to the view.
const BASE = import.meta.env.BASE_URL

export function Viewport({ sites, matrix, area, subsolar, subearth, skyKm, scoreMap, scoreGrid, updating }: {
  sites: Site[] | null; matrix: Matrix | null; area: Area | null
  subsolar: { lat: number; lon: number } | null; subearth: { lat: number; lon: number } | null
  skyKm: { earthKm: number; sunKm: number } | null
  scoreMap: { data: Area | null; loading: boolean; error: string | null }
  scoreGrid: { data: ScoreGrid | null; loading: boolean; error: string | null }; updating: boolean
}) {
  const { metric, mode, point, scaleMode, pins, compareOpen, dateIdx, layer: layerId, setMetric, setSelected, setPoint, setCompareOpen, setLayer } = useApp()
  const [view, setView] = useState<'3d' | '2d'>('3d')
  const [reset, setReset] = useState(0) // each press of the reset button
  const moon = useRef<Group>(null)
  const layer = layerById(layerId)
  // What the chosen layer cannot show right now, said next to the picker instead of failing silently.
  const layerNote = !layer ? null
    : layer.kind === 'score' ? (mode !== 'live' ? 'Needs the live analysis server.'
      : scoreGrid.error ?? scoreMap.error ? `Could not compute: ${scoreGrid.error ?? scoreMap.error}`
      : scoreGrid.loading ? 'Computing the whole Moon…' : scoreMap.loading && view === '2d' ? 'Computing the south pole in detail…' : null)
    : layer.kind === 'daynight' ? (view === '3d' ? 'On the globe the lighting already shows it; the line is drawn on the 2D map.' : !subsolar ? 'No Sun position for this date.' : null)
    : null
  // Score layer: both parts share one colour range, the lowest and highest score found on the whole Moon.
  const scoreRange = scoreGrid.data?.score_range ?? null
  const scoreGlobal = useMemo(() => (layer?.kind === 'score' && scoreGrid.data && scoreRange ? scoreGridImage(scoreGrid.data, scoreRange) : null),
    [layer, scoreGrid.data, scoreRange])
  const layerLegend = layer?.kind === 'score' ? (scoreRange ? [scoreRange[0].toFixed(2), scoreRange[1].toFixed(2)] : null) : layer?.legend ?? null
  const sitesScale = matrix ? siteScale(matrix, metric, dateIdx) : null
  return (
    <div className="stage">
      {view === '2d' && <Map2D sites={sites} matrix={matrix} area={area} subsolar={subsolar} subearth={subearth} resetSignal={reset}
        layer={layer} scoreMap={scoreMap.data} scoreGlobal={scoreGlobal} scoreRange={scoreRange} />}
      {view === '3d' && <Canvas camera={{ position: HOME, fov: 35, near: 0.01, far: FAR }} onPointerMissed={() => setSelected(null)}>
        <color attach="background" args={['#000000']} />
        <Lights subsolar={subsolar} />
        <Suspense fallback={null}>
          <group ref={moon}
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
        {layer?.kind === 'image' && (
          <Suspense fallback={null}>
            <LayerOverlay globalUrl={layer.global && BASE + layer.global} capUrl={layer.cap && BASE + layer.cap} />
          </Suspense>
        )}
        {layer?.kind === 'score' && scoreGlobal && <Suspense fallback={null}><LayerOverlay globalUrl={scoreGlobal} /></Suspense>}
        {sites && matrix && <SiteMarkers sites={sites} matrix={matrix} />}
        {area && <AreaDots area={area} mode={scaleMode} />}
        {point && <PointMarkers point={point} best={area && !area.center_is_best ? area.best : null} />}
        <Suspense fallback={null}>
          <Sky subsolar={subsolar} subearth={subearth} moon={moon}
            earthKm={skyKm?.earthKm ?? TYPICAL_EARTH_KM} sunKm={skyKm?.sunKm ?? TYPICAL_SUN_KM} />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} minDistance={1.15} maxDistance={16} rotateSpeed={0.5} zoomSpeed={0.7} />
        <CameraFocus point={point} />
        <CameraReset signal={reset} />
      </Canvas>}

      <header className="stage-top">
        <h1>Lunar Landing Site Navigator</h1>
        <div className="view-toggle" role="radiogroup" aria-label="View">
          <button type="button" role="radio" aria-checked={view === '3d'} onClick={() => setView('3d')}>3D globe</button>
          <button type="button" role="radio" aria-checked={view === '2d'} onClick={() => setView('2d')}>2D map</button>
        </div>
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

      <button type="button" className="view-reset" onClick={() => setReset(reset + 1)}
        title={view === '3d' ? 'Back to the opening view' : 'Show the whole Moon'} aria-label="Reset the view">
        <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10.5" /><path className="n" d="M12 3.5 15 12H9z" /><path className="s" d="M12 20.5 9 12h6z" /></svg>
      </button>
      <MissionCard />

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
              <span title="Worst site on this date">{sitesScale ? formatValue(sitesScale.worst, metric) : metricMeta(metric).higherIsBetter ? 'Less' : 'More'}</span>
              <span className="ramp" style={{ background: `linear-gradient(90deg, ${[0, 0.33, 0.66, 1].map(metricColor).join(',')})` }} />
              <span title="Best site on this date">{sitesScale ? formatValue(sitesScale.best, metric) : metricMeta(metric).higherIsBetter ? 'More' : 'Less'}</span>
              <Hint mark label="i" title="Site colours">
                Each site is coloured by the chosen quantity on the landing date. The colours are stretched between the worst and the best
                site of that date (the two values printed at the ends of the bar), so differences between sites stay visible even when
                all the values are close. The palette does not change; only its ends move with the date and the settings.
              </Hint>
              <span className="nodata"><i style={{ background: metricColor(null) }} />No data</span>
            </div>
          </div>
        )}
        <div className="legend-row layer-row">
          <label className="metric">
            <span>Map layer</span>
            <select value={layerId ?? ''} onChange={(e) => setLayer((e.target.value || null) as LayerId | null)}>
              <option value="">None</option>
              {LAYERS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              {UNAVAILABLE.map((u) => <option key={u} disabled>{u}</option>)}
            </select>
          </label>
          {layer && <Hint mark label="i" title={layer.label}>{layer.how}</Hint>}
          {layerLegend && (
            <div className="legend legend-ticks">
              <span className="ramp" style={{ background: `linear-gradient(90deg, ${[0, 0.33, 0.66, 1].map(metricColor).join(',')})` }} />
              <span className="ticks">{layerLegend.map((l) => <span key={l}>{l}</span>)}</span>
            </div>
          )}
          {layerNote && <span className="layer-note">{layerNote}</span>}
        </div>
        <p className="credit">
          <Hint label="Info on views" title={view === '3d' ? 'About the 3D view' : 'About the 2D map'}>
            Moon imagery: NASA's Scientific Visualization Studio, CGI Moon Kit; south pole: LROC WAC mosaic and LOLA 80 m altitude map.
            {view === '3d' ? ' Relief exaggerated four times. ' : ' Flat map: areas stretch toward the poles, so the polar layers appear as a wide strip at the bottom. '}
            {subsolar
              ? `Sunlight from the Sun's position at landing time (sub-solar point ${subsolar.lat.toFixed(1)}°, ${subsolar.lon.toFixed(1)}°).`
              : 'Lighting is illustrative: no Sun position data for this date.'}
            {view === '3d' && (subsolar || subearth) && (
              <>
                {' '}Sun and Earth: real directions, sizes and distances at landing time (to scale), so they look small from the Moon.
                {skyKm
                  ? ` Distances from the analysis server: Earth ${Math.round(skyKm.earthKm).toLocaleString('en-GB')} km, Sun ${(skyKm.sunKm / 1e6).toFixed(1)} million km.`
                  : ' Without the analysis server the average distances are used (Earth 384 400 km, Sun 1 AU).'}
                {' '}Stars are decorative. Earth and Sun textures: Solar System Scope, CC BY 4.0.
              </>
            )}
          </Hint>
        </p>
      </div>
    </div>
  )
}
