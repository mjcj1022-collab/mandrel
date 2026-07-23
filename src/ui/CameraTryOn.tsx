import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { useDesign } from '../state/design'
import { Piece } from '../viewer/Piece'

/** Procedural studio lighting (no CDN) so the metal reflects over the camera feed. */
function ArEnv() {
  return (
    <Environment resolution={128}>
      <Lightformer form="rect" intensity={2.0} color="#ffffff" scale={[12, 12, 1]} position={[0, 6, 5]} rotation={[-Math.PI / 2, 0, 0]} />
      <Lightformer form="rect" intensity={1.1} color="#cfe0ff" scale={[12, 12, 1]} position={[0, -6, 5]} rotation={[Math.PI / 2, 0, 0]} />
      <Lightformer form="ring" intensity={2.4} color="#ffffff" scale={3.5} position={[6, 4, 6]} />
    </Environment>
  )
}

/**
 * Live camera try-on: the webcam fills the screen and the piece is composited on
 * top, which you drag onto your finger and scale to fit. Manual placement (no
 * fragile hand-tracking model) so it's reliable; the render is a transparent 3D
 * canvas over the video. Falls back to a clear message if there's no camera.
 */
export function CameraTryOn({ onClose }: { onClose: () => void }) {
  const spec = useDesign(s => s.spec)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    const md = navigator.mediaDevices
    if (!md?.getUserMedia) { setError('This browser has no camera access.'); return }
    md.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(s => { stream = s; if (videoRef.current) { videoRef.current.srcObject = s; void videoRef.current.play().catch(() => {}) } })
      .catch(() => setError('Camera unavailable — allow camera access in your browser, or this device has no camera.'))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  const down = (e: React.PointerEvent) => { drag.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y }; (e.target as Element).setPointerCapture?.(e.pointerId) }
  const move = (e: React.PointerEvent) => { if (!drag.current) return; setPos({ x: drag.current.px + (e.clientX - drag.current.sx), y: drag.current.py + (e.clientY - drag.current.sy) }) }
  const up = () => { drag.current = null }

  return (
    <div className="ar-overlay">
      <video ref={videoRef} className="ar-video" playsInline muted />
      {error && <div className="ar-error">{error}<br /><button className="sbtn" style={{ marginTop: 12 }} onClick={onClose}>Close</button></div>}

      {!error && (
        <>
          <div className="ar-ring" style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
            <Canvas gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 30, position: [0, 4, 42] }} style={{ background: 'transparent' }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[6, 12, 9]} intensity={1.4} />
              <ArEnv />
              <group><Piece spec={spec} /></group>
            </Canvas>
          </div>

          <div className="ar-controls">
            <label>Size<input type="range" min={0.4} max={2.6} step={0.02} value={scale} onChange={e => setScale(+e.target.value)} /></label>
            <span className="ar-hint">Drag the ring onto your finger</span>
            <button className="sbtn" onClick={onClose}>Close</button>
          </div>
        </>
      )}
    </div>
  )
}
