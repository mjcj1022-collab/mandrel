import { create } from 'zustand'
import { bakedVertices, subdivideSoup, smoothSoup, booleanOp, type SketchMode } from '../lib/sculpt'

export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'tube'
export type JewelryKind = 'shank' | 'gem' | 'head' | 'bezel'
export type SculptKind = PrimitiveKind | JewelryKind
export type SculptMaterial = 'metal' | 'gem'
export type TransformMode = 'translate' | 'rotate' | 'scale'
export type EditMode = 'object' | 'vertex'
export type ShankProfile = 'round' | 'flat' | 'dshape' | 'knife' | 'comfort'

/** A free-drawn profile that stays editable — geometry is regenerated from it. */
export interface SketchDef {
  points: [number, number][]   // mm, profile outline
  mode: SketchMode             // revolve (around Y) or extrude (along Z)
  depth: number                // extrude depth, mm
  segments: number             // revolve resolution
}

/** Parameters for the jewelry-native builders and the free-draw sketch. */
export interface SculptParams {
  ringSize?: number       // shank — US size
  profile?: ShankProfile  // shank
  width?: number          // shank / bezel — mm
  thickness?: number      // shank — mm
  shapeId?: string        // gem — stone shape
  stoneTypeId?: string    // gem — stone material (for pricing)
  carat?: number          // gem
  prongs?: number         // head
  stoneW?: number         // head / bezel — stone width mm
  height?: number         // head / bezel — mm
  wall?: number           // bezel wall — mm
  sketch?: SketchDef      // 'sketch' — a live, re-editable free-draw profile
}

export interface SculptObject {
  id: string
  kind: SculptKind | 'mesh' | 'sketch'
  name: string
  position: [number, number, number]
  rotation: [number, number, number]   // radians
  scale: [number, number, number]
  size: number
  material: SculptMaterial
  color: number
  params?: SculptParams
  vertices?: number[]                   // baked positions for 'mesh' (boolean) results
}

const GOLD = 0xD8B36A
const GEM = 0x8FD0E8
export const SCULPT_COLORS = { metal: GOLD, gem: GEM }

const LABEL: Record<SculptKind, string> = {
  box: 'Box', sphere: 'Sphere', cylinder: 'Cylinder', cone: 'Cone', torus: 'Torus', tube: 'Tube',
  shank: 'Shank', gem: 'Gem', head: 'Prong head', bezel: 'Bezel'
}

const TWO_PI = Math.PI * 2

/** Per-kind spawn defaults. */
function defaults(kind: SculptKind): Pick<SculptObject, 'position' | 'size' | 'material' | 'color' | 'params'> {
  switch (kind) {
    case 'shank':
      return { position: [0, 0, 0], size: 6, material: 'metal', color: GOLD, params: { ringSize: 7, profile: 'round', width: 2.2, thickness: 1.8 } }
    case 'gem':
      return { position: [0, 6, 0], size: 6, material: 'gem', color: GEM, params: { shapeId: 'rd', stoneTypeId: 'dia', carat: 1 } }
    case 'head':
      return { position: [0, 6, 0], size: 6, material: 'metal', color: GOLD, params: { prongs: 4, stoneW: 6.5, height: 4 } }
    case 'bezel':
      return { position: [0, 6, 0], size: 6, material: 'metal', color: GOLD, params: { stoneW: 6.5, height: 3, wall: 0.6 } }
    case 'torus':
    case 'tube':
      return { position: [0, 1.5, 0], size: 6, material: 'metal', color: GOLD }
    default:
      return { position: [0, 3, 0], size: 6, material: 'metal', color: GOLD }
  }
}

function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  return c?.randomUUID ? c.randomUUID() : 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
}

interface ModelerStore {
  objects: SculptObject[]
  selectedId: string | null
  mode: TransformMode
  editMode: EditMode
  falloff: number
  alloyId: string
  snap: boolean
  symmetry: boolean
  past: SculptObject[][]
  future: SculptObject[][]
  undo: () => void
  redo: () => void
  setEditMode: (m: EditMode) => void
  setFalloff: (r: number) => void
  toggleSymmetry: () => void
  bakeToMesh: (id: string) => void
  subdivideMesh: (id: string) => void
  smoothMesh: (id: string, radius: number) => void
  fuseMetal: () => number
  toggleSnap: () => void
  mirror: (id: string) => void
  centerObject: (id: string) => void
  sketching: boolean
  sketchEditId: string | null
  setSketching: (on: boolean, editId?: string | null) => void
  addSketch: (sketch: SketchDef) => string
  setObjectSketch: (id: string, sketch: SketchDef) => void
  add: (kind: SculptKind) => void
  addPart: (kind: SculptKind, params: Partial<SculptParams>, name?: string) => void
  addObjects: (objs: Array<Omit<SculptObject, 'id' | 'name'> & { name?: string }>) => void
  addMesh: (obj: Omit<SculptObject, 'id' | 'name'> & { name?: string }) => string
  update: (id: string, patch: Partial<SculptObject>) => void
  updateParams: (id: string, patch: Partial<SculptParams>) => void
  remove: (id: string) => void
  duplicate: (id: string) => void
  arrayCircular: (id: string, count: number) => void
  arrayLinear: (id: string, count: number, spacing: number) => void
  select: (id: string | null) => void
  setMode: (mode: TransformMode) => void
  setAlloy: (id: string) => void
  clear: () => void
  load: (objects: SculptObject[]) => void
}

