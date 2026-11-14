import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { HOME } from './view'

// Glides the camera back to the opening view each time `signal` changes. Any drag by the user cancels the move.
export function CameraReset({ signal }: { signal: number }) {
  const goal = useRef<Vector3 | null>(null)
  const controls = useThree((s) => s.controls) as unknown as
    { update: () => void; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void } | null

  useEffect(() => { if (signal > 0) goal.current = new Vector3(...HOME) }, [signal])
  useEffect(() => {
    if (!controls) return
    const cancel = () => { goal.current = null }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useFrame(({ camera }) => {
    const g = goal.current
    if (!g) return
    if (camera.position.distanceTo(g) < 0.005) { goal.current = null; return }
    // Turn and zoom separately, so the camera swings around the Moon instead of cutting through it.
    const dist = camera.position.length() + (g.length() - camera.position.length()) * 0.1
    const dir = camera.position.clone().normalize().lerp(g.clone().normalize(), 0.1).normalize()
    camera.position.copy(dir.multiplyScalar(dist))
    camera.lookAt(0, 0, 0)
    controls?.update()
  })
  return null
}
