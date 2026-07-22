import { describe, it, expect } from 'vitest'
import { primitiveGeometry, booleanOp, modelerToStl, renderGeometry, bakedGeometry, meshVolume, sculptMetalVolume, boundingSize, editSketchPoint, sketchSummary, profileDistance, profileThinnest, MIN_SECTION_MM, sculptPull, loftVertices, resampleClosed } from '../lib/sculpt'
import type { SculptObject, PrimitiveKind } from '../state/modeler'

const obj = (over: Partial<SculptObject> & { kind: SculptObject['kind'] }): SculptObject => ({
  id: 'x', name: 'o', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  size: 6, material: 'metal', color: 0xffffff, ...over
})

describe('sculpt geometry', () => {
  const kinds: PrimitiveKind[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'tube']
  for (const k of kinds) {
    it(`${k} builds a geometry with positions`, () => {
      const g = primitiveGeometry(k, 6)
      expect(g.getAttribute('position').count).toBeGreaterThan(0)
    })
  }

  it('exports STL for a scene of primitives', () => {
    const stl = modelerToStl([obj({ kind: 'box' }), obj({ kind: 'sphere', position: [10, 0, 0] })])
    expect(stl.startsWith('solid')).toBe(true)
    expect(stl).toContain('facet normal')
  })
})

describe('editSketchPoint (type-in a node dimension)', () => {
  const pts: [number, number][] = [[2, 0], [5, 4], [3, 8]]

  it('sets a revolve point to the typed radius/height', () => {
    const out = editSketchPoint(pts, 1, 'revolve', 9, 6)
    expect(out[1]).toEqual([9, 6])
    expect(out[0]).toBe(pts[0])          // other points untouched (same ref)
    expect(pts[1]).toEqual([5, 4])       // original not mutated
  })
  it('clamps a negative revolve radius to 0 (distance from the axis)', () => {
    expect(editSketchPoint(pts, 0, 'revolve', -4, 3)[0]).toEqual([0, 3])
  })
  it('allows negative coordinates in extrude mode', () => {
    expect(editSketchPoint(pts, 2, 'extrude', -1.5, -2)[2]).toEqual([-1.5, -2])
  })
  it('ignores non-finite input and out-of-range index (returns same array)', () => {
    expect(editSketchPoint(pts, 1, 'revolve', NaN, 6)).toBe(pts)
    expect(editSketchPoint(pts, 9, 'revolve', 1, 2)).toBe(pts)
  })
})

describe('resampleClosed', () => {
  it('resamples to exactly n points around a closed polygon', () => {
    const sq: [number, number][] = [[0, 0], [4, 0], [4, 4], [0, 4]]
    expect(resampleClosed(sq, 12).length).toBe(12)
    expect(resampleClosed(sq, 40).length).toBe(40)
  })
  it('handles degenerate input without NaN', () => {
    for (const [x, y] of resampleClosed([[2, 3]], 8)) { expect(x).toBe(2); expect(y).toBe(3) }
  })
})

describe('loftVertices (blend two profiles)', () => {
  const A: [number, number][] = [[-3, -3], [3, -3], [3, 3], [-3, 3]]   // square
  const B: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]   // smaller square

  it('builds watertight triangle geometry with the expected count', () => {
    const sections = 16, n = 4
    const v = loftVertices(A, B, 8, sections)
    expect(v.length % 9).toBe(0)
    // walls: sections·n·2 tris; caps: 2·n tris
    const tris = sections * n * 2 + 2 * n
    expect(v.length).toBe(tris * 9)
  })
  it('spans z from 0 to the loft length', () => {
    const v = loftVertices(A, B, 10, 16)
    let minZ = Infinity, maxZ = -Infinity
    for (let i = 2; i < v.length; i += 3) { minZ = Math.min(minZ, v[i]); maxZ = Math.max(maxZ, v[i]) }
    expect(minZ).toBeCloseTo(0, 5)
    expect(maxZ).toBeCloseTo(10, 5)
  })
  it('the bottom matches profile A and the top matches profile B in extent', () => {
    const v = loftVertices(A, B, 8, 16)
    const spanAt = (zTarget: number) => {
      let mn = Infinity, mx = -Infinity
      for (let i = 0; i < v.length; i += 3) if (Math.abs(v[i + 2] - zTarget) < 1e-6) { mn = Math.min(mn, v[i]); mx = Math.max(mx, v[i]) }
      return mx - mn
    }
    expect(spanAt(0)).toBeCloseTo(6, 1)    // square A is 6 wide
    expect(spanAt(8)).toBeCloseTo(2, 1)    // square B is 2 wide
  })
  it('resamples mismatched point counts to a common ring', () => {
    const tri: [number, number][] = [[0, 0], [4, 0], [2, 4]]         // 3 pts
    const hex: [number, number][] = [[0, 0], [2, 0], [3, 2], [2, 4], [0, 4], [-1, 2]]  // 6 pts
    const v = loftVertices(tri, hex, 6, 8)
    expect(v.length).toBeGreaterThan(0)
    expect(v.length % 9).toBe(0)
  })
})

