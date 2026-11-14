import { useRef, useState } from 'react'
import type { Area } from '../data/api'
import { cellValue } from '../data/load'
import type { Matrix, Site } from '../data/schemas'
import { useApp } from '../state/store'
import { areaColor, metricColor } from '../ui/colors'
import { goodness } from '../ui/metrics'

const BASE = import.meta.env.BASE_URL
type LatLon = { lat: number; lon: number }
type Box = { x: number; y: number; w: number; h: number }
const WORLD: Box = { x: -180, y: -90, w: 360, h: 180 }

// The whole Moon as a flat map: longitude across (-180 to 180, 0 in the middle), latitude up (simple cylindrical,
// so areas stretch toward the poles). Same imagery, markers and clicks as the globe. Drag to move, wheel to zoom.
// Map coordinates: x = longitude, y = -latitude, in degrees.
export function Map2D({ sites, matrix, area, subsolar, subearth, resetSignal }: {
  sites: Site[] | null; matrix: Matrix | null; area: Area | null; subsolar: LatLon | null; subearth: LatLon | null; resetSignal: number
}) {
  const { dateIdx, metric, mode, point, scaleMode, hoveredSite, selectedSite, setHovered, setSelected, setPoint } = useApp()
  const svg = useRef<SVGSVGElement>(null)
  const [box, setBox] = useState<Box>(WORLD)
  const [seen, setSeen] = useState(resetSignal)
  if (seen !== resetSignal) { setSeen(resetSignal); setBox(WORLD) } // the reset button puts the whole Moon back in view
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null)

  const clamp = (b: Box): Box => {
    const w = Math.min(Math.max(b.w, 4), 360), h = w / 2
    return { w, h, x: Math.min(Math.max(b.x, -180), 180 - w), y: Math.min(Math.max(b.y, -90), 90 - h) }
  }
  // Pointer position in map degrees.
  const at = (e: { clientX?: number; clientY?: number; x?: number; y?: number }) => {
    const cx = e.clientX ?? e.x!, cy = e.clientY ?? e.y!
    const m = svg.current!.getScreenCTM()!.inverse()
    return { x: m.a * cx + m.c * cy + m.e, y: m.b * cx + m.d * cy + m.f }
  }
  const k = box.w / 360 // marker sizes stay the same on screen at any zoom
  // Grid spacing of the nearby search in degrees of latitude (1 degree = 30.3 km on the 1737.4 km sphere).
  const dotR = area ? (area.radius_km / 20 / 30.32) * 0.45 : 0

  return (
    <svg ref={svg} className="map2d" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} role="img" aria-label="Map of the Moon"
      onWheel={(e) => {
        const p = at(e), f = e.deltaY > 0 ? 1.2 : 1 / 1.2
        setBox((b) => clamp({ w: b.w * f, h: b.h * f, x: p.x - (p.x - b.x) * f, y: p.y - (p.y - b.y) * f }))
      }}
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, moved: 0 }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        const from = at(d), to = at(e)
        d.moved += Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y); d.x = e.clientX; d.y = e.clientY
        setBox((b) => clamp({ ...b, x: b.x - (to.x - from.x), y: b.y - (to.y - from.y) }))
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (!d || d.moved > 4 || mode !== 'live') return // a drag, or no server to ask
        const p = at(e)
        if (Math.abs(p.x) > 180 || Math.abs(p.y) > 90) return
        setPoint({ lat: -p.y, lon: p.x })
        setSelected(null)
      }}>
      <image href={`${BASE}textures/moon_color.jpg`} x={-180} y={-90} width={360} height={180} preserveAspectRatio="none" />
      <g className="map-grid">
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((v) => <line key={`x${v}`} x1={v} x2={v} y1={-90} y2={90} />)}
        {[-60, -30, 0, 30, 60].map((v) => <line key={`y${v}`} y1={v} y2={v} x1={-180} x2={180} />)}
      </g>
      {area?.points.lat_deg.map((lat, i) => (
        <circle key={i} cx={area.points.lon_deg[i]} cy={-lat} r={dotR} fill={areaColor(area.points.score[i], area.score_range, scaleMode)} />
      ))}
      {subsolar && <Body at={subsolar} k={k} label="Sun overhead" />}
      {subearth && <Body at={subearth} k={k} label="Earth overhead" />}
      {sites && matrix && sites.map((s) => {
        const v = goodness(cellValue(matrix, s.id, metric, dateIdx), metric, matrix.mission_duration_h)
        const active = s.id === hoveredSite || s.id === selectedSite
        return (
          <circle key={s.id} className="map-site" cx={s.lon_deg} cy={-s.lat_deg} r={(active ? 4.2 : 2.8) * k} fill={metricColor(v)}
            onPointerEnter={() => setHovered(s.id)} onPointerLeave={() => setHovered(null)}
            onPointerUp={(e) => {
              if ((drag.current?.moved ?? 0) > 4) return
              e.stopPropagation(); drag.current = null
              setSelected(s.id)
              if (mode === 'live') setPoint({ lat: s.lat_deg, lon: s.lon_deg })
            }}>
            <title>{s.name}</title>
          </circle>
        )
      })}
      {area?.best && !area.center_is_best && <Reticle lat={area.best.lat_deg} lon={area.best.lon_deg} k={k} color="#f2e08a" />}
      {point && <Reticle lat={point.lat} lon={point.lon} k={k} color="#ffffff" />}
    </svg>
  )
}

// The point of the Moon that has the Sun, or the Earth, straight overhead at the landing time.
function Body({ at, k, label }: { at: LatLon; k: number; label: string }) {
  return (
    <g className="map-body" transform={`translate(${at.lon} ${-at.lat}) scale(${k})`}>
      <circle r={3.2} />
      <line x1={-5.5} x2={5.5} /><line y1={-5.5} y2={5.5} />
      <text x={7} y={1.4}>{label}</text>
    </g>
  )
}

// Same mark as on the globe: ring, four ticks, centre dot.
function Reticle({ lat, lon, k, color }: { lat: number; lon: number; k: number; color: string }) {
  return (
    <g className="map-reticle" transform={`translate(${lon} ${-lat}) scale(${k})`} stroke={color} fill={color}>
      <circle r={5.6} className="back" />
      <circle r={4.4} fill="none" />
      <line x1={4.4} x2={7.4} /><line x1={-4.4} x2={-7.4} /><line y1={4.4} y2={7.4} /><line y1={-4.4} y2={-7.4} />
      <circle r={0.9} stroke="none" />
    </g>
  )
}
