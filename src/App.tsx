import { useState, useEffect } from 'react'
import { Scene } from './viewer/Scene'
import { ModelerScene } from './viewer/ModelerScene'
import { Controls } from './ui/Controls'
import { MetalPanel } from './ui/MetalPanel'
import { QuotePanel } from './ui/QuotePanel'
import { ProductionPanel } from './ui/ProductionPanel'
import { AttributesPanel } from './ui/AttributesPanel'
import { VariantsPanel } from './ui/VariantsPanel'
import { OrderPanel } from './ui/OrderPanel'
import { LibraryPanel } from './ui/LibraryPanel'
import { ModelerPanel } from './ui/ModelerPanel'
import { MetalGenerator } from './ui/MetalGenerator'
import { useDesign } from './state/design'
import { useAuth } from './state/auth'
import { useWorkspace } from './state/workspace'
import { computeMetal } from './lib/metal'
import { computePrice } from './lib/pricing'
import { money } from './lib/units'
import { CATEGORY_LABEL } from './spec/types'
import { shareUrl, specFromUrl } from './lib/share'

type Mode = 'design' | 'model'

function Masthead({ mode, setMode, onLab }: { mode: Mode; setMode: (m: Mode) => void; onLab: () => void }) {
  const spec = useDesign(s => s.spec)
  const reset = useDesign(s => s.reset)
  const shop = useDesign(s => s.shop)
  const authUser = useAuth(s => s.user)
  const logout = useAuth(s => s.logout)
  const [shared, setShared] = useState(false)
  const m = computeMetal(spec)
  const p = computePrice(spec)
  const share = async () => {
    try { await navigator.clipboard.writeText(shareUrl(spec)); setShared(true); setTimeout(() => setShared(false), 2000) } catch { /* clipboard blocked */ }
  }
  return (
    <header className="mast">
      <div className="mast-in">
        <span className="logo">{shop.name === 'Blue Flame' ? <>BLUE&nbsp;<em>FLAME</em></> : shop.name}</span>
        <div className="mode-tabs">
          <button aria-pressed={mode === 'design'} onClick={() => setMode('design')}>Design</button>
          <button aria-pressed={mode === 'model'} onClick={() => setMode('model')}>Sculpt</button>
        </div>
        {mode === 'design' ? (
          <>
            <span className="tag">{CATEGORY_LABEL[spec.category]}</span>
            <span className="mast-fig">{m.finished.toFixed(2)} g finished</span>
            <span className="mast-fig">{m.pour.toFixed(2)} g to pour</span>
            {!shop.hideCost && <span className="mast-fig strong">{money(p.total)}</span>}
            <button className="mast-lab" onClick={share}>{shared ? 'Link copied' : 'Share'}</button>
          </>
        ) : (
          <span className="tag">Free-form CSG modeler</span>
        )}
        <button className="mast-lab" onClick={onLab}>Metal Lab</button>
        {mode === 'design' && <button className="mast-reset" onClick={reset}>Reset</button>}
        <span className="mast-user">{authUser}<button className="mast-signout" onClick={logout}>sign out</button></span>
      </div>
    </header>
  )
}

export default function App() {
  const [labOpen, setLabOpen] = useState(false)
  const mode = useWorkspace(s => s.mode)
  const setMode = useWorkspace(s => s.setMode)
  const load = useDesign(s => s.load)

  // A shared ?d= link opens the exact design.
  useEffect(() => {
    const shared = specFromUrl()
    if (shared) load(shared)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Masthead mode={mode} setMode={setMode} onLab={() => setLabOpen(true)} />
      <div className="app">
        {mode === 'design' ? (
          <>
            <Scene />
            <aside className="panel">
              <div className="panel-scroll">
                <Controls />
                <AttributesPanel />
                <VariantsPanel />
                <MetalPanel />
                <ProductionPanel />
                <OrderPanel />
                <LibraryPanel />
              </div>
              <QuotePanel />
            </aside>
          </>
        ) : (
          <>
            <ModelerScene />
            <aside className="panel">
              <div className="panel-scroll">
                <ModelerPanel />
              </div>
            </aside>
          </>
        )}
      </div>
      <MetalGenerator open={labOpen} onClose={() => setLabOpen(false)} />
    </>
  )
}