describe('sculptPull (direct vertex manipulation)', () => {
  it('moves the grabbed vertex (distance 0) by the full delta', () => {
    const base = new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0])
    const out = sculptPull(base, [0, 0, 0], [2, 3, 4], 5, false, new Float32Array(9))
    expect([out[0], out[1], out[2]]).toEqual([2, 3, 4])
  })
  it('leaves vertices at/beyond the region radius untouched', () => {
    const base = new Float32Array([0, 0, 0, 10, 0, 0])   // second vert 10mm away, radius 5
    const out = sculptPull(base, [0, 0, 0], [2, 3, 4], 5, false, new Float32Array(6))
    expect([out[3], out[4], out[5]]).toEqual([10, 0, 0])
  })
  it('applies a partial pull to vertices inside the radius (smooth falloff)', () => {
    const base = new Float32Array([0, 0, 0, 2.5, 0, 0])  // 2.5mm away, radius 5 → weight 0.5
    const out = sculptPull(base, [0, 0, 0], [4, 0, 0], 5, false, new Float32Array(6))
    expect(out[0]).toBe(4)                    // grabbed vertex: full
    expect(out[3]).toBeCloseTo(2.5 + 4 * 0.5, 5)   // neighbour: half the pull
  })
  it('closer neighbours follow more than farther ones', () => {
    const base = new Float32Array([0, 0, 0, 1, 0, 0, 3, 0, 0])
    const out = sculptPull(base, [0, 0, 0], [0, 5, 0], 5, false, new Float32Array(9))
    expect(out[4]).toBeGreaterThan(out[7])    // vert at 1mm rises more than vert at 3mm
    expect(out[7]).toBeGreaterThan(0)
  })
  it('symmetry mirrors the pull across the X=0 plane', () => {
    const base = new Float32Array([3, 0, 0, -3, 0, 0])   // grab (3,0,0); mirror at (-3,0,0)
    const out = sculptPull(base, [3, 0, 0], [0, 2, 0], 4, true, new Float32Array(6))
    expect(out[1]).toBe(2)    // grabbed vertex rises
    expect(out[4]).toBe(2)    // mirrored vertex rises too
  })
})

describe('profileDistance (measure tool)', () => {
  it('is the Euclidean mm distance between two profile points', () => {
    expect(profileDistance([0, 0], [3, 4])).toBe(5)
    expect(profileDistance([2, 1], [2, 1])).toBe(0)
    expect(profileDistance([1, 1], [1, 6])).toBe(5)
  })
})

describe('profileThinnest (DFM section check)', () => {
  it('extrude: catches a thin wall as the closed-outline self-approach', () => {
    // 12mm-wide bar, 0.4mm thick → thinnest section is the 0.4mm wall
    const bar: [number, number][] = [[-6, 0.2], [6, 0.2], [6, -0.2], [-6, -0.2]]
    expect(profileThinnest(bar, 'extrude')).toBeCloseTo(0.4, 5)
  })
  it('extrude: a chunky outline is well above the cast minimum', () => {
    const block: [number, number][] = [[-4, 4], [4, 4], [4, -4], [-4, -4]]
    expect(profileThinnest(block, 'extrude')).toBeGreaterThan(MIN_SECTION_MM)
  })
  it('revolve: flags a thin turned stem (interior small radius → diameter 2r)', () => {
    // waist pinches to r=0.3 → 0.6mm stem, below the 0.8mm minimum
    const waist: [number, number][] = [[3, 0], [0.3, 5], [3, 10]]
    expect(profileThinnest(waist, 'revolve')).toBeCloseTo(0.6, 5)
    expect(profileThinnest(waist, 'revolve')).toBeLessThan(MIN_SECTION_MM)
  })
  it('revolve: a healthy dome clears the minimum', () => {
    const dome: [number, number][] = [[0, 8], [4, 7.4], [7, 5.2], [8.4, 2.6], [8.8, 0]]
    expect(profileThinnest(dome, 'revolve')).toBeGreaterThan(MIN_SECTION_MM)
  })
  it('is Infinity for a degenerate profile', () => {
    expect(profileThinnest([[0, 0], [5, 0]], 'revolve')).toBe(Infinity)
  })
})

