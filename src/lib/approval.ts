import { jsPDF } from 'jspdf'
import type { DesignSpec } from '../spec/types'
import { CATEGORY_LABEL, stoneOnPiece } from '../spec/types'
import { alloyById, shapeById, stoneById, settingById, finishById } from '../catalog'
import { formatSize } from './sizing'
import { computePrice, stoneUnits } from './pricing'
import { money } from './units'
import type { HeroImage } from './techpack'

export interface Signature { name: string; date: string }

/** Client-facing summary rows for the approval receipt. */
function summaryRows(spec: DesignSpec): [string, string][] {
  const rows: [string, string][] = [['Piece', CATEGORY_LABEL[spec.category]]]
  const { count, caratEach } = stoneUnits(spec)
  if (stoneOnPiece(spec) && count > 0) {
    const stone = stoneById(spec.center.stoneTypeId)
    rows.push(['Stone', `${caratEach.toFixed(2)} ct ${shapeById(spec.center.shapeId).name} ${stone.name}${stone.variety ? ` (${stone.variety})` : ''}`])
    rows.push(['Setting', settingById(spec.setting.typeId).name])
  }
  const alloy = alloyById(spec.metal.alloyId)
  rows.push(['Metal', `${alloy.name} · ${alloy.hallmark}`])
  if (spec.category === 'ring') rows.push(['Ring size', `US ${formatSize(spec.ring.size)}`])
  rows.push(['Finish', finishById(spec.finish).name])
  if (spec.engraving.text.trim()) rows.push(['Engraving', `“${spec.engraving.text.trim()}”`])
  return rows
}

/**
 * Build a signed design-approval receipt: the shop, the design summary and
 * price, an optional render, and the client's typed e-signature and date, with
 * an authorization statement. Returns the jsPDF document (pure — no download),
 * so it can be tested and reused.
 */
export function buildApprovalPdf(spec: DesignSpec, shopName: string, sig: Signature, hero?: HeroImage | null): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const PAGE_W = 612, PAGE_H = 792, M = 48
  const p = computePrice(spec)

  doc.setFillColor(19, 22, 25); doc.rect(0, 0, PAGE_W, 64, 'F')
  doc.setTextColor(198, 162, 101); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text(shopName.toUpperCase(), M, 34)
  doc.setTextColor(150, 160, 165); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(`Design Approval  ·  ${sig.date}`, M, 50)

  let y = 96
  let imgBottom = y
  if (hero) {
    const imgW = 176
    const imgH = Math.min(200, Math.round(imgW * (hero.h / hero.w)))
    doc.setFillColor(14, 17, 19); doc.rect(PAGE_W - M - imgW, y - 4, imgW, imgH + 8, 'F')
    try { doc.addImage(hero.url, hero.format, PAGE_W - M - imgW + 4, y, imgW - 8, imgH) } catch { /* skip image */ }
    imgBottom = y + imgH + 12
  }

  doc.setTextColor(28, 28, 28); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(`Your ${CATEGORY_LABEL[spec.category].toLowerCase()}`, M, y); y += 22

  doc.setFontSize(9.5)
  for (const [label, value] of summaryRows(spec)) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 128, 132); doc.text(label, M, y)
    doc.setTextColor(28, 28, 28); doc.text(value, M + 100, y); y += 16
  }
  y += 4
  doc.setDrawColor(210, 210, 210); doc.line(M, y, M + 300, y); y += 18
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(28, 28, 28)
  doc.text('Price', M, y); doc.text(money(p.total), M + 100, y); y += 30
  y = Math.max(y, imgBottom)                             // keep the signature clear of the render

  // authorization + signature
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 66, 70)
  const auth = `By signing below, I approve this design as shown and authorize ${shopName} to proceed with manufacture at the price above.`
  doc.text(doc.splitTextToSize(auth, PAGE_W - M * 2) as string[], M, y); y += 44

  doc.setDrawColor(60, 60, 60); doc.line(M, y, M + 240, y)
  doc.setFontSize(9); doc.setTextColor(120, 128, 132); doc.text('Signature', M, y + 14)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(28, 28, 28)
  doc.text(sig.name, M + 6, y - 8)                       // typed e-signature on the line
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(28, 28, 28)
  doc.text(`Date: ${sig.date}`, M + 300, y)

  doc.setFontSize(8); doc.setTextColor(140, 146, 150)
  doc.text('A typed name constitutes an electronic signature. Return this document to your jeweler to begin production.', M, PAGE_H - 40, { maxWidth: PAGE_W - M * 2 })
  return doc
}

/** Download the signed approval receipt as a PDF. */
export function downloadApprovalPdf(spec: DesignSpec, shopName: string, sig: Signature, hero?: HeroImage | null): void {
  buildApprovalPdf(spec, shopName, sig, hero).save(`design-approval-${spec.category}.pdf`)
}
