import type { DesignSpec } from '../spec/types'
import { usesSetting, stoneOnPiece, NO_STONE } from '../spec/types'
import { settingById, shapeById, stoneById, stoneMm } from '../catalog'
import { computeMetal, type MetalResult } from './metal'

export const FINISH_FEE = 95     // cast, file, sand, pre-polish, final polish
export const RHODIUM_FEE = 45    // white-metal rhodium plating pass
export const MARGIN = 1.35

export interface PriceResult {
  metal: MetalResult
  metalCost: number
  stoneCost: number
  stoneCount: number
  settingFee: number
  accentCost: number
  accentCount: number
  platingFee: number
  finishFee: number
  subtotal: number
  total: number
}

export const MELEE_LABOR_EACH = 12   // bead/channel setting labor per accent stone

/**
 * How many set stones the piece carries, and the carat of each. A pair of studs
 * is two stones; a tennis bracelet is `linkCount` stones; a plain band is none.
 */
export function stoneUnits(spec: DesignSpec): { count: number; caratEach: number } {
  if (spec.center.stoneTypeId === NO_STONE) return { count: 0, caratEach: 0 }
  const ct = spec.center.carat
  switch (spec.category) {
    case 'ring':     return { count: 1, caratEach: ct }
    case 'pendant':  return { count: 1, caratEach: ct }
    case 'earring':  return { count: spec.earring.pair ? 2 : 1, caratEach: ct }
    case 'bracelet': return spec.bracelet.kind === 'tennis'
      ? { count: spec.bracelet.linkCount, caratEach: ct / Math.max(spec.bracelet.linkCount, 1) }
      : { count: 0, caratEach: 0 }
    case 'necklace': return spec.necklace.hasPendant ? { count: 1, caratEach: ct } : { count: 0, caratEach: 0 }
  }
}

export function computePrice(spec: DesignSpec): PriceResult {
  const metal = computeMetal(spec)
  const stone = stoneById(spec.center.stoneTypeId)
  const setting = settingById(spec.setting.typeId)
  const { count, caratEach } = stoneUnits(spec)

  const stoneCost = count > 0 ? count * stone.rate * Math.pow(caratEach, stone.exponent) : 0
  const settingFee = usesSetting(spec.category) && count > 0 ? count * setting.fee : 0

  // Accent stones (halo, pavé, channel, three-stone sides): cheaper per-ct
  // melee plus bead-setting labor.
  const melee = count > 0 && setting.melee ? setting.melee : 0
  const accentCt = setting.accentCt ?? 0.01
  const accentCost = melee * (stone.rate * 0.5) * Math.pow(accentCt, stone.exponent) + melee * MELEE_LABOR_EACH

  const platingFee = spec.metal.rhodium && metal.alloy.platable ? RHODIUM_FEE : 0
  const subtotal = metal.netMetalCost + stoneCost + settingFee + accentCost + platingFee + FINISH_FEE

  return {
    metal,
    metalCost: metal.netMetalCost,
    stoneCost,
    stoneCount: count,
    settingFee,
    accentCost,
    accentCount: melee,
    platingFee,
    finishFee: FINISH_FEE,
    subtotal,
    total: subtotal * MARGIN
  }
}

export interface Guardrail {
  level: 'warn' | 'note' | 'ok'
  title: string
  body: string
}

/** Wearability and setting advice derived from the spec. */
export function guardrails(spec: DesignSpec): Guardrail[] {
  const out: Guardrail[] = []
  const stone = stoneById(spec.center.stoneTypeId)
  const setting = settingById(spec.setting.typeId)
  const shape = shapeById(spec.center.shapeId)
  const { width } = stoneMm(shape, spec.center.carat)
  const daily = spec.category === 'ring' || spec.category === 'bracelet'

  if (stoneOnPiece(spec)) {
    if (stone.mohs < 7 && daily) {
      out.push({
        level: 'warn',
        title: 'Not for daily wear',
        body: `${stone.name} is Mohs ${stone.mohs}. It will abrade and chip in a piece worn every day. Better suited to a pendant or an occasional-wear piece.${stone.care ? ' ' + stone.care : ''}`
      })
    } else if (stone.mohs < 8 && daily) {
      out.push({
        level: 'note',
        title: 'Wear with care',
        body: `Mohs ${stone.mohs}. Fine, but remove it for manual work.${stone.care ? ' ' + stone.care : ''}`
      })
    }

    if (setting.bezel && stone.mohs < 8) {
      out.push({ level: 'ok', title: 'Good pairing', body: 'A bezel protects the girdle, which is the right call for a softer stone.' })
    }
    if (!setting.bezel && setting.prongs === 4 && spec.center.carat >= 2) {
      out.push({ level: 'note', title: 'Consider six prongs', body: `At ${spec.center.carat.toFixed(2)} ct, four prongs leave more girdle exposed than most setters are comfortable with.` })
    }
    if (['ma', 'pe', 'he'].includes(shape.id) && !setting.bezel && setting.prongs < 6) {
      out.push({ level: 'note', title: 'Protect the point', body: `${shape.name} cuts have a vulnerable tip. Specify a V-prong at the point or move to a bezel.` })
    }
    if (stone.labGrown) {
      out.push({ level: 'note', title: 'Disclosure required', body: 'Laboratory-grown origin must be disclosed on the quote, the appraisal and any advertising. Handled automatically on generated documents.' })
    }
  }

  if (spec.category === 'ring' && width > spec.ring.width * 3.4 && spec.ring.thickness < 1.8) {
    out.push({ level: 'warn', title: 'Shank may be under-built', body: `A ${width.toFixed(1)} mm stone on a ${spec.ring.width.toFixed(1)} x ${spec.ring.thickness.toFixed(1)} mm shank is top-heavy and will spin. Increase thickness to at least 1.8 mm.` })
  }

  return out
}
