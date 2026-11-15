import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Vector3, type PerspectiveCamera } from 'three'
import { latLonToVec3 } from './geo'
import { freeArea, isSea, MIN_FEATURE_PX, placeLabels, type FeatureName } from './labels'

const R_KM = 1737.4
const FACING = 0.15 // names closer to the limb than this (cosine of the view angle) are left out: too foreshortened

// Feature names on the globe, written into an HTML layer over the canvas (`overlay`) at a fixed pixel size, so they
// stay sharp and the same size at any zoom. Recomputed only when the camera or the canvas size changes.
export function GlobeLabels({ names, overlay }: { names: FeatureName[]; overlay: RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree()
  const pos = useMemo(() => names.map((n) => new Vector3(...latLonToVec3(n.lat, n.lon, 1))), [names])
  const pool = useRef<HTMLSpanElement[]>([])
  const last = useRef('')
  const v = useMemo(() => new Vector3(), [])
  useEffect(() => () => { pool.current.forEach((s) => s.remove()); pool.current = [] }, [])
  useEffect(() => { last.current = '' }, [names])
  useFrame(() => {
    const el = overlay.current
    if (!el) return
    const key = `${camera.matrixWorld.elements.join(',')}|${size.width}x${size.height}`
    if (key === last.current) return
    last.current = key
    const focal = size.height / 2 / Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360)
    const cand: { i: number; name: string; x: number; y: number; px: number }[] = []
    names.forEach((n, i) => {
      const p = pos[i]
      v.copy(camera.position).sub(p)
      const dist = v.length()
      if (p.dot(v) / dist < FACING) return // far side or limb
      const px = (n.dKm / R_KM / dist) * focal
      if (px < MIN_FEATURE_PX) return
      v.copy(p).project(camera)
      cand.push({ i, name: n.name, x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, px })
    })
    const kept = placeLabels(cand, freeArea(el))
    const byI = new Map(cand.map((c) => [c.i, c]))
    while (pool.current.length < kept.length) {
      const s = document.createElement('span')
      el.appendChild(s)
      pool.current.push(s)
    }
    pool.current.forEach((s, k) => {
      const c = k < kept.length ? byI.get(kept[k]) : undefined
      if (!c) { s.style.display = 'none'; return }
      const n = names[c.i]
      s.textContent = n.name
      s.className = isSea(n.code) ? 'feature-label sea' : 'feature-label'
      s.style.display = ''
      s.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px) translate(-50%, -50%)`
    })
  })
  return null
}
