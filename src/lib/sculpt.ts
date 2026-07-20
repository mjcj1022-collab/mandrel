import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg'
import { shapeById, stoneMm, alloyById, stoneById } from '../catalog'
import { sizeToDiameter } from './sizing'
import { brilliantGeometry } from './gem'
import { MARKET } from './market'
import type { SculptObject, PrimitiveKind, SculptParams, ShankProfile } from '../state/modeler'

export type BooleanOp = 'union' | 'subtract' | 'intersect'
const OP = { union: ADDITION, subtract: SUBTRACTION, intersect: INTERSECTION } as const
const JEWELRY = new Set(['shank', 'gem', 'head', 'bezel'])

/* ---------- primitives ---------- */

export function primitiveGeometry(kind: PrimitiveKind, size: number): THREE.BufferGeometry {
  const r = size / 2
  switch (kind) {
    case 'box': return new THREE.BoxGeometry(size, size, size)
    case 'sphere': return new THREE.SphereGeometry(r, 40, 28)
    case 'cylinder': return new THREE.CylinderGeometry(r, r, size, 40)
    case 'cone': return new THREE.ConeGeometry(r, size, 40)
    case 'torus': return new THREE.TorusGeometry(r, size / 4, 24, 64)
    case 'tube': return new THREE.TorusGeometry(r, size / 10, 18, 72)
  }
}

/* ---------- jewelry builders ---------- */

/** Cross-section of a shank, in mm. X = radial (thickness), Y = axial (width). */
function profileShape(profile: ShankProfile, width: number, thickness: number): THREE.Shape {
  const s = new THREE.Shape()
  const hw = width / 2, ht = thickness / 2
  switch (profile) {
    case 'round':
      s.absellipse(0, 0, ht, hw, 0, Math.PI * 2, false, 0); break
    case 'knife':
      s.moveTo(-ht, 0); s.lineTo(0, hw); s.lineTo(ht, 0); s.lineTo(0, -hw); s.closePath(); break
    case 'comfort':
      // rounded (domed) interior on the -X side
      s.moveTo(ht, -hw); s.lineTo(ht, hw); s.quadraticCurveTo(-ht * 1.6, 0, ht, -hw); s.closePath(); break
    case 'dshape':
      s.moveTo(-ht, -hw); s.lineTo(-ht, hw); s.quadraticCurveTo(ht * 1.5, 0, -ht, -hw); s.closePath(); break
    default: // flat
      s.moveTo(-ht, -hw); s.lineTo(ht, -hw); s.lineTo(ht, hw); s.lineTo(-ht, hw); s.closePath()
  }
  return s
}

export function shankGeometry(p: SculptParams): THREE.BufferGeometry {
  const ringSize = p.ringSize ?? 7
  const profile = p.profile ?? 'round'
  const width = p.width ?? 2.2
  const thickness = p.thickness ?? 1.8
  const R = sizeToDiameter(ringSize) / 2 + thickness / 2   // centreline radius

  const pts: THREE.Vector3[] = []
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0))
  }
  const path = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0)
  // 96 steps keeps the band visually smooth while roughly halving the triangle
  // count vs. 200 — so a baked band stays responsive to vertex sculpting.
  const geo = new THREE.ExtrudeGeometry(profileShape(profile, width, thickness), {
    steps: 96, curveSegments: 8, bevelEnabled: false, extrudePath: path
  })
  geo.computeVertexNormals()
  return geo
}

function gemGeometry(p: SculptParams): THREE.BufferGeometry {
  const shape = shapeById(p.shapeId ?? 'rd')
  const width = stoneMm(shape, Math.max(p.carat ?? 1, 0.02)).width
  const geo = brilliantGeometry(width, shape.segments)
  geo.scale(1, 1, shape.lwRatio)
  geo.computeVertexNormals()
  return geo
}

