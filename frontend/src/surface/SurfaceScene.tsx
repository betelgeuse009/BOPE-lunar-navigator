import { Html, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry, RepeatWrapping, SRGBColorSpace, type PerspectiveCamera, type Texture, Vector3 } from 'three'
import { CARDINALS, dir, type BodyNow } from './track'

const BASE = import.meta.env.BASE_URL
// Scene distances in metres from the observer. Only directions and angular sizes are real: the skyline is drawn at
// WALL m, the Earth at EARTH_D, the Sun at SUN_D, each sized so that its angular radius is the real one.
const WALL = 400, EARTH_D = 700, SUN_D = 800, STARS_D = 900

// The camera turns in place: yaw = azimuth looked at (clockwise from north), pitch = elevation looked at; fov = zoom.
export function LookCamera({ yaw, pitch, fov }: { yaw: number; pitch: number; fov: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  useFrame(() => {
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix() }
    const [x, y, z] = dir(yaw, pitch)
    camera.position.set(0, 0, 0)
    camera.lookAt(x, y, z)
  })
  return null
}

// The ground around the observer and the real skyline: a funnel from the observer's feet to the foot of the skyline
// and, on top of it, a wall up to the skyline elevation of every azimuth (from /api/horizon). Lit by the Sun only
// when the Sun is in view, so the ground goes dark when the Sun sets behind the terrain.
export function Terrain({ az, el, obsHeightM }: { az: number[]; el: number[]; obsHeightM: number }) {
  const [map, normalMap] = useTexture([`${BASE}textures/regolith_color.jpg`, `${BASE}textures/regolith_normal.jpg`]) as Texture[]
  map.colorSpace = SRGBColorSpace
  for (const t of [map, normalMap]) { t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(8, 8) }
  const { ground, wall } = useMemo(() => {
    const n = az.length
    const top: number[] = [], foot: number[] = []
    for (let i = 0; i < n; i++) {
      const ty = WALL * Math.tan((el[i] * Math.PI) / 180)
      top.push(ty)
      foot.push(Math.min(-obsHeightM, ty))
    }
    const ringXZ = (i: number): [number, number] => {
      const a = (az[i % n] * Math.PI) / 180
      return [WALL * Math.sin(a), -WALL * Math.cos(a)]
    }
    // Ground: triangle fan from below the observer to the foot of the wall.
    const gp: number[] = [0, -obsHeightM, 0], guv: number[] = [0.5, 0.5], gi: number[] = []
    for (let i = 0; i <= n; i++) {
      const [x, z] = ringXZ(i)
      gp.push(x, foot[i % n], z); guv.push(0.5 + x / (2 * WALL), 0.5 + z / (2 * WALL))
      if (i > 0) gi.push(0, i + 1, i) // counter-clockwise seen from above: the ground faces up
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(gp), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(guv), 2))
    g.setIndex(gi)
    g.computeVertexNormals()
    // Wall: two vertices per azimuth, foot and skyline.
    const wp: number[] = [], wuv: number[] = [], wi: number[] = []
    for (let i = 0; i <= n; i++) {
      const [x, z] = ringXZ(i)
      wp.push(x, foot[i % n], z, x, top[i % n], z)
      wuv.push(i / n * 12, 0, i / n * 12, Math.max(0.02, (top[i % n] - foot[i % n]) / 60))
      if (i < n) { const k = 2 * i; wi.push(k, k + 2, k + 1, k + 1, k + 2, k + 3) }
    }
    const w = new BufferGeometry()
    w.setAttribute('position', new BufferAttribute(new Float32Array(wp), 3))
    w.setAttribute('uv', new BufferAttribute(new Float32Array(wuv), 2))
    w.setIndex(wi)
    // Shade the wall like terrain that faces mostly up (it stands for the ground out to the skyline), not like a cliff.
    const wn: number[] = []
    for (let i = 0; i <= n; i++) {
      const [x, z] = ringXZ(i), k = 0.35 / WALL, m = Math.hypot(x * k, 1, z * k)
      wn.push(-x * k / m, 1 / m, -z * k / m, -x * k / m, 1 / m, -z * k / m)
    }
    w.setAttribute('normal', new BufferAttribute(new Float32Array(wn), 3))
    return { ground: g, wall: w }
  }, [az, el, obsHeightM])
  return (
    <>
      <mesh geometry={ground}>
        <meshStandardMaterial map={map} normalMap={normalMap} color="#9a9a96" roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={wall}>
        <meshStandardMaterial map={map} normalMap={normalMap} color="#7d7d79" roughness={1} metalness={0} side={2} />
      </mesh>
    </>
  )
}

