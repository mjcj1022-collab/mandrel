import { describe, it, expect } from 'vitest'
import { makeComponentLibrary } from '../lib/componentLibrary'
import type { KV } from '../lib/library'
import type { SculptObject } from '../state/modeler'

const fakeKV = (): KV => {
  const m = new Map<string, string>()
  return { get: k => m.get(k) ?? null, set: (k, v) => { m.set(k, v) } }
}

const part = (name: string): SculptObject => ({
  id: 'x', kind: 'box', name, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  size: 6, material: 'metal', color: 0xD8B36A,
})

describe('component (parts) library', () => {
  it('saves and lists newest-first', () => {
    let t = 100
    const lib = makeComponentLibrary(fakeKV(), () => t++, (() => { let n = 0; return () => 'id' + n++ })())
    lib.save('Shank', [part('a')])
    lib.save('Head', [part('b'), part('c')])
    const list = lib.list()
    expect(list.map(c => c.name)).toEqual(['Head', 'Shank'])   // newest first
    expect(list[0].objects).toHaveLength(2)
  })

  it('gets and removes by id', () => {
    const kv = fakeKV()
    const lib = makeComponentLibrary(kv, () => 1, (() => { let n = 0; return () => 'id' + n++ })())
    const rec = lib.save('Halo', [part('h')])
    expect(lib.get(rec.id)?.name).toBe('Halo')
    lib.remove(rec.id)
    expect(lib.get(rec.id)).toBeNull()
    expect(lib.list()).toHaveLength(0)
  })
})
