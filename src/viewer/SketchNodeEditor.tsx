import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { TransformControls, Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useModeler, type SculptObject } from '../state/modeler'
import { renderGeometry, objectMatrix } from '../lib/sculpt'

/**
 * Drag a sketch's profile control points directly in the 3D render. Each node
 * sits on the generated surface (at the revolve's front for a lathe, or the
 * front face for an extrude); moving it rewrites that profile point, so the
 * whole parametric shape regenerates live — no baking to a mesh.
 */
export function SketchNodeEditor({ o }: { o: SculptObject }) {
  const setObjectSketch = useModeler(s => s.setObjectSketch)
  const sk = o.params!.sketch!

  const geom = useMemo(() => renderGeometry(o), [o.id, JSON.stringify(o.params)])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: o.color, metalness: 1, roughness: 0.25, envMapIntensity: 1.3 }), [o.color])
  const matrix = useMemo(() => objectMatrix(o), [o.position, o.rotation, o.scale])
  const inv = useMemo(() => matrix.clone().invert(), [matrix])

  const handleLocal = (p: [number, number]) =>
    sk.mode === 'revolve' ? new THREE.Vector3(p[0], p[1], 0) : new THREE.Vector3(p[0], p[1], sk.depth / 2)
  const handleWorld = (p: [number, number]) => handleLocal(p).applyMatrix4(matrix)

  const [pick, setPick] = useState<number | null>(null)
  const [pickKey, setPickKey] = useState(0)
  const handleRef = useRef<THREE.Mesh>(null)

  const grab = (i: number) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); setPick(i); setPickKey(k => k + 1) }

  const drag = () => {
    if (pick == null || !handleRef.current) return
    const local = handleRef.current.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv)
    const np = sk.points.map((pt, i): [number, number] =>
      i !== pick ? pt : sk.mode === 'revolve' ? [Math.max(0, local.x), local.y] : [local.x, local.y])
    setObjectSketch(o.id, { ...sk, points: np })
  }

  return (
    <>
      <mesh geometry={geom} material={material} position={o.position} rotation={o.rotation} scale={o.scale} castShadow>
        <Edges scale={1.003} threshold={20} color="#3d454a" />
      </mesh>

      {sk.points.map((p, i) => i === pick ? null : (
        <mesh key={i} position={handleWorld(p)} onClick={grab(i)}>
          <sphereGeometry args={[0.5, 12, 10]} />
          <meshBasicMaterial color="#9BB4C6" toneMapped={false} />
        </mesh>
      ))}

      {pick != null && sk.points[pick] && (
        <TransformControls key={pickKey} mode="translate" size={0.6} showZ={false} onObjectChange={drag} onMouseUp={drag}>
          <mesh ref={handleRef} position={handleWorld(sk.points[pick])}>
            <sphereGeometry args={[0.6, 12, 10]} />
            <meshBasicMaterial color="#C6A265" toneMapped={false} />
          </mesh>
        </TransformControls>
      )}
    </>
  )
}
