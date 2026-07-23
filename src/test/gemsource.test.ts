import { describe, it, expect } from 'vitest'
import { searchInventory, gradingColor, DEMO_INVENTORY } from '../lib/gemSource'

describe('gem sourcing', () => {
  it('filters by shape and carat range, sorted by carat', () => {
    const r = searchInventory({ shapeId: 'rd', caratMin: 0.6, caratMax: 1.1 })
    expect(r.every(s => s.shapeId === 'rd' && s.carat >= 0.6 && s.carat <= 1.1)).toBe(true)
    expect(r.map(s => s.carat)).toEqual([...r.map(s => s.carat)].sort((a, b) => a - b))
    expect(r.length).toBeGreaterThan(0)
  })

  it('"any" shape returns everything within the carat range', () => {
    const r = searchInventory({ shapeId: 'any', caratMin: 0, caratMax: 99 })
    expect(r).toHaveLength(DEMO_INVENTORY.length)
  })

  it('only letter colour grades are applied to the design grading', () => {
    expect(gradingColor({ ...DEMO_INVENTORY[0], color: 'F' })).toBe('F')
    expect(gradingColor({ ...DEMO_INVENTORY[0], color: 'Blue' })).toBeNull()
  })
})
