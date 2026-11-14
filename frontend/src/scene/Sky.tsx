import { Html, useTexture } from '@react-three/drei'
import { useMemo, type RefObject } from 'react'
import { BufferAttribute, BufferGeometry, SRGBColorSpace, type Object3D } from 'three'
import { latLonToVec3 } from './geo'
import { R_EARTH_KM, R_MOON_KM, R_SUN_KM, STAR_RADIUS } from './view'

const BASE = import.meta.env.BASE_URL
type LatLon = { lat: number; lon: number }

// The sky around the Moon, to scale: the Earth and the Sun at their real distance and size (in Moon radii), in the
// real direction for the landing time. They are far beyond the reach of the camera, so they never get in its way.
// Stars are decorative (not a star catalogue). Textures: Solar System Scope, CC BY 4.0. Earth's rotation is not modelled.
export function Sky({ subsolar, subearth, earthKm, sunKm, moon }: {
  subsolar: LatLon | null; subearth: LatLon | null; earthKm: number; sunKm: number; moon: RefObject<Object3D | null>
}) {
  const [earthMap, sunMap] = useTexture([`${BASE}textures/earth_color.jpg`, `${BASE}textures/sun_color.jpg`])
  earthMap.colorSpace = sunMap.colorSpace = SRGBColorSpace
  const hidden = [moon] as RefObject<Object3D>[]
  const rEarth = R_EARTH_KM / R_MOON_KM, rSun = R_SUN_KM / R_MOON_KM
  return (
    <>
      <StarField />
      {subearth && (
        <group position={latLonToVec3(subearth.lat, subearth.lon, earthKm / R_MOON_KM)}>
          <mesh raycast={() => null}>
            <sphereGeometry args={[rEarth, 48, 24]} />
            <meshStandardMaterial map={earthMap} roughness={1} metalness={0} />
          </mesh>
          <Html position={[0, rEarth * 1.5, 0]} center occlude={hidden} className="sky-label">Earth</Html>
        </group>
      )}
      {subsolar && (
        <group position={latLonToVec3(subsolar.lat, subsolar.lon, sunKm / R_MOON_KM)}>
          <mesh raycast={() => null}>
            <sphereGeometry args={[rSun, 48, 24]} />
            <meshBasicMaterial map={sunMap} toneMapped={false} />
          </mesh>
          <Html position={[0, rSun * 2.4, 0]} center occlude={hidden} className="sky-label">Sun</Html>
        </group>
      )}
    </>
  )
}

// Points on a sphere far beyond the Sun, a fixed size on screen. Same pattern on every load.
function StarField() {
  const geometry = useMemo(() => {
    const n = 6000
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3)
    let seed = 20261114
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    for (let i = 0; i < n; i++) {
      const y = 2 * rnd() - 1, a = 2 * Math.PI * rnd(), r = Math.sqrt(1 - y * y)
      pos.set([STAR_RADIUS * r * Math.cos(a), STAR_RADIUS * y, STAR_RADIUS * r * Math.sin(a)], i * 3)
      const b = 0.35 + 0.65 * rnd() ** 3 // many faint stars, a few bright ones
      col.set([b, b, Math.min(1, b * 1.08)], i * 3)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('color', new BufferAttribute(col, 3))
    return g
  }, [])
  return (
    <points geometry={geometry} raycast={() => null}>
      <pointsMaterial size={2.4} sizeAttenuation={false} vertexColors toneMapped={false} />
    </points>
  )
}
