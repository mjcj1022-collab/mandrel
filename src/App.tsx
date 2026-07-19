import { Scene } from './viewer/Scene'
import { Controls } from './ui/Controls'
import { MetalPanel } from './ui/MetalPanel'
import { QuotePanel } from './ui/QuotePanel'
import { ProductionPanel } from './ui/ProductionPanel'
import { LibraryPanel } from './ui/LibraryPanel'
import { useDesign } from './state/design'
import { computeMetal } from './lib/metal'
import { computePrice } from './lib/pricing'
import { money } from './lib/units'
import { CATEGORY_LABEL } from './spec/types'

function Masthead() {
  const spec = useDesign(s => s.spec)
  const reset = useDesign(s => s.reset)
  const m = computeMetal(spec)
  const p = computePrice(spec)
  return (
    <header className="mast">
      <div className="mast-in">
        <span className="logo">MAN<em>D</em>REL</span>
        <span className="tag">Studio · {CATEGORY_LABEL[spec.category]}</span>
        <span className="mast-fig">{m.finished.toFixed(2)} g finished</span>
        <span className="mast-fig">{m.pour.toFixed(2)} g to pour</span>
        <span className="mast-fig strong">{money(p.total)}</span>
        <button className="mast-reset" onClick={reset}>Reset</button>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <>
      <Masthead />
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
    </>
  )
}
