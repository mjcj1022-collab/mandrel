import { describe, it, expect } from 'vitest'
import { DEFAULT_SPEC, NO_STONE, type DesignSpec, type ProductCategory } from '../spec/types'
import { computeBom } from '../lib/bom'
import { manufacturabilityChecks, checkSummary } from '../lib/manufacture'
import { computePrice } from '../lib/pricing'
import { computeMetal } from '../lib/metal'

const cat = (category: ProductCategory, over: Partial<DesignSpec> = {}): DesignSpec =>
  ({ ...DEFAULT_SPEC, category, ...over })

describe('bill of materials', () => {
  it('a solitaire lists metal, stone, head and labor', () => {
    const bom = computeBom(cat('ring'))
    const kinds = bom.lines.map(l => l.kind)
    expect(kinds).toContain('metal')
    expect(kinds).toContain('stone')
    expect(kinds).toContain('finding')  // the head
    expect(kinds).toContain('labor')
  })
  it('a plain band lists no stone', () => {
    const bom = computeBom(cat('ring', { center: { ...DEFAULT_SPEC.center, stoneTypeId: NO_STONE } }))
    expect(bom.lines.some(l => l.kind === 'stone')).toBe(false)
  })
  it('BOM total equals the quote total', () => {
    const spec = cat('ring')
    expect(computeBom(spec).total).toBeCloseTo(computePrice(spec).total, 5)
  })
  it('a pair of studs lists two posts and two backs', () => {
    const bom = computeBom(cat('earring'))
    const posts = bom.lines.find(l => l.item === 'Posts')
    const backs = bom.lines.find(l => l.item === 'Backs')
    expect(posts?.qty).toBe('2')
    expect(backs?.qty).toBe('2')
  })
})

describe('settings, accents and metals depth', () => {
  it('a halo adds 16 accent stones and costs more than a plain solitaire', () => {
    const solit = computePrice(cat('ring', { setting: { typeId: 'p4' } }))
    const halo = computePrice(cat('ring', { setting: { typeId: 'hal' } }))
    expect(halo.accentCount).toBe(16)
    expect(halo.accentCost).toBeGreaterThan(0)
    expect(halo.total).toBeGreaterThan(solit.total)
  })
  it('rhodium plating adds a fee only on platable white metals', () => {
    const plated = computePrice(cat('ring', { metal: { alloyId: '14kw', rhodium: true } }))
    const bare = computePrice(cat('ring', { metal: { alloyId: '14kw', rhodium: false } }))
    const yellow = computePrice(cat('ring', { metal: { alloyId: '14ky', rhodium: true } }))
    expect(plated.platingFee).toBeGreaterThan(0)
    expect(bare.platingFee).toBe(0)
    expect(yellow.platingFee).toBe(0)   // yellow gold is not platable
  })
  it('titanium is priced per gram with no fine content', () => {
    const ti = computeMetal(cat('ring', { metal: { alloyId: 'ti' } }))
    expect(ti.cast).toBeGreaterThan(0)
    expect(ti.fineGrams).toBe(0)
    expect(ti.scrapCredit).toBe(0)
    expect(ti.netMetalCost).toBeGreaterThan(0)
  })
})

describe('manufacturability checks', () => {
  it('a sub-minimum shank fails the wall check', () => {
    const checks = manufacturabilityChecks(cat('ring', { ring: { ...DEFAULT_SPEC.ring, thickness: 0.8 } }))
    const wall = checks.find(c => c.id === 'wall')
    expect(wall?.level).toBe('fail')
  })
  it('a healthy shank passes the wall check', () => {
    const checks = manufacturabilityChecks(cat('ring', { ring: { ...DEFAULT_SPEC.ring, thickness: 1.8 } }))
    expect(checks.find(c => c.id === 'wall')?.level).toBe('pass')
  })
  it('a bezel flags a closed void', () => {
    const checks = manufacturabilityChecks(cat('ring', { setting: { typeId: 'bz' } }))
    expect(checks.some(c => c.id === 'void')).toBe(true)
  })
  it('an over-packed tennis bracelet fails on spacing', () => {
    const checks = manufacturabilityChecks(cat('bracelet', {
      center: { ...DEFAULT_SPEC.center, carat: 5 },
      bracelet: { ...DEFAULT_SPEC.bracelet, kind: 'tennis', linkCount: 70, wristCircumference: 150, fitAllowance: 5 }
    }))
    expect(checks.find(c => c.id === 'spacing')?.level).toBe('fail')
  })
  it('summary counts levels', () => {
    const checks = manufacturabilityChecks(cat('ring'))
    const s = checkSummary(checks)
    expect(s.pass + s.warn + s.fail).toBe(checks.length)
  })
})
