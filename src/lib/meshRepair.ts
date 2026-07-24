/**
 * One-click mesh repair over a triangle soup (flat [x,y,z, x,y,z, ...], 9 floats
 * per triangle — the format baked sculpt/boolean results store). Pairs with the
 * read-only DFM analyzer: where that *detects* problems, this *fixes* the ones a
 * caster actually hits after boolean operations —
 *   • welds coincident vertices (booleans leave near-duplicate points),
 *   • drops degenerate (zero-area) triangles,
 *   • removes exact duplicate triangles,
 *   • caps open holes by fan-filling each boundary loop.
 * Pure geometry, no dependencies — deterministic and unit-testable.
 */

export interface RepairStats {
  weldedVertices: number      // duplicate positions merged away
  removedDegenerate: number   // zero-area triangles dropped
  removedDuplicate: number    // repeated triangles dropped
  holesFilled: number         // boundary loops capped
  trianglesAdded: number      // fill triangles created
  before: { triangles: number; boundaryEdges: number; nonManifoldEdges: number }
  after: { triangles: number; boundaryEdges: number; nonManifoldEdges: number }
  watertight: boolean
}

export interface RepairResult { vertices: number[]; stats: RepairStats }

const QUANT = 1e4   // weld tolerance: positions rounded to 1e-4 mm (matches the DFM audit)

type V3 = [number, number, number]

/** Undirected + directed edge audit over an indexed triangle list. */
function edgeStats(tris: number[][]): { boundary: number; nonManifold: number } {
  const und = new Map<string, number>()
  const key = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`)
  for (const [a, b, c] of tris) {
    und.set(key(a, b), (und.get(key(a, b)) ?? 0) + 1)
    und.set(key(b, c), (und.get(key(b, c)) ?? 0) + 1)
    und.set(key(c, a), (und.get(key(c, a)) ?? 0) + 1)
  }
  let boundary = 0, nonManifold = 0
  for (const n of und.values()) { if (n === 1) boundary++; else if (n > 2) nonManifold++ }
  return { boundary, nonManifold }
}

/** Index a triangle soup by welded position; drop triangles that collapse. */
function weld(soup: number[]): { pos: V3[]; tris: number[][]; welded: number; degenerate: number } {
  const map = new Map<string, number>()
  const pos: V3[] = []
  const idOf = (x: number, y: number, z: number): number => {
    const k = `${Math.round(x * QUANT)},${Math.round(y * QUANT)},${Math.round(z * QUANT)}`
    let n = map.get(k)
    if (n === undefined) { n = pos.length; map.set(k, n); pos.push([x, y, z]) }
    return n
  }
  const triCount = Math.floor(soup.length / 9)
  const tris: number[][] = []
  let degenerate = 0
  let rawVerts = 0
  for (let t = 0; t < triCount; t++) {
    const o = t * 9
    rawVerts += 3
    const a = idOf(soup[o], soup[o + 1], soup[o + 2])
    const b = idOf(soup[o + 3], soup[o + 4], soup[o + 5])
    const c = idOf(soup[o + 6], soup[o + 7], soup[o + 8])
    if (a === b || b === c || c === a) { degenerate++; continue }   // two corners welded → zero area
    tris.push([a, b, c])
  }
  return { pos, tris, welded: Math.max(0, rawVerts - pos.length), degenerate }
}

/** Drop triangles that repeat the same three vertices in the same winding. */
function dedupe(tris: number[][]): { tris: number[][]; removed: number } {
  const seen = new Set<string>()
  const out: number[][] = []
  let removed = 0
  for (const tri of tris) {
    // rotation-invariant, winding-sensitive signature
    const [a, b, c] = tri
    const min = Math.min(a, b, c)
    const rot = a === min ? [a, b, c] : b === min ? [b, c, a] : [c, a, b]
    const sig = rot.join('_')
    if (seen.has(sig)) { removed++; continue }
    seen.add(sig)
    out.push(tri)
  }
  return { tris: out, removed }
}

/** Assemble single-use directed boundary edges into closed loops. */
function boundaryLoops(tris: number[][]): number[][] {
  const count = new Map<string, number>()
  const key = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`)
  for (const [a, b, c] of tris) {
    for (const [x, y] of [[a, b], [b, c], [c, a]] as [number, number][]) count.set(key(x, y), (count.get(key(x, y)) ?? 0) + 1)
  }
  // directed boundary edges: the one direction each open edge appears in
  const next = new Map<number, number>()
  for (const [a, b, c] of tris) {
    for (const [x, y] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      if (count.get(key(x, y)) === 1) next.set(x, y)
    }
  }
  const loops: number[][] = []
  const used = new Set<number>()
  for (const start of next.keys()) {
    if (used.has(start)) continue
    const loop: number[] = []
    let cur: number | undefined = start
    let guard = 0
    while (cur !== undefined && !used.has(cur) && guard++ < next.size + 1) {
      used.add(cur)
      loop.push(cur)
      cur = next.get(cur)
      if (cur === start) break
    }
    if (loop.length >= 3) loops.push(loop)
  }
  return loops
}

/** Fan-fill a boundary loop from its centroid, orienting the caps outward
 *  (each new triangle carries the reverse of the loop's boundary edge). */
function capLoops(pos: V3[], tris: number[][], loops: number[][]): { added: number } {
  let added = 0
  for (const loop of loops) {
    const cx = loop.reduce((s, i) => s + pos[i][0], 0) / loop.length
    const cy = loop.reduce((s, i) => s + pos[i][1], 0) / loop.length
    const cz = loop.reduce((s, i) => s + pos[i][2], 0) / loop.length
    const ci = pos.length
    pos.push([cx, cy, cz])
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]
      const b = loop[(i + 1) % loop.length]
      // boundary edge runs a→b; the cap triangle carries b→a so it faces the
      // opposite way from the shell interior, closing the edge manifold-clean.
      tris.push([ci, b, a])
      added++
    }
  }
  return { added }
}

/** Flatten an indexed mesh back to a triangle soup. */
function toSoup(pos: V3[], tris: number[][]): number[] {
  const out: number[] = []
  for (const [a, b, c] of tris) {
    out.push(pos[a][0], pos[a][1], pos[a][2], pos[b][0], pos[b][1], pos[b][2], pos[c][0], pos[c][1], pos[c][2])
  }
  return out
}

export function repairMesh(soup: number[], opts: { fillHoles?: boolean } = {}): RepairResult {
  const fill = opts.fillHoles ?? true
  const before0 = weld(soup)
  const beforeEdges = edgeStats(before0.tris)

  const { pos, tris, welded, degenerate } = weld(soup)
  const dd = dedupe(tris)
  let working = dd.tris

  let holesFilled = 0, trianglesAdded = 0
  if (fill) {
    const loops = boundaryLoops(working)
    holesFilled = loops.length
    const cap = capLoops(pos, working, loops)
    trianglesAdded = cap.added
  }

  const afterEdges = edgeStats(working)
  const vertices = toSoup(pos, working)

  return {
    vertices,
    stats: {
      weldedVertices: welded,
      removedDegenerate: degenerate,
      removedDuplicate: dd.removed,
      holesFilled,
      trianglesAdded,
      before: { triangles: before0.tris.length, boundaryEdges: beforeEdges.boundary, nonManifoldEdges: beforeEdges.nonManifold },
      after: { triangles: working.length, boundaryEdges: afterEdges.boundary, nonManifoldEdges: afterEdges.nonManifold },
      watertight: afterEdges.boundary === 0 && afterEdges.nonManifold === 0
    }
  }
}
