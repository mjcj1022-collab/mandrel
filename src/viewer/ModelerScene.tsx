import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei'
import * as THREE from 'three'
import { useModeler } from '../state/modeler'
import { SculptMesh } from './SculptMesh'
import { ObjectListOverlay } from '../ui/ObjectListOverlay'
import { SketchDock } from '../ui/SketchPad'

export function ModelerScene() {
  const objects = useModeler(s => s.objects)
  const select = useModeler(s => s.select)
  const sketching = useModeler(s => s.sketching)

  return (
    <div className="stage">
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ fov: 35, position: [34, 28, 46] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onPointerMissed={() => select(null)}
      >
        <color attach="background" args={['#0E1113']} />
        <Suspense fallback={null}>
          <Environment preset="studio" environmentIntensity={0.85} />
        </Suspense>
        <ambientLight intensity={0.35} />
        <directionalLight position={[10, 18, 12]} intensity={1.5} castShadow />
        <directionalLight position={[-10, 4, -8]} intensity={0.6} color="#BFD4FF" />

        <gridHelper args={[100, 50, '#39424633', '#252b2e']} />

        {objects.map(o => <SculptMesh key={o.id} o={o} />)}

        <OrbitControls makeDefault enablePan minDistance={8} maxDistance={200} target={[0, 4, 0]} />
        <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
          <GizmoViewport axisColors={['#B4553C', '#4C7A3F', '#3B6FA0']} labelColor="#0E1113" />
        </GizmoHelper>
      </Canvas>

      <ObjectListOverlay />
      {sketching && <SketchDock />}

      {objects.length === 0 && (
        <div className="modeler-empty">
          <b>Empty workspace</b>
          Add a primitive from the toolbar, move it with the gizmo, then combine
          shapes with union / subtract / intersect to sculpt a custom piece.
        </div>
      )}

      <div className="stage-foot">
        <div className="scalebar"><i /> Click to select · drag the gizmo · scroll to zoom</div>
      </div>
    </div>
  )
}
