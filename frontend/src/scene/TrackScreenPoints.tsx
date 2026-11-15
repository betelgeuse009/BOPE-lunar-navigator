import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import { latLonToVec3 } from './geo'
import { ptsKey, useScreenPoints, type ScreenPt } from './screenPoints'

// Projects the places to keep visible onto the screen every frame; publishes them only when they move by 8 px or more.
// A place on the far side of the Moon is not visible, so it is left out.
export function TrackScreenPoints({ targets }: { targets: { lat: number; lon: number }[] }) {
  const { camera, size } = useThree()
  const setPts = useScreenPoints((s) => s.setPts)
  const last = useRef('')
  const v = useRef(new Vector3()).current, c = useRef(new Vector3()).current
  useFrame(() => {
    const pts: ScreenPt[] = []
    for (const t of targets) {
      v.set(...latLonToVec3(t.lat, t.lon, 1))
      if (v.dot(c.copy(camera.position).sub(v)) <= 0) continue // far side
      v.project(camera)
      pts.push({ x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height })
    }
    const key = ptsKey(pts)
    if (key !== last.current) { last.current = key; setPts(pts) }
  })
  return null
}
