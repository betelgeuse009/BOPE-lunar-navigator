import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import { SRGBColorSpace } from 'three'
import { capGeometry } from './capGeometry'
import { LAYER_CAP_DEG } from './layers'

// The chosen map layer drawn just above the Moon's surface: a whole-Moon image and, where finer data exists, the
// south polar cap on top of it. Unlit, so its colours read the same in day and night. Both are image addresses
// (a file under public/, or a data: address for a layer drawn live).
export function LayerOverlay({ globalUrl, capUrl }: { globalUrl?: string; capUrl?: string }) {
  const urls = [globalUrl, capUrl].filter((u): u is string => !!u)
  const textures = useTexture(urls)
  textures.forEach((t) => { t.colorSpace = SRGBColorSpace })
  const global = globalUrl ? textures[0] : null
  const cap = capUrl ? textures[textures.length - 1] : null
  const geometry = useMemo(() => capGeometry(1.003, LAYER_CAP_DEG), [])
  return (
    <>
      {global && (
        <mesh raycast={() => null}>
          <sphereGeometry args={[1.002, 256, 128]} />
          <meshBasicMaterial map={global} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {cap && (
        <mesh geometry={geometry} raycast={() => null}>
          <meshBasicMaterial map={cap} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </>
  )
}
