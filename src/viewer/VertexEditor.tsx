import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { TransformControls, Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useModeler, type SculptObject } from '../state/modeler'

/**
 * Direct vertex sculpting for a baked 'mesh'. Click anywhere on the surface to
 * grab the nearest vertex, then drag the gizmo — surrounding vertices follow
 * with a smooth falloff set by the "Region" radius (small = single vertex,
 * large = soft proportional pull). The mesh sits at identity transform (see
 * bakeToMesh) so local and world space coincide, keeping the math exact.
 */
export function VertexEditor({ o }: { o: SculptObject }) {
  const falloff = useModeler(s => s.falloff)
  const update = useModeler(s => s.update)

  // Live, mutable geometry — edits write straight into this buffer for instant
  // feedback; we only push to the store on release. Rebuilt when the stored
  // vertices change identity (selection change, a committed edit, or undo/redo)
  // — never mid-drag, since dragging mutates the buffer in place without a
  // store write, so the shape stays stable while you pull it.
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(o.vertices ?? []), 3))
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }, [o.vertices])

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: o.color, metalness: 1, roughness: 0.25, envMapIntensity: 1.3 }),
    [o.color]
  )

  const handleRef = useRef<THREE.Mesh>(null)
  const baseRef = useRef<Float32Array | null>(null)
  const centerRef = useRef(new THREE.Vector3())
  const [pick, setPick] = useState<THREE.Vector3 | null>(null)
  const [pickKey, setPickKey] = useState(0)

  const grab = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    const p = e.point
    let bi = 0, bd = Infinity
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i) - p.x, dy = pos.getY(i) - p.y, dz = pos.getZ(i) - p.z
      const d = dx * dx + dy * dy + dz * dz
      if (d < bd) { bd = d; bi = i }
    }
    const c = new THREE.Vector3(pos.getX(bi), pos.getY(bi), pos.getZ(bi))
    baseRef.current = (pos.array as Float32Array).slice()
    centerRef.current.copy(c)
    setPick(c)
    setPickKey(k => k + 1)
  }

  const drag = () => {
    const h = handleRef.current, base = baseRef.current
    if (!h || !base) return
    const c = centerRef.current
    const dx = h.position.x - c.x, dy = h.position.y - c.y, dz = h.position.z - c.z
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const r = falloff
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2]
      const d = Math.hypot(bx - c.x, by - c.y, bz - c.z)
      let w = 0
      if (d < r) { const t = 1 - d / r; w = t * t * (3 - 2 * t) }
      arr[i * 3] = bx + dx * w
      arr[i * 3 + 1] = by + dy * w
      arr[i * 3 + 2] = bz + dz * w
    }
    pos.needsUpdate = true
    geom.computeVertexNormals()
  }

  const commit = () => {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    update(o.id, { vertices: Array.from(pos.array as Float32Array) })
    // Rebase so a follow-up drag starts clean from the handle's new spot.
    if (handleRef.current) centerRef.current.copy(handleRef.current.position)
    baseRef.current = (pos.array as Float32Array).slice()
  }

  return (
    <>
      <mesh geometry={geom} material={material} onClick={grab} castShadow>
        <Edges scale={1.002} threshold={20} color="#3d454a" />
      </mesh>

      {pick && (
        <TransformControls key={pickKey} mode="translate" size={0.7} onObjectChange={drag} onMouseUp={commit}>
          <mesh ref={handleRef} position={pick}>
            <sphereGeometry args={[0.55, 16, 12]} />
            <meshBasicMaterial color="#C6A265" toneMapped={false} />
          </mesh>
        </TransformControls>
      )}
    </>
  )
}
