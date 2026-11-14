import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import { SRGBColorSpace } from 'three'
import { capGeometry } from './capGeometry'
import { LAYER_CAP_DEG, type Layer } from './layers'

const BASE = import.meta.env.BASE_URL

// The chosen map layer drawn just above the Moon's surface: over the whole globe when the layer is global,
// and over the south polar cap. Unlit, so its colours read the same in day and night.
export function LayerOverlay({ layer }: { layer: Layer }) {
  const urls = [layer.cap, ...(layer.global ? [layer.global] : [])].map((f) => BASE + f)
  const [cap, global] = useTexture(urls)
  cap.colorSpace = SRGBColorSpace
  if (global) global.colorSpace = SRGBColorSpace
  const geometry = useMemo(() => capGeometry(1.0009, LAYER_CAP_DEG), [])
  return (
    <>
      {global && (
        <mesh raycast={() => null}>
          <sphereGeometry args={[1.0007, 128, 64]} />
          <meshBasicMaterial map={global} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <mesh geometry={geometry} raycast={() => null}>
        <meshBasicMaterial map={cap} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}