function headGeometry(p: SculptParams): THREE.BufferGeometry {
  const prongs = p.prongs ?? 4
  const stoneW = p.stoneW ?? 6.5
  const h = p.height ?? 4
  const r = stoneW / 2
  const prongR = 0.42 + stoneW * 0.012

  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < prongs; i++) {
    const a = (i / prongs) * Math.PI * 2 + Math.PI / prongs
    const c = new THREE.CylinderGeometry(prongR * 0.85, prongR, h, 12)
    c.translate(Math.cos(a) * r * 0.99, 0, Math.sin(a) * r * 0.99)
    parts.push(c)
    const bead = new THREE.SphereGeometry(prongR * 0.9, 10, 8)
    bead.translate(Math.cos(a) * r * 0.94, h / 2, Math.sin(a) * r * 0.94)
    parts.push(bead)
  }
  const gallery = new THREE.TorusGeometry(r * 0.82, prongR * 0.85, 10, 44)
  gallery.rotateX(Math.PI / 2); gallery.translate(0, -h * 0.3, 0)
  parts.push(gallery)

  const merged = mergeGeometries(parts, false) ?? gallery
  merged.computeVertexNormals()
  return merged
}

function bezelGeometry(p: SculptParams): THREE.BufferGeometry {
  const stoneW = p.stoneW ?? 6.5
  const height = p.height ?? 3
  const wall = p.wall ?? 0.6
  const rIn = stoneW / 2, rOut = stoneW / 2 + wall
  const pts = [
    new THREE.Vector2(rIn, 0), new THREE.Vector2(rOut, 0),
    new THREE.Vector2(rOut, height), new THREE.Vector2(rIn, height),
    new THREE.Vector2(rIn, 0)
  ]
  const geo = new THREE.LatheGeometry(pts, 56)
  geo.computeVertexNormals()
  return geo
}

function jewelryGeometry(kind: string, params: SculptParams): THREE.BufferGeometry {
  switch (kind) {
    case 'shank': return shankGeometry(params)
    case 'gem': return gemGeometry(params)
    case 'head': return headGeometry(params)
    case 'bezel': return bezelGeometry(params)
    default: return new THREE.BoxGeometry(1, 1, 1)
  }
}

/* ---------- shared geometry access ---------- */

function geomFromVertices(vertices: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  g.computeVertexNormals()
  return g
}

function baseGeometry(o: SculptObject): THREE.BufferGeometry {
  if (o.kind === 'mesh' && o.vertices) return geomFromVertices(o.vertices)
  if (o.kind === 'sketch' && o.params?.sketch) {
    const sk = o.params.sketch
    return geomFromVertices(sketchToVertices(sk.points, sk.mode, sk.depth, sk.segments))
  }
  if (JEWELRY.has(o.kind)) return jewelryGeometry(o.kind, o.params ?? {})
  return primitiveGeometry(o.kind as PrimitiveKind, o.size)
}

export const renderGeometry = (o: SculptObject): THREE.BufferGeometry => baseGeometry(o)

/* ---------- editable-mesh conversion + free-draw ---------- */

/** Positions as a flat triangle soup, converting only when indexed (avoids a
 *  noisy three.js warning on geometry that is already non-indexed). */
function soupPositions(geo: THREE.BufferGeometry): number[] {
  const g = geo.getIndex() ? geo.toNonIndexed() : geo
  const arr = Array.from(g.getAttribute('position').array as Float32Array)
  if (g !== geo) g.dispose()
  return arr
}

/** Triangle-soup positions of an object with its transform baked in — used to
 *  flatten a parametric part into an editable 'mesh' at identity transform. */
export function bakedVertices(o: SculptObject): number[] {
  const g = bakedGeometry(o)
  const arr = soupPositions(g)
  g.dispose()
  return arr
}

export type SketchMode = 'revolve' | 'extrude'

/**
 * Turn a hand-drawn 2D profile (points in mm) into mesh vertices.
 * - revolve: spin the profile around the Y axis (x = radius ≥ 0, y = height).
 * - extrude: treat the points as a closed outline in XY, extruded along Z.
 */
export function sketchToVertices(points: [number, number][], mode: SketchMode, depth = 3, segments = 64): number[] {
  if (points.length < 2) return []
  let geo: THREE.BufferGeometry
  if (mode === 'revolve') {
    const pts = points.map(([x, y]) => new THREE.Vector2(Math.max(0.02, x), y))
    geo = new THREE.LatheGeometry(pts, Math.max(3, Math.round(segments)))
  } else {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
    geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 })
    geo.translate(0, 0, -depth / 2)
  }
  const arr = soupPositions(geo)
  geo.dispose()
  return arr
}

