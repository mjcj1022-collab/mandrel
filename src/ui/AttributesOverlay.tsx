import { useDesign } from '../state/design'
import { designFeatures, isHidden } from '../lib/features'

const copyOut = (text: string) => { try { void navigator.clipboard?.writeText(text) } catch { /* clipboard blocked */ } }

/**
 * The attribute table, floated on the left of the 3D stage. Lists every
 * rendered object in the design; click a row to hide/restore it (delete), copy
 * its name out to the clipboard, or copy the whole list from the footer.
 */
export function AttributesOverlay() {
  const spec = useDesign(s => s.spec)
  const toggle = useDesign(s => s.toggleHidden)
  const feats = designFeatures(spec)
  if (!feats.length) return null
  const shown = feats.filter(f => !isHidden(spec, f.key))

  return (
    <div className="stage-attrs">
      <h5>Attributes <b>{shown.length}/{feats.length}</b></h5>
      {feats.map(f => {
        const hidden = isHidden(spec, f.key)
        return (
          <div key={f.key} className={`attr-row ${hidden ? 'off' : ''}`} onClick={() => toggle(f.key)}>
            <span>{f.label}</span>
            <span className="attr-acts">
              <button onClick={e => { e.stopPropagation(); copyOut(f.label) }} title="Copy name to clipboard">Copy</button>
              <button onClick={e => { e.stopPropagation(); toggle(f.key) }} title={hidden ? 'Restore' : 'Hide from the piece'}>{hidden ? 'Add' : 'Hide'}</button>
            </span>
          </div>
        )
      })}
      <div className="attrs-foot">
        <button onClick={() => copyOut(shown.map(f => f.label).join('\n'))} title="Copy all shown objects">Copy all</button>
      </div>
    </div>
  )
}
