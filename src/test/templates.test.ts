import { describe, it, expect } from 'vitest'
import { TEMPLATES } from '../catalog'
import { computePrice } from '../lib/pricing'
import { settingById } from '../catalog'

describe('templates', () => {
  it('every template builds a valid, priceable spec', () => {
    for (const t of TEMPLATES) {
      const spec = t.build()
      expect(spec.category).toBe(t.category)
      const p = computePrice(spec)
      expect(p.total).toBeGreaterThan(0)
      expect(Number.isFinite(p.total)).toBe(true)
    }
  })

  it('halo, three-stone and pavé templates use accent-stone settings', () => {
    const ids = ['halo', 'double-halo', 'three-stone', 'pave-band', 'channel']
    for (const id of ids) {
      const t = TEMPLATES.find(x => x.id === id)
      expect(t, id).toBeTruthy()
      const spec = t!.build()
      expect(settingById(spec.setting.typeId).melee, id).toBeGreaterThan(0)
      // accents actually contribute to the price
      expect(computePrice(spec).accentCount, id).toBeGreaterThan(0)
    }
  })
})
