import { useTexture } from '@react-three/drei'
import { SRGBColorSpace, Vector2 } from 'three'

const BASE = import.meta.env.BASE_URL

export function Moon() {
  const [map, normalMap] = useTexture([`${BASE}textures/moon_color.jpg`, `${BASE}textures/moon_normal.jpg`])
  map.colorSpace = SRGBColorSpace
  map.anisotropy = normalMap.anisotropy = 8
  return (
    <mesh>
      <sphereGeometry args={[1, 256, 128]} />
      <meshStandardMaterial map={map} normalMap={normalMap} normalScale={new Vector2(1.4, 1.4)} roughness={1} metalness={0} />
    </mesh>
  )
}

// Illustrative light: a low, grazing sun for the south pole. Not the real Sun direction for the selected date.
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.05} />
      <directionalLight position={[6, -0.6, 2.5]} intensity={3.2} />
    </>
  )
}
