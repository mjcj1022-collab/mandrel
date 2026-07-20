import { useEffect, useState } from 'react'
import { Scene } from '../viewer/Scene'
import { useDesign } from '../state/design'
import { computePrice, stoneUnits } from '../lib/pricing'
import { alloyById, shapeById, stoneById, settingById, finishById } from '../catalog'
import { formatSize } from '../lib/sizing'
import { money } from '../lib/units'
import { CATEGORY_LABEL, stoneOnPiece, type DesignSpec } from '../spec/types'

function summaryLines(spec: DesignSpec): [string, string][] {
  const rows: [string, string][] = [['Piece', CATEGORY_LABEL[spec.category]]]
  const { count, caratEach } = stoneUnits(spec)
  if (stoneOnPiece(spec) && count > 0) {
    const stone = stoneById(spec.center.stoneTypeId)
    rows.push(['Stone', `${caratEach.toFixed(2)} ct ${shapeById(spec.center.shapeId).name} ${stone.name}${stone.variety ? ` (${stone.variety})` : ''}`])
    rows.push(['Setting', `${settingById(spec.setting.typeId).name}`])
  }
  const alloy = alloyById(spec.metal.alloyId)
  rows.push(['Metal', `${alloy.name} · ${alloy.hallmark}`])
  if (spec.category === 'ring') rows.push(['Ring size', `US ${formatSize(spec.ring.size)}`])
  rows.push(['Finish', finishById(spec.finish).name])
  if (spec.engraving.text.trim()) rows.push(['Engraving', `“${spec.engraving.text.trim()}”`])
  return rows
}

export function ClientReview({ spec, shop }: { spec: DesignSpec; shop: string }) {
  const load = useDesign(s => s.load)
  const setShop = useDesign(s => s.setShop)
  useEffect(() => { load(spec); setShop({ name: shop }) }, [load, setShop, spec, shop])

  const [state, setState] = useState<'review' | 'approved' | 'changes'>('review')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const p = computePrice(spec)

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 2500) } catch { /* blocked */ }
  }
  const approvalText = `I approve this ${CATEGORY_LABEL[spec.category].toLowerCase()} design — ${money(p.total)}. Please proceed.`
  const changeText = () => `Requested changes to the ${CATEGORY_LABEL[spec.category].toLowerCase()}:\n${note.trim()}`

  return (
    <>
      <header className="mast">
        <div className="mast-in">
          <span className="logo">{shop}</span>
          <span className="tag">Design approval</span>
          <span className="mast-fig strong">{money(p.total)}</span>
        </div>
      </header>

      <div className="app review">
        <Scene />
        <aside className="panel">
          <div className="panel-scroll review-body">
            <h3 className="review-h">Your {CATEGORY_LABEL[spec.category].toLowerCase()}</h3>
            <p className="disc">Rotate and zoom the model on the left. Please review the details below and approve, or request changes, before {shop} begins work.</p>
            <div className="review-summary">
              {summaryLines(spec).map(([k, v]) => (
                <div key={k} className="review-row"><span>{k}</span><b>{v}</b></div>
              ))}
              <div className="review-row total"><span>Price</span><b>{money(p.total)}</b></div>
            </div>
          </div>

          <div className="review-actions">
            {state === 'review' && (
              <>
                <button className="primary review-approve" onClick={() => setState('approved')}>Approve design</button>
                <button className="ghost" onClick={() => setState('changes')}>Request changes</button>
              </>
            )}
            {state === 'approved' && (
              <>
                <p className="review-ok">✓ Thank you. Send this confirmation back to {shop} and they’ll begin your piece.</p>
                <button className="primary" onClick={() => copy(approvalText, 'approval')}>{copied === 'approval' ? 'Copied ✓' : 'Copy my approval'}</button>
                <button className="ghost" onClick={() => setState('review')}>Back</button>
              </>
            )}
            {state === 'changes' && (
              <>
                <textarea className="review-note" rows={4} placeholder="Describe the changes you’d like…" value={note} onChange={e => setNote(e.target.value)} />
                <button className="primary" disabled={!note.trim()} onClick={() => copy(changeText(), 'changes')}>{copied === 'changes' ? 'Copied ✓' : 'Copy my notes'}</button>
                <button className="ghost" onClick={() => setState('review')}>Back</button>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
