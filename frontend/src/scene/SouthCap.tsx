import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import { SRGBColorSpace, SphereGeometry, Vector2 } from 'three'
import { polarCapUV } from './geo'

const BASE = import.meta.env.BASE_URL
const CAP_DEG = 20 // must match CAP_DEG in scripts/textures.py

// Patch over the south pole with its own pole-centred texture, so the pole is not pinched into streaks
// the way an equirectangular map on a sphere is. Sits a hair above the globe to win the depth test.
export function SouthCap() {
  const [map, normalMap] = useTexture([`${BASE}textures/moon_south_color.jpg`, `${BASE}textures/moon_south_normal.jpg`])
  map.colorSpace = SRGBColorSpace
  map.anisotropy = normalMap.anisotropy = 8

  const geometry = useMemo(() => {
    const cap = (CAP_DEG * Math.PI) / 180
    const g = new SphereGeometry(1.0005, 512, 96, 0, Math.PI * 2, Math.PI - cap, cap)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const lat = (Math.asin(y / Math.hypot(x, y, z)) * 180) / Math.PI
      const lon = (Math.atan2(-z, x) * 180) / Math.PI
      const [u, v] = polarCapUV(lat, lon, CAP_DEG)
      uv.setXY(i, u, v)
    }
    return g
  }, [])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={map} normalMap={normalMap} normalScale={new Vector2(1.4, 1.4)} roughness={1} metalness={0} />
    </mesh>
  )
}
