import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import type { Point } from '../state/store'
import { latLonToVec3 } from './geo'

// Turns the camera to face a newly chosen place (smooth, keeps the zoom), so it is never behind the Moon or off screen.
// The view direction's latitude is capped at ±70° so polar places are seen obliquely instead of from straight
// below the pole, where the orbit controls flip. Any drag by the user cancels the move.
const MAX_VIEW_LAT = 70

export function CameraFocus({ point }: { point: Point | null }) {
  const goal = useRef<Vector3 | null>(null)
  const controls = useThree((s) => s.controls) as unknown as
    { update: () => void; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void } | null

  useEffect(() => {
    if (!point) return
    const lat = Math.max(-MAX_VIEW_LAT, Math.min(MAX_VIEW_LAT, point.lat))
    goal.current = new Vector3(...latLonToVec3(lat, point.lon, 1))
  }, [point])

  useEffect(() => {
    if (!controls) return
    const cancel = () => { goal.current = null }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useFrame(({ camera }) => {
    const g = goal.current
    if (!g) return
    const dist = camera.position.length()
    const dir = camera.position.clone().normalize()
    if (dir.angleTo(g) < 0.003) { goal.current = null; return }
    dir.lerp(g, 0.08).normalize()
    camera.position.copy(dir.multiplyScalar(dist))
    camera.lookAt(0, 0, 0)
    controls?.update()
  })
  return null
}
