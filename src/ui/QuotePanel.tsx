import { useDesign } from '../state/design'
import { computePrice, stoneUnits } from '../lib/pricing'
import { alloyById, shapeById, stoneById, settingById, stoneMm, finishById, isGradeable, gradeLabel } from '../catalog'
import { sizeToDiameter, formatSize } from '../lib/sizing'
import { money, gToDwt } from '../lib/units'
import { CATEGORY_LABEL, type DesignSpec } from '../spec/types'

function geometryLines(spec: DesignSpec): string[] {
  const alloy = alloyById(spec.metal.alloyId)
  switch (spec.category) {
    case 'ring':
      return [
        'RING',
        `  Inside diameter   ${sizeToDiameter(spec.ring.size).toFixed(2)} mm  (US ${formatSize(spec.ring.size)})`,
        `  Band              ${spec.ring.width.toFixed(1)} x ${spec.ring.thickness.toFixed(1)} mm, ${spec.ring.fit} fit`,
        `  Hallmark          ${alloy.hallmark}`,
        `  Resizable         ${settingById(spec.setting.typeId).resizeRange}`
      ]
    case 'pendant':
      return [
        'PENDANT',
        `  Bail              ${spec.pendant.bailInner.toFixed(1)} mm opening, ${spec.pendant.bailGauge.toFixed(1)} mm gauge`,
        `  Chain             ${spec.pendant.hasChain ? `${spec.pendant.chainLength}" at ${spec.pendant.chainGauge.toFixed(1)} mm` : 'None (pendant only)'}`,
        `  Hallmark          ${alloy.hallmark}`
      ]
    case 'earring':
      return [
        'EARRINGS',
        `  Configuration     ${spec.earring.pair ? 'Matched pair' : 'Single'}`,
        `  Style             ${spec.earring.dropLength > 0 ? `Drop, ${spec.earring.dropLength} mm` : 'Stud'}`,
        `  Post              ${spec.earring.postLength.toFixed(1)} mm, ${spec.earring.postGauge.toFixed(1)} mm gauge, ${spec.earring.back} back`,
        `  Hallmark          ${alloy.hallmark}`
      ]
    case 'bracelet':
      return [
        'BRACELET',
        `  Type              ${spec.bracelet.kind}`,
        `  Worn length       ${(spec.bracelet.wristCircumference + spec.bracelet.fitAllowance)} mm  (${((spec.bracelet.wristCircumference + spec.bracelet.fitAllowance) / 25.4).toFixed(2)}")`,
        spec.bracelet.kind === 'tennis' ? `  Stones            ${spec.bracelet.linkCount}` : `  Section           ${spec.bracelet.width.toFixed(1)} x ${spec.bracelet.thickness.toFixed(1)} mm`,
        `  Hallmark          ${alloy.hallmark}`
      ]
    case 'necklace':
      return [
        'NECKLACE',
        `  Length            ${spec.necklace.length}"`,
        `  Chain gauge       ${spec.necklace.gauge.toFixed(1)} mm`,
        `  Pendant           ${spec.necklace.hasPendant ? 'Yes' : 'None'}`,
        `  Hallmark          ${alloy.hallmark}`
      ]
  }
}

function stoneLines(spec: DesignSpec): string[] {
  const { count, caratEach } = stoneUnits(spec)
  if (count === 0) return []
  const shape = shapeById(spec.center.shapeId)
  const stone = stoneById(spec.center.stoneTypeId)
  const setting = settingById(spec.setting.typeId)
  const mm = stoneMm(shape, caratEach)
  return [
    '',
    'STONE',
    `  ${count > 1 ? `${count} x ` : 'Center            '}${caratEach.toFixed(2)} ct ${shape.name}, ${mm.length.toFixed(2)} x ${mm.width.toFixed(2)} mm`,
    `  Material          ${stone.name} - ${stone.variety}, Mohs ${stone.mohs}`,
    ...(isGradeable(spec.center.stoneTypeId) ? [
      `  Grade             ${gradeLabel(spec.center.grading)}, ${spec.center.grading.fluorescence} fluor.`,
      spec.center.cert.lab !== 'none' ? `  Certificate       ${spec.center.cert.lab} ${spec.center.cert.number || '(number pending)'}` : ''
    ] : []),
    `  Treatment         ${stone.treatment ?? 'None disclosed'}`,
    `  Setting           ${setting.name} (${setting.variety})`
  ].filter(Boolean)
}

