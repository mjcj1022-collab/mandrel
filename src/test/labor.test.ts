import { describe, it, expect, afterEach } from 'vitest'
import { settingBand, settingSizeMultiplier, settingLaborFor, finishingFee, SETTING_BANDS } from '../lib/labor'
import { MARKET, DEFAULT_MARKET, setMarket } from '../lib/market'

afterEach(() => setMarket(DEFAULT_MARKET))

describe('setting labor scales with stone size', () => {
  it('puts stones in the band a bench would quote', () => {
    expect(settingBand(0.03).label).toBe('melee')
    expect(settingBand(0.25).label).toBe('small')
    expect(settingBand(0.75).label).toBe('medium')
    expect(settingBand(1.5).label).toBe('large')
    expect(settingBand(3).label).toBe('statement')
    expect(settingBand(6).label).toBe('exceptional')
  })

  it('never charges less for a bigger stone', () => {
    const cts = [0, 0.05, 0.1, 0.3, 0.5, 0.9, 1, 1.9, 2, 3.9, 4, 10]
    const mults = cts.map(settingSizeMultiplier)
    for (let i = 1; i < mults.length; i++) expect(mults[i]).toBeGreaterThanOrEqual(mults[i - 1])
  })

  it('charges a 3 ct centre far more labor than a melee', () => {
    expect(settingLaborFor(3)).toBeGreaterThan(settingLaborFor(0.03) * 4)
  })

  it('bands are exclusive at the upper bound — 0.10 ct is small, not melee', () => {
    expect(settingBand(0.099).label).toBe('melee')
    expect(settingBand(0.10).label).toBe('small')
  })

  it('takes the style rate as the base so a bezel can cost more than prongs', () => {
    expect(settingLaborFor(1, 100)).toBeCloseTo(100 * settingSizeMultiplier(1), 6)
    expect(settingLaborFor(1, 200)).toBeCloseTo(2 * settingLaborFor(1, 100), 6)
  })

  it('defaults to the shop rate and follows it when tuned', () => {
    expect(settingLaborFor(0.3)).toBeCloseTo(MARKET.settingBase * 1.0, 6)
    setMarket({ settingBase: 80 })
    expect(settingLaborFor(0.3)).toBeCloseTo(80, 6)
  })

  it('handles junk input without producing NaN', () => {
    expect(settingSizeMultiplier(-5)).toBe(SETTING_BANDS[0].mult)
    expect(Number.isFinite(settingSizeMultiplier(NaN))).toBe(true)
  })
})

describe('finishing scales with mass', () => {
  it('costs more to finish a heavy cuff than a light stud', () => {
    expect(finishingFee(40)).toBeGreaterThan(finishingFee(2))
  })

  it('is base + per-gram', () => {
    expect(finishingFee(0)).toBeCloseTo(MARKET.finishFee, 6)
    expect(finishingFee(10)).toBeCloseTo(MARKET.finishFee + 10 * MARKET.finishPerGram, 6)
  })

  it('never goes below the setup base', () => {
    expect(finishingFee(-10)).toBeCloseTo(MARKET.finishFee, 6)
    expect(finishingFee(NaN)).toBeCloseTo(MARKET.finishFee, 6)
  })

  it('follows the shop rate when tuned', () => {
    setMarket({ finishPerGram: 0 })
    expect(finishingFee(100)).toBeCloseTo(MARKET.finishFee, 6)
  })
})
