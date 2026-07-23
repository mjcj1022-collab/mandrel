import { useModeler, type SculptObject } from '../state/modeler'

/** One-line attribute summary for a part — material + a size/parameter hint. */
function attrLine(o: SculptObject): string {
  const bits: string[] = [o.material]
  const p = o.params
  if (p?.ringSize != null) bits.push(`sz ${p.ringSize}`)
  else if (p?.carat != null) bits.push(`${p.carat} ct`)
  else if (p?.width != null) bits.push(`${p.width} mm`)
  if (o.kind === 'mesh' && o.vertices) bits.push(`${Math.round(o.vertices.length / 3)} pts`)
  return bits.join(' · ')
}

/**
 * The sculpt object attribute table, floated on the left of the modeler stage.
 * Lists every object in play with a short attribute line; select a row, copy
 * (duplicate) it, or delete it — mirroring the Design tab's attribute overlay.
 */
export function ObjectListOverlay() {
  const objects = useModeler(s => s.objects)
  const selectedId = useModeler(s => s.selectedId)
  const select = useModeler(s => s.select)
  const remove = useModeler(s => s.remove)
  const duplicate = useModeler(s => s.duplicate)
  if (!objects.length) return null

  return (
    <div className="stage-attrs">
      <h5>Objects <b>{objects.length}</b></h5>
      {objects.map(o => (
        <div key={o.id} className={`attr-row ${o.id === selectedId ? 'sel' : ''}`} onClick={() => select(o.id)}>
          <span>
            {o.name} <i className="attr-kind">{o.kind}</i>
            <i className="attr-sub">{attrLine(o)}</i>
          </span>
          <span className="attr-acts">
            <button onClick={e => { e.stopPropagation(); duplicate(o.id) }} aria-label={`Copy ${o.name}`} title="Duplicate">Copy</button>
            <button onClick={e => { e.stopPropagation(); remove(o.id) }} aria-label={`Delete ${o.name}`} title="Delete">×</button>
          </span>
        </div>
      ))}
    </div>
  )
}
