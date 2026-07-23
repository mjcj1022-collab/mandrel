import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { TransformControls, Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { sculptPull } from '../lib/sculpt'
import type { VertexTool } from '../state/modeler'

export interface VertexSculptorProps {
  /** Flat triangle-soup positions (x,y,z,…) at identity transform, true mm. */
  vertices: number[]
  color: number
  falloff: number
  symmetry: boolean
  /** 'select' = click only highlights a vertex; 'edit' = grab + drag gizmo. */
  tool: VertexTool
  /** Index of the currently highlighted vertex, or null. */
  selectedVertex: number | null
  /** Called with the nearest vertex when the surface is clicked. */
  onPick: (index: number, pos: [number, number, number]) => void
  /** Called once per drag on release, with the new positions. */
  onCommit: (vertices: number[]) => void
}

/**
 * Direct vertex sculpting for a flat triangle soup, shared by the Sculpt tab
 * (a baked SculptObject) and the Design tab (the parametric piece baked to mm).
 *
 * Click the surface to grab the nearest vertex. In the Edit tool a translate
 * gizmo appears and dragging pulls surrounding vertices with a smooth falloff
 * (the "Region" radius). In the Select tool the click only highlights the
 * vertex — orbit stays live and nothing moves by accident. The mesh sits at
 * identity transform, so local and world coordinates coincide and the math
 * stays exact.
 */
export function VertexSculptor({ vertices, color, falloff, symmetry, tool, selectedVertex, onPick, onCommit }: VertexSculptorProps) {
  // Live, mutable geometry — edits write straight into this buffer for instant
  // feedback; we only report to the store on release. Rebuilt when the stored
  // vertices change identity (a committed edit or undo/redo) — never mid-drag,
  // since dragging mutates the buffer in place without a store write.
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(vertices), 3))
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }, [vertices])
  useEffect(() => () => geom.dispose(), [geom])

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.25, envMapIntensity: 1.3 }),
    [color]
  )
  useEffect(() => () => material.dispose(), [material])

  const handleRef = useRef<THREE.Mesh>(null)
  const baseRef = useRef<Float32Array | null>(null)
  const centerRef = useRef(new THREE.Vector3())
  const [pick, setPick] = useState<THREE.Vector3 | null>(null)
  const [pickKey, setPickKey] = useState(0)

  // Switching to the Select tool retires any active drag gizmo.
  useEffect(() => { if (tool === 'select') setPick(null) }, [tool])

  const nearest = (p: THREE.Vector3): number => {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    let bi = 0, bd = Infinity
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i) - p.x, dy = pos.getY(i) - p.y, dz = pos.getZ(i) - p.z
      const d = dx * dx + dy * dy + dz * dz
      if (d < bd) { bd = d; bi = i }
    }
    return bi
  }

  const grab = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    const bi = nearest(e.point)
    const c = new THREE.Vector3(pos.getX(bi), pos.getY(bi), pos.getZ(bi))
    onPick(bi, [c.x, c.y, c.z])
    if (tool === 'edit') {
      baseRef.current = (pos.array as Float32Array).slice()
      centerRef.current.copy(c)
      setPick(c)
      setPickKey(k => k + 1)
    } else {
      setPick(null)
    }
  }

  const drag = () => {
    const h = handleRef.current, base = baseRef.current
    if (!h || !base) return
    const c = centerRef.current
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    sculptPull(base, [c.x, c.y, c.z], [h.position.x - c.x, h.position.y - c.y, h.position.z - c.z], falloff, symmetry, pos.array as Float32Array)
    pos.needsUpdate = true
    geom.computeVertexNormals()
  }

  const commit = () => {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    onCommit(Array.from(pos.array as Float32Array))
    if (handleRef.current) centerRef.current.copy(handleRef.current.position)
    baseRef.current = (pos.array as Float32Array).slice()
  }

  // The highlighted vertex, in the mesh's current (possibly mid-edit) space.
  const marker = useMemo(() => {
    if (selectedVertex == null) return null
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    if (selectedVertex >= pos.count) return null
    return new THREE.Vector3(pos.getX(selectedVertex), pos.getY(selectedVertex), pos.getZ(selectedVertex))
  }, [geom, selectedVertex])

  // Show the actual vertices as dots so grab points are visible; skipped on
  // dense meshes. The overlay never raycasts, so clicks still hit the surface.
  const showPoints = geom.getAttribute('position').count <= 20000
  const dotSize = tool === 'select' ? 0.85 : 0.6

  return (
    <>
      <mesh geometry={geom} material={material} onClick={grab} castShadow>
        <Edges scale={1.002} threshold={20} color="#3d454a" />
      </mesh>
      {showPoints && (
        <points geometry={geom} raycast={() => null}>
          <pointsMaterial size={dotSize} sizeAttenuation color="#9BB4C6" transparent opacity={tool === 'select' ? 0.85 : 0.7} />
        </points>
      )}

      {/* Static highlight for the picked vertex (hidden while a drag gizmo is up). */}
      {marker && !pick && (
        <mesh position={marker} raycast={() => null}>
          <sphereGeometry args={[0.62, 18, 14]} />
          <meshBasicMaterial color={tool === 'select' ? '#7FC8FF' : '#C6A265'} toneMapped={false} />
        </mesh>
      )}

      {pick && (
        <TransformControls key={pickKey} mode="translate" size={1.1} onObjectChange={drag} onMouseUp={commit}>
          <mesh ref={handleRef} position={pick}>
            <sphereGeometry args={[0.55, 16, 12]} />
            <meshBasicMaterial color="#C6A265" toneMapped={false} />
          </mesh>
        </TransformControls>
      )}
    </>
  )
}
