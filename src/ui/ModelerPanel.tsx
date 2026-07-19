import { useState, useEffect } from 'react'
import { useModeler, SCULPT_COLORS, type PrimitiveKind, type JewelryKind, type SculptMaterial, type SculptObject, type ShankProfile } from '../state/modeler'
import { booleanOp, modelerToStl, sculptMetalVolume, sculptGemCarats, boundingSize, type BooleanOp } from '../lib/sculpt'
import { sculptLibrary, type SavedSculpt } from '../lib/sculptLibrary'
import { ALLOYS, SHAPES, alloyById, shapeById, stoneMm } from '../catalog'
import { money } from '../lib/units'
import { SketchPad } from './SketchPad'

const DEG = 180 / Math.PI
const round1 = (n: number) => Math.round(n * 10) / 10

const OZT = 31.1035
const PRIMS: [PrimitiveKind, string][] = [['box', 'Box'], ['sphere', 'Sphere'], ['cylinder', 'Cylinder'], ['cone', 'Cone'], ['torus', 'Torus'], ['tube', 'Tube']]
const PARTS: [JewelryKind, string][] = [['shank', 'Shank'], ['gem', 'Gem'], ['head', 'Prong head'], ['bezel', 'Bezel']]
const PROFILES: [ShankProfile, string][] = [['round', 'Round'], ['flat', 'Flat'], ['dshape', 'D-shape'], ['knife', 'Knife'], ['comfort', 'Comfort']]
const OPS: [BooleanOp, string][] = [['union', 'Union'], ['subtract', 'Subtract'], ['intersect', 'Intersect']]

function Slider({ label, value, min, max, step, unit, on }: { label: string; value: number; min: number; max: number; step: number; unit: string; on: (v: number) => void }) {
  return (
    <>
      <div className="row" style={{ marginTop: 12 }}><label>{label}</label><span className="val">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => on(+e.target.value)} />
    </>
  )
}

