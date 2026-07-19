import { useState, useEffect } from 'react'
import { Scene } from './viewer/Scene'
import { Controls } from './ui/Controls'
import { MetalPanel } from './ui/MetalPanel'
import { QuotePanel } from './ui/QuotePanel'
import { ProductionPanel } from './ui/ProductionPanel'
import { LibraryPanel } from './ui/LibraryPanel'
import { MetalGenerator } from './ui/MetalGenerator'
import { useDesign } from './state/design'
import { computeMetal } from './lib/metal'
import { computePrice } from './lib/pricing'
import { money } from './lib/units'
import { CATEGORY_LABEL } from './spec/types'
import { shareUrl, specFromUrl } from './lib/share'

function Masthead({ onLab }: { onLab: () => void }) {
  const spec = useDesign(s => s.spec)
  const reset = useDesign(s => s.reset)
  const [shared, setShared] = useState(false)
  const m = computeMetal(spec)
  const p = computePrice(spec)
  const share = async () => {
    try { await navigator.clipboard.writeText(shareUrl(spec)); setShared(true); setTimeout(() => setShared(false), 2000) } catch { /* clipboard blocked */ }
  }
  return (
    <header className="mast">
      <div className="mast-in">
        <span className="logo">MAN<em>D</em>REL</span>
        <span className="tag">Studio · {CATEGORY_LABEL[spec.category]}</span>
        <span className="mast-fig">{m.finished.toFixed(2)} g finished</span>
        <span className="mast-fig">{m.pour.toFixed(2)} g to pour</span>
        <span className="mast-fig strong">{money(p.total)}</span>
        <button className="mast-lab" onClick={share}>{shared ? 'Link copied' : 'Share'}</button>
        <button className="mast-lab" onClick={onLab}>Metal Lab</button>
        <button className="mast-reset" onClick={reset}>Reset</button>
      </div>
    </header>
  )
}

export default function App() {
  const [labOpen, setLabOpen] = useState(false)
  const load = useDesign(s => s.load)

  // A shared ?d= link opens the exact design.
  useEffect(() => {
    const shared = specFromUrl()
    if (shared) load(shared)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Masthead onLab={() => setLabOpen(true)} />
      <div className="app">
        <Scene />
        <aside className="panel">
          <div className="panel-scroll">
            <Controls />
            <MetalPanel />
            <ProductionPanel />
            <LibraryPanel />
          </div>
          <QuotePanel />
        </aside>
      </div>
      <MetalGenerator open={labOpen} onClose={() => setLabOpen(false)} />
    </>
  )
}