const HISTORY_LIMIT = 60

export const useModeler = create<ModelerStore>((set, get) => {
  /** Snapshot the current objects onto the undo stack before a mutation. */
  const record = () => set(s => ({ past: [...s.past, s.objects].slice(-HISTORY_LIMIT), future: [] }))
  const stillThere = (id: string | null, objs: SculptObject[]) => (id && objs.some(o => o.id === id) ? id : null)

  return {
  objects: [],
  selectedId: null,
  mode: 'translate',
  editMode: 'object',
  falloff: 2.5,
  alloyId: '14ky',
  snap: false,
  symmetry: false,
  sketching: false,
  sketchEditId: null,
  past: [],
  future: [],

  undo: () => set(s => {
    if (!s.past.length) return {}
    const prev = s.past[s.past.length - 1]
    return { objects: prev, past: s.past.slice(0, -1), future: [s.objects, ...s.future].slice(0, HISTORY_LIMIT), selectedId: stillThere(s.selectedId, prev) }
  }),
  redo: () => set(s => {
    if (!s.future.length) return {}
    const next = s.future[0]
    return { objects: next, future: s.future.slice(1), past: [...s.past, s.objects].slice(-HISTORY_LIMIT), selectedId: stillThere(s.selectedId, next) }
  }),

  setEditMode: editMode => set({ editMode }),
  setFalloff: falloff => set({ falloff: Math.max(0.2, falloff) }),
  toggleSymmetry: () => set(s => ({ symmetry: !s.symmetry })),

  /** Flatten any part/primitive into an editable triangle mesh at identity
   *  transform, so its vertices can be pushed and pulled directly. */
  bakeToMesh: id => { record(); set(s => ({
    objects: s.objects.map(o => o.id === id
      ? { ...o, kind: 'mesh', vertices: bakedVertices(o), position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], size: 0 }
      : o)
  })) },

  /** Refine an editable mesh (each triangle → four) for finer vertex control. */
  subdivideMesh: id => { record(); set(s => ({
    objects: s.objects.map(o => o.id === id && o.kind === 'mesh' && o.vertices ? { ...o, vertices: subdivideSoup(o.vertices) } : o)
  })) },

  /** Relax an editable mesh one pass, smoothing lumps from aggressive pulls. */
  smoothMesh: (id, radius) => { record(); set(s => ({
    objects: s.objects.map(o => o.id === id && o.kind === 'mesh' && o.vertices ? { ...o, vertices: smoothSoup(o.vertices, radius) } : o)
  })) },

  /** Boolean-union every metal part into one watertight mesh for clean STL /
   *  3D-print export. Gems are left untouched. Returns the count fused. */
  fuseMetal: () => {
    const metals = get().objects.filter(o => o.material === 'metal')
    if (metals.length < 2) return 0
    record()
    let acc: SculptObject = { ...metals[0], kind: 'mesh', vertices: bakedVertices(metals[0]), position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], size: 0 }
    for (let i = 1; i < metals.length; i++) {
      try {
        const v = booleanOp(acc, metals[i], 'union')
        if (v.length) acc = { ...acc, vertices: v }
      } catch { /* skip a part that fails to union; keep the rest */ }
    }
    const fused: SculptObject = { id: newId(), kind: 'mesh', name: 'Fused metal', vertices: acc.vertices, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], size: 0, material: 'metal', color: metals[0].color }
    set(s => ({ objects: [...s.objects.filter(o => o.material !== 'metal'), fused], selectedId: fused.id }))
    return metals.length
  },

  toggleSnap: () => set(s => ({ snap: !s.snap })),

  mirror: id => {
    const src = get().objects.find(o => o.id === id)
    if (!src) return
    record()
    const copy: SculptObject = { ...src, id: newId(), name: `${src.name} mirror`, position: [-src.position[0], src.position[1], src.position[2]], scale: [-src.scale[0], src.scale[1], src.scale[2]] }
    set(s => ({ objects: [...s.objects, copy], selectedId: copy.id }))
  },

  centerObject: id => { record(); set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, position: [0, o.position[1], 0] } : o) })) },

  add: kind => {
    record()
    const n = get().objects.filter(o => o.kind === kind).length + 1
    const d = defaults(kind)
    const obj: SculptObject = { id: newId(), kind, name: `${LABEL[kind]} ${n}`, rotation: [0, 0, 0], scale: [1, 1, 1], ...d }
    set(s => ({ objects: [...s.objects, obj], selectedId: obj.id }))
  },

  /** Add a jewelry part pre-configured with params, in a single history step. */
  addPart: (kind, params, name) => {
    record()
    const n = get().objects.filter(o => o.kind === kind).length + 1
    const d = defaults(kind)
    const obj: SculptObject = { id: newId(), kind, name: name ?? `${LABEL[kind as SculptKind]} ${n}`, rotation: [0, 0, 0], scale: [1, 1, 1], ...d, params: { ...d.params, ...params } }
    set(s => ({ objects: [...s.objects, obj], selectedId: obj.id }))
  },

  setSketching: (sketching, editId = null) => set({ sketching, sketchEditId: sketching ? editId : null }),

  /** Create a live, re-editable sketch object from a free-drawn profile. */
  addSketch: sketch => {
    record()
    const id = newId()
    const n = get().objects.filter(o => o.kind === 'sketch').length + 1
    const obj: SculptObject = {
      id, kind: 'sketch', name: `Sketch ${n}`,
      position: [0, sketch.mode === 'extrude' ? 6 : 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      size: 0, material: 'metal', color: GOLD, params: { sketch }
    }
    set(s => ({ objects: [...s.objects, obj], selectedId: id }))
    return id
  },

  /** Live-update a sketch object's profile (no history entry — used while drawing). */
  setObjectSketch: (id, sketch) => set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, params: { ...o.params, sketch } } : o) })),

  /** Add several parts at once (e.g. a full ring assembly) in one history step. */
  addObjects: objs => {
    if (!objs.length) return
    record()
    const full: SculptObject[] = objs.map((o, i) => ({ id: newId(), name: o.name ?? `Part ${i + 1}`, ...o }))
    set(s => ({ objects: [...s.objects, ...full], selectedId: full[0].id }))
  },

  addMesh: obj => {
    record()
    const id = newId()
    const full: SculptObject = { id, name: obj.name ?? 'Result', ...obj }
    set(s => ({ objects: [...s.objects, full], selectedId: id }))
    return id
  },

  update: (id, patch) => { record(); set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, ...patch } : o) })) },
  updateParams: (id, patch) => { record(); set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, params: { ...o.params, ...patch } } : o) })) },

  remove: id => { record(); set(s => ({ objects: s.objects.filter(o => o.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })) },

  duplicate: id => {
    const src = get().objects.find(o => o.id === id)
    if (!src) return
    record()
    const copy: SculptObject = { ...src, id: newId(), name: `${src.name} copy`, position: [src.position[0] + 2, src.position[1], src.position[2] + 2] }
    set(s => ({ objects: [...s.objects, copy], selectedId: copy.id }))
  },

  /** Array around the Y axis at the object's current radius — eternity / halo / pavé rings. */
  arrayCircular: (id, count) => {
    const src = get().objects.find(o => o.id === id)
    if (!src || count < 2) return
    record()
    const [x, y, z] = src.position
    let r = Math.hypot(x, z)
    if (r < 0.5) r = 8   // sitting at the centre — array on a default ring radius
    const a0 = Math.atan2(z, x)
    const copies: SculptObject[] = []
    for (let i = 1; i < count; i++) {
      const a = a0 + (i / count) * TWO_PI
      copies.push({ ...src, id: newId(), name: `${src.name} ${i + 1}`, position: [Math.cos(a) * r, y, Math.sin(a) * r], rotation: [src.rotation[0], -a + Math.PI / 2, src.rotation[2]] })
    }
    if (r === 8 && Math.hypot(x, z) < 0.5) src.position = [r, y, 0]   // move original onto the ring too
    set(s => ({ objects: [...s.objects.map(o => o.id === id ? { ...o, position: src.position } : o), ...copies] }))
  },

  arrayLinear: (id, count, spacing) => {
    const src = get().objects.find(o => o.id === id)
    if (!src || count < 2) return
    record()
    const copies: SculptObject[] = []
    for (let i = 1; i < count; i++) {
      copies.push({ ...src, id: newId(), name: `${src.name} ${i + 1}`, position: [src.position[0] + i * spacing, src.position[1], src.position[2]] })
    }
    set(s => ({ objects: [...s.objects, ...copies] }))
  },

  select: id => set({ selectedId: id }),
  setMode: mode => set({ mode }),
  setAlloy: id => set({ alloyId: id }),
  clear: () => { record(); set({ objects: [], selectedId: null }) },
  load: objects => { record(); set({ objects, selectedId: null }) }
  }
})
