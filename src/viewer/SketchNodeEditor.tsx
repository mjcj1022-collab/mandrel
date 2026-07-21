import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { TransformControls, Edges, Html } from '@react-three/drei'
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

  // Live mm readout for a profile point: radius·height (revolve) or x·y (extrude).
  const readout = (p: [number, number]) =>
    sk.mode === 'revolve'
      ? `r ${p[0].toFixed(1)} · h ${p[1].toFixed(1)}`
      : `${p[0].toFixed(1)} · ${p[1].toFixed(1)}`
  const nodeLabel = (p: [number, number], active: boolean) => (
    <Html position={handleWorld(p)} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{
        transform: 'translateY(-14px)', whiteSpace: 'nowrap',
        font: '600 10px ui-monospace, monospace', fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em', padding: '1px 5px', borderRadius: 4,
        background: 'rgba(12,14,17,0.82)', border: '1px solid rgba(255,255,255,0.08)',
        color: active ? '#E7C989' : '#9BB4C6', opacity: active ? 1 : 0.85,
      }}>{readout(p)} mm</div>
    </Html>
  )

  const drag = () => {
    if (pick == null || !handleRef.current) return
    const local = handleRef.current.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv)
    const np = sk.points.map((pt, i): [number, number] =>
      i !== pick ? pt : sk.mode === 'revolve' ? [Math.max(0, local.x), local.y] : [local.x, local.y])
    setObjectSketch(o.id, { ...sk, points: np })
  }

  // profile coordinate of a world-space point on the surface
  const toProfile = (world: THREE.Vector3): [number, number] => {
    const l = world.clone().applyMatrix4(inv)
    return sk.mode === 'revolve' ? [Math.hypot(l.x, l.z), l.y] : [l.x, l.y]
  }

  // click the surface to insert a node at the nearest profile segment
  const addNode = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const np = toProfile(e.point)
    let at = sk.points.length, best = Infinity
    for (let i = 0; i < sk.points.length - 1; i++) {
      const mx = (sk.points[i][0] + sk.points[i + 1][0]) / 2, my = (sk.points[i][1] + sk.points[i + 1][1]) / 2
      const d = (mx - np[0]) ** 2 + (my - np[1]) ** 2
      if (d < best) { best = d; at = i + 1 }
    }
    const out = [...sk.points]; out.splice(at, 0, np)
    setObjectSketch(o.id, { ...sk, points: out })
  }

  // right-click a node to delete it
  const delNode = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (sk.points.length <= 2) return
    setObjectSketch(o.id, { ...sk, points: sk.points.filter((_, j) => j !== i) })
    if (pick === i) setPick(null); else if (pick != null && pick > i) setPick(pick - 1)
  }

  return (
    <>
      <mesh geometry={geom} material={material} position={o.position} rotation={o.rotation} scale={o.scale} onClick={addNode} castShadow>
        <Edges scale={1.003} threshold={20} color="#3d454a" />
      </mesh>

      {sk.points.map((p, i) => i === pick ? null : (
        <group key={i}>
          <mesh position={handleWorld(p)} onClick={grab(i)} onContextMenu={delNode(i)} renderOrder={10}>
            <sphereGeometry args={[0.7, 14, 12]} />
            <meshBasicMaterial color="#9BB4C6" toneMapped={false} depthTest={false} depthWrite={false} />
          </mesh>
          {nodeLabel(p, false)}
        </group>
      ))}

      {pick != null && sk.points[pick] && (
        <>
          <TransformControls key={pickKey} mode="translate" size={0.6} showZ={false} onObjectChange={drag} onMouseUp={drag}>
            <mesh ref={handleRef} position={handleWorld(sk.points[pick])} onContextMenu={delNode(pick)} renderOrder={11}>
              <sphereGeometry args={[0.8, 14, 12]} />
              <meshBasicMaterial color="#C6A265" toneMapped={false} depthTest={false} depthWrite={false} />
            </mesh>
          </TransformControls>
          {nodeLabel(sk.points[pick], true)}
        </>
      )}
    </>
  )
}