function ParamControls({ sel }: { sel: SculptObject }) {
  const { updateParams } = useModeler()
  const p = sel.params ?? {}
  if (sel.kind === 'shank') return (
    <>
      <Slider label="Ring size" value={p.ringSize ?? 7} min={3} max={13} step={0.25} unit="" on={v => updateParams(sel.id, { ringSize: v })} />
      <div className="row" style={{ marginTop: 12 }}><label>Profile</label></div>
      <div className="opts c2">
        {PROFILES.map(([id, label]) => <button key={id} className="opt" aria-pressed={(p.profile ?? 'round') === id} onClick={() => updateParams(sel.id, { profile: id })}>{label}</button>)}
      </div>
      <Slider label="Width" value={p.width ?? 2.2} min={1.2} max={10} step={0.1} unit=" mm" on={v => updateParams(sel.id, { width: v })} />
      <Slider label="Thickness" value={p.thickness ?? 1.8} min={1} max={4} step={0.1} unit=" mm" on={v => updateParams(sel.id, { thickness: v })} />
    </>
  )
  if (sel.kind === 'gem') return (
    <>
      <div className="row" style={{ marginTop: 12 }}><label>Cut</label></div>
      <select className="lib-name" style={{ width: '100%' }} value={p.shapeId ?? 'rd'} onChange={e => updateParams(sel.id, { shapeId: e.target.value })}>
        {SHAPES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <Slider label="Carat" value={p.carat ?? 1} min={0.1} max={6} step={0.05} unit=" ct" on={v => updateParams(sel.id, { carat: v })} />
    </>
  )
  if (sel.kind === 'head') return (
    <>
      <Slider label="Prongs" value={p.prongs ?? 4} min={3} max={8} step={1} unit="" on={v => updateParams(sel.id, { prongs: v })} />
      <Slider label="Stone width" value={p.stoneW ?? 6.5} min={3} max={16} step={0.1} unit=" mm" on={v => updateParams(sel.id, { stoneW: v })} />
      <Slider label="Height" value={p.height ?? 4} min={2} max={9} step={0.1} unit=" mm" on={v => updateParams(sel.id, { height: v })} />
    </>
  )
  if (sel.kind === 'bezel') return (
    <>
      <Slider label="Stone width" value={p.stoneW ?? 6.5} min={3} max={16} step={0.1} unit=" mm" on={v => updateParams(sel.id, { stoneW: v })} />
      <Slider label="Height" value={p.height ?? 3} min={1.5} max={7} step={0.1} unit=" mm" on={v => updateParams(sel.id, { height: v })} />
      <Slider label="Wall" value={p.wall ?? 0.6} min={0.3} max={1.5} step={0.05} unit=" mm" on={v => updateParams(sel.id, { wall: v })} />
    </>
  )
  return null
}

export function ModelerPanel() {
  const { objects, selectedId, mode, editMode, falloff, alloyId, snap, past, future, undo, redo, add, addMesh, update, remove, duplicate, arrayCircular, arrayLinear, mirror, centerObject, toggleSnap, bakeToMesh, setEditMode, setFalloff, select, setMode, setAlloy, clear, load } = useModeler()
  const sel = objects.find(o => o.id === selectedId) ?? null
  const dims = sel ? boundingSize(sel) : [0, 0, 0]
  const others = objects.filter(o => o.id !== selectedId)
  const [otherId, setOtherId] = useState('')
  const [seatTarget, setSeatTarget] = useState('')
  const [count, setCount] = useState(8)
  const [sketchOpen, setSketchOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saved, setSaved] = useState<SavedSculpt[]>(() => sculptLibrary.list())
  const [msg, setMsg] = useState('')
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  // Undo / redo keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const t = e.target as HTMLElement
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
      else if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const metalObjects = objects.filter(o => o.material === 'metal' && o.id !== selectedId)

  const boreSeat = (gem: SculptObject) => {
    const metalObj = objects.find(o => o.id === seatTarget)
    if (!metalObj) { flash('Choose the metal to seat the gem into.'); return }
    const gemW = stoneMm(shapeById(gem.params?.shapeId ?? 'rd'), gem.params?.carat ?? 1).width
    const cutter: SculptObject = { id: 'cut', kind: 'cone', name: 'cutter', position: [gem.position[0], gem.position[1] - gemW * 0.1, gem.position[2]], rotation: [Math.PI, 0, 0], scale: [1, 1, 1], size: gemW * 1.15, material: 'metal', color: 0 }
    try {
      const vertices = booleanOp(metalObj, cutter, 'subtract')
      if (!vertices.length) { flash('Gem isn’t over the metal — position it above the part first.'); return }
      addMesh({ kind: 'mesh', vertices, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], size: 0, material: metalObj.material, color: metalObj.color, name: `${metalObj.name} seated` })
      remove(metalObj.id); setSeatTarget('')
    } catch { flash('Seat failed on this geometry.') }
  }

  const alloy = alloyById(alloyId)
  const vol = sculptMetalVolume(objects)
  const castG = (vol / 1000) * alloy.density
  const metalCost = alloy.precious
    ? ((castG * alloy.fine) / OZT) * alloy.spot * (1 + alloy.premium)
    : castG * alloy.perGram * (1 + alloy.premium)
  const carats = sculptGemCarats(objects)

  const doBoolean = (op: BooleanOp) => {
    const b = objects.find(o => o.id === otherId)
    if (!sel || !b) { flash('Pick a second shape to combine with.'); return }
    try {
      const vertices = booleanOp(sel, b, op)
      if (!vertices.length) { flash('The shapes don’t overlap — nothing to combine.'); return }
      addMesh({ kind: 'mesh', vertices, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], size: 0, material: sel.material, color: sel.color, name: `${op} result` })
      remove(sel.id); remove(b.id); setOtherId('')
    } catch { flash('Boolean failed on this geometry.') }
  }

  const exportStl = () => {
    if (!objects.length) { flash('Nothing to export.'); return }
    const blob = new Blob([modelerToStl(objects)], { type: 'model/stl' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `blue-flame-sculpt-${Date.now()}.stl`; a.click(); URL.revokeObjectURL(a.href)
  }
  const save = () => {
    if (!objects.length) { flash('Nothing to save.'); return }
    const name = saveName.trim() || `Sculpt ${new Date().toLocaleDateString()}`
    sculptLibrary.save(name, objects); setSaveName(''); setSaved(sculptLibrary.list()); flash('Saved.')
  }
  const openSaved = (id: string) => { const rec = sculptLibrary.get(id); if (rec) { load(rec.objects); flash(`Loaded “${rec.name}”.`) } }
  const removeSaved = (id: string) => { sculptLibrary.remove(id); setSaved(sculptLibrary.list()) }

  return (
    <>
      <div className="panel-block">
        <h4>Jewelry parts</h4>
        <div className="opts c2">
          {PARTS.map(([k, label]) => <button key={k} className="opt tpl" onClick={() => add(k)}>{label}</button>)}
        </div>
        <h4 style={{ marginTop: 18 }}>Primitives</h4>
        <div className="opts c2">
          {PRIMS.map(([k, label]) => <button key={k} className="opt" onClick={() => add(k)}>{label}</button>)}
        </div>
        <h4 style={{ marginTop: 18 }}>Free draw</h4>
        <div className="opts"><button className="opt tpl" onClick={() => setSketchOpen(true)}>Sketch a shape…</button></div>

        <h4 style={{ marginTop: 18 }}>Edit mode</h4>
        <div className="opts c2">
          <button className="opt" aria-pressed={editMode === 'object'} onClick={() => setEditMode('object')}>Object</button>
          <button className="opt" aria-pressed={editMode === 'vertex'} onClick={() => setEditMode('vertex')}>Vertices</button>
        </div>
        {editMode === 'object' ? (
          <>
            <div className="opts" style={{ marginTop: 8 }}>
              {(['translate', 'rotate', 'scale'] as const).map(m => (
                <button key={m} className="opt" aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {m === 'translate' ? 'Move' : m === 'rotate' ? 'Rotate' : 'Scale'}
                </button>
              ))}
            </div>
            <label className="filter-row" style={{ marginTop: 12 }}>
              <input type="checkbox" checked={snap} onChange={toggleSnap} />
              Snap to grid<small>0.5 mm · 15°</small>
            </label>
          </>
        ) : (
          <>
            <Slider label="Region" value={falloff} min={0.4} max={14} step={0.2} unit=" mm" on={setFalloff} />
            <p className="disc">Select an <b>editable mesh</b>, click a point on it, then drag the gizmo. Nearby vertices follow within the region radius — small pulls one point, large sculpts a soft bulge. Convert a part with <b>Make editable</b> below.</p>
          </>
        )}
      </div>

      <div className="panel-block metalreq">
        <h4>Metal
          <select className="unit" value={alloyId} onChange={e => setAlloy(e.target.value)} style={{ marginLeft: 'auto' }}>
            {ALLOYS.map(a => <option key={a.id} value={a.id}>{a.short}</option>)}
          </select>
        </h4>
        <div className="qline"><span>Volume</span><span>{Math.round(vol).toLocaleString()} mm³</span></div>
        <div className="qline hi"><span>Cast weight <i>{alloy.name}</i></span><span>{castG.toFixed(2)} g</span></div>
        <div className="qline sub"><span>Metal value</span><span>{money(metalCost)}</span></div>
        {carats > 0 && <div className="qline"><span>Gemstones</span><span>{carats.toFixed(2)} ct</span></div>}
        <p className="disc">Weight is the summed volume of every metal part × alloy density — the same engine the configurator uses. Overlaps double-count until you boolean-union them.</p>
      </div>

      <div className="panel-block">
        <h4>Objects <span className="mfg-sum"><b className="ok">{objects.length}</b></span></h4>
        {objects.length === 0 && <p className="disc">Add a part or primitive above.</p>}
        {objects.map(o => (
          <div key={o.id} className={`lib-row obj-row ${o.id === selectedId ? 'sel' : ''}`} onClick={() => select(o.id)}>
            <div className="lib-meta"><b>{o.name}</b><small>{o.kind}{o.material === 'gem' ? ' · gem' : ''}</small></div>
            <div className="lib-acts">
              <button className="mini" onClick={e => { e.stopPropagation(); duplicate(o.id) }}>Dup</button>
              <button className="mini danger" onClick={e => { e.stopPropagation(); remove(o.id) }}>×</button>
            </div>
          </div>
        ))}
      </div>

      {sel && (
        <div className="panel-block">
          <h4>{sel.name}</h4>
          <div className="opts c2">
            {(['metal', 'gem'] as SculptMaterial[]).map(m => (
              <button key={m} className="opt" aria-pressed={sel.material === m} onClick={() => update(sel.id, { material: m, color: SCULPT_COLORS[m] })}>
                {m === 'metal' ? 'Metal' : 'Gemstone'}
              </button>
            ))}
          </div>

          <ParamControls sel={sel} />

          {sel.kind === 'mesh' ? (
            <div className="opts" style={{ marginTop: 12 }}>
              <button className="opt" aria-pressed={editMode === 'vertex'} onClick={() => { select(sel.id); setEditMode('vertex') }}>
                {editMode === 'vertex' ? 'Editing vertices ✓' : 'Edit vertices'}
              </button>
            </div>
          ) : (
            <div className="opts" style={{ marginTop: 12 }}>
              <button className="opt tpl" onClick={() => { bakeToMesh(sel.id); setEditMode('vertex') }}>Make editable →</button>
            </div>
          )}

          {!['shank', 'gem', 'head', 'bezel'].includes(sel.kind) && sel.kind !== 'mesh' && (
            <Slider label="Size" value={sel.size} min={1} max={30} step={0.5} unit="" on={v => update(sel.id, { size: v })} />
          )}
          <Slider label="Height" value={sel.position[1]} min={-10} max={30} step={0.5} unit="" on={v => update(sel.id, { position: [sel.position[0], v, sel.position[2]] })} />
          <Slider label="Uniform scale" value={sel.scale[0]} min={0.1} max={4} step={0.05} unit="×" on={v => update(sel.id, { scale: [v, v, v] })} />

          <div className="row" style={{ marginTop: 14 }}><label>Dimensions</label><span className="val">{dims[0].toFixed(1)} × {dims[1].toFixed(1)} × {dims[2].toFixed(1)} mm</span></div>
          <div className="subhead" style={{ marginTop: 10 }}>Position (mm)</div>
          <div className="xyz">
            {[0, 1, 2].map(i => (
              <input key={i} type="number" step={0.5} value={round1(sel.position[i])}
                onChange={e => { const p = [...sel.position] as [number, number, number]; p[i] = +e.target.value; update(sel.id, { position: p }) }} />
            ))}
          </div>
          <div className="subhead" style={{ marginTop: 8 }}>Rotation (°)</div>
          <div className="xyz">
            {[0, 1, 2].map(i => (
              <input key={i} type="number" step={5} value={Math.round(sel.rotation[i] * DEG)}
                onChange={e => { const r = [...sel.rotation] as [number, number, number]; r[i] = (+e.target.value) / DEG; update(sel.id, { rotation: r }) }} />
            ))}
          </div>
          <div className="opts c2" style={{ marginTop: 10 }}>
            <button className="opt" onClick={() => mirror(sel.id)}>Mirror X</button>
            <button className="opt" onClick={() => centerObject(sel.id)}>Center X/Z</button>
          </div>

          {sel.kind === 'gem' && (
            <>
              <h4 style={{ marginTop: 20 }}>Auto-seat</h4>
              <select className="lib-name" style={{ width: '100%' }} value={seatTarget} onChange={e => setSeatTarget(e.target.value)}>
                <option value="">Bore seat into…</option>
                {metalObjects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <div className="opts" style={{ marginTop: 8 }}><button className="opt" onClick={() => boreSeat(sel)}>Bore seat</button></div>
              <p className="disc">Cuts a conical seat into the chosen metal directly below the gem.</p>
            </>
          )}

          <h4 style={{ marginTop: 20 }}>Array <small style={{ color: '#6E787B', fontWeight: 400 }}>eternity · halo · pavé</small></h4>
          <div className="row"><label>Count</label><input className="lib-name" style={{ width: 64 }} type="number" min={2} max={60} value={count} onChange={e => setCount(Math.max(2, +e.target.value))} /></div>
          <div className="opts c2" style={{ marginTop: 8 }}>
            <button className="opt" onClick={() => arrayCircular(sel.id, count)}>Ring array</button>
            <button className="opt" onClick={() => arrayLinear(sel.id, count, sel.size || 4)}>Row array</button>
          </div>

          <h4 style={{ marginTop: 20 }}>Boolean</h4>
          <select className="lib-name" style={{ width: '100%' }} value={otherId} onChange={e => setOtherId(e.target.value)}>
            <option value="">Combine with…</option>
            {others.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <div className="opts" style={{ marginTop: 8 }}>
            {OPS.map(([op, label]) => <button key={op} className="opt" onClick={() => doBoolean(op)}>{label}</button>)}
          </div>
        </div>
      )}

      <div className="panel-block">
        <h4>History</h4>
        <div className="opts c2">
          <button className="opt" disabled={!past.length} onClick={undo} title="Ctrl/⌘+Z">↶ Undo</button>
          <button className="opt" disabled={!future.length} onClick={redo} title="Ctrl/⌘+Shift+Z">↷ Redo</button>
        </div>

        <h4 style={{ marginTop: 18 }}>Saved sculpts</h4>
        <div className="lib-save">
          <input className="lib-name" placeholder="Name this sculpt" value={saveName}
            onChange={e => setSaveName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save() }} />
          <button className="primary" onClick={save}>Save</button>
        </div>
        {saved.length === 0 && <p className="disc">Nothing saved yet. Saved sculpts live in this browser.</p>}
        {saved.map(s => (
          <div key={s.id} className="lib-row obj-row">
            <div className="lib-meta"><b>{s.name}</b><small>{s.objects.length} part{s.objects.length === 1 ? '' : 's'} · {new Date(s.at).toLocaleDateString()}</small></div>
            <div className="lib-acts">
              <button className="mini" onClick={() => openSaved(s.id)}>Load</button>
              <button className="mini danger" onClick={() => removeSaved(s.id)}>×</button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-block quote">
        <div className="qact"><button className="primary" onClick={exportStl}>Export STL</button><button className="ghost" onClick={clear}>Clear all</button></div>
        {msg && <p className="disc">{msg}</p>}
      </div>

      {sketchOpen && <SketchPad onClose={() => setSketchOpen(false)} />}
    </>
  )
}
