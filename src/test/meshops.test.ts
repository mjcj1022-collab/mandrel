import { describe, it, expect } from 'vitest'
import { addVertexInTriangle, removeVertexNear } from '../lib/sculpt'

// one triangle A(0,0,0) B(1,0,0) C(0,1,0) as a flat soup
const tri = [0, 0, 0, 1, 0, 0, 0, 1, 0]

describe('addVertexInTriangle', () => {
  it('splits the clicked triangle into three, with the new point shared', () => {
    const out = addVertexInTriangle(tri, 0, [0.25, 0.25, 0])
    expect(out.length).toBe(27)                 // 3 triangles * 9
    expect(out.slice(0, 3)).toEqual([0.25, 0.25, 0])   // PAB
    expect(out.slice(9, 12)).toEqual([0.25, 0.25, 0])  // PBC
    expect(out.slice(18, 21)).toEqual([0.25, 0.25, 0]) // PCA
  })

  it('is a no-op for an out-of-range face index', () => {
    expect(addVertexInTriangle(tri, 5, [0, 0, 0])).toEqual(tri)
  })
})

describe('removeVertexNear', () => {
  it('drops only the triangles touching the nearest vertex', () => {
    const two = [0, 0, 0, 1, 0, 0, 0, 1, 0, /* far triangle */ 5, 5, 5, 6, 5, 5, 5, 6, 5]
    const out = removeVertexNear(two, [0.1, 0.1, 0])   // nearest is A(0,0,0)
    expect(out).toEqual([5, 5, 5, 6, 5, 5, 5, 6, 5])
  })

  it('refuses to empty the mesh', () => {
    expect(removeVertexNear(tri, [0, 0, 0])).toEqual(tri)
  })
})
