import { SphereGeometry } from 'three'
import { polarCapUV } from './geo'

// A patch of sphere around the south pole, capDeg degrees wide from the pole, with texture coordinates for a
// pole-centred image (polarCapUV). Used for the south-pole imagery and for the polar map layers.
export function capGeometry(radius: number, capDeg: number): SphereGeometry {
  const cap = (capDeg * Math.PI) / 180
  const g = new SphereGeometry(radius, 512, 96, 0, Math.PI * 2, Math.PI - cap, cap)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const lat = (Math.asin(y / Math.hypot(x, y, z)) * 180) / Math.PI
    const lon = (Math.atan2(-z, x) * 180) / Math.PI
    const [u, v] = polarCapUV(lat, lon, capDeg)
    uv.setXY(i, u, v)
  }
  return g
}
