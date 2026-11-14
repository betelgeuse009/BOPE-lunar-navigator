import { Html, Stars, useTexture } from '@react-three/drei'
import type { RefObject } from 'react'
import { SRGBColorSpace, type Object3D } from 'three'
import { latLonToVec3 } from './geo'
import { SKY } from './view'

const BASE = import.meta.env.BASE_URL
type LatLon = { lat: number; lon: number }

// The sky around the Moon: decorative stars (not a star catalogue), the Sun and the Earth.
// Textures: Solar System Scope, CC BY 4.0. The Earth's rotation is not modelled.
export function Sky({ subsolar, subearth, moon }: { subsolar: LatLon | null; subearth: LatLon | null; moon: RefObject<Object3D | null> }) {
  const [earthMap, sunMap] = useTexture([`${BASE}textures/earth_color.jpg`, `${BASE}textures/sun_color.jpg`])
  earthMap.colorSpace = sunMap.colorSpace = SRGBColorSpace
  const hidden = [moon] as RefObject<Object3D>[]
  return (
    <>
      <Stars radius={120} depth={40} count={3500} factor={5} saturation={0} fade speed={0} />
      {subearth && (
        <group position={latLonToVec3(subearth.lat, subearth.lon, SKY.earthDist)}>
          <mesh raycast={() => null}>
            <sphereGeometry args={[SKY.earthRadius, 48, 24]} />
            <meshStandardMaterial map={earthMap} roughness={1} metalness={0} />
          </mesh>
          <Html position={[0, SKY.earthRadius + 0.14, 0]} center occlude={hidden} className="sky-label">Earth</Html>
        </group>
      )}
      {subsolar && (
        <group position={latLonToVec3(subsolar.lat, subsolar.lon, SKY.sunDist)}>
          <mesh raycast={() => null}>
            <sphereGeometry args={[SKY.sunRadius, 48, 24]} />
            <meshBasicMaterial map={sunMap} toneMapped={false} />
          </mesh>
          <Html position={[0, SKY.sunRadius + 0.14, 0]} center occlude={hidden} className="sky-label">Sun</Html>
        </group>
      )}
    </>
  )
}
