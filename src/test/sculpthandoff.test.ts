import { describe, it, expect } from 'vitest'
import { sculptHandoff, isSculptSpec, SculptHandoffError, MAX_SPEC_BYTES } from '../lib/sculptHandoff'
import { sculptEstimate } from '../lib/sculpt'
import type { SculptObject } from '../state/modeler'

const obj = (over: Partial<SculptObject> & { kind: SculptObject['kind'] }): SculptObject => ({
  id: Math.random().toString(36).slice(2), name: 'o',
  position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  size: 6, material: 'metal', color: 0xffffff, ...over,
})

const band = () => obj({ kind: 'shank', params: { ringSize: 7, profile: 'flat', width: 2.2, thickness: 1.8 } })
const stone = () => obj({ kind: 'gem', material: 'gem', params: { shapeId: 'rd', carat: 1, stoneTypeId: 'dia' } })

describe('sculptHandoff — making a sculpted piece sellable', () => {
  it('builds a persistable spec carrying the manufacturing facts', () => {
    const h = sculptHandoff('Signet', [band()], '14ky')
    expect(h.name).toBe('Signet')
    expect(h.spec.kind).toBe('sculpt')
    expect(h.spec.alloyId).toBe('14ky')
    expect(h.spec.metal.castGrams).toBeGreaterThan(0)
    expect(h.spec.metal.volumeMm3).toBeGreaterThan(0)
    expect(h.total).toBeGreaterThan(0)
  })

  it('keeps the geometry so the order can be reopened in the modeler', () => {
    const h = sculptHandoff('Signet', [band()], '14ky')
    expect(h.spec.objects).toHaveLength(1)
    expect(h.spec.objects[0].kind).toBe('shank')
  })

  it('agrees with the estimate shown in the modeler (no divergent pricing)', () => {
    const parts = [band(), stone()]
    const est = sculptEstimate(parts, '18kw')
    const h = sculptHandoff('Piece', parts, '18kw')
    expect(h.total).toBeCloseTo(est.total, 6)
    expect(h.spec.estimate.metal).toBeCloseTo(est.metalCost, 6)
    expect(h.spec.estimate.subtotal).toBeCloseTo(est.subtotal, 6)
  })

  it('itemizes stones and setting labor only when there are stones', () => {
    const plain = sculptHandoff('Plain', [band()], '14ky')
    expect(plain.lines.map(l => l.label)).toEqual(['Metal', 'Cast, finish, polish'])

    const set = sculptHandoff('Set', [band(), stone()], '14ky')
    expect(set.lines.map(l => l.label)).toEqual(['Metal', 'Stones', 'Setting labor', 'Cast, finish, polish'])
    expect(set.spec.stones).toEqual({ count: 1, carats: 1 })
  })

  it('line amounts sum to the pre-margin subtotal', () => {
    const h = sculptHandoff('Piece', [band(), stone()], '14ky')
    const sum = h.lines.reduce((s, l) => s + l.amount, 0)
    expect(sum).toBeCloseTo(h.spec.estimate.subtotal, 6)
  })

  it('refuses a scene with no metal to sell', () => {
    expect(() => sculptHandoff('Gems only', [stone()], '14ky')).toThrow(SculptHandoffError)
    expect(() => sculptHandoff('Empty', [], '14ky')).toThrow(/at least one metal part/i)
  })

  it('refuses a scene too large to persist, naming the fix', () => {
    // a real band (so there IS metal to price) plus a vertex soup heavy enough
    // to blow past the storage guard
    const heavy = obj({ kind: 'mesh', vertices: new Array(MAX_SPEC_BYTES / 4).fill(1.2345) })
    expect(() => sculptHandoff('Huge', [band(), heavy], '14ky')).toThrow(/too large to save/i)
  })

  it('falls back to a sensible name when none is given', () => {
    expect(sculptHandoff('   ', [band()], '14ky').name).toBe('Sculpted piece')
  })
})

describe('isSculptSpec', () => {
  it('recognises a sculpt record and rejects a parametric one', () => {
    const h = sculptHandoff('Piece', [band()], '14ky')
    expect(isSculptSpec(h.spec)).toBe(true)
    expect(isSculptSpec({ version: 1, category: 'ring' })).toBe(false)
    expect(isSculptSpec(null)).toBe(false)
  })
})