/** Midpoint-subdivide a triangle soup: each triangle becomes four, so vertex
 *  edits land on a finer mesh. Input/output are flat [x,y,z,...] positions. */
export function subdivideSoup(verts: number[]): number[] {
  const out: number[] = []
  const mid = (a: number, b: number): [number, number, number] => [
    (verts[a] + verts[b]) / 2, (verts[a + 1] + verts[b + 1]) / 2, (verts[a + 2] + verts[b + 2]) / 2
  ]
  const tri = (p: [number, number, number]) => out.push(p[0], p[1], p[2])
  const at = (i: number): [number, number, number] => [verts[i], verts[i + 1], verts[i + 2]]
  for (let i = 0; i < verts.length; i += 9) {
    const a = at(i), b = at(i + 3), c = at(i + 6)
    const ab = mid(i, i + 3), bc = mid(i + 3, i + 6), ca = mid(i + 6, i)
    tri(a); tri(ab); tri(ca)
    tri(ab); tri(b); tri(bc)
    tri(ca); tri(bc); tri(c)
    tri(ab); tri(bc); tri(ca)
  }
  return out
}

/** One spatial-Laplacian relax pass: each vertex eases toward the average of
 *  vertices within `radius`, blended by `strength` (0..1). Smooths lumps left
 *  by aggressive vertex pulls. A uniform hash grid keeps it ~O(n), so it stays
 *  responsive even on the dense meshes a baked band produces. */
export function smoothSoup(verts: number[], radius: number, strength = 0.5): number[] {
  const n = verts.length / 3
  const out = verts.slice()
  if (n === 0) return out
  const cell = Math.max(radius, 1e-3)
  const grid = new Map<string, number[]>()
  const key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
  for (let i = 0; i < n; i++) {
    const k = key(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2])
    const bucket = grid.get(k)
    if (bucket) bucket.push(i); else grid.set(k, [i])
  }
  const r2 = radius * radius
  for (let i = 0; i < n; i++) {
    const xi = verts[i * 3], yi = verts[i * 3 + 1], zi = verts[i * 3 + 2]
    const cx = Math.floor(xi / cell), cy = Math.floor(yi / cell), cz = Math.floor(zi / cell)
    let sx = 0, sy = 0, sz = 0, cnt = 0
    for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gz = cz - 1; gz <= cz + 1; gz++) {
      const bucket = grid.get(`${gx},${gy},${gz}`)
      if (!bucket) continue
      for (const j of bucket) {
        const dx = verts[j * 3] - xi, dy = verts[j * 3 + 1] - yi, dz = verts[j * 3 + 2] - zi
        if (dx * dx + dy * dy + dz * dz <= r2) { sx += verts[j * 3]; sy += verts[j * 3 + 1]; sz += verts[j * 3 + 2]; cnt++ }
      }
    }
    if (cnt > 0) {
      out[i * 3] = xi + (sx / cnt - xi) * strength
      out[i * 3 + 1] = yi + (sy / cnt - yi) * strength
      out[i * 3 + 2] = zi + (sz / cnt - zi) * strength
    }
  }
  return out
}

export function objectMatrix(o: SculptObject): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...o.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...o.rotation)),
    new THREE.Vector3(...o.scale)
  )
}

export function bakedGeometry(o: SculptObject): THREE.BufferGeometry {
  const g = baseGeometry(o)
  g.applyMatrix4(objectMatrix(o))
  return g
}

/* ---------- boolean + export ---------- */

export function booleanOp(a: SculptObject, b: SculptObject, op: BooleanOp): number[] {
  const brushA = new Brush(bakedGeometry(a)); brushA.updateMatrixWorld()
  const brushB = new Brush(bakedGeometry(b)); brushB.updateMatrixWorld()
  const evaluator = new Evaluator()
  evaluator.useGroups = false
  const result = evaluator.evaluate(brushA, brushB, OP[op])
  const pos = result.geometry.getAttribute('position')
  return Array.from(pos.array as Float32Array)
}

