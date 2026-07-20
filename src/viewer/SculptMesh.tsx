import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { TransformControls, Edges } from '@react-three/drei'
import { useModeler, type SculptObject } from '../state/modeler'
import { renderGeometry } from '../lib/sculpt'
import { VertexEditor } from './VertexEditor'
import { SketchNodeEditor } from './SketchNodeEditor'
import { SurfaceDraw } from './SurfaceDraw'

function useSculptMaterial(o: SculptObject) {
  return useMemo(() => {
    if (o.material === 'gem') {
      return new THREE.MeshPhysicalMaterial({
        color: o.color, metalness: 0, roughness: 0.02, transmission: 0.9,
        thickness: 4, ior: 2.0, clearcoat: 1, flatShading: true, transparent: true
      })
    }
    return new THREE.MeshStandardMaterial({ color: o.color, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 })
  }, [o.material, o.color])
}

const snapTo = (v: number, step: number) => Math.round(v / step) * step

export function SculptMesh({ o }: { o: SculptObject }) {
  const { selectedId, select, mode, update, snap, editMode } = useModeler()
  const ref = useRef<THREE.Mesh>(null)
  const geom = useMemo(() => renderGeometry(o), [o.kind, o.size, o.vertices, JSON.stringify(o.params)])
  const material = useSculptMaterial(o)
  const selected = selectedId === o.id

  // Vertex mode: drag a sketch's profile nodes (parametric) or a mesh's vertices.
  if (selected && editMode === 'vertex' && o.kind === 'sketch' && o.params?.sketch) return <SketchNodeEditor o={o} />
  if (selected && editMode === 'vertex' && o.kind === 'mesh') return <VertexEditor o={o} />
  // Surface-draw mode: emboss/cut a stroke on the selected part (any kind).
  if (selected && editMode === 'surface') return <SurfaceDraw o={o} />

  const mesh = (
    <mesh
      ref={ref}
      geometry={geom}
      material={material}
      position={o.position}
      rotation={o.rotation}
      scale={o.scale}
      onClick={e => { e.stopPropagation(); select(o.id) }}
      castShadow
    >
      {selected && <Edges scale={1.03} threshold={15} color="#C6A265" />}
    </mesh>
  )

  if (!selected) return mesh

  const commit = () => {
    const m = ref.current
    if (!m) return
    const g = Math.PI / 12   // 15° rotation grid
    update(o.id, {
      position: snap ? [snapTo(m.position.x, 0.5), snapTo(m.position.y, 0.5), snapTo(m.position.z, 0.5)] : [m.position.x, m.position.y, m.position.z],
      rotation: snap ? [snapTo(m.rotation.x, g), snapTo(m.rotation.y, g), snapTo(m.rotation.z, g)] : [m.rotation.x, m.rotation.y, m.rotation.z],
      scale: [m.scale.x, m.scale.y, m.scale.z]
    })
  }

  return (
    <TransformControls mode={mode} onMouseUp={commit} size={0.8}>
      {mesh}
    </TransformControls>
  )
}
