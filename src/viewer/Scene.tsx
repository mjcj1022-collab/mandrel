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

export function Scene() {
  const spec = useDesign(s => s.spec)
  const [spin, setSpin] = useState(true)
  const [top, setTop] = useState(false)
  const [reduced, setReduced] = useState(false)

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
        <color attach="background" args={['#0E1113']} />
        <Suspense fallback={null}>
          <Environment preset="studio" environmentIntensity={0.9} />
        </Suspense>
        <ambientLight intensity={0.3} />
        <directionalLight position={[6, 12, 9]} intensity={1.6} />
        <directionalLight position={[-8, 3, -7]} intensity={0.7} color="#BFD4FF" />
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

      <div className="stage-foot">
        <div className="scalebar"><i /> Drag to orbit · scroll to zoom</div>
        <div className="stage-btns">
          <button className="sbtn" aria-pressed={spin} onClick={() => setSpin(v => !v)}>Turntable</button>
          <button className="sbtn" aria-pressed={top} onClick={() => setTop(v => !v)}>Top view</button>
        </div>
      </div>
      {top && <div className="topview-note">Drag to look straight down — the plan view shows the setting and profile.</div>}
    </div>
  )
}