// Light on the terrain (display only): sunlight from the Sun's direction, scaled by the visible part of the solar disc,
// a much weaker earthshine from the Earth's direction, scaled by its lit fraction, and a faint ambient so the ground
// stays visible when neither is up.
export function SkyLights({ sun, earth, phase }: { sun: BodyNow; earth: BodyNow; phase: number | null }) {
  const s = dir(sun.az, sun.el), e = dir(earth.az, earth.el)
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[s[0] * 100, s[1] * 100, s[2] * 100]} intensity={7 * clamp(sun.vis)} />
      <directionalLight position={[e[0] * 100, e[1] * 100, e[2] * 100]} intensity={0.5 * clamp(earth.vis) * (phase ?? 0.5)} color="#bcd4ff" />
    </>
  )
}

export function SunDisc({ sun }: { sun: BodyNow }) {
  const p = new Vector3(...dir(sun.az, sun.el)).multiplyScalar(SUN_D)
  const r = SUN_D * Math.tan((sun.radiusDeg * Math.PI) / 180)
  return (
    <group position={p}>
      <mesh><sphereGeometry args={[r, 32, 16]} /><meshBasicMaterial color="#fff6df" toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[r * 3.2, 32, 16]} /><meshBasicMaterial color="#fff1c4" transparent opacity={0.12} depthWrite={false} toneMapped={false} /></mesh>
      <Html zIndexRange={[1, 0]} center position={[0, r * 4.2, 0]} className={`sky-label${sun.vis < 0.5 ? ' hidden-body' : ''}`}>Sun</Html>
    </group>
  )
}

// The Earth, lit from the Sun's direction by a small shader, so its phase is the real one (the Sun shines on the Earth
// whether or not it is in view from the landing site). The Earth's own rotation is not modelled.
export function EarthDisc({ earth, sun }: { earth: BodyNow; sun: BodyNow }) {
  const map = useTexture(`${BASE}textures/earth_color.jpg`) as Texture
  map.colorSpace = SRGBColorSpace
  const p = new Vector3(...dir(earth.az, earth.el)).multiplyScalar(EARTH_D)
  const r = EARTH_D * Math.tan((earth.radiusDeg * Math.PI) / 180)
  const sunDir = useMemo(() => new Vector3(), [])
  sunDir.set(...dir(sun.az, sun.el))
  const uniforms = useMemo(() => ({ map: { value: map }, sunDir: { value: sunDir } }), [map, sunDir])
  return (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[r, 48, 24]} />
        <shaderMaterial uniforms={uniforms}
          vertexShader={'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'}
          fragmentShader={'uniform sampler2D map; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vN; void main(){ float l = max(dot(normalize(vN), normalize(sunDir)), 0.0); vec3 c = texture2D(map, vUv).rgb; gl_FragColor = vec4(c * (0.03 + 1.6 * l), 1.0);\n#include <colorspace_fragment>\n}'} />
      </mesh>
      <Html zIndexRange={[1, 0]} center position={[0, r * 2.2, 0]} className={`sky-label${earth.vis < 0.5 ? ' hidden-body' : ''}`}>Earth</Html>
    </group>
  )
}

// Decorative stars on a sphere around the observer (not a star catalogue); the sky is black: the Moon has no air.
export function Stars() {
  const g = useMemo(() => {
    const n = 4000, pos = new Float32Array(n * 3)
    let seed = 20261115
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    for (let i = 0; i < n; i++) {
      const y = 2 * rnd() - 1, a = 2 * Math.PI * rnd(), r = Math.sqrt(1 - y * y)
      pos.set([STARS_D * r * Math.cos(a), STARS_D * y, STARS_D * r * Math.sin(a)], i * 3)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    return geo
  }, [])
  return <points geometry={g}><pointsMaterial size={1.6} sizeAttenuation={false} color="#c9cdd6" toneMapped={false} /></points>
}

// N, NE, E ... labels on the horizon line, to orient the view.
export function CardinalMarks() {
  return (
    <>
      {CARDINALS.map((c, i) => {
        const [x, , z] = dir(i * 45, 0)
        return <Html key={c} zIndexRange={[1, 0]} center position={[x * (WALL - 5), 0, z * (WALL - 5)]} className={`cardinal${c.length === 1 ? ' main' : ''}`}>{c}</Html>
      })}
    </>
  )
}
