import { cellValue } from '../data/load'
import type { Matrix, Site } from '../data/schemas'
import { useApp } from '../state/store'
import { metricColor } from '../ui/colors'
import { goodness } from '../ui/metrics'
import { latLonToVec3 } from './geo'

export function SiteMarkers({ sites, matrix }: { sites: Site[]; matrix: Matrix }) {
  const { dateIdx, metric, hoveredSite, selectedSite, mode, setHovered, setSelected, setPoint } = useApp()
  return (
    <group>
      {sites.map((s) => {
        const v = goodness(cellValue(matrix, s.id, metric, dateIdx), metric, matrix.mission_duration_h)
        const active = s.id === hoveredSite || s.id === selectedSite
        const pos = latLonToVec3(s.lat_deg, s.lon_deg, 1.004)
        return (
          <mesh
            key={s.id}
            position={pos}
            scale={active ? 1.6 : 1}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(s.id) }}
            onPointerOut={() => setHovered(null)}
            onClick={(e) => {
              e.stopPropagation()
              setSelected(s.id)
              if (mode === 'live') setPoint({ lat: s.lat_deg, lon: s.lon_deg }) // evaluate the site with the user's settings
            }}
          >
            <sphereGeometry args={[0.009, 16, 12]} />
            <meshBasicMaterial color={metricColor(v)} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}
