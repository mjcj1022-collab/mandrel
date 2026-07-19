import { useDesign } from '../state/design'
import { computePrice } from '../lib/pricing'
import { computeMetal } from '../lib/metal'
import { alloyById, shapeById } from '../catalog'
import { money } from '../lib/units'
import { CATEGORY_LABEL, stoneOnPiece } from '../spec/types'

/** Pin up to four designs and compare them side by side. */
export function VariantsPanel() {
  const { spec, variants, pinVariant, unpinVariant, load } = useDesign()

  return (
    <div className="panel-block">
      <h4>Compare variants
        <button className="unit" disabled={variants.length >= 4} onClick={pinVariant}>
          {variants.length >= 4 ? 'full' : 'pin current'}
        </button>
      </h4>
      {variants.length === 0 && <p className="disc">Pin the current design (up to 4) to compare metal, stone, setting and price side by side.</p>}

      {variants.length > 0 && (
        <div className="cmp-scroll">
          <table className="cmp variants">
            <thead>
              <tr><th>#</th><th>Piece</th><th>Metal</th><th>Stone</th><th>Price</th><th></th></tr>
            </thead>
            <tbody>
              {variants.map((v, i) => {
                const p = computePrice(v)
                const m = computeMetal(v)
                const alloy = alloyById(v.metal.alloyId)
                const shape = shapeById(v.center.shapeId)
                return (
                  <tr key={i}>
                    <th scope="row">{i + 1}</th>
                    <td>{CATEGORY_LABEL[v.category]}</td>
                    <td>{alloy.short} · {m.finished.toFixed(2)}g</td>
                    <td>{stoneOnPiece(v) ? `${v.center.carat.toFixed(2)}ct ${shape.name}` : '—'}</td>
                    <td className="best">{money(p.total)}</td>
                    <td className="v-acts">
                      <button className="mini" onClick={() => load(v)}>Load</button>
                      <button className="mini danger" onClick={() => unpinVariant(i)}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="disc">Current: <b>{CATEGORY_LABEL[spec.category]}</b> · {money(computePrice(spec).total)}. Pin it, tweak, and pin again to weigh options.</p>
    </div>
  )
}
