import type { DesignSpec } from '../spec/types'
import { alloyById } from '../catalog'
import { stoneDims } from './Stone'
import { Head } from './Head'
import { useMetalMaterial } from './material'

const MM_PER_INCH = 25.4

/** Necklace / chain hanging as a loop, optionally carrying a pendant. */
export function Necklace({ spec }: { spec: DesignSpec }) {
  const alloy = alloyById(spec.metal.alloyId)
  const metal = useMetalMaterial(alloy, spec.finish)
  const headMetalMat = useMetalMaterial(alloyById(spec.metal.headAlloyId ?? spec.metal.alloyId), spec.finish)
  const headMetal = spec.metal.twoTone && spec.metal.headAlloyId ? headMetalMat : metal
  const { length, gauge, hasPendant } = spec.necklace
  const circ = length * MM_PER_INCH
  const R = circ / (Math.PI * 2)
  const d = stoneDims(spec.center.shapeId, spec.center.carat)

  return (
    <group>
      {/* Chain loop, hanging in the view plane */}
      <mesh material={metal} scale={[1, 1.15, 1]}>
        <torusGeometry args={[R, Math.max(gauge * 0.5, 0.5), 14, 200]} />
      </mesh>

      {hasPendant && (
        <group position={[0, -R * 1.15 - d.r * d.lwRatio, 0]}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <Head material={headMetal} shapeId={spec.center.shapeId} stoneTypeId={spec.center.stoneTypeId}
              carat={spec.center.carat} settingId={spec.setting.typeId} grading={spec.center.grading} />
          </group>
        </group>
      )}
    </group>
  )
}
