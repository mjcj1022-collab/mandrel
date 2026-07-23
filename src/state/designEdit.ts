import { create } from 'zustand'
import type { VertexTool } from './modeler'

/**
 * Freeform vertex editing for the Design tab. Kept in its own store — NOT in the
 * design spec — because the spec's undo stack snapshots the whole spec on every
 * change and holds 80 entries; a large vertex array does not belong there. This
 * slice carries its own per-drag history so Ctrl+Z steps through vertex pulls
 * without touching the parametric design history.
 *
 * The vertices are a flat triangle soup at identity transform, true millimetres
 * (see pieceToEditableVertices) — the same shape the Sculpt engine edits.
 */
interface DesignEditStore {
  active: boolean
  tool: VertexTool
  vertices: number[] | null
  original: number[] | null      // the first bake, for Reset
  selectedVertex: number | null
  falloff: number
  symmetry: boolean
  past: number[][]
  future: number[][]
  begin: (vertices: number[], tool: VertexTool) => void
  setTool: (t: VertexTool) => void
  setFalloff: (r: number) => void
  toggleSymmetry: () => void
  pick: (i: number | null) => void
  commit: (vertices: number[]) => void
  undo: () => void
  redo: () => void
  reset: () => void
  exit: () => void
}

const LIMIT = 50

export const useDesignEdit = create<DesignEditStore>((set) => ({
  active: false,
  tool: 'edit',
  vertices: null,
  original: null,
  selectedVertex: null,
  falloff: 2.5,
  symmetry: false,
  past: [],
  future: [],

  // Enter edit mode from a fresh bake. If already editing, just switch the tool
  // so re-clicking Select/Edit never discards work in progress.
  begin: (vertices, tool) => set(s => s.active
    ? { tool }
    : { active: true, tool, vertices, original: vertices, past: [], future: [], selectedVertex: null }),

  setTool: tool => set({ tool }),
  setFalloff: falloff => set({ falloff: Math.max(0.2, falloff) }),
  toggleSymmetry: () => set(s => ({ symmetry: !s.symmetry })),
  pick: selectedVertex => set({ selectedVertex }),

  commit: vertices => set(s => ({ past: [...s.past, s.vertices ?? []].slice(-LIMIT), future: [], vertices })),

  undo: () => set(s => {
    if (!s.past.length) return {}
    const prev = s.past[s.past.length - 1]
    return { vertices: prev, past: s.past.slice(0, -1), future: [s.vertices ?? [], ...s.future].slice(0, LIMIT) }
  }),
  redo: () => set(s => {
    if (!s.future.length) return {}
    const next = s.future[0]
    return { vertices: next, future: s.future.slice(1), past: [...s.past, s.vertices ?? []].slice(-LIMIT) }
  }),

  reset: () => set(s => (s.original ? { vertices: s.original, past: [], future: [], selectedVertex: null } : {})),
  exit: () => set({ active: false, vertices: null, original: null, selectedVertex: null, past: [], future: [] }),
}))
