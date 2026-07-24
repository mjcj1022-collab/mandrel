import { describe, it, expect } from 'vitest'
import { repairMesh } from '../lib/meshRepair'

// 8 cube corners
const C: [number, number, number][] = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
]
// 12 triangles (6 faces), consistent outward winding
const FACES: [number, number, number][] = [
  [0, 1, 2], [0, 2, 3],   // bottom z=0
  [4, 6, 5], [4, 7, 6],   // top z=1
  [0, 4, 5], [0, 5, 1],   // front y=0
  [3, 2, 6], [3, 6, 7],   // back y=1
  [0, 3, 7], [0, 7, 4],   // left x=0
  [1, 5, 6], [1, 6, 2],   // right x=1
]
const soupFrom = (faces: [number, number, number][]): number[] => {
  const out: number[] = []
  for (const [a, b, c] of faces) for (const i of [a, b, c]) out.push(...C[i])
  return out
}
const cube = () => soupFrom(FACES)

describe('meshRepair', () => {
  it('welds coincident vertices without changing a closed cube', () => {
    const { stats } = repairMesh(cube())
    expect(stats.before.triangles).toBe(12)
    expect(stats.before.boundaryEdges).toBe(0)         // valid closed triangulation
    expect(stats.weldedVertices).toBe(36 - 8)          // 36 raw corners → 8 unique
    expect(stats.watertight).toBe(true)
    expect(stats.holesFilled).toBe(0)
  })

  it('caps an open hole so the mesh becomes watertight', () => {
    const open = soupFrom(FACES.filter((_, i) => i !== 2 && i !== 3))   // drop the two top-face tris
    const before = repairMesh(open, { fillHoles: false })
    expect(before.stats.before.boundaryEdges).toBe(4)  // square hole = 4 open edges
    expect(before.stats.watertight).toBe(false)

    const fixed = repairMesh(open, { fillHoles: true })
    expect(fixed.stats.holesFilled).toBe(1)
    expect(fixed.stats.trianglesAdded).toBe(4)         // fan of 4 from the loop centroid
    expect(fixed.stats.after.boundaryEdges).toBe(0)
    expect(fixed.stats.watertight).toBe(true)
  })

  it('drops degenerate (zero-area) triangles', () => {
    const soup = [...cube(), 2, 2, 2, 2, 2, 2, 2, 2, 2]   // a collapsed triangle
    const { stats } = repairMesh(soup)
    expect(stats.removedDegenerate).toBe(1)
    expect(stats.after.triangles).toBe(12)
  })

  it('removes exact duplicate triangles', () => {
    const soup = [...cube(), ...C[0], ...C[1], ...C[2]]   // repeat the first face triangle
    const { stats } = repairMesh(soup, { fillHoles: false })
    expect(stats.removedDuplicate).toBe(1)
    expect(stats.after.triangles).toBe(12)
  })

  it('returns a valid triangle soup (multiple of 9 floats)', () => {
    const { vertices } = repairMesh(cube())
    expect(vertices.length % 9).toBe(0)
    expect(vertices.length / 9).toBe(12)
  })
})