export function modelerToStl(objects: SculptObject[]): string {
  const group = new THREE.Group()
  for (const o of objects) group.add(new THREE.Mesh(bakedGeometry(o)))
  const stl = new STLExporter().parse(group, { binary: false })
  group.traverse(n => { const g = (n as THREE.Mesh).geometry; if (g) g.dispose() })
  return stl
}

/* ---------- volume → weight bridge ---------- */

/** Signed-tetrahedron volume of a geometry, mm³ (geometry already in mm). */
export function meshVolume(geo: THREE.BufferGeometry): number {
  const pos = geo.getAttribute('position')
  const idx = geo.getIndex()
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  let vol = 0
  const tri = (i0: number, i1: number, i2: number) => {
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2)
    vol += a.dot(b.clone().cross(c)) / 6
  }
  if (idx) for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2))
  else for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2)
  return Math.abs(vol)
}

/** Total metal volume of the sculpt (gems and cutters excluded), mm³. */
export function sculptMetalVolume(objects: SculptObject[]): number {
  let vol = 0
  for (const o of objects) {
    if (o.material !== 'metal') continue
    const g = bakedGeometry(o)
    vol += meshVolume(g)
    g.dispose()
  }
  return vol
}

export function sculptGemCarats(objects: SculptObject[]): number {
  return objects.filter(o => o.kind === 'gem').reduce((s, o) => s + (o.params?.carat ?? 0), 0)
}

/* ---------- sculpt price estimate ---------- */

const OZT_G = 31.1035
const SETTING_EACH = 55   // setting labor per main stone, $

export interface SculptEstimate {
  vol: number; castG: number; carats: number; gemCount: number
  metalCost: number; stoneCost: number; settingLabor: number; finishFee: number
  subtotal: number; total: number
}

/**
 * A retail estimate from a sculpt, mirroring the Design tab's engine: exact
 * metal (summed part volume × alloy, at the shared spot factor), catalog stone
 * rates, per-stone setting labor, one cast/finish fee, all × the shop margin.
 */
export function sculptEstimate(objects: SculptObject[], alloyId: string): SculptEstimate {
  const alloy = alloyById(alloyId)
  const vol = sculptMetalVolume(objects)
  const castG = (vol / 1000) * alloy.density
  const metalCost = alloy.precious
    ? ((castG * alloy.fine) / OZT_G) * (alloy.spot * MARKET.spotFactor) * (1 + alloy.premium)
    : castG * alloy.perGram * (1 + alloy.premium)
  const gems = objects.filter(o => o.kind === 'gem')
  const stoneCost = gems.reduce((sum, g) => {
    const st = stoneById(g.params?.stoneTypeId ?? 'dia')
    return sum + st.rate * Math.pow(Math.max(g.params?.carat ?? 0, 0.001), st.exponent)
  }, 0)
  const carats = gems.reduce((s, g) => s + (g.params?.carat ?? 0), 0)
  const settingLabor = gems.length * SETTING_EACH
  const finishFee = MARKET.finishFee
  const subtotal = metalCost + stoneCost + settingLabor + finishFee
  return { vol, castG, carats, gemCount: gems.length, metalCost, stoneCost, settingLabor, finishFee, subtotal, total: subtotal * MARKET.margin }
}

/** Minimum wall / feature size, mm — below this, casting or printing gets risky. */
export const MIN_WALL_MM = 0.8

export interface SculptWarning { part: string; text: string }

/** Printability / castability checks over the metal parts (thin sections). */
export function sculptWarnings(objects: SculptObject[]): SculptWarning[] {
  const out: SculptWarning[] = []
  for (const o of objects) {
    if (o.material !== 'metal') continue
    const [w, h, d] = boundingSize(o)
    const min = Math.min(w, h, d)
    if (min > 0 && min < MIN_WALL_MM) {
      out.push({ part: o.name, text: `thin section ${min.toFixed(2)} mm — below ~${MIN_WALL_MM} mm may not cast or print cleanly` })
    }
  }
  return out
}

/** Bounding-box dimensions of one object, in mm [w, h, d]. */
export function boundingSize(o: SculptObject): [number, number, number] {
  const g = bakedGeometry(o)
  g.computeBoundingBox()
  const b = g.boundingBox
  g.dispose()
  if (!b) return [0, 0, 0]
  return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z]
}
