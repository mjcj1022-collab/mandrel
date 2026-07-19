import type { DesignSpec } from '../spec/types'
import { usesSetting } from '../spec/types'
import { ALLOYS, CUSTOM_ALLOYS, alloyById, settingById, type Alloy } from '../catalog'
import { computeVolume } from './volume'
import { OZT } from './units'

/**
 * Pattern densities. Castable resin is ~21% denser than injection wax.
 * A shop that keeps the old wax multiplier on 3D-printed patterns
 * under-orders metal on every single job.
 */
export const PATTERN_DENSITY = {
  injectionWax: 0.95,
  carvingWax: 1.02,
  castableResin: 1.15,
  moldlayFilament: 1.05
} as const

/** Sprue and button defaults. Override per shop. */
export const POUR_DEFAULTS = {
  sprueRadius: 1.75,   // mm — 3.5 mm sprue
  sprueLength: 12,     // mm per attachment
  sprueCount: 1,
  buttonRatio: 0.40    // reservoir as a fraction of tree weight
}

/** Scrap recovery. Metal removed is not metal lost. */
export const RECOVERY = {
  cleanFraction: 1.0,     // sprue and button, all of it
  cleanPayout: 0.965,     // refiner payout on clean scrap
  sweepFraction: 0.70,    // filings and bench sweeps actually captured
  sweepPayout: 0.88
}

export interface MetalResult {
  alloy: Alloy
  volume: number        // mm3
  cast: number          // g, out of the flask
  finished: number      // g, what the client wears
  finishingLoss: number // fraction
  lossGrams: number
  sprue: number
  button: number
  pour: number          // g, what must be in the crucible
  pourRatio: number     // pour / cast
  fineGrams: number
  fineOzt: number
  purchaseCost: number
  scrapCredit: number
  netMetalCost: number
  patternWax: number
  patternResin: number
}

/**
 * Finishing loss — metal that disappears into filing, sanding and polishing.
 * The finished piece is ALWAYS lighter than the casting. Report finished
 * weight to the client and cast weight to the bench; they are not the same.
 */
export function finishingLoss(spec: DesignSpec, alloy: Alloy): number {
  let loss = 0.07                                   // standard piece with a head
  if (usesSetting(spec.category)) loss += settingById(spec.setting.typeId).finishPenalty
  loss += alloy.finishPenalty                       // platinum is slow to finish
  if (spec.category === 'ring' && spec.ring.width >= 6) loss += 0.01  // more surface to bring up
  return loss
}

export function computeMetal(spec: DesignSpec, alloyId?: string): MetalResult {
  const alloy = alloyById(alloyId ?? spec.metal.alloyId)
  const { total: volume } = computeVolume(spec)

  const cast = (volume / 1000) * alloy.density
  const loss = finishingLoss(spec, alloy)
  const finished = cast * (1 - loss)
  const lossGrams = cast - finished

  const sprueVol =
    Math.PI * POUR_DEFAULTS.sprueRadius ** 2 * POUR_DEFAULTS.sprueLength * POUR_DEFAULTS.sprueCount
  const sprue = (sprueVol / 1000) * alloy.density
  const button = Math.max(alloy.buttonMin, (cast + sprue) * POUR_DEFAULTS.buttonRatio)
  const pour = (cast + sprue + button) * (1 + alloy.meltLoss)

  const fineGrams = finished * alloy.fine
  const fineOzt = fineGrams / OZT

  let purchaseCost: number
  let scrapCredit: number
  if (alloy.precious) {
    // Priced on fine troy ounces of the precious content; scrap comes back.
    purchaseCost = ((pour * alloy.fine) / OZT) * alloy.spot * (1 + alloy.premium)
    const scrapClean =
      (((sprue + button) * RECOVERY.cleanFraction * alloy.fine) / OZT) * alloy.spot * RECOVERY.cleanPayout
    const scrapSweep =
      ((lossGrams * RECOVERY.sweepFraction * alloy.fine) / OZT) * alloy.spot * RECOVERY.sweepPayout
    scrapCredit = scrapClean + scrapSweep
  } else {
    // Base / contemporary metals: priced per gram of stock, scrap value negligible.
    purchaseCost = pour * alloy.perGram * (1 + alloy.premium)
    scrapCredit = 0
  }

  return {
    alloy, volume, cast, finished, finishingLoss: loss, lossGrams,
    sprue, button, pour, pourRatio: pour / cast,
    fineGrams, fineOzt,
    purchaseCost, scrapCredit, netMetalCost: purchaseCost - scrapCredit,
    patternWax: (volume / 1000) * PATTERN_DENSITY.injectionWax,
    patternResin: (volume / 1000) * PATTERN_DENSITY.castableResin
  }
}

/** The same design costed across every alloy in the catalog (plus any custom). */
export function compareAlloys(spec: DesignSpec): MetalResult[] {
  return [...ALLOYS, ...CUSTOM_ALLOYS].map(a => computeMetal(spec, a.id))
}

/**
 * Metal-to-metal conversion. Cast a sterling sample, then scale by density.
 * A 4.00 g sterling sample becomes 5.05 g in 14K yellow.
 */
export const convertWeight = (grams: number, from: Alloy, to: Alloy) =>
  grams * (to.density / from.density)

/** Pattern weight to metal weight, when there is no CAD volume. */
export const patternToMetal = (patternGrams: number, patternDensity: number, alloy: Alloy) =>
  patternGrams * (alloy.density / patternDensity)
