import type { DesignSpec } from '../spec/types'
import { alloyById, shapeById, stoneById, settingById, stoneMm } from '../catalog'
import { computeMetal } from './metal'
import { computePrice, stoneUnits } from './pricing'

/**
 * Bill of materials — the structured parts list a bench needs to actually make
 * the piece. Derived entirely from the spec, like everything else.
 */
export type BomKind = 'metal' | 'stone' | 'finding' | 'labor'

export interface BomLine {
  kind: BomKind
  item: string
  detail: string
  qty: string
  cost: number
}

export interface Bom {
  lines: BomLine[]
  metalGrams: number       // finished weight
  pourGrams: number        // order this much
  totalCarat: number
  total: number
}

export function computeBom(spec: DesignSpec): Bom {
  const alloy = alloyById(spec.metal.alloyId)
  const m = computeMetal(spec)
  const p = computePrice(spec)
  const { count, caratEach } = stoneUnits(spec)
  const lines: BomLine[] = []

  // Metal
  lines.push({
    kind: 'metal',
    item: alloy.name,
    detail: `${m.finished.toFixed(2)} g finished · ${m.pour.toFixed(2)} g to pour · ${(alloy.fine * 100).toFixed(1)}% ${alloy.symbol}`,
    qty: `${m.pour.toFixed(2)} g`,
    cost: p.metalCost
  })

  // Stones
  if (count > 0) {
    const shape = shapeById(spec.center.shapeId)
    const stone = stoneById(spec.center.stoneTypeId)
    const mm = stoneMm(shape, caratEach)
    lines.push({
      kind: 'stone',
      item: `${stone.name} — ${stone.variety}`,
      detail: `${shape.name}, ${mm.length.toFixed(2)} × ${mm.width.toFixed(2)} mm, ${caratEach.toFixed(2)} ct ea · ${(count * caratEach).toFixed(2)} ct total${stone.treatment ? ` · ${stone.treatment}` : ''}`,
      qty: `${count}`,
      cost: p.stoneCost
    })
  }

  // Findings, per category
  const setting = settingById(spec.setting.typeId)
  if (count > 0) lines.push({ kind: 'finding', item: `${setting.name} head`, detail: setting.variety, qty: `${count}`, cost: p.settingFee })

  // Accent stones (halo / pavé / channel / sides)
  if (p.accentCount > 0) {
    const stone = stoneById(spec.center.stoneTypeId)
    lines.push({
      kind: 'stone',
      item: `Accent ${stone.name.toLowerCase()} melee`,
      detail: `${(setting.accentCt ?? 0.01).toFixed(2)} ct each · ${(p.accentCount * (setting.accentCt ?? 0.01)).toFixed(2)} ct total · bead/channel set`,
      qty: `${p.accentCount}`,
      cost: p.accentCost
    })
  }

  switch (spec.category) {
    case 'pendant':
      lines.push({ kind: 'finding', item: 'Bail', detail: `${spec.pendant.bailInner.toFixed(1)} mm opening, ${spec.pendant.bailGauge.toFixed(1)} mm gauge`, qty: '1', cost: 0 })
      if (spec.pendant.hasChain) lines.push({ kind: 'finding', item: 'Chain', detail: `${spec.pendant.chainLength}" cable, ${spec.pendant.chainGauge.toFixed(1)} mm`, qty: '1', cost: 0 })
      break
    case 'earring':
      lines.push({ kind: 'finding', item: 'Posts', detail: `${spec.earring.postLength.toFixed(1)} mm, ${spec.earring.postGauge.toFixed(1)} mm gauge`, qty: spec.earring.pair ? '2' : '1', cost: 0 })
      lines.push({ kind: 'finding', item: 'Backs', detail: `${spec.earring.back} type`, qty: spec.earring.pair ? '2' : '1', cost: 0 })
      break
    case 'bracelet':
      lines.push({ kind: 'finding', item: 'Clasp', detail: spec.bracelet.kind === 'tennis' ? 'Box clasp with safety' : spec.bracelet.kind === 'chain' ? 'Lobster clasp' : 'Integral', qty: '1', cost: 0 })
      break
    case 'necklace':
      lines.push({ kind: 'finding', item: 'Clasp', detail: 'Lobster clasp', qty: '1', cost: 0 })
      if (spec.necklace.hasPendant) lines.push({ kind: 'finding', item: 'Bail', detail: 'Integrated', qty: '1', cost: 0 })
      break
  }

  // Labor
  lines.push({ kind: 'labor', item: 'Cast, finish & polish', detail: `${(m.finishingLoss * 100).toFixed(1)}% finishing loss`, qty: '—', cost: p.finishFee })

  return {
    lines,
    metalGrams: m.finished,
    pourGrams: m.pour,
    totalCarat: count * caratEach,
    total: p.total
  }
}
