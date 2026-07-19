import type { DesignSpec } from '../spec/types'

/**
 * Design library — save, fork and version any design. Pure over an injected
 * key-value backend and clock so it unit-tests without a DOM; the app wires it
 * to localStorage.
 */
export interface VersionEntry {
  spec: DesignSpec
  at: number
  note?: string
}

export interface SavedDesign {
  id: string
  name: string
  spec: DesignSpec
  createdAt: number
  updatedAt: number
  parentId?: string
  versions: VersionEntry[]   // prior specs, newest last
}

export interface KV {
  get(key: string): string | null
  set(key: string, value: string): void
}

const KEY = 'mandrel.library.v1'
const MAX_VERSIONS = 20

export class Library {
  constructor(
    private backend: KV,
    private clock: () => number = () => Date.now(),
    private idGen: () => string = defaultId
  ) {}

  list(): SavedDesign[] {
    const raw = this.backend.get(KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as SavedDesign[]) : []
    } catch {
      return []
    }
  }

  private write(all: SavedDesign[]): void {
    this.backend.set(KEY, JSON.stringify(all))
  }

  get(id: string): SavedDesign | undefined {
    return this.list().find(d => d.id === id)
  }

  /** Save the current spec as a brand-new design. */
  save(name: string, spec: DesignSpec): SavedDesign {
    const now = this.clock()
    const design: SavedDesign = {
      id: this.idGen(), name: name.trim() || 'Untitled', spec,
      createdAt: now, updatedAt: now, versions: []
    }
    this.write([design, ...this.list()])
    return design
  }

  /** Update an existing design, archiving its previous spec as a version. */
  update(id: string, spec: DesignSpec, note?: string): SavedDesign | undefined {
    const all = this.list()
    const design = all.find(d => d.id === id)
    if (!design) return undefined
    design.versions = [...design.versions, { spec: design.spec, at: design.updatedAt, note }].slice(-MAX_VERSIONS)
    design.spec = spec
    design.updatedAt = this.clock()
    this.write(all)
    return design
  }

  /** Rename a saved design. */
  rename(id: string, name: string): SavedDesign | undefined {
    const all = this.list()
    const design = all.find(d => d.id === id)
    if (!design) return undefined
    design.name = name.trim() || design.name
    design.updatedAt = this.clock()
    this.write(all)
    return design
  }

  /** Clone a design into a new, independent entry that remembers its parent. */
  fork(id: string, name?: string): SavedDesign | undefined {
    const src = this.get(id)
    if (!src) return undefined
    const now = this.clock()
    const copy: SavedDesign = {
      id: this.idGen(),
      name: name?.trim() || `${src.name} (copy)`,
      spec: src.spec,
      createdAt: now, updatedAt: now,
      parentId: src.id,
      versions: []
    }
    this.write([copy, ...this.list()])
    return copy
  }

  remove(id: string): void {
    this.write(this.list().filter(d => d.id !== id))
  }

  /**
   * Roll a design back to one of its archived versions. The current spec is
   * itself archived first, so a rollback is undoable.
   */
  rollback(id: string, versionAt: number): SavedDesign | undefined {
    const all = this.list()
    const design = all.find(d => d.id === id)
    if (!design) return undefined
    const version = design.versions.find(v => v.at === versionAt)
    if (!version) return undefined
    design.versions = [...design.versions, { spec: design.spec, at: design.updatedAt, note: 'before rollback' }].slice(-MAX_VERSIONS)
    design.spec = version.spec
    design.updatedAt = this.clock()
    this.write(all)
    return design
  }
}

function defaultId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
}

/** localStorage-backed KV, safe when storage is unavailable (SSR, private mode). */
export const browserKV: KV = {
  get: k => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* quota / disabled */ } }
}
