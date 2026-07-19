import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { DesignSpec } from '../spec/types'
import { displayScale } from './Piece'

/**
 * Live handle to the rendered piece group (inside the turntable). Set by Scene;
 * read by the exporter so an STL can be produced from exactly what's on screen.
 */
export const pieceHandle: { current: THREE.Object3D | null } = { current: null }

/**
 * Build a watertight-ish, metal-only mesh from the rendered piece and return
 * ASCII STL. Stones (non-metal materials) are dropped — a caster prints metal.
 * Geometry is taken relative to the piece root so the turntable rotation is
 * cancelled, then divided by the display scale so the model is true millimetres.
 */
export function pieceToStl(spec: DesignSpec, root: THREE.Object3D): string {
  root.updateWorldMatrix(true, true)
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const invScale = 1 / displayScale(spec)

  const group = new THREE.Group()
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as THREE.MeshPhysicalMaterial
    if (!mat || mat.metalness !== 1) return   // metal only
    const g = (mesh.geometry as THREE.BufferGeometry).clone()
    // mesh -> piece-local, then remove the display scale to restore mm
    const local = new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld)
    local.premultiply(new THREE.Matrix4().makeScale(invScale, invScale, invScale))
    g.applyMatrix4(local)
    group.add(new THREE.Mesh(g))
  })

  const stl = new STLExporter().parse(group, { binary: false })
  group.traverse(o => { const g = (o as THREE.Mesh).geometry; if (g) g.dispose() })
  return stl
}

export function downloadStl(spec: DesignSpec, filename: string): boolean {
  const root = pieceHandle.current
  if (!root) return false
  const stl = pieceToStl(spec, root)
  const blob = new Blob([stl], { type: 'model/stl' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
  return true
}
