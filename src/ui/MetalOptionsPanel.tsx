import { useDesign } from '../state/design'
import { alloyById } from '../catalog'
import { computeMetal } from '../lib/metal'
import { computePrice } from '../lib/pricing'
import { money } from '../lib/units'

/** The metals to quote side by side — the common precious options. */
const OPTIONS = ['14ky', '14kw', '14kr', '18ky', '18kw', 'pt95']

/**
 * The same piece priced across several metals at once, so the shop can offer
 * options. Weights and totals come from the live metal computation; tap a row to
 * switch the design to that metal.
 */
export function MetalOptionsPanel() {
  const spec = useDesign(s => s.spec)
  const setAlloy = useDesign(s => s.setAlloy)
  const shop = useDesign(s => s.shop)

  const rows = OPTIONS.map(id => {
    const s = { ...spec, metal: { ...spec.metal, alloyId: id } }
    return { id, name: alloyById(id).name, g: computeMetal(s).finished, total: computePrice(s).total }
  })

  const copy = () => {
    const text = `${shop.name} — metal options for your piece:\n` + rows.map(r => `  ${r.name}: ${money(r.total)}`).join('\n')
    try { void navigator.clipboard?.writeText(text) } catch { /* blocked */ }
  }

  return (
    <div className="panel-block">
      <h4>Metal options</h4>
      <div className="metopt">
        {rows.map(r => (
          <button key={r.id} className={`metopt-row ${r.id === spec.metal.alloyId ? 'on' : ''}`} onClick={() => setAlloy(r.id)}>
            <span className="metopt-name">{r.name}</span>
            <span className="metopt-g">{r.g.toFixed(2)} g</span>
            {!shop.hideCost && <b className="metopt-total">{money(r.total)}</b>}
          </button>
        ))}
      </div>
      {!shop.hideCost && <button className="opt" style={{ width: '100%', marginTop: 8 }} onClick={copy}>Copy options for client</button>}
      <p className="disc">The same piece priced across metals — tap one to switch the design. Weights and totals track the live metal market.</p>
    </div>
  )
}
