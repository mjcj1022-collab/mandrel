/**
 * Bench labor. Two things the engines used to treat as flat, which mis-prices
 * real work at both ends of the range:
 *
 *  - Setting labor was per-stone regardless of size. A bench does not charge
 *    the same to bead-set a 0.03 ct melee as to seat a 3 ct centre — bigger
 *    stones mean more seat work, tighter tolerance and more risk if it chips.
 *  - Finishing was a flat fee regardless of mass. A 2 g stud and a 40 g cuff
 *    are not the same amount of filing, sanding and polishing.
 *
 * Rates live in MARKET so a shop can tune them live without touching code.
 */
import { MARKET } from './market'

export interface SettingBand {
  label: string
  /** Upper bound of the band, exclusive (ct). */
  maxCt: number
  /** Labor multiplier against the style's base setting fee. */
  mult: number
}

/** Size bands, the way benches actually quote setting. */
export const SETTING_BANDS: SettingBand[] = [
  { label: 'melee', maxCt: 0.10, mult: 0.5 },
  { label: 'small', maxCt: 0.50, mult: 1.0 },
  { label: 'medium', maxCt: 1.00, mult: 1.4 },
  { label: 'large', maxCt: 2.00, mult: 1.8 },
  { label: 'statement', maxCt: 4.00, mult: 2.4 },
  { label: 'exceptional', maxCt: Infinity, mult: 3.0 },
]

export function settingBand(carat: number): SettingBand {
  const ct = Number.isFinite(carat) ? Math.max(0, carat) : 0
  return SETTING_BANDS.find(b => ct < b.maxCt) ?? SETTING_BANDS[SETTING_BANDS.length - 1]
}

/** Labor multiplier for a stone of this size. */
export const settingSizeMultiplier = (carat: number): number => settingBand(carat).mult

/**
 * Setting labor for one stone, $. `baseFee` lets the setting style carry its
 * own rate (a bezel costs more than a prong) while size scales it.
 */
export const settingLaborFor = (carat: number, baseFee: number = MARKET.settingBase): number =>
  baseFee * settingSizeMultiplier(carat)

/** Cast, finish and polish, $ — a setup base plus a term that tracks mass. */
export const finishingFee = (castGrams: number): number =>
  MARKET.finishFee + MARKET.finishPerGram * (Number.isFinite(castGrams) ? Math.max(0, castGrams) : 0)