function techSheet(spec: DesignSpec) {
  const p = computePrice(spec)
  const m = p.metal
  const alloy = alloyById(spec.metal.alloyId)
  const stone = stoneById(spec.center.stoneTypeId)
  const { count } = stoneUnits(spec)

  return [
    `BFG REQUEST — TECH SHEET  (${CATEGORY_LABEL[spec.category]})`,
    '',
    ...geometryLines(spec),
    '',
    'METAL',
    `  Alloy             ${alloy.name}, density ${alloy.density} g/cm3, ${(alloy.fine * 100).toFixed(1)}% ${alloy.symbol}`,
    spec.metal.twoTone && spec.metal.headAlloyId ? `  Head alloy        ${alloyById(spec.metal.headAlloyId).name} (two-tone, cast separately)` : '',
    `  Model volume      ${Math.round(m.volume).toLocaleString()} mm3`,
    `  Cast weight       ${m.cast.toFixed(2)} g   (${gToDwt(m.cast).toFixed(2)} dwt)`,
    `  Finished weight   ${m.finished.toFixed(2)} g   (${gToDwt(m.finished).toFixed(2)} dwt)`,
    `  Finishing loss    ${m.lossGrams.toFixed(2)} g at ${(m.finishingLoss * 100).toFixed(1)}%`,
    `  Fine ${alloy.symbol} content    ${m.fineGrams.toFixed(2)} g   (${m.fineOzt.toFixed(4)} ozt)`,
    `  Sprue + button    ${(m.sprue + m.button).toFixed(2)} g`,
    `  METAL TO POUR     ${m.pour.toFixed(2)} g   (${gToDwt(m.pour).toFixed(2)} dwt)`,
    `  Pattern weight    ${m.patternWax.toFixed(2)} g wax  /  ${m.patternResin.toFixed(2)} g castable resin`,
    ...stoneLines(spec),
    '',
    'FINISH & PERSONALIZATION',
    `  Finish            ${finishById(spec.finish).name}`,
    `  Engraving         ${spec.engraving.text.trim() ? `“${spec.engraving.text.trim()}” (${spec.engraving.placement}, ${spec.engraving.font})` : 'None'}`,
    spec.metal.rhodium && p.metal.alloy.platable ? '  Plating           Rhodium' : '',
    '',
    'PRICE',
    `  Net metal         ${money(p.metalCost)}`,
    ...(count > 0 ? [
      `  Stones            ${money(p.stoneCost)}`,
      `  Setting labor     ${money(p.settingFee)}`
    ] : []),
    ...(p.accentCount > 0 ? [`  Accent (${p.accentCount})      ${money(p.accentCost)}`] : []),
    ...(p.platingFee > 0 ? [`  Rhodium plating   ${money(p.platingFee)}`] : []),
    ...(p.finishExtra > 0 ? [`  Surface finish    ${money(p.finishExtra)}`] : []),
    ...(p.engraveFee > 0 ? [`  Engraving         ${money(p.engraveFee)}`] : []),
    `  Cast and finish   ${money(p.finishFee)}`,
    `  ESTIMATE          ${money(p.total)}`,
    '',
    'DISCLOSURE',
    count > 0
      ? `  ${stone.labGrown ? 'LABORATORY-GROWN. Must be disclosed on all documents and advertising.' : 'Natural origin. Treatments as noted above.'}`
      : '  No center stone.',
    count > 0 && stone.care ? `  Care: ${stone.care}` : ''
  ].filter(Boolean).join('\n')
}

export function QuotePanel() {
  const spec = useDesign(s => s.spec)
  const p = computePrice(spec)
  const alloy = alloyById(spec.metal.alloyId)
  const hasStones = p.stoneCount > 0

  const download = () => {
    const blob = new Blob([techSheet(spec)], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bfg-request-${spec.category}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copySpec = async () => {
    await navigator.clipboard.writeText(JSON.stringify(spec, null, 2))
  }

  return (
    <div className="panel-block quote">
      <div className="qline"><span>Net metal — {alloy.name}</span><span>{money(p.metalCost)}</span></div>
      {hasStones && <div className="qline"><span>{p.stoneCount > 1 ? `${p.stoneCount} stones` : 'Center stone'}</span><span>{money(p.stoneCost)}</span></div>}
      {p.accentCount > 0 && <div className="qline"><span>{p.accentCount} accent stones + setting</span><span>{money(p.accentCost)}</span></div>}
      {hasStones && <div className="qline"><span>Setting labor</span><span>{money(p.settingFee)}</span></div>}
      {p.platingFee > 0 && <div className="qline"><span>Rhodium plating</span><span>{money(p.platingFee)}</span></div>}
      {p.finishExtra > 0 && <div className="qline"><span>Surface finish</span><span>{money(p.finishExtra)}</span></div>}
      {p.engraveFee > 0 && <div className="qline"><span>Engraving</span><span>{money(p.engraveFee)}</span></div>}
      <div className="qline"><span>Cast, finish, polish</span><span>{money(p.finishFee)}</span></div>
      <div className="qtotal">
        <span className="lbl">Estimate</span>
        <span className="amt">{money(p.total)}</span>
      </div>
      <div className="qact">
        <button className="primary" onClick={download}>Tech sheet</button>
        <button className="ghost" onClick={copySpec}>Copy spec</button>
      </div>
      <p className="disc">
        Metal priced from illustrative spot values. Wire <code>Alloy.spot</code> to a live feed
        before quoting a client.
      </p>
    </div>
  )
}
