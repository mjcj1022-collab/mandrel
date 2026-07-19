import { useDesign } from '../state/design'
import { computeMetal, compareAlloys } from '../lib/metal'
import { formatWeight, money } from '../lib/units'
import { METAL_FORMS, metalFormById } from '../catalog'

export function MetalPanel() {
  const { spec, unit, toggleUnit, compareOpen, toggleCompare, setAlloy, setMetalForm } = useDesign()
  const m = computeMetal(spec)
  const form = metalFormById(spec.metal.form)
  const all = compareAlloys(spec)
  const cheapest = Math.min(...all.map(a => a.netMetalCost))
  const w = (g: number) => formatWeight(g, unit)

  return (
    <>
      <div className="panel-block metalreq">
        <h4>
          Metal requirement
          <button className="unit" onClick={toggleUnit} title="Switch between grams and pennyweight">{unit}</button>
        </h4>

        <div className="subhead" style={{ marginTop: 0 }}>Stock form <span style={{ textTransform: 'none', letterSpacing: 0 }}>· how the metal is smelted</span></div>
        <div className="opts c2" style={{ marginBottom: 14 }}>
          {METAL_FORMS.map(f => (
            <button key={f.id} className="opt" aria-pressed={form.id === f.id} onClick={() => setMetalForm(f.id)}>{f.label}</button>
          ))}
        </div>

        <div className="qline"><span>Model volume</span><span>{Math.round(m.volume).toLocaleString()} mm³</span></div>
        <div className="qline"><span>Cast weight <i>out of the flask</i></span><span>{w(m.cast)}</span></div>
        <div className="qline hi"><span>Finished weight <i>what the client wears</i></span><span>{w(m.finished)}</span></div>
        <div className="qline sub"><span>Finishing loss <i>{(m.finishingLoss * 100).toFixed(1)}%</i></span><span>−{w(m.lossGrams)}</span></div>
        <div className="qline"><span>Fine {m.alloy.symbol} content</span><span>{w(m.fineGrams)} · {m.fineOzt.toFixed(4)} ozt</span></div>
        <div className="qline sub"><span>Sprue + button</span><span>{w(m.sprue + m.button)}</span></div>
        <div className="qline hi"><span>Metal to pour <i>order this much</i></span><span>{w(m.pour)}</span></div>
        <div className="qline sub"><span>Pattern equivalent</span><span>{m.patternWax.toFixed(2)} g wax · {m.patternResin.toFixed(2)} g resin</span></div>
        <div className="qline sub"><span>Metal purchased</span><span>{money(m.purchaseCost)}</span></div>
        <div className="qline sub"><span>Scrap recovery credit</span><span>−{money(m.scrapCredit)}</span></div>

        <p className="disc">
          Order <b>{m.pourRatio.toFixed(2)}×</b> the cast weight. {form.note} Sprue and button come back as clean scrap.
          Spot assumed ${m.alloy.spot.toLocaleString()}/ozt {m.alloy.symbol}.
        </p>
      </div>

      <div className="panel-block compare">
        <h4>
          Same design, every alloy
          <button className="unit" onClick={toggleCompare}>{compareOpen ? 'hide' : 'show'}</button>
        </h4>

        {compareOpen && (
          <div className="cmp-scroll">
            <table className="cmp">
              <thead>
                <tr>
                  <th>Alloy</th>
                  <th>Cast</th>
                  <th>Finished</th>
                  <th>To pour</th>
                  <th>Fine {'\u2009'}</th>
                  <th>Net metal</th>
                </tr>
              </thead>
              <tbody>
                {all.map(a => (
                  <tr
                    key={a.alloy.id}
                    className={a.alloy.id === spec.metal.alloyId ? 'active' : ''}
                    onClick={() => setAlloy(a.alloy.id)}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAlloy(a.alloy.id) } }}
                  >
                    <th scope="row">
                      <span className="dot" style={{ background: '#' + a.alloy.color.toString(16).padStart(6, '0') }} />
                      {a.alloy.short}
                    </th>
                    <td>{w(a.cast)}</td>
                    <td>{w(a.finished)}</td>
                    <td>{w(a.pour)}</td>
                    <td>{a.fineGrams.toFixed(2)} g {a.alloy.symbol}</td>
                    <td className={a.netMetalCost === cheapest ? 'best' : ''}>{money(a.netMetalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="disc">
          Identical geometry, different densities. Platinum weighs {(20.9 / 13.07).toFixed(2)}× what 14K yellow does
          for the same model. Click a row to switch the design to that alloy.
        </p>
      </div>
    </>
  )
}
