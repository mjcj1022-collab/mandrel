import type { DesignSpec } from '../spec/types'
import { stoneOnPiece } from '../spec/types'
import { alloyById } from '../catalog'
import { sizeToDiameter } from '../lib/sizing'
import { stoneDims } from './Stone'
import { Head } from './Head'
import { useMetalMaterial } from './material'

export function Ring({ spec }: { spec: DesignSpec }) {
  const alloy = alloyById(spec.metal.alloyId)
  const metal = useMetalMaterial(alloy, spec.finish)
  const headMetalMat = useMetalMaterial(alloyById(spec.metal.headAlloyId ?? spec.metal.alloyId), spec.finish)
  const headMetal = spec.metal.twoTone && spec.metal.headAlloyId ? headMetalMat : metal
  const d = stoneDims(spec.center.shapeId, spec.center.carat)

  const insideR = sizeToDiameter(spec.ring.size) / 2
  const tube = spec.ring.thickness / 2
  const centreR = insideR + tube
  const seatY = centreR + tube * 0.2
  const stoneY = seatY + d.pavH * 0.55

  return (
    <group>
      {/* Shank — a torus scaled on the ring axis to give width != thickness */}
      <mesh material={metal} scale={[1, 1, spec.ring.width / spec.ring.thickness]}>
        <torusGeometry args={[centreR, tube, 24, 180]} />
      </mesh>

      {stoneOnPiece(spec) && (
        <group position={[0, stoneY, 0]}>
          <Head material={headMetal} shapeId={spec.center.shapeId} stoneTypeId={spec.center.stoneTypeId}
            carat={spec.center.carat} settingId={spec.setting.typeId} grading={spec.center.grading} />
        </group>
      )}
    </group>
  )
}
