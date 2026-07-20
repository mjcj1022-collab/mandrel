import { useState } from 'react'
import { useDesign } from '../state/design'
import { reviewUrl } from '../lib/share'

const STAGES = ['Designed', 'Approved', 'Cast', 'Set', 'Finished', 'QC', 'Shipped']

/** Order status tracker — the client-visible pipeline for a piece. */
export function OrderPanel() {
  const spec = useDesign(s => s.spec)
  const shop = useDesign(s => s.shop)
  const stage = useDesign(s => s.orderStage)
  const setStage = useDesign(s => s.setOrderStage)
  const [copied, setCopied] = useState(false)

  const sendForApproval = async () => {
    try { await navigator.clipboard.writeText(reviewUrl(spec, shop.name)); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* clipboard blocked */ }
  }

  return (
    <div className="panel-block">
      <h4>Order status <span className="mfg-sum"><b className="ok">{STAGES[stage]}</b></span></h4>
      <div className="pipeline">
        {STAGES.map((s, i) => (
          <button key={s} className={`stage ${i < stage ? 'done' : i === stage ? 'now' : ''}`} onClick={() => setStage(i)}>
            <span className="dot" /><span className="lbl">{s}</span>
          </button>
        ))}
      </div>
      <div className="opts c2" style={{ marginTop: 12 }}>
        <button className="opt" disabled={stage === 0} onClick={() => setStage(stage - 1)}>Back</button>
        <button className="opt" disabled={stage === STAGES.length - 1} onClick={() => setStage(stage + 1)}>Advance</button>
      </div>
      {stage === 0 && (
        <button className="opt" style={{ width: '100%', marginTop: 8 }} onClick={sendForApproval}>{copied ? 'Approval link copied ✓' : 'Copy approval link for client'}</button>
      )}
      <p className="disc">Send the client a no-login link to review and sign off before anything is cast. Advance the stage as the piece moves through the shop.</p>
    </div>
  )
}
