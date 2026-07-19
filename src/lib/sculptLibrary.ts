import type { SculptObject } from '../state/modeler'

/** Named, multi-slot saves for the Sculpt workspace (localStorage). */
export interface SavedSculpt {
  id: string
  name: string
  at: number
  objects: SculptObject[]
}

const KEY = 'blue-flame.sculpts.v1'

function readAll(): SavedSculpt[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedSculpt[]) : []
  } catch { return [] }
}

function writeAll(list: SavedSculpt[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* quota / private mode */ }
}

function uid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  return c?.randomUUID ? c.randomUUID() : 'k' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
}

export const sculptLibrary = {
  list: (): SavedSculpt[] => readAll().sort((a, b) => b.at - a.at),
  save: (name: string, objects: SculptObject[]): SavedSculpt => {
    const rec: SavedSculpt = { id: uid(), name, at: Date.now(), objects }
    writeAll([...readAll(), rec])
    return rec
  },
  remove: (id: string): void => writeAll(readAll().filter(s => s.id !== id)),
  get: (id: string): SavedSculpt | null => readAll().find(s => s.id === id) ?? null
}
