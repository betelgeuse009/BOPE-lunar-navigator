import { useLayoutEffect, useRef } from 'react'
import { Color, type InstancedMesh, type Mesh, Object3D } from 'three'
import type { Area } from '../data/api'
import type { Point } from '../state/store'
import { areaColor, type ScaleMode } from '../ui/colors'
import { latLonToVec3 } from './geo'

const R_MOON_KM = 1737.4

// One dot per area-search point, coloured by score; dot size follows the grid spacing.
export function AreaDots({ area, mode }: { area: Area; mode: ScaleMode }) {
  const ref = useRef<InstancedMesh>(null)
  const n = area.points.score.length
  const dotR = (area.radius_km / 20 / R_MOON_KM) * 0.45

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    for (let i = 0; i < n; i++) {
      o.position.set(...latLonToVec3(area.points.lat_deg[i], area.points.lon_deg[i], 1.0012))
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, c.set(areaColor(area.points.score[i], area.score_range, mode)))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [area, mode, n])

  return (
    <instancedMesh key={n} ref={ref} args={[undefined, undefined, n]} raycast={() => null}>
      <sphereGeometry args={[dotR, 8, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

// Clicked point (white) and the best point found nearby (ring).
export function PointMarkers({ point, best }: { point: Point; best: { lat_deg: number; lon_deg: number } | null }) {
  return (
    <group>
      <mesh position={latLonToVec3(point.lat, point.lon, 1.002)} raycast={() => null}>
        <sphereGeometry args={[0.006, 16, 12]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {best && <Ring at={latLonToVec3(best.lat_deg, best.lon_deg, 1.002)} />}
    </group>
  )
}

// Ring lying flat on the surface (torus axis turned toward the Moon's centre).
function Ring({ at }: { at: [number, number, number] }) {
  const ref = useRef<Mesh>(null)
  useLayoutEffect(() => { ref.current?.lookAt(0, 0, 0) }, [at])
  return (
    <mesh ref={ref} position={at} raycast={() => null}>
      <torusGeometry args={[0.009, 0.0018, 8, 32]} />
      <meshBasicMaterial color="#f2e08a" toneMapped={false} />
    </mesh>
  )
}
