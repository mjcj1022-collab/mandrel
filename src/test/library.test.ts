import { describe, it, expect } from 'vitest'
import { Library, type KV } from '../lib/library'
import { DEFAULT_SPEC, type DesignSpec } from '../spec/types'

function memKV(): KV {
  const map = new Map<string, string>()
  return { get: k => map.get(k) ?? null, set: (k, v) => { map.set(k, v) } }
}

/** Deterministic library: clock ticks by 1, ids count up. */
function lib() {
  let t = 0
  let n = 0
  return new Library(memKV(), () => ++t, () => `id${++n}`)
}

const withCarat = (ct: number): DesignSpec => ({ ...DEFAULT_SPEC, center: { ...DEFAULT_SPEC.center, carat: ct } })

describe('design library', () => {
  it('saves and lists designs, newest first', () => {
    const l = lib()
    l.save('First', withCarat(1))
    l.save('Second', withCarat(2))
    const all = l.list()
    expect(all.map(d => d.name)).toEqual(['Second', 'First'])
  })

  it('update archives the previous spec as a version', () => {
    const l = lib()
    const d = l.save('A', withCarat(1))
    const updated = l.update(d.id, withCarat(3))!
    expect(updated.spec.center.carat).toBe(3)
    expect(updated.versions).toHaveLength(1)
    expect(updated.versions[0].spec.center.carat).toBe(1)
  })

  it('rollback restores an archived version and stays undoable', () => {
    const l = lib()
    const d = l.save('A', withCarat(1))
    l.update(d.id, withCarat(2))
    const v0 = l.get(d.id)!.versions[0]          // the carat-1 version
    const rolled = l.rollback(d.id, v0.at)!
    expect(rolled.spec.center.carat).toBe(1)
    // current (carat 2) was archived before the rollback
    expect(rolled.versions.some(v => v.spec.center.carat === 2)).toBe(true)
  })

  it('fork creates an independent copy that remembers its parent', () => {
    const l = lib()
    const d = l.save('Original', withCarat(1))
    const f = l.fork(d.id)!
    expect(f.parentId).toBe(d.id)
    expect(f.name).toBe('Original (copy)')
    l.update(f.id, withCarat(5))
    expect(l.get(d.id)!.spec.center.carat).toBe(1)   // parent untouched
    expect(l.get(f.id)!.spec.center.carat).toBe(5)
  })

  it('remove deletes a design', () => {
    const l = lib()
    const d = l.save('A', withCarat(1))
    l.remove(d.id)
    expect(l.list()).toHaveLength(0)
  })

  it('survives corrupt storage', () => {
    const kv = memKV()
    kv.set('mandrel.library.v1', 'not json{')
    const l = new Library(kv)
    expect(l.list()).toEqual([])
  })
})
