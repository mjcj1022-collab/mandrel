import { useState } from 'react'
import { useModeler } from '../state/modeler'
import { componentLibrary, type SavedComponent } from '../lib/componentLibrary'

/**
 * Reusable component library for the Sculpt tab: save the selected part (or the
 * whole piece) as a named component, then drop it into any sculpt. Parts insert
 * as fresh copies (new ids), nudged off the originals so they don't overlap.
 */
export function PartsLibrary() {
  const objects = useModeler(s => s.objects)
  const selectedId = useModeler(s => s.selectedId)
  const addObjects = useModeler(s => s.addObjects)
  const [list, setList] = useState<SavedComponent[]>(() => componentLibrary.list())
  const [name, setName] = useState('')

  const selected = objects.find(o => o.id === selectedId) ?? null

  const savePart = () => {
    const parts = selected ? [selected] : objects
    if (!parts.length) return
    componentLibrary.save(name.trim() || (selected ? selected.name : 'Assembly'), parts)
    setName(''); setList(componentLibrary.list())
  }

  const insert = (c: SavedComponent) => {
    addObjects(c.objects.map(o => {
      const { id, ...rest } = o
      void id
      return { ...rest, position: [o.position[0] + 4, o.position[1], o.position[2] + 4] as [number, number, number] }
    }))
  }

  const remove = (id: string) => { componentLibrary.remove(id); setList(componentLibrary.list()) }

  return (
    <div className="panel-block">
      <h4>Parts library</h4>
      <div className="lib-save">
        <input className="lib-name" placeholder={selected ? `Save “${selected.name}”` : 'Save whole piece as a part'}
          value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') savePart() }} />
        <button className="primary" onClick={savePart} disabled={!objects.length}>Save</button>
      </div>
      {list.length === 0 && <p className="disc">Save a shank, head, or halo — or the whole piece — and drop it into any design. Select a part first to save just that one; parts live in this browser.</p>}
      {list.map(c => (
        <div key={c.id} className="lib-row obj-row">
          <div className="lib-meta"><b>{c.name}</b><small>{c.objects.length} part{c.objects.length === 1 ? '' : 's'} · {new Date(c.at).toLocaleDateString()}</small></div>
          <div className="lib-acts">
            <button className="mini" onClick={() => insert(c)}>Insert</button>
            <button className="mini danger" onClick={() => remove(c.id)}>×</button>
          </div>
        </div>
      ))}
    </div>
  )
}
