import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import { SRGBColorSpace, Vector2 } from 'three'
import { capGeometry } from './capGeometry'

const BASE = import.meta.env.BASE_URL
const CAP_DEG = 20 // must match CAP_DEG in scripts/textures.py

// Patch over the south pole with its own pole-centred texture, so the pole is not pinched into streaks
// the way an equirectangular map on a sphere is. Sits a hair above the globe to win the depth test.
export function SouthCap() {
  const [map, normalMap] = useTexture([`${BASE}textures/moon_south_color.jpg`, `${BASE}textures/moon_south_normal.jpg`])
  map.colorSpace = SRGBColorSpace
  map.anisotropy = normalMap.anisotropy = 8

  const geometry = useMemo(() => capGeometry(1.0005, CAP_DEG), [])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={map} normalMap={normalMap} normalScale={new Vector2(1.4, 1.4)} roughness={1} metalness={0} />
    </mesh>
  )
}
