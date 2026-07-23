import { useState } from 'react'
import { useDesign } from '../state/design'
import { stoneOnPiece } from '../spec/types'
import { shapeById, stoneById } from '../catalog'
import { searchInventory, gradingColor, type InventoryStone } from '../lib/gemSource'
import { money } from '../lib/units'

const SHAPES = ['any', 'rd', 'ov', 'cu', 'pr', 'em', 'pe', 'ma']
const shapeLabel = (id: string) => (id === 'any' ? 'Any shape' : shapeById(id).name)

/**
 * Source a real stone: search inventory by shape and carat, then apply one — its
 * shape, carat, 4Cs, lab and cert flow into the design's center stone. Uses a
 * curated demo inventory today; a supplier feed can back it later.
 */
export function StoneSourcePanel() {
  const spec = useDesign(s => s.spec)
  const setShape = useDesign(s => s.setShape)
  const setStone = useDesign(s => s.setStone)
  const setCarat = useDesign(s => s.setCarat)
  const setGrading = useDesign(s => s.setGrading)
  const setCert = useDesign(s => s.setCert)

  const [shape, setShapeFilter] = useState('any')
  const [minC, setMinC] = useState(0.3)
  const [maxC, setMaxC] = useState(3)

  if (!stoneOnPiece(spec)) return null
  const results = searchInventory({ shapeId: shape, caratMin: minC, caratMax: maxC })

  const use = (s: InventoryStone) => {
    setStone(s.stoneTypeId); setShape(s.shapeId); setCarat(s.carat)
    const gc = gradingColor(s)
    setGrading({ ...(gc ? { color: gc } : {}), clarity: s.clarity, cut: s.cut, fluorescence: 'none' })
    setCert({ lab: s.lab, number: s.cert })
  }

  return (
    <div className="panel-block">
      <h4>Source a stone <span className="mfg-sum"><b className="ok">{results.length}</b></span></h4>
      <div className="src-filters">
        <select value={shape} onChange={e => setShapeFilter(e.target.value)} aria-label="Shape">
          {SHAPES.map(s => <option key={s} value={s}>{shapeLabel(s)}</option>)}
        </select>
        <label>min <input type="number" step={0.1} min={0} value={minC} onChange={e => setMinC(+e.target.value)} /></label>
        <label>max <input type="number" step={0.1} min={0} value={maxC} onChange={e => setMaxC(+e.target.value)} /> ct</label>
      </div>
      {results.length === 0 && <p className="disc">No stones in that range. Widen the carat window or change the shape.</p>}
      {results.map(s => (
        <div key={s.id} className="lib-row obj-row">
          <div className="lib-meta">
            <b>{s.carat.toFixed(2)} ct {shapeById(s.shapeId).name} {stoneById(s.stoneTypeId).name}{s.labGrown ? ' (lab)' : ''}</b>
            <small>{s.color} · {s.clarity.toUpperCase()} · {s.cut.toUpperCase()} cut · {s.lab} {s.cert}</small>
          </div>
          <div className="lib-acts">
            <b className="metopt-total">{money(s.price)}</b>
            <button className="mini" onClick={() => use(s)}>Use</button>
          </div>
        </div>
      ))}
      <p className="disc">Live-style inventory (demo). Pick a stone and its 4Cs and cert flow into the design. Point this at your supplier's feed to go live.</p>
    </div>
  )
}
