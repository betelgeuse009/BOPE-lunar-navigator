import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { Color, DoubleSide, type Group, type InstancedMesh, type Mesh, type MeshBasicMaterial, Object3D, type RingGeometry } from 'three'
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

// Clicked point and the best point found nearby. Targets that face the viewer and keep the same size on screen
// at any zoom: dark outline (contrast on bright regolith), white ring, coloured centre; the clicked point pulses.
const POINT_COLOR = '#ff4f7b'
const BEST_COLOR = '#f2e08a'
const PX_PER_DISTANCE = 0.012 // marker radius in scene units per unit of camera distance (~16 px at the default view)

export function PointMarkers({ point, best }: { point: Point; best: { lat_deg: number; lon_deg: number } | null }) {
  return (
    <group>
      {best && <Target at={latLonToVec3(best.lat_deg, best.lon_deg, 1.003)} color={BEST_COLOR} />}
      <Target at={latLonToVec3(point.lat, point.lon, 1.003)} color={POINT_COLOR} pulse />
    </group>
  )
}

function Target({ at, color, pulse = false }: { at: [number, number, number]; color: string; pulse?: boolean }) {
  const ref = useRef<Group>(null)
  const halo = useRef<Mesh<RingGeometry, MeshBasicMaterial>>(null)
  useFrame(({ camera, clock }) => {
    const g = ref.current
    if (!g) return
    // Drawn on top of everything (site markers sit on the same spot), so hide it ourselves on the far side of the Moon.
    g.visible = g.position.dot(camera.position) > g.position.lengthSq()
    g.quaternion.copy(camera.quaternion) // face the viewer: a full circle even at grazing angles near the poles
    g.scale.setScalar(camera.position.distanceTo(g.position) * PX_PER_DISTANCE)
    if (halo.current) {
      const t = (clock.elapsedTime % 1.6) / 1.6
      halo.current.scale.setScalar(1 + 1.2 * t)
      halo.current.material.opacity = 0.8 * (1 - t)
    }
  })
  const mat = { toneMapped: false, side: DoubleSide, depthTest: false } as const
  return (
    <group ref={ref} position={at}>
      <mesh renderOrder={10} raycast={() => null}><ringGeometry args={[0.7, 1.15, 48]} /><meshBasicMaterial color="#000000" transparent opacity={0.7} {...mat} /></mesh>
      <mesh renderOrder={11} raycast={() => null}><ringGeometry args={[0.5, 0.75, 48]} /><meshBasicMaterial color="#ffffff" {...mat} /></mesh>
      <mesh renderOrder={12} raycast={() => null}><circleGeometry args={[0.38, 32]} /><meshBasicMaterial color={color} {...mat} /></mesh>
      {pulse && (
        <mesh ref={halo} renderOrder={9} raycast={() => null}><ringGeometry args={[1.05, 1.3, 48]} /><meshBasicMaterial color={color} transparent {...mat} /></mesh>
      )}
    </group>
  )
}
