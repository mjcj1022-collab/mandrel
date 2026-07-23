import { useMemo } from 'react'
import * as THREE from 'three'
import { finishById, type Alloy } from '../catalog'
import type { FinishId } from '../spec/types'
import { useDesign } from '../state/design'

function darken(hex: number, factor: number): number {
  if (factor >= 1) return hex
  const r = Math.round(((hex >> 16) & 255) * factor)
  const g = Math.round(((hex >> 8) & 255) * factor)
  const b = Math.round((hex & 255) * factor)
  return (r << 16) | (g << 8) | b
}

/** One physically-based metal material per alloy + surface finish. Honors the
 *  global wireframe/inspect toggle. */
export function useMetalMaterial(alloy: Alloy, finishId?: FinishId) {
  const wire = useDesign(s => s.viewWire)
  const override = useDesign(s => s.colorwork.metal)   // custom colour from the Color studio
  return useMemo(() => {
    const f = finishId ? finishById(finishId) : null
    const roughness = f ? f.roughness : alloy.roughness
    const base = f ? darken(alloy.color, f.darken) : alloy.color
    return new THREE.MeshPhysicalMaterial({
      color: wire ? 0xC6A265 : (override ?? base),
      metalness: wire ? 0 : 1,
      roughness,
      wireframe: wire,
      envMapIntensity: 1.4,
      clearcoat: roughness > 0.4 || wire ? 0 : 0.25,
      clearcoatRoughness: 0.35
    })
  }, [alloy, finishId, wire, override])
}
