import { useRef, useState, useEffect } from 'react'
import { useModeler } from '../state/modeler'
import type { SketchMode } from '../lib/sculpt'

/** Drawing surface size (px) and the mm each pixel represents. */
const W = 250, H = 220, MM_PER_PX = 0.12
const AXIS_X = 42            // revolve spin-axis, in px from the left edge

type Pt = { x: number; y: number }

function simplify(pts: Pt[], minDist = 6): Pt[] {
  const out: Pt[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minDist) out.push(p)
  }
  return out
}

// px ↔ mm. Revolve: x = radius from the axis (≥0), y = height (up = +).
// Extrude: outline in a centred XY plane.
const toMm = (pts: Pt[], mode: SketchMode): [number, number][] =>
  mode === 'revolve'
    ? pts.map(p => [Math.max(0, (p.x - AXIS_X) * MM_PER_PX), (H - p.y) * MM_PER_PX])
    : pts.map(p => [(p.x - W / 2) * MM_PER_PX, (H / 2 - p.y) * MM_PER_PX])
const toPx = (mm: [number, number][], mode: SketchMode): Pt[] =>
  mode === 'revolve'
    ? mm.map(([r, h]) => ({ x: AXIS_X + r / MM_PER_PX, y: H - h / MM_PER_PX }))
    : mm.map(([x, y]) => ({ x: W / 2 + x / MM_PER_PX, y: H / 2 - y / MM_PER_PX }))

/**
 * A docked, live sketch pad on the modeler stage. As you draw, the revolved or
 * extruded solid appears in the 3D scene in real time and stays a parametric,
 * re-editable "sketch" object — so you can keep changing it, tweak its depth or
 * resolution, boolean other parts onto it, or freeze it for vertex sculpting.
 */
export function SketchDock() {
  const editId = useModeler(s => s.sketchEditId)
  const objectById = useModeler(s => s.objects.find(o => o.id === s.sketchEditId) ?? null)
  const setSketching = useModeler(s => s.setSketching)
  const addSketch = useModeler(s => s.addSketch)
  const setObjectSketch = useModeler(s => s.setObjectSketch)
  const remove = useModeler(s => s.remove)

  const [mode, setMode] = useState<SketchMode>('revolve')
  const [depth, setDepth] = useState(3)
  const [segments, setSegments] = useState(48)
  const [pts, setPtsState] = useState<Pt[]>([])
  const ptsRef = useRef<Pt[]>([])
  const setPts = (p: Pt[]) => { ptsRef.current = p; setPtsState(p) }   // ref stays current within a single event turn
  const drawing = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const objId = useRef<string | null>(null)
  const isNew = useRef(true)

  // On open: editing an existing sketch loads its profile; otherwise start fresh.
  useEffect(() => {
    if (editId && objectById?.params?.sketch) {
      const sk = objectById.params.sketch
      setMode(sk.mode); setDepth(sk.depth); setSegments(sk.segments)
      setPts(toPx(sk.points, sk.mode))
      objId.current = editId; isNew.current = false
    } else {
      objId.current = null; isNew.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Push the current profile into the live 3D object (creating it on first use). */
  const pushLive = (p: Pt[], m: SketchMode, d: number, seg: number) => {
    if (p.length < 2) return
    const def = { points: toMm(p, m), mode: m, depth: d, segments: seg }
    if (objId.current) setObjectSketch(objId.current, def)
    else objId.current = addSketch(def)
  }

  const toSvg = (e: React.PointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const down = (e: React.PointerEvent) => { drawing.current = true; setPts([toSvg(e)]); try { svgRef.current?.setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ } }
  const move = (e: React.PointerEvent) => { if (drawing.current) setPts([...ptsRef.current, toSvg(e)]) }
  const up = () => { if (!drawing.current) return; drawing.current = false; const s = simplify(ptsRef.current); setPts(s); pushLive(s, mode, depth, segments) }

  const changeMode = (m: SketchMode) => { setMode(m); pushLive(ptsRef.current, m, depth, segments) }
  const changeDepth = (d: number) => { setDepth(d); pushLive(ptsRef.current, mode, d, segments) }
  const changeSeg = (s: number) => { setSegments(s); pushLive(ptsRef.current, mode, depth, s) }
  const clear = () => { setPts([]); if (objId.current) setObjectSketch(objId.current, { points: [], mode, depth, segments }) }

  const done = () => setSketching(false)
  const cancel = () => { if (isNew.current && objId.current) remove(objId.current); setSketching(false) }

  const path = pts.length ? 'M ' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') : ''
  const closeExtrude = mode === 'extrude' && !drawing.current && pts.length >= 3

  return (
    <div className="sketch-dock">
      <div className="sketch-dock-head">
        <b>{isNew.current ? 'Free draw' : 'Edit sketch'}</b>
        <span>{mode === 'revolve' ? 'draw right of the axis' : 'draw a closed outline'}</span>
      </div>
      <svg
        ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="sketch-svg"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
      >
        {[...Array(Math.floor(W / 20) + 1)].map((_, i) => <line key={'v' + i} x1={i * 20} y1={0} x2={i * 20} y2={H} className="sk-grid" />)}
        {[...Array(Math.floor(H / 20) + 1)].map((_, i) => <line key={'h' + i} x1={0} y1={i * 20} x2={W} y2={i * 20} className="sk-grid" />)}
        {mode === 'revolve' && <line x1={AXIS_X} y1={0} x2={AXIS_X} y2={H} className="sk-axis" />}
        {mode === 'extrude' && <line x1={W / 2} y1={0} x2={W / 2} y2={H} className="sk-axis dim" />}
        {path && <path d={closeExtrude ? path + ' Z' : path} className="sk-path" />}
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={1.6} className="sk-dot" />)}
      </svg>

      <div className="sketch-dock-ctl">
        <div className="opts c2">
          <button className="opt" aria-pressed={mode === 'revolve'} onClick={() => changeMode('revolve')}>Revolve</button>
          <button className="opt" aria-pressed={mode === 'extrude'} onClick={() => changeMode('extrude')}>Extrude</button>
        </div>
        {mode === 'extrude'
          ? <label className="sk-slider">Depth {depth.toFixed(1)} mm<input type="range" min={0.6} max={12} step={0.2} value={depth} onChange={e => changeDepth(+e.target.value)} /></label>
          : <label className="sk-slider">Sides {segments}<input type="range" min={8} max={96} step={1} value={segments} onChange={e => changeSeg(+e.target.value)} /></label>}
        <div className="opts c2">
          <button className="opt" onClick={clear}>Clear</button>
          <button className="opt" onClick={cancel}>Cancel</button>
        </div>
        <button className="opt tpl sk-done" onClick={done}>Done</button>
      </div>
    </div>
  )
}