describe('sketchSummary (whole-profile envelope)', () => {
  const pts: [number, number][] = [[2, 0], [11, 4], [5, 20]]

  it('revolve: diameter is 2×max radius, height is Δy', () => {
    const s = sketchSummary(pts, 'revolve')
    expect(s.diameter).toBe(22)      // 2 × 11
    expect(s.height).toBe(20)        // 20 − 0
    expect(s.nodes).toBe(3)
    expect(s.width).toBeUndefined()
  })
  it('extrude: width is Δx, height is Δy, depth carried through', () => {
    const s = sketchSummary(pts, 'extrude', 3.5)
    expect(s.width).toBe(9)          // 11 − 2
    expect(s.height).toBe(20)
    expect(s.depth).toBe(3.5)
    expect(s.diameter).toBeUndefined()
  })
  it('empty profile is all zero, no NaN', () => {
    const s = sketchSummary([], 'revolve')
    expect(s.nodes).toBe(0)
    expect(s.diameter).toBe(0)
    expect(s.height).toBe(0)
  })
})

describe('boolean operations', () => {
  const a = obj({ kind: 'box', size: 8 })
  const b = obj({ kind: 'sphere', size: 8, position: [4, 0, 0] })

  it('subtract produces result geometry', () => {
    const verts = booleanOp(a, b, 'subtract')
    expect(verts.length).toBeGreaterThan(0)
    expect(verts.length % 9).toBe(0)   // triangles = 3 verts × 3 coords
  })
  it('union of overlapping solids yields more geometry than intersect', () => {
    const union = booleanOp(a, b, 'union')
    const intersect = booleanOp(a, b, 'intersect')
    expect(union.length).toBeGreaterThan(0)
    expect(intersect.length).toBeGreaterThan(0)
    expect(union.length).toBeGreaterThan(intersect.length)
  })
})

describe('jewelry builders + weight bridge', () => {
  it('builds shank / gem / head / bezel geometry', () => {
    for (const kind of ['shank', 'gem', 'head', 'bezel'] as const) {
      const g = renderGeometry(obj({ kind, params: kind === 'gem' ? { shapeId: 'rd', carat: 1 } : {} }))
      expect(g.getAttribute('position').count).toBeGreaterThan(0)
    }
  })

  it('a size-7, 2.2×1.8 mm shank has a plausible metal volume', () => {
    const shank = obj({ kind: 'shank', params: { ringSize: 7, profile: 'flat', width: 2.2, thickness: 1.8 } })
    const vol = meshVolume(bakedGeometry(shank))
    expect(vol).toBeGreaterThan(120)   // mm³ — compare to the configurator's ~230
    expect(vol).toBeLessThan(400)
  })

  it('metal volume counts metal parts and excludes gems', () => {
    const shank = obj({ kind: 'shank', material: 'metal', params: { ringSize: 7 } })
    const gem = obj({ kind: 'gem', material: 'gem', position: [0, 6, 0], params: { shapeId: 'rd', carat: 1.5 } })
    const withGem = sculptMetalVolume([shank, gem])
    const metalOnly = sculptMetalVolume([shank])
    expect(withGem).toBeCloseTo(metalOnly, 3)   // gem adds no metal
    expect(metalOnly).toBeGreaterThan(0)
  })

  it('a larger ring size uses more metal', () => {
    const small = meshVolume(bakedGeometry(obj({ kind: 'shank', params: { ringSize: 4 } })))
    const large = meshVolume(bakedGeometry(obj({ kind: 'shank', params: { ringSize: 12 } })))
    expect(large).toBeGreaterThan(small)
  })

  it('bounding size reports real millimetres, scaled by transform', () => {
    const [w, h, d] = boundingSize(obj({ kind: 'box', size: 8 }))
    expect(w).toBeCloseTo(8, 1)
    expect(h).toBeCloseTo(8, 1)
    expect(d).toBeCloseTo(8, 1)
    const scaled = boundingSize(obj({ kind: 'box', size: 8, scale: [2, 1, 1] }))
    expect(scaled[0]).toBeCloseTo(16, 1)
  })

  it('auto-seat: subtracting a cone cutter leaves a seated result', () => {
    const metal = obj({ kind: 'box', size: 10 })
    const cutter = obj({ kind: 'cone', size: 6, position: [0, 5, 0], rotation: [Math.PI, 0, 0] })
    const verts = booleanOp(metal, cutter, 'subtract')
    expect(verts.length).toBeGreaterThan(0)
  })
})
