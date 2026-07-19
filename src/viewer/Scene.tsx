import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useDesign } from '../state/design'
import { alloyById, shapeById, stoneMm } from '../catalog'
import { sizeToDiameter, formatSize } from '../lib/sizing'
import { CATEGORY_LABEL, stoneOnPiece } from '../spec/types'
import { Piece, viewTarget } from './Piece'
import { pieceHandle } from './exportStl'

function Turntable({ on, children }: { on: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (on && ref.current) ref.current.rotation.y += dt * 0.25 })
  return <group ref={ref}>{children}</group>
}

function hudChips(spec: ReturnType<typeof useDesign.getState>['spec']) {
  const alloy = alloyById(spec.metal.alloyId)
  const shape = shapeById(spec.center.shapeId)
  const mm = stoneMm(shape, spec.center.carat)
  const chips: React.ReactNode[] = []

  if (spec.category === 'ring') {
    chips.push(<span key="s" className="chip">Size <b>{formatSize(spec.ring.size)}</b> · <b>{sizeToDiameter(spec.ring.size).toFixed(2)}</b> mm ID</span>)
  } else if (spec.category === 'bracelet') {
    chips.push(<span key="s" className="chip"><b>{CATEGORY_LABEL[spec.category]}</b> · {spec.bracelet.kind} · <b>{((spec.bracelet.wristCircumference + spec.bracelet.fitAllowance) / 25.4).toFixed(1)}</b> in</span>)
  } else if (spec.category === 'necklace') {
    chips.push(<span key="s" className="chip"><b>Necklace</b> · <b>{spec.necklace.length}</b> in</span>)
  } else {
    chips.push(<span key="s" className="chip"><b>{CATEGORY_LABEL[spec.category]}</b></span>)
  }

  if (stoneOnPiece(spec))
    chips.push(<span key="c" className="chip"><b>{spec.center.carat.toFixed(2)} ct</b> {shape.name} · <b>{mm.length.toFixed(2)} × {mm.width.toFixed(2)}</b> mm</span>)

  chips.push(<span key="a" className="chip"><b>{alloy.name}</b> · {alloy.hallmark}</span>)
  return chips
}

interface Lighting { label: string; bg: string; envI: number; amb: number; key: [string, number]; fill: [string, number] }
const LIGHTING: Record<string, Lighting> = {
  studio:   { label: 'Studio',   bg: '#0E1113', envI: 0.90, amb: 0.30, key: ['#ffffff', 1.6], fill: ['#BFD4FF', 0.70] },
  daylight: { label: 'Daylight', bg: '#151a1d', envI: 1.10, amb: 0.50, key: ['#FFF7E8', 2.1], fill: ['#CFE0FF', 0.95] },
  case:     { label: 'Case',     bg: '#050607', envI: 0.70, amb: 0.12, key: ['#FFFFFF', 2.7], fill: ['#FFFFFF', 0.22] },
  candle:   { label: 'Candle',   bg: '#140f0a', envI: 0.60, amb: 0.18, key: ['#FF9C45', 1.6], fill: ['#FFB86A', 0.40] },
  office:   { label: 'Office',   bg: '#10151a', envI: 0.90, amb: 0.55, key: ['#EAF0FF', 1.2], fill: ['#EAF0FF', 0.85] }
}
const SCENES = ['studio', 'daylight', 'case', 'candle', 'office']

const SKIN_TONES = ['#E7C1A0', '#C89778', '#A56A43', '#6E4326']

export function Scene() {
  const spec = useDesign(s => s.spec)
  const wire = useDesign(s => s.viewWire)
  const toggleWire = useDesign(s => s.toggleWire)
  const explode = useDesign(s => s.explode)
  const setExplode = useDesign(s => s.setExplode)
  const tryOn = useDesign(s => s.tryOn)
  const toggleTryOn = useDesign(s => s.toggleTryOn)
  const skinTone = useDesign(s => s.skinTone)
  const setSkinTone = useDesign(s => s.setSkinTone)
  const isRing = spec.category === 'ring'
  const [spin, setSpin] = useState(true)
  const [top, setTop] = useState(false)
  const [scene, setScene] = useState('studio')
  const [reduced, setReduced] = useState(false)
  const L = LIGHTING[scene]

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    if (mq.matches) setSpin(false)
  }, [])

  const target = viewTarget(spec)

  return (
    <div className="stage">
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 30, position: [18, 16, 44] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <color attach="background" args={[L.bg]} />
        <Suspense fallback={null}>
          <Environment preset="studio" environmentIntensity={L.envI} />
        </Suspense>
        <ambientLight intensity={L.amb} />
        <directionalLight position={[6, 12, 9]} intensity={L.key[1]} color={L.key[0]} />
        <directionalLight position={[-8, 3, -7]} intensity={L.fill[1]} color={L.fill[0]} />
        <Turntable on={spin && !reduced}>
          <group ref={g => { pieceHandle.current = g }}>
            <Piece spec={spec} />
          </group>
        </Turntable>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={16}
          maxDistance={110}
          target={target}
          onStart={() => setSpin(false)}
        />
      </Canvas>

      <div className="stage-hud">{hudChips(spec)}</div>

      <div className="stage-light">
        {SCENES.map(s => (
          <button key={s} className="sbtn" aria-pressed={scene === s} onClick={() => setScene(s)}>{LIGHTING[s].label}</button>
        ))}
      </div>

      <div className="stage-foot">
        <div className="scalebar"><i /> Drag to orbit · scroll to zoom</div>
        <div className="stage-btns">
          <button className="sbtn" aria-pressed={spin} onClick={() => setSpin(v => !v)}>Turntable</button>
          <button className="sbtn" aria-pressed={top} onClick={() => setTop(v => !v)}>Top view</button>
          <button className="sbtn" aria-pressed={wire} onClick={toggleWire}>Wireframe</button>
          {isRing && <button className="sbtn" aria-pressed={tryOn} onClick={toggleTryOn}>Try-on</button>}
        </div>
      </div>

      <div className="stage-tools">
        <label className="explode-row">
          <span>Explode</span>
          <input type="range" min={0} max={1} step={0.02} value={explode} onChange={e => setExplode(+e.target.value)} />
        </label>
        {isRing && tryOn && (
          <div className="skin-row">
            {SKIN_TONES.map(c => (
              <button key={c} className={`skin ${skinTone === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setSkinTone(c)} aria-label="skin tone" />
            ))}
          </div>
        )}
      </div>
      {top && <div className="topview-note">Drag to look straight down — the plan view shows the setting and profile.</div>}
    </div>
  )
}
