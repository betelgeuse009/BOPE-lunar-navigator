import { useTexture } from '@react-three/drei'
import { SRGBColorSpace, Vector2 } from 'three'
import { latLonToVec3 } from './geo'

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

// Sun light from AERO's sub-solar point (where the Sun is at zenith) when scene data exists;
// otherwise an illustrative low sun so the pole still reads.
export function Lights({ subsolar }: { subsolar: { lat: number; lon: number } | null }) {
  const position = subsolar ? latLonToVec3(subsolar.lat, subsolar.lon, 10) : ([6, -0.6, 2.5] as const)
  return (
    <>
      <ambientLight intensity={0.04} />
      <directionalLight position={position} intensity={3.2} />
    </>
  )
}
