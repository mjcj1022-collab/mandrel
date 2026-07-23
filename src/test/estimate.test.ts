import { describe, it, expect } from 'vitest'
import { sculptEstimate } from '../lib/sculpt'
import { stoneById } from '../catalog'
import { MARKET } from '../lib/market'
import { settingLaborFor, finishingFee } from '../lib/labor'
import type { SculptObject } from '../state/modeler'

const obj = (over: Partial<SculptObject> & { kind: SculptObject['kind'] }): SculptObject => ({
  id: 'x', name: 'o', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  size: 6, material: 'metal', color: 0xffffff, ...over
})

describe('sculptEstimate', () => {
  it('prices metal from volume and applies the shop margin', () => {
    const e = sculptEstimate([obj({ kind: 'shank', params: { ringSize: 7 } })], '14ky')
    expect(e.metalCost).toBeGreaterThan(0)
    expect(e.stoneCost).toBe(0)
    expect(e.gemCount).toBe(0)
    // subtotal = metal + mass-scaled finishing (no stones/setting); total = ×margin
    expect(e.finishFee).toBeCloseTo(finishingFee(e.castG), 5)
    expect(e.subtotal).toBeCloseTo(e.metalCost + e.finishFee, 5)
    expect(e.total).toBeCloseTo(e.subtotal * MARKET.margin, 5)
  })

  it('adds catalog stone cost and per-stone setting labor for gems', () => {
    const gem = obj({ kind: 'gem', material: 'gem', position: [0, 6, 0], params: { shapeId: 'rd', stoneTypeId: 'dia', carat: 1 } })
    const e = sculptEstimate([obj({ kind: 'shank', params: { ringSize: 7 } }), gem], '14ky')
    const dia = stoneById('dia')
    expect(e.gemCount).toBe(1)
    expect(e.carats).toBeCloseTo(1, 5)
    expect(e.stoneCost).toBeCloseTo(dia.rate * Math.pow(1, dia.exponent), 3)
    // a 1 ct stone lands in the "medium" band — setting labor scales with size
    expect(e.settingLabor).toBeCloseTo(settingLaborFor(1), 5)
  })

  it('a bigger diamond costs more than a smaller one', () => {
    const mk = (ct: number) => sculptEstimate([obj({ kind: 'gem', material: 'gem', params: { stoneTypeId: 'dia', carat: ct } })], '14ky').stoneCost
    expect(mk(2)).toBeGreaterThan(mk(1))
  })

  it('defaults a gem with no stone type to diamond pricing', () => {
    const withType = sculptEstimate([obj({ kind: 'gem', material: 'gem', params: { stoneTypeId: 'dia', carat: 1 } })], '14ky').stoneCost
    const noType = sculptEstimate([obj({ kind: 'gem', material: 'gem', params: { carat: 1 } })], '14ky').stoneCost
    expect(noType).toBeCloseTo(withType, 5)
  })
})
