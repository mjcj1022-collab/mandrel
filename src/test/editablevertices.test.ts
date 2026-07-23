import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import { pieceToEditableVertices } from '../viewer/exportStl'
import { useModeler } from '../state/modeler'
import { DEFAULT_SPEC } from '../spec/types'

const metalMesh = () => new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshPhysicalMaterial({ metalness: 1 }))
const gemMesh = () => new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshPhysicalMaterial({ metalness: 0 }))
const ringSpec = { ...DEFAULT_SPEC, category: 'ring' as const }

describe('pieceToEditableVertices', () => {
  it('bakes only metal, as a flat triangle soup', () => {
    const root = new THREE.Group()
    root.add(metalMesh(), gemMesh())
    const verts = pieceToEditableVertices(ringSpec, root)
    // one non-indexed box = 36 verts * 3 = 108 floats; the gem is excluded
    expect(verts.length).toBe(108)
  })

  it('cancels the root (turntable) transform so vertices are piece-local mm', () => {
    const root = new THREE.Group()
    root.position.set(10, 0, 0)     // stand-in for an orbited / spun stage
    root.rotation.y = 1.1
    root.add(metalMesh())
    const verts = pieceToEditableVertices(ringSpec, root)
    // a size-2 box has half-extent 1 in piece-local mm — not offset by the root
    let max = 0
    for (const v of verts) max = Math.max(max, Math.abs(v))
    expect(max).toBeLessThan(1.001)
    expect(max).toBeGreaterThan(0.99)
  })

  it('returns nothing when no metal is on screen', () => {
    const root = new THREE.Group()
    root.add(gemMesh())
    expect(pieceToEditableVertices(ringSpec, root)).toEqual([])
  })
})

describe('modeler Select / Edit vertex tool', () => {
  beforeEach(() => useModeler.setState({ objects: [], selectedId: null, editMode: 'object', vertexTool: 'edit', selectedVertex: null }))
  const s = () => useModeler.getState()

  it('choosing a tool implies Vertices edit mode', () => {
    s().setVertexTool('select')
    expect(s().editMode).toBe('vertex')
    expect(s().vertexTool).toBe('select')
  })

  it('leaving Vertices mode drops the picked vertex', () => {
    s().setVertexTool('edit')
    s().pickVertex(4)
    expect(s().selectedVertex).toBe(4)
    s().setEditMode('object')
    expect(s().selectedVertex).toBeNull()
  })

  it('selecting a different object clears the picked vertex', () => {
    s().add('box')
    const first = s().selectedId!
    s().add('sphere')
    const second = s().selectedId!
    s().select(first)
    s().setVertexTool('edit')
    s().pickVertex(2)
    expect(s().selectedVertex).toBe(2)
    s().select(second)               // switching object drops the stale pick
    expect(s().selectedVertex).toBeNull()
  })
})
